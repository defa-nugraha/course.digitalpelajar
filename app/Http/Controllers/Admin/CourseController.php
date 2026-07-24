<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Course;
use App\Models\Lesson;
use App\Models\MediaUpload;
use App\Services\AuditLogger;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class CourseController extends Controller
{
    public function store(Request $request): RedirectResponse
    {
        $data = $this->validated($request);
        if ($request->user()?->role === 'internal_instructor') {
            $this->authorizeInstructorLearningPathSelection($request, $data['learning_path_id'] ?? null);
            $data['instructor_id'] = $request->user()->id;
        }
        $prerequisiteIds = $data['prerequisite_ids'];
        unset($data['prerequisite_ids']);

        $course = DB::transaction(function () use ($data, $prerequisiteIds) {
            $course = Course::create($data);
            $course->prerequisites()->sync($prerequisiteIds);

            return $course;
        });
        AuditLogger::log('course.created', $request->user(), $course);

        return to_route($this->managementRoutePrefix($request).'.course-builder', ['course' => $course->id])
            ->with('success', 'Kursus berhasil dibuat.');
    }

    public function update(Request $request, Course $course): RedirectResponse
    {
        $this->authorizeCourse($request, $course);
        $data = $this->validated($request, $course);
        if ($request->user()?->role === 'internal_instructor') {
            $this->authorizeInstructorLearningPathSelection($request, $data['learning_path_id'] ?? null);
            $data['instructor_id'] = $course->instructor_id ?: $request->user()->id;
        }
        $prerequisiteIds = $data['prerequisite_ids'];
        unset($data['prerequisite_ids']);

        if (
            $data['status'] === 'published'
            && $course->status !== 'published'
            && $course->chapters()
                ->whereHas('lessons.contentBlocks', fn ($query) => $query->where('status', '!=', 'published'))
                ->exists()
        ) {
            throw ValidationException::withMessages([
                'status' => 'Semua blok materi harus reviewed dan published sebelum kursus dipublikasikan.',
            ]);
        }

        DB::transaction(function () use ($course, $data, $prerequisiteIds) {
            $course->update($data);
            $course->prerequisites()->sync($prerequisiteIds);
        });
        AuditLogger::log('course.updated', $request->user(), $course);

        return back()->with('success', 'Kursus berhasil diperbarui.');
    }

    public function destroy(Request $request, Course $course): RedirectResponse
    {
        $this->authorizeCourse($request, $course);
        $lessonIds = $course->lessons()->pluck('lessons.id');
        MediaUpload::query()
            ->where('mediable_type', Lesson::class)
            ->whereIn('mediable_id', $lessonIds)
            ->get()
            ->each(function (MediaUpload $upload) {
                Storage::disk($upload->disk)->delete($upload->path);
                $upload->delete();
            });

        AuditLogger::log('course.deleted', $request->user(), $course, ['title' => $course->title]);
        $course->delete();

        return to_route($this->managementRoutePrefix($request).'.course-builder')->with('success', 'Kursus berhasil dihapus.');
    }

    private function validated(Request $request, ?Course $course = null): array
    {
        $data = $request->validate([
            'learning_path_id' => ['nullable', 'exists:learning_paths,id'],
            'learning_path_order' => ['sometimes', 'integer', 'min:0'],
            'instructor_id' => [
                'nullable',
                Rule::exists('users', 'id')->where(fn ($query) => $query
                    ->whereIn('role', ['admin', 'internal_instructor'])
                    ->where('status', 'active')),
            ],
            'certificate_template_id' => [
                'nullable',
                Rule::exists('certificate_templates', 'id')->where('status', 'published'),
            ],
            'prerequisite_ids' => ['sometimes', 'array'],
            'prerequisite_ids.*' => [
                'integer',
                'distinct',
                Rule::exists('courses', 'id'),
                Rule::notIn(array_filter([$course?->id])),
            ],
            'title' => ['required', 'string', 'max:255'],
            'slug' => [
                'nullable',
                'string',
                'max:255',
                'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/',
                Rule::unique('courses', 'slug')->ignore($course?->id),
            ],
            'description' => ['nullable', 'string', 'max:3000'],
            'level' => ['required', Rule::in(['beginner', 'intermediate', 'advanced'])],
            'price_type' => ['required', Rule::in(['free', 'paid'])],
            'price' => [
                'required',
                'integer',
                Rule::when($request->input('price_type') === 'free', ['in:0'], ['min:1']),
            ],
            'access_mode' => ['required', Rule::in(['sequential', 'open', 'scheduled'])],
            'status' => ['required', Rule::in(['draft', 'reviewed', 'published', 'archived'])],
            'meta_title' => ['nullable', 'string', 'max:70'],
            'meta_description' => ['nullable', 'string', 'max:170'],
            'canonical_url' => ['nullable', 'url', 'max:2048'],
            'og_image' => ['nullable', 'string', 'max:2048'],
            'course_image' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:4096'],
        ]);

        $data['learning_path_order'] ??= $course?->learning_path_order ?? 0;
        $data['slug'] = $this->uniqueSlug(($data['slug'] ?? null) ?: $data['title'], $course?->id);
        $data['meta_title'] = filled($data['meta_title'] ?? null)
            ? $data['meta_title']
            : Str::limit($data['title'].' | RoboAcademy', 70, '');
        $data['meta_description'] = filled($data['meta_description'] ?? null)
            ? $data['meta_description']
            : $this->defaultMetaDescription($data['description'] ?? null, $data['title']);
        $data['canonical_url'] = $this->normalizeCanonicalUrl($data['canonical_url'] ?? null, $data['slug']);
        if ($request->hasFile('course_image')) {
            $this->deleteCourseImage($course?->og_image);
            $data['og_image'] = $request->file('course_image')->store('course-images', 'public');
        } else {
            $data['og_image'] = $this->normalizePublicImagePath($request, $data['og_image'] ?? null);
        }
        unset($data['course_image']);
        $data['prerequisite_ids'] ??= $course
            ? $course->prerequisites()->pluck('courses.id')->all()
            : [];

        return $data;
    }

    private function uniqueSlug(string $value, ?int $ignoreId = null): string
    {
        $base = Str::slug($value) ?: 'kelas';
        $slug = $base;
        $counter = 2;

        while (
            Course::query()
                ->where('slug', $slug)
                ->when($ignoreId, fn ($query) => $query->where('id', '!=', $ignoreId))
                ->exists()
        ) {
            $slug = $base.'-'.$counter;
            $counter++;
        }

        return $slug;
    }

    private function defaultMetaDescription(?string $description, string $title): string
    {
        $plain = trim(preg_replace('/\s+/', ' ', strip_tags((string) $description)));

        if ($plain === '') {
            $plain = 'Pelajari '.$title.' melalui kelas robotik terstruktur dengan materi, praktik, dan sertifikat digital.';
        }

        return Str::limit($plain, 165, '');
    }

    private function normalizeCanonicalUrl(?string $canonicalUrl, string $slug): ?string
    {
        if (! filled($canonicalUrl)) {
            return null;
        }

        $url = trim($canonicalUrl);
        $path = parse_url($url, PHP_URL_PATH);

        return $url === route('products.show', $slug ?: 'unknown') || $path === '/produk/'.$slug ? null : $url;
    }

    private function normalizePublicImagePath(Request $request, ?string $imagePath): ?string
    {
        if (! filled($imagePath)) {
            return null;
        }

        $path = trim($imagePath);
        $origin = $request->getSchemeAndHttpHost();

        if (str_starts_with($path, $origin.'/')) {
            $path = Str::after($path, $origin);
        }

        $urlPath = parse_url($path, PHP_URL_PATH);

        if (is_string($urlPath) && str_starts_with($urlPath, '/storage/')) {
            return Str::after($urlPath, '/storage/');
        }

        if ($urlPath === '/logo.png') {
            return $urlPath;
        }

        if (str_contains($path, '/storage/')) {
            return Str::after($path, '/storage/');
        }

        if (str_starts_with($path, 'storage/')) {
            return Str::after($path, 'storage/');
        }

        return $path;
    }

    private function deleteCourseImage(?string $imagePath): void
    {
        if (! filled($imagePath)) {
            return;
        }

        $path = $this->normalizeStoredImagePath($imagePath);

        if (! $path || ! str_starts_with($path, 'course-images/')) {
            return;
        }

        Storage::disk('public')->delete($path);
    }

    private function normalizeStoredImagePath(string $imagePath): ?string
    {
        $path = trim($imagePath);
        $urlPath = parse_url($path, PHP_URL_PATH);

        if (is_string($urlPath) && str_starts_with($urlPath, '/storage/')) {
            return Str::after($urlPath, '/storage/');
        }

        if (str_starts_with($path, 'storage/')) {
            return Str::after($path, 'storage/');
        }

        if (str_starts_with($path, '/')) {
            return null;
        }

        return $path;
    }

    private function authorizeCourse(Request $request, Course $course): void
    {
        $user = $request->user();

        if (! $user?->isInstructor()) {
            abort(403);
        }

        if ($user->isAdmin()) {
            return;
        }

        $courseIds = DB::table('courses')
            ->where('instructor_id', $user->id)
            ->pluck('id')
            ->merge(DB::table('teaching_schedules')->where('instructor_id', $user->id)->pluck('course_id'))
            ->merge(DB::table('teaching_sessions')->where('instructor_id', $user->id)->pluck('course_id'))
            ->filter()
            ->unique()
            ->values()
            ->all();

        abort_unless(in_array($course->id, $courseIds, true), 403);
    }

    private function authorizeInstructorLearningPathSelection(Request $request, mixed $learningPathId): void
    {
        if (! $learningPathId) {
            return;
        }

        $user = $request->user();
        abort_unless($user?->role === 'internal_instructor', 403);

        $courseIds = DB::table('courses')
            ->where('instructor_id', $user->id)
            ->pluck('id')
            ->merge(DB::table('teaching_schedules')->where('instructor_id', $user->id)->pluck('course_id'))
            ->merge(DB::table('teaching_sessions')->where('instructor_id', $user->id)->pluck('course_id'))
            ->filter()
            ->unique()
            ->values();

        $allowed = DB::table('learning_paths')
            ->where('id', $learningPathId)
            ->where(function ($query) use ($user, $courseIds) {
                $query->where('created_by', $user->id)
                    ->orWhereExists(function ($query) use ($courseIds) {
                        $query->selectRaw('1')
                            ->from('courses')
                            ->whereColumn('courses.learning_path_id', 'learning_paths.id')
                            ->whereIn('courses.id', $courseIds);
                    });
            })
            ->exists();

        abort_unless($allowed, 403);
    }

    private function managementRoutePrefix(Request $request): string
    {
        return $request->user()?->role === 'internal_instructor' ? 'instructor' : 'admin';
    }
}
