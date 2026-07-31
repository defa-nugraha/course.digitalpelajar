<?php

namespace App\Services;

use App\Models\ContentBlock;
use App\Models\Enrollment;
use App\Models\InteractiveBlockProgress;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class InteractiveProgressService
{
    public function __construct(private readonly InteractiveBlockSchemaService $schema) {}

    /**
     * Persist interactive progress. The frontend may report scene and clicked
     * element IDs, but completion is always recomputed on the server.
     *
     * @param  array{
     *     scene_id?: string|null,
     *     scene_index?: int|string|null,
     *     completed_element_ids?: array<int, string>|null,
     *     video_timestamp_seconds?: int|string|null,
     *     video_watched_percent?: int|string|null
     * }  $data
     */
    public function update(User $user, ContentBlock $contentBlock, array $data): InteractiveBlockProgress
    {
        $contentBlock->loadMissing('lesson.chapter.course');
        $lesson = $contentBlock->lesson;
        $course = $lesson->chapter->course;

        abort_unless($contentBlock->type === 'interactive' && $contentBlock->status === 'published', 404);

        $enrollment = Enrollment::query()
            ->where('user_id', $user->id)
            ->where('course_id', $course->id)
            ->whereIn('status', ['active', 'completed'])
            ->firstOrFail();

        $metadata = $contentBlock->metadata ?? [];
        $sceneIds = $this->schema->sceneIds($metadata);
        $sceneCount = count($sceneIds);

        if ($sceneCount === 0) {
            throw ValidationException::withMessages([
                'interactive' => 'Interactive block belum memiliki scene valid.',
            ]);
        }

        $requestedIndex = (int) ($data['scene_index'] ?? 0);
        $requestedIndex = max(0, min($requestedIndex, $sceneCount - 1));
        $requestedSceneId = (string) ($data['scene_id'] ?? ($sceneIds[$requestedIndex] ?? ''));

        if (($sceneIds[$requestedIndex] ?? null) !== $requestedSceneId) {
            throw ValidationException::withMessages([
                'scene_id' => 'Scene interactive tidak valid.',
            ]);
        }

        return DB::transaction(function () use ($user, $contentBlock, $data, $lesson, $course, $enrollment, $metadata, $sceneIds, $requestedIndex, $requestedSceneId) {
            $progress = InteractiveBlockProgress::query()
                ->where('user_id', $user->id)
                ->where('content_block_id', $contentBlock->id)
                ->lockForUpdate()
                ->first();

            $currentIndex = $progress?->current_scene_index ?? 0;
            if ($requestedIndex > $currentIndex + 1) {
                throw ValidationException::withMessages([
                    'scene_index' => 'Scene hanya dapat dilanjutkan secara berurutan.',
                ]);
            }

            $completedIds = $this->mergeCompletedElementIds($metadata, $progress, $data['completed_element_ids'] ?? [], $currentIndex);
            $this->assertRequiredElementsBeforeAdvance($metadata, $completedIds, $currentIndex, $requestedIndex);

            $progress ??= new InteractiveBlockProgress([
                'user_id' => $user->id,
                'content_block_id' => $contentBlock->id,
                'started_at' => now(),
            ]);

            $nextSceneIndex = max($currentIndex, $requestedIndex);

            $progress->fill([
                'enrollment_id' => $enrollment->id,
                'course_id' => $course->id,
                'lesson_id' => $lesson->id,
                'current_scene_id' => $sceneIds[$nextSceneIndex] ?? $requestedSceneId,
                'current_scene_index' => $nextSceneIndex,
                'video_timestamp_seconds' => max(0, (int) ($data['video_timestamp_seconds'] ?? $progress->video_timestamp_seconds ?? 0)),
                'video_watched_percent' => max(0, min(100, (int) ($data['video_watched_percent'] ?? $progress->video_watched_percent ?? 0))),
                'completed_element_ids' => $completedIds,
                'last_accessed_at' => now(),
            ]);

            $progress->status = $this->schema->isComplete($metadata, $progress) ? 'completed' : 'in_progress';
            if ($progress->status === 'completed' && ! $progress->completed_at) {
                $progress->completed_at = now();
            }

            $progress->save();

            if ($progress->wasChanged('status') && $progress->status === 'completed') {
                AuditLogger::log('interactive_block.completed', $user, $contentBlock, [
                    'course_id' => $course->id,
                    'lesson_id' => $lesson->id,
                    'enrollment_id' => $enrollment->id,
                ]);
            }

            return $progress->fresh();
        });
    }

    public function progressPayload(?InteractiveBlockProgress $progress, array $metadata): array
    {
        return [
            'currentSceneId' => $progress?->current_scene_id,
            'currentSceneIndex' => $progress?->current_scene_index ?? 0,
            'completedElementIds' => $progress?->completed_element_ids ?? [],
            'videoTimestampSeconds' => $progress?->video_timestamp_seconds ?? 0,
            'videoWatchedPercent' => $progress?->video_watched_percent ?? 0,
            'status' => $progress?->status ?? 'not_started',
            'completedAt' => $progress?->completed_at?->toISOString(),
            'requiredElementIds' => $this->schema->requiredElementIds($metadata),
        ];
    }

    public function assertCompleted(User $user, ContentBlock $contentBlock): void
    {
        $metadata = $contentBlock->metadata ?? [];
        $progress = InteractiveBlockProgress::query()
            ->where('user_id', $user->id)
            ->where('content_block_id', $contentBlock->id)
            ->first();

        if (! $this->schema->isComplete($metadata, $progress)) {
            throw ValidationException::withMessages([
                'lesson' => 'Selesaikan seluruh interaksi wajib pada materi interactive sebelum menandai lesson selesai.',
            ]);
        }
    }

    /**
     * @param  array<int, string>  $reportedIds
     * @return array<int, string>
     */
    private function mergeCompletedElementIds(
        array $metadata,
        ?InteractiveBlockProgress $progress,
        array $reportedIds,
        int $currentSceneIndex,
    ): array {
        $allElementIds = collect($this->schema->allElementIds($metadata));
        $sceneMap = $this->schema->elementSceneIndexMap($metadata);
        $existingIds = collect($progress?->completed_element_ids ?? [])
            ->map(fn ($id) => (string) $id)
            ->filter(fn (string $id) => $allElementIds->contains($id));

        $newIds = collect($reportedIds)
            ->map(fn ($id) => (string) $id)
            ->filter(fn (string $id) => $allElementIds->contains($id))
            ->filter(fn (string $id) => ($sceneMap[$id] ?? PHP_INT_MAX) <= $currentSceneIndex);

        return $existingIds
            ->merge($newIds)
            ->unique()
            ->values()
            ->all();
    }

    /**
     * @param  array<int, string>  $completedIds
     */
    private function assertRequiredElementsBeforeAdvance(array $metadata, array $completedIds, int $currentIndex, int $requestedIndex): void
    {
        if ($requestedIndex <= $currentIndex) {
            return;
        }

        $scenes = collect($metadata['scenes'] ?? [])->values();
        $completed = collect($completedIds);

        for ($sceneIndex = $currentIndex; $sceneIndex < $requestedIndex; $sceneIndex++) {
            $sceneId = (string) ($scenes[$sceneIndex]['id'] ?? '');
            $missingRequired = collect($this->schema->requiredElementIds($metadata, $sceneId))
                ->contains(fn (string $id) => ! $completed->contains($id));

            if ($missingRequired) {
                throw ValidationException::withMessages([
                    'interactive' => 'Selesaikan hotspot atau tombol wajib pada scene ini sebelum lanjut.',
                ]);
            }
        }
    }
}
