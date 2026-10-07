<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Chapter;
use App\Models\ContentBlock;
use App\Models\Course;
use App\Models\Lesson;
use App\Models\MediaUpload;
use App\Models\Quiz;
use App\Services\AuditLogger;
use App\Services\InteractiveBlockSchemaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class CurriculumController extends Controller
{
    public function storeChapter(Request $request, Course $course): RedirectResponse
    {
        $this->authorizeCourse($request, $course);
        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'order_no' => ['required', 'integer', 'min:1'],
        ]);

        $chapter = $course->chapters()->create($data);
        AuditLogger::log('chapter.created', $request->user(), $chapter);

        return back()->with('success', 'Bab berhasil ditambahkan.');
    }

    public function updateChapter(Request $request, Chapter $chapter): RedirectResponse
    {
        $this->authorizeCourse($request, $chapter->course);
        $chapter->update($request->validate([
            'title' => ['required', 'string', 'max:255'],
            'order_no' => ['required', 'integer', 'min:1'],
        ]));

        AuditLogger::log('chapter.updated', $request->user(), $chapter);

        return back()->with('success', 'Bab berhasil diperbarui.');
    }

    public function destroyChapter(Request $request, Chapter $chapter): RedirectResponse
    {
        $this->authorizeCourse($request, $chapter->course);
        $this->deleteLessonUploads($chapter->lessons()->pluck('id'));
        AuditLogger::log('chapter.deleted', $request->user(), $chapter, ['title' => $chapter->title]);
        $chapter->delete();

        return back()->with('success', 'Bab dan seluruh materinya berhasil dihapus.');
    }

    public function storeLesson(Request $request, Chapter $chapter): RedirectResponse
    {
        $this->authorizeCourse($request, $chapter->course);
        $lessonData = $this->lessonData($request);
        $isStudioCourse = $chapter->course->learning_format === 'interactive';
        $initialBlockData = $isStudioCourse ? null : $this->initialBlockData($request);

        $lesson = DB::transaction(function () use ($chapter, $lessonData, $initialBlockData) {
            $lesson = $chapter->lessons()->create($lessonData);

            if ($initialBlockData) {
                $lesson->contentBlocks()->create($initialBlockData);
            }

            return $lesson;
        });

        AuditLogger::log('lesson.created', $request->user(), $lesson);
        if ($initialBlockData) {
            AuditLogger::log('content_block.created', $request->user(), $lesson->contentBlocks()->latest('id')->first());
        }

        if ($isStudioCourse) {
            $block = $this->ensureInteractiveBlockForLesson($lesson, app(InteractiveBlockSchemaService::class), $request);

            return to_route($this->managementRoutePrefix($request).'.blocks.interactive-editor', $block)
                ->with('success', 'Lesson berhasil dibuat. Studio interaktif siap digunakan.');
        }

        return back()->with('success', 'Lesson berhasil ditambahkan.');
    }

    public function openLessonInteractiveEditor(Request $request, Lesson $lesson, InteractiveBlockSchemaService $interactiveSchema): RedirectResponse
    {
        $lesson->load('chapter.course');
        $this->authorizeCourse($request, $lesson->chapter->course);
        abort_unless($lesson->chapter->course->learning_format === 'interactive', 404);

        $block = $this->ensureInteractiveBlockForLesson($lesson, $interactiveSchema, $request);

        return to_route($this->managementRoutePrefix($request).'.blocks.interactive-editor', $block);
    }

    public function updateLesson(Request $request, Lesson $lesson): RedirectResponse
    {
        $this->authorizeCourse($request, $lesson->chapter->course);
        $lesson->update($this->lessonData($request));
        AuditLogger::log('lesson.updated', $request->user(), $lesson);

        return back()->with('success', 'Lesson berhasil diperbarui.');
    }

    public function destroyLesson(Request $request, Lesson $lesson): RedirectResponse
    {
        $this->authorizeCourse($request, $lesson->chapter->course);
        $this->deleteLessonUploads(collect([$lesson->id]));
        AuditLogger::log('lesson.deleted', $request->user(), $lesson, ['title' => $lesson->title]);
        $lesson->delete();

        return back()->with('success', 'Lesson berhasil dihapus.');
    }

    public function storeBlock(Request $request, Lesson $lesson, InteractiveBlockSchemaService $interactiveSchema): RedirectResponse
    {
        $this->authorizeCourse($request, $lesson->chapter->course);
        $block = $lesson->contentBlocks()->create($this->blockData($request, $lesson, null, $interactiveSchema));
        AuditLogger::log('content_block.created', $request->user(), $block);

        return to_route($this->managementRoutePrefix($request).'.course-builder', ['course' => $lesson->chapter->course_id])
            ->with('success', 'Blok materi berhasil ditambahkan.');
    }

    public function updateBlock(Request $request, ContentBlock $block, InteractiveBlockSchemaService $interactiveSchema): RedirectResponse
    {
        $this->authorizeCourse($request, $block->lesson->chapter->course);
        $data = $this->blockData($request, $block->lesson, $block, $interactiveSchema);
        $mediaUploadId = $block->metadata['media_upload_id'] ?? null;

        if (($block->metadata['source'] ?? null) === 'pdf_conversion' && $mediaUploadId && $block->status === 'draft' && $data['status'] === 'published') {
            throw ValidationException::withMessages([
                'status' => 'Block hasil konversi PDF harus diubah ke reviewed sebelum published.',
            ]);
        }

        $block->update($data);
        $this->syncConversionStatus($mediaUploadId);
        AuditLogger::log('content_block.updated', $request->user(), $block);

        return to_route($this->managementRoutePrefix($request).'.course-builder', ['course' => $block->lesson->chapter->course_id])
            ->with('success', 'Blok materi berhasil diperbarui.');
    }

    public function autosaveInteractiveBlock(Request $request, ContentBlock $block, InteractiveBlockSchemaService $interactiveSchema): JsonResponse
    {
        $block->loadMissing('lesson.chapter.course');
        $this->authorizeCourse($request, $block->lesson->chapter->course);
        abort_unless($block->type === 'interactive', 404);

        $data = $request->validate([
            'metadata' => ['required', 'array'],
            'status' => ['nullable', Rule::in(['draft', 'reviewed', 'published'])],
            'updated_at' => ['required', 'date'],
        ]);

        if ($block->updated_at && ! Carbon::parse($data['updated_at'])->equalTo($block->updated_at)) {
            return response()->json([
                'message' => 'Konten sudah berubah di server. Muat ulang data terbaru sebelum menyimpan lagi.',
                'metadata' => $interactiveSchema->enrichMediaUrls($block->metadata ?? []),
                'status' => $block->status,
                'content' => $block->content,
                'updatedAt' => $block->updated_at?->toJSON(),
            ], 409);
        }

        $nextStatus = $data['status'] ?? $block->status;
        $metadata = $interactiveSchema->normalize($this->metadataArray($data['metadata']), $block->lesson);
        if ($nextStatus === 'published') {
            $interactiveSchema->assertPublishable($metadata);
        }

        $block->update([
            'metadata' => $metadata,
            'content' => $this->interactiveBlockSummary($metadata),
            'status' => $nextStatus,
        ]);

        AuditLogger::log('content_block.interactive_autosaved', $request->user(), $block);

        return response()->json([
            'message' => 'Perubahan editor berhasil disimpan.',
            'metadata' => $interactiveSchema->enrichMediaUrls($block->fresh()->metadata ?? []),
            'status' => $block->status,
            'content' => $block->content,
            'updatedAt' => $block->updated_at?->toJSON(),
        ]);
    }

    public function destroyBlock(Request $request, ContentBlock $block): RedirectResponse
    {
        $this->authorizeCourse($request, $block->lesson->chapter->course);
        $mediaUploadId = $block->metadata['media_upload_id'] ?? null;
        AuditLogger::log('content_block.deleted', $request->user(), $block);
        $this->deleteBlockUpload($block);
        $block->delete();
        $this->syncConversionStatus($mediaUploadId);

        return back()->with('success', 'Blok materi berhasil dihapus.');
    }

    public function uploadEditorMedia(Request $request, Lesson $lesson): JsonResponse
    {
        $lesson->loadMissing('chapter.course');
        $this->authorizeCourse($request, $lesson->chapter->course);

        $data = $request->validate([
            'type' => ['required', Rule::in(['image', 'video'])],
            'media' => [
                'required',
                'file',
                'max:51200',
                'mimetypes:image/jpeg,image/png,image/webp,image/gif,image/svg+xml,video/mp4,video/webm,video/ogg,video/quicktime',
            ],
        ]);

        $file = $request->file('media');
        $mimeType = (string) $file->getMimeType();
        $mediaType = str_starts_with($mimeType, 'image/') ? 'image' : (str_starts_with($mimeType, 'video/') ? 'video' : null);

        if ($mediaType !== $data['type']) {
            throw ValidationException::withMessages([
                'media' => $data['type'] === 'image' ? 'File harus berupa gambar.' : 'File harus berupa video.',
            ]);
        }

        $course = $lesson->chapter->course;
        $path = $file->store("course-materials/{$course->id}/{$lesson->id}/editor/{$mediaType}s", 'public');
        $upload = MediaUpload::create([
            'user_id' => $request->user()->id,
            'mediable_type' => Lesson::class,
            'mediable_id' => $lesson->id,
            'disk' => 'public',
            'path' => $path,
            'original_name' => $file->getClientOriginalName(),
            'mime_type' => $mimeType,
            'size' => $file->getSize(),
            'conversion_status' => 'published',
        ]);

        AuditLogger::log('content_editor_media.uploaded', $request->user(), $upload, [
            'course_id' => $course->id,
            'lesson_id' => $lesson->id,
            'type' => $mediaType,
        ]);

        return response()->json([
            'id' => $upload->id,
            'type' => $mediaType,
            'path' => $path,
            'url' => Storage::disk('public')->url($path),
            'originalName' => $file->getClientOriginalName(),
        ]);
    }

    public function uploadInteractiveMedia(Request $request, Lesson $lesson): JsonResponse
    {
        $lesson->loadMissing('chapter.course');
        $this->authorizeCourse($request, $lesson->chapter->course);

        $data = $request->validate([
            'type' => ['required', Rule::in(['image', 'video', 'audio'])],
            'media' => [
                'required',
                'file',
                'max:51200',
                'mimetypes:image/jpeg,image/png,image/webp,image/gif,image/svg+xml,video/mp4,video/webm,video/ogg,video/quicktime,audio/mpeg,audio/mp3,audio/wav,audio/x-wav,audio/ogg,audio/mp4,audio/aac',
            ],
        ]);

        $file = $request->file('media');
        $mimeType = (string) $file->getMimeType();
        $mediaType = str_starts_with($mimeType, 'image/')
            ? 'image'
            : (str_starts_with($mimeType, 'video/')
                ? 'video'
                : (str_starts_with($mimeType, 'audio/') ? 'audio' : null));

        if ($mediaType !== $data['type']) {
            throw ValidationException::withMessages([
                'media' => match ($data['type']) {
                    'image' => 'File harus berupa gambar.',
                    'video' => 'File harus berupa video.',
                    default => 'File harus berupa audio.',
                },
            ]);
        }

        $course = $lesson->chapter->course;
        $path = $file->store("course-materials/{$course->id}/{$lesson->id}/interactive/{$mediaType}s", 'public');
        $upload = MediaUpload::create([
            'user_id' => $request->user()->id,
            'mediable_type' => Lesson::class,
            'mediable_id' => $lesson->id,
            'disk' => 'public',
            'path' => $path,
            'original_name' => $file->getClientOriginalName(),
            'mime_type' => $mimeType,
            'size' => $file->getSize(),
            'conversion_status' => 'published',
        ]);

        AuditLogger::log('interactive_media.uploaded', $request->user(), $upload, [
            'course_id' => $course->id,
            'lesson_id' => $lesson->id,
            'type' => $mediaType,
        ]);

        return response()->json([
            'id' => $upload->id,
            'type' => $mediaType,
            'path' => $path,
            'url' => Storage::disk('public')->url($path),
            'originalName' => $file->getClientOriginalName(),
            'mimeType' => $mimeType,
            'size' => $file->getSize(),
        ]);
    }

    public function storeQuiz(Request $request, Course $course): RedirectResponse
    {
        $this->authorizeCourse($request, $course);
        $data = $this->quizData($request);
        $data['course_id'] = $course->id;

        $quiz = Quiz::create($data);
        AuditLogger::log('quiz.created', $request->user(), $quiz);

        return back()->with('success', 'Kuis berhasil ditambahkan.');
    }

    public function updateQuiz(Request $request, Quiz $quiz): RedirectResponse
    {
        $this->authorizeCourse($request, $quiz->course);
        $quiz->update($this->quizData($request));
        AuditLogger::log('quiz.updated', $request->user(), $quiz);

        return back()->with('success', 'Kuis berhasil diperbarui.');
    }

    public function destroyQuiz(Request $request, Quiz $quiz): RedirectResponse
    {
        $this->authorizeCourse($request, $quiz->course);
        if ($quiz->attempts()->exists()) {
            return back()->with('error', 'Kuis yang sudah dikerjakan tidak dapat dihapus.');
        }

        AuditLogger::log('quiz.deleted', $request->user(), $quiz);
        $quiz->delete();

        return back()->with('success', 'Kuis berhasil dihapus.');
    }

    private function lessonData(Request $request): array
    {
        return $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'order_no' => ['required', 'integer', 'min:1'],
            'is_required' => ['required', 'boolean'],
            'available_at' => ['nullable', 'date'],
        ]);
    }

    private function initialBlockData(Request $request): ?array
    {
        if (! $request->boolean('add_initial_block')) {
            return null;
        }

        $data = $request->validate([
            'initial_block_type' => [
                'required',
                Rule::in(['text', 'image', 'video', 'code', 'file', 'submission', 'checklist', 'note', 'warning']),
            ],
            'initial_block_content' => ['nullable', 'string'],
            'initial_block_metadata' => ['nullable'],
            'initial_block_status' => ['required', Rule::in(['draft', 'reviewed', 'published'])],
        ]);

        $block = [
            'type' => $data['initial_block_type'],
            'content' => $data['initial_block_content'] ?? null,
            'metadata' => $this->metadataArray($data['initial_block_metadata'] ?? null),
            'order_no' => 1,
            'status' => $data['initial_block_status'],
        ];

        if ($this->requiresContent($block['type'], $block['content'], $block['metadata'])) {
            throw ValidationException::withMessages([
                'initial_block_content' => 'Konten awal wajib diisi untuk tipe block ini.',
            ]);
        }

        $requiresUrl = in_array($block['type'], ['image', 'video'], true)
            || (
                $block['type'] === 'file'
                && ($block['metadata']['source'] ?? null) !== 'pdf_conversion'
            );
        if ($requiresUrl && ! filter_var($block['content'], FILTER_VALIDATE_URL)) {
            throw ValidationException::withMessages([
                'initial_block_content' => 'Konten image, video, atau file manual harus berupa URL valid.',
            ]);
        }

        return $block;
    }

    private function ensureInteractiveBlockForLesson(Lesson $lesson, InteractiveBlockSchemaService $interactiveSchema, ?Request $request = null): ContentBlock
    {
        $lesson->loadMissing('chapter.course');
        $existing = $lesson->contentBlocks()
            ->where('type', 'interactive')
            ->orderBy('order_no')
            ->first();

        if ($existing) {
            return $existing;
        }

        $metadata = $interactiveSchema->normalize([
            'schema_version' => 1,
            'canvas' => [
                'width' => 1280,
                'height' => 720,
                'aspect_ratio' => '16:9',
                'background_color' => '#f8fafc',
            ],
            'scenes' => [
                [
                    'id' => 'scene-intro',
                    'title' => $lesson->title,
                    'order' => 1,
                    'text' => 'Mulai susun materi interaktif pada Visual Editor.',
                    'background' => null,
                    'narration' => null,
                    'hotspots' => [],
                    'buttons' => [],
                    'assets' => [],
                ],
            ],
        ], $lesson);

        $block = $lesson->contentBlocks()->create([
            'type' => 'interactive',
            'content' => $this->interactiveBlockSummary($metadata),
            'metadata' => $metadata,
            'order_no' => ((int) $lesson->contentBlocks()->max('order_no')) + 1,
            'status' => 'draft',
        ]);

        if ($request) {
            AuditLogger::log('content_block.created', $request->user(), $block, [
                'source' => 'studio_interactive_auto_create',
            ]);
        }

        return $block;
    }

    private function blockData(
        Request $request,
        Lesson $lesson,
        ?ContentBlock $existingBlock = null,
        ?InteractiveBlockSchemaService $interactiveSchema = null,
    ): array {
        $data = $request->validate([
            'type' => [
                'required',
                Rule::in(['text', 'image', 'video', 'code', 'file', 'pdf', 'submission', 'checklist', 'note', 'warning', 'interactive']),
            ],
            'content' => ['nullable', 'string'],
            'metadata' => ['nullable'],
            'material_file' => ['nullable', 'file', 'max:20480'],
            'order_no' => ['required', 'integer', 'min:1'],
            'status' => ['required', Rule::in(['draft', 'reviewed', 'published'])],
        ]);

        $data['metadata'] = $this->metadataArray($data['metadata'] ?? null);
        $data = $this->withBlockUpload($request, $lesson, $data, $existingBlock);
        unset($data['material_file']);

        if ($data['type'] === 'interactive') {
            $schema = $interactiveSchema ?? app(InteractiveBlockSchemaService::class);
            $data['metadata'] = $schema->normalize($data['metadata'], $lesson);
            if ($data['status'] === 'published') {
                $schema->assertPublishable($data['metadata']);
            }
            $data['content'] = $this->interactiveBlockSummary($data['metadata']);
        }

        if ($this->requiresContent($data['type'], $data['content'] ?? null, $data['metadata'])) {
            throw ValidationException::withMessages([
                'content' => 'Konten wajib diisi untuk tipe block ini.',
            ]);
        }

        if ($data['type'] === 'video' && ! filter_var($data['content'], FILTER_VALIDATE_URL)) {
            throw ValidationException::withMessages([
                'content' => 'Konten video harus berupa URL valid.',
            ]);
        }

        return $data;
    }

    private function withBlockUpload(Request $request, Lesson $lesson, array $data, ?ContentBlock $existingBlock = null): array
    {
        if (! in_array($data['type'], ['image', 'file', 'pdf'], true)) {
            if ($existingBlock && in_array($existingBlock->type, ['image', 'file', 'pdf'], true)) {
                $this->deleteBlockUpload($existingBlock);
            }

            return $data;
        }

        if (! $request->hasFile('material_file')) {
            if ($existingBlock && $existingBlock->type === $data['type'] && filled($existingBlock->content)) {
                return $data;
            }

            throw ValidationException::withMessages([
                'material_file' => match ($data['type']) {
                    'image' => 'Upload gambar wajib diisi.',
                    'pdf' => 'Upload PDF materi wajib diisi.',
                    default => 'Upload file materi wajib diisi.',
                },
            ]);
        }

        $file = $request->file('material_file');

        if ($data['type'] === 'image' && ! str_starts_with((string) $file->getMimeType(), 'image/')) {
            throw ValidationException::withMessages([
                'material_file' => 'File gambar harus berformat JPG, PNG, WEBP, SVG, atau format image valid.',
            ]);
        }

        if ($data['type'] === 'pdf' && $file->getMimeType() !== 'application/pdf') {
            throw ValidationException::withMessages([
                'material_file' => 'File materi harus berformat PDF.',
            ]);
        }

        $course = $lesson->chapter->course;
        $directory = "course-materials/{$course->id}/{$lesson->id}/".match ($data['type']) {
            'image' => 'images',
            'pdf' => 'pdf',
            default => 'files',
        };
        $path = $file->store($directory, 'public');

        $this->deleteBlockUpload($existingBlock);

        $upload = MediaUpload::create([
            'user_id' => $request->user()->id,
            'mediable_type' => Lesson::class,
            'mediable_id' => $lesson->id,
            'disk' => 'public',
            'path' => $path,
            'original_name' => $file->getClientOriginalName(),
            'mime_type' => $file->getMimeType(),
            'size' => $file->getSize(),
            'conversion_status' => $data['status'],
        ]);

        $data['content'] = $data['type'] === 'image' ? $path : $file->getClientOriginalName();
        $data['metadata'] = [
            ...$data['metadata'],
            'source' => 'block_upload',
            'media_upload_id' => $upload->id,
            'storage_path' => $path,
            'original_name' => $file->getClientOriginalName(),
            'mime_type' => $file->getMimeType(),
            'size' => $file->getSize(),
        ];

        return $data;
    }

    private function metadataArray(mixed $metadata): array
    {
        if (is_array($metadata)) {
            return $metadata;
        }

        if (! filled($metadata)) {
            return [];
        }

        $decoded = json_decode((string) $metadata, true);

        return is_array($decoded) ? $decoded : [];
    }

    private function requiresContent(string $type, ?string $content, array $metadata): bool
    {
        if (in_array($type, ['submission', 'interactive'], true)) {
            return false;
        }

        if ($type === 'checklist') {
            return collect($metadata['items'] ?? [])
                ->map(fn ($item) => trim((string) $item))
                ->filter()
                ->isEmpty();
        }

        return blank($content);
    }

    private function interactiveBlockSummary(array $metadata): string
    {
        $scenes = collect($metadata['scenes'] ?? []);
        $sceneCount = $scenes->count();
        $requiredCount = collect($metadata['completion_rules']['required_element_ids'] ?? [])->count();
        $firstTitle = (string) ($scenes->first()['title'] ?? 'Interactive lesson');

        return "{$firstTitle} · {$sceneCount} scene · {$requiredCount} interaksi wajib";
    }

    private function quizData(Request $request): array
    {
        $data = $request->validate([
            'lesson_id' => ['nullable', 'exists:lessons,id'],
            'title' => ['required', 'string', 'max:255'],
            'order_no' => ['required', 'integer', 'min:0'],
            'passing_score' => ['required', 'integer', 'between:1,100'],
            'time_limit_mode' => ['nullable', Rule::in(['none', 'total', 'per_question'])],
            'time_limit_seconds' => ['nullable', 'integer', 'min:15', 'max:14400'],
            'is_final_exam' => ['required', 'boolean'],
            'questions' => ['required', 'json'],
        ]);

        $questions = json_decode($data['questions'], true);
        if (! is_array($questions) || count($questions) === 0) {
            throw ValidationException::withMessages([
                'questions' => 'Kuis harus memiliki pertanyaan.',
            ]);
        }

        foreach ($questions as $question) {
            if (! is_array($question) || blank($question['question'] ?? null) || ! array_key_exists('answer', $question)) {
                throw ValidationException::withMessages([
                    'questions' => 'Setiap pertanyaan wajib memiliki teks question dan answer.',
                ]);
            }
        }

        if (filled($data['lesson_id'] ?? null)) {
            $lessonMatchesCourse = Lesson::query()
                ->whereKey($data['lesson_id'])
                ->whereHas('chapter', fn ($query) => $query->where('course_id', $request->route('course')?->id ?? $request->route('quiz')?->course_id))
                ->exists();

            if (! $lessonMatchesCourse) {
                throw ValidationException::withMessages([
                    'lesson_id' => 'Lesson tidak termasuk dalam kursus.',
                ]);
            }
        }

        $questions = Quiz::normalizeQuestions($questions);

        if ($questions === []) {
            throw ValidationException::withMessages([
                'questions' => 'Kuis harus memiliki minimal satu pertanyaan yang lengkap.',
            ]);
        }

        $data['questions'] = $questions;
        $data['time_limit_mode'] = $data['time_limit_mode'] ?? 'none';

        if ($data['time_limit_mode'] === 'none') {
            $data['time_limit_seconds'] = null;
        } elseif (blank($data['time_limit_seconds'] ?? null)) {
            throw ValidationException::withMessages([
                'time_limit_seconds' => 'Durasi wajib diisi saat batas waktu quiz aktif.',
            ]);
        } else {
            $data['time_limit_seconds'] = (int) $data['time_limit_seconds'];
        }

        return $data;
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

    private function managementRoutePrefix(Request $request): string
    {
        return $request->user()?->role === 'internal_instructor' ? 'instructor' : 'admin';
    }

    private function syncConversionStatus(mixed $mediaUploadId): void
    {
        if (! $mediaUploadId) {
            return;
        }

        $upload = MediaUpload::find($mediaUploadId);
        if (! $upload) {
            return;
        }

        $statuses = ContentBlock::query()
            ->where('metadata->media_upload_id', (int) $mediaUploadId)
            ->pluck('status');

        if ($statuses->isEmpty()) {
            Storage::disk($upload->disk)->delete($upload->path);
            $upload->delete();

            return;
        }

        $status = $statuses->contains('draft')
            ? 'draft'
            : ($statuses->contains('reviewed') ? 'reviewed' : 'published');

        $upload->update(['conversion_status' => $status]);
    }

    private function deleteBlockUpload(?ContentBlock $block): void
    {
        if (! $block) {
            return;
        }

        $metadata = $block->metadata ?? [];

        if (($metadata['source'] ?? null) !== 'block_upload') {
            return;
        }

        $mediaUploadId = $metadata['media_upload_id'] ?? null;
        $upload = $mediaUploadId ? MediaUpload::find($mediaUploadId) : null;

        if ($upload) {
            Storage::disk($upload->disk)->delete($upload->path);
            $upload->delete();

            return;
        }

        if (filled($metadata['storage_path'] ?? null)) {
            Storage::disk('public')->delete($metadata['storage_path']);
        }
    }

    private function deleteLessonUploads($lessonIds): void
    {
        MediaUpload::query()
            ->where('mediable_type', Lesson::class)
            ->whereIn('mediable_id', $lessonIds)
            ->get()
            ->each(function (MediaUpload $upload) {
                Storage::disk($upload->disk)->delete($upload->path);
                $upload->delete();
            });
    }
}
