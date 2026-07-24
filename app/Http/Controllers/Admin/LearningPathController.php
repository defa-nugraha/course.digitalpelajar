<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\LearningPath;
use App\Services\AuditLogger;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class LearningPathController extends Controller
{
    public function store(Request $request): RedirectResponse
    {
        $data = $this->validated($request);

        if ($request->user()?->role === 'internal_instructor') {
            $data['created_by'] = $request->user()->id;
        }

        $path = LearningPath::create($data);
        AuditLogger::log('learning_path.created', $request->user(), $path);

        return back()->with('success', 'Learning path berhasil dibuat.');
    }

    public function update(Request $request, LearningPath $learningPath): RedirectResponse
    {
        $this->authorizeLearningPath($request, $learningPath);
        $learningPath->update($this->validated($request));
        AuditLogger::log('learning_path.updated', $request->user(), $learningPath);

        return back()->with('success', 'Learning path berhasil diperbarui.');
    }

    public function destroy(Request $request, LearningPath $learningPath): RedirectResponse
    {
        $this->authorizeLearningPath($request, $learningPath);
        AuditLogger::log('learning_path.deleted', $request->user(), $learningPath, [
            'title' => $learningPath->title,
        ]);
        $learningPath->delete();

        return back()->with('success', 'Learning path berhasil dihapus.');
    }

    private function validated(Request $request): array
    {
        $learningPath = $request->route('learningPath');
        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'slug' => [
                'nullable',
                'string',
                'max:255',
                'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/',
                Rule::unique('learning_paths', 'slug')->ignore($learningPath?->id),
            ],
            'description' => ['nullable', 'string', 'max:3000'],
            'level' => ['required', Rule::in(['beginner', 'intermediate', 'advanced', 'beginner-to-advanced'])],
            'status' => ['required', Rule::in(['draft', 'published', 'archived'])],
            'meta_title' => ['nullable', 'string', 'max:70'],
            'meta_description' => ['nullable', 'string', 'max:170'],
        ]);

        $data['slug'] = $this->uniqueSlug(($data['slug'] ?? null) ?: $data['title'], $learningPath?->id);
        $data['meta_title'] = filled($data['meta_title'] ?? null)
            ? $data['meta_title']
            : Str::limit($data['title'].' | RoboAcademy', 70, '');
        $data['meta_description'] = filled($data['meta_description'] ?? null)
            ? $data['meta_description']
            : $this->defaultMetaDescription($data['description'] ?? null, $data['title']);

        return $data;
    }

    private function uniqueSlug(string $value, ?int $ignoreId = null): string
    {
        $base = Str::slug($value) ?: 'jalur-belajar';
        $slug = $base;
        $counter = 2;

        while (
            LearningPath::query()
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
            $plain = 'Ikuti jalur belajar '.$title.' untuk mempelajari robotik secara bertahap dari materi dasar sampai proyek praktik.';
        }

        return Str::limit($plain, 165, '');
    }

    private function authorizeLearningPath(Request $request, LearningPath $learningPath): void
    {
        $user = $request->user();

        if ($user?->isAdmin()) {
            return;
        }

        if ($user?->role !== 'internal_instructor') {
            abort(403);
        }

        $courseIds = DB::table('courses')
            ->where('instructor_id', $user->id)
            ->pluck('id')
            ->merge(DB::table('teaching_schedules')->where('instructor_id', $user->id)->pluck('course_id'))
            ->merge(DB::table('teaching_sessions')->where('instructor_id', $user->id)->pluck('course_id'))
            ->filter()
            ->unique()
            ->values();

        $hasAssignedCourse = DB::table('courses')
            ->whereIn('id', $courseIds)
            ->where('learning_path_id', $learningPath->id)
            ->exists();

        abort_unless((int) $learningPath->created_by === (int) $user->id || $hasAssignedCourse, 403);
    }
}
