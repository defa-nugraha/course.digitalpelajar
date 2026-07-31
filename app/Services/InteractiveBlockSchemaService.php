<?php

namespace App\Services;

use App\Models\InteractiveBlockProgress;
use App\Models\Lesson;
use App\Models\MediaUpload;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class InteractiveBlockSchemaService
{
    public const SCHEMA_VERSION = 1;

    /**
     * Normalize and validate an interactive block metadata payload.
     *
     * The Course Builder UI sends structured form fields, not raw JSON. This
     * method still treats the payload as untrusted and rewrites it to the only
     * schema version the player accepts.
     */
    public function normalize(array $metadata, ?Lesson $lesson = null): array
    {
        $rawScenes = collect($metadata['scenes'] ?? [])
            ->filter(fn ($scene) => is_array($scene))
            ->values();

        if ($rawScenes->isEmpty()) {
            throw ValidationException::withMessages([
                'metadata' => 'Interactive block harus memiliki minimal satu scene.',
            ]);
        }

        $scenes = $rawScenes
            ->map(fn (array $scene, int $index) => $this->normalizeScene($scene, $index))
            ->values()
            ->all();

        $sceneIds = collect($scenes)->pluck('id');
        if ($sceneIds->duplicates()->isNotEmpty()) {
            throw ValidationException::withMessages([
                'metadata' => 'ID scene interactive tidak boleh duplikat.',
            ]);
        }

        $elementIds = collect($scenes)
            ->flatMap(fn (array $scene) => collect($scene['hotspots'])->pluck('id')->merge(collect($scene['buttons'])->pluck('id')));

        if ($elementIds->duplicates()->isNotEmpty()) {
            throw ValidationException::withMessages([
                'metadata' => 'ID hotspot atau tombol interactive tidak boleh duplikat.',
            ]);
        }

        $normalized = [
            'schema_version' => self::SCHEMA_VERSION,
            'settings' => [
                'navigation' => 'sequential',
                'show_progress' => true,
                'allow_scene_back' => true,
            ],
            'scenes' => $scenes,
        ];

        $normalized['completion_rules'] = [
            'require_last_scene' => true,
            'required_element_ids' => $this->requiredElementIds($normalized),
        ];

        $this->assertMediaUploadsBelongToLesson($normalized, $lesson);

        return $normalized;
    }

    public function enrichMediaUrls(array $metadata): array
    {
        $mediaIds = $this->mediaUploadIds($metadata);
        if ($mediaIds === []) {
            return $metadata;
        }

        $uploads = MediaUpload::query()
            ->whereIn('id', $mediaIds)
            ->get()
            ->keyBy('id');

        $metadata['scenes'] = collect($metadata['scenes'] ?? [])
            ->map(function ($scene) use ($uploads) {
                if (! is_array($scene)) {
                    return $scene;
                }

                if (isset($scene['background']) && is_array($scene['background'])) {
                    $scene['background'] = $this->withMediaPayload($scene['background'], $uploads);
                }

                if (isset($scene['narration']) && is_array($scene['narration'])) {
                    $scene['narration'] = $this->withMediaPayload($scene['narration'], $uploads);
                }

                return $scene;
            })
            ->values()
            ->all();

        return $metadata;
    }

    public function mediaUploadIds(array $metadata): array
    {
        return collect($metadata['scenes'] ?? [])
            ->filter(fn ($scene) => is_array($scene))
            ->flatMap(function (array $scene) {
                return [
                    $scene['background']['media_upload_id'] ?? null,
                    $scene['narration']['media_upload_id'] ?? null,
                ];
            })
            ->filter(fn ($id) => filled($id))
            ->map(fn ($id) => (int) $id)
            ->unique()
            ->values()
            ->all();
    }

    public function requiredElementIds(array $metadata, ?string $sceneId = null): array
    {
        return collect($metadata['scenes'] ?? [])
            ->filter(fn ($scene) => is_array($scene) && ($sceneId === null || ($scene['id'] ?? null) === $sceneId))
            ->flatMap(fn (array $scene) => collect($scene['hotspots'] ?? [])
                ->merge($scene['buttons'] ?? [])
                ->filter(fn ($element) => is_array($element) && (bool) ($element['required'] ?? false))
                ->pluck('id'))
            ->filter()
            ->map(fn ($id) => (string) $id)
            ->unique()
            ->values()
            ->all();
    }

    public function allElementIds(array $metadata): array
    {
        return collect($metadata['scenes'] ?? [])
            ->filter(fn ($scene) => is_array($scene))
            ->flatMap(fn (array $scene) => collect($scene['hotspots'] ?? [])
                ->merge($scene['buttons'] ?? [])
                ->pluck('id'))
            ->filter()
            ->map(fn ($id) => (string) $id)
            ->unique()
            ->values()
            ->all();
    }

    public function elementSceneIndexMap(array $metadata): array
    {
        return collect($metadata['scenes'] ?? [])
            ->filter(fn ($scene) => is_array($scene))
            ->values()
            ->flatMap(function (array $scene, int $sceneIndex) {
                return collect($scene['hotspots'] ?? [])
                    ->merge($scene['buttons'] ?? [])
                    ->filter(fn ($element) => is_array($element) && filled($element['id'] ?? null))
                    ->mapWithKeys(fn (array $element) => [(string) $element['id'] => $sceneIndex]);
            })
            ->all();
    }

    public function sceneIds(array $metadata): array
    {
        return collect($metadata['scenes'] ?? [])
            ->filter(fn ($scene) => is_array($scene))
            ->pluck('id')
            ->filter()
            ->map(fn ($id) => (string) $id)
            ->values()
            ->all();
    }

    public function sceneCount(array $metadata): int
    {
        return collect($metadata['scenes'] ?? [])
            ->filter(fn ($scene) => is_array($scene))
            ->count();
    }

    public function isComplete(array $metadata, ?InteractiveBlockProgress $progress): bool
    {
        if (! $progress) {
            return false;
        }

        $lastSceneIndex = max(0, $this->sceneCount($metadata) - 1);
        if ($progress->current_scene_index < $lastSceneIndex) {
            return false;
        }

        $completed = collect($progress->completed_element_ids ?? [])
            ->map(fn ($id) => (string) $id)
            ->unique();

        return collect($this->requiredElementIds($metadata))
            ->every(fn (string $requiredId) => $completed->contains($requiredId));
    }

    private function normalizeScene(array $scene, int $index): array
    {
        $title = $this->sanitizeText($scene['title'] ?? '');
        $text = $this->sanitizeLongText($scene['text'] ?? '');
        $background = $this->normalizeMedia($scene['background'] ?? null, ['image', 'video']);
        $narration = $this->normalizeMedia($scene['narration'] ?? null, ['audio']);
        $hotspots = collect($scene['hotspots'] ?? [])
            ->filter(fn ($hotspot) => is_array($hotspot))
            ->map(fn (array $hotspot) => $this->normalizeHotspot($hotspot))
            ->values()
            ->all();
        $buttons = collect($scene['buttons'] ?? [])
            ->filter(fn ($button) => is_array($button))
            ->map(fn (array $button) => $this->normalizeButton($button))
            ->values()
            ->all();

        if (blank($title)) {
            throw ValidationException::withMessages([
                'metadata' => 'Setiap scene interactive wajib memiliki judul.',
            ]);
        }

        if (blank($text) && ! $background && ! $narration && $hotspots === [] && $buttons === []) {
            throw ValidationException::withMessages([
                'metadata' => 'Scene interactive harus memiliki teks, media, hotspot, audio, atau tombol.',
            ]);
        }

        return [
            'id' => $this->stableId($scene['id'] ?? null, 'scene'),
            'title' => Str::limit($title, 160, ''),
            'order' => $index + 1,
            'text' => $text,
            'background' => $background,
            'narration' => $narration,
            'hotspots' => $hotspots,
            'buttons' => $buttons,
        ];
    }

    private function normalizeHotspot(array $hotspot): array
    {
        $label = $this->sanitizeText($hotspot['label'] ?? '');
        $explanation = $this->sanitizeLongText($hotspot['explanation'] ?? '');

        if (blank($label)) {
            throw ValidationException::withMessages([
                'metadata' => 'Setiap hotspot wajib memiliki judul.',
            ]);
        }

        if (blank($explanation)) {
            throw ValidationException::withMessages([
                'metadata' => 'Setiap hotspot wajib memiliki penjelasan.',
            ]);
        }

        return [
            'id' => $this->stableId($hotspot['id'] ?? null, 'hotspot'),
            'type' => 'hotspot',
            'label' => Str::limit($label, 120, ''),
            'explanation' => $explanation,
            'required' => (bool) ($hotspot['required'] ?? false),
            'position' => $this->normalizePosition($hotspot['position'] ?? []),
        ];
    }

    private function normalizeButton(array $button): array
    {
        $label = $this->sanitizeText($button['label'] ?? '');
        $explanation = $this->sanitizeLongText($button['explanation'] ?? '');
        $action = in_array(($button['action'] ?? 'show_explanation'), ['show_explanation', 'next_scene'], true)
            ? $button['action']
            : 'show_explanation';

        if (blank($label)) {
            throw ValidationException::withMessages([
                'metadata' => 'Setiap tombol interactive wajib memiliki label.',
            ]);
        }

        if ($action === 'show_explanation' && blank($explanation)) {
            throw ValidationException::withMessages([
                'metadata' => 'Tombol dengan aksi penjelasan wajib memiliki isi penjelasan.',
            ]);
        }

        return [
            'id' => $this->stableId($button['id'] ?? null, 'button'),
            'type' => 'button',
            'label' => Str::limit($label, 120, ''),
            'explanation' => $explanation,
            'required' => (bool) ($button['required'] ?? false),
            'action' => $action,
        ];
    }

    /**
     * @param  array<int, string>  $allowedTypes
     */
    private function normalizeMedia(mixed $media, array $allowedTypes): ?array
    {
        if (! is_array($media) || blank($media['media_upload_id'] ?? null)) {
            return null;
        }

        $type = (string) ($media['type'] ?? '');
        if (! in_array($type, $allowedTypes, true)) {
            throw ValidationException::withMessages([
                'metadata' => 'Tipe media interactive tidak valid.',
            ]);
        }

        return [
            'type' => $type,
            'media_upload_id' => (int) $media['media_upload_id'],
            'alt' => Str::limit($this->sanitizeText($media['alt'] ?? ''), 160, ''),
        ];
    }

    private function normalizePosition(mixed $position): array
    {
        $position = is_array($position) ? $position : [];
        $x = $this->percent($position['x'] ?? 45);
        $y = $this->percent($position['y'] ?? 45);
        $width = max(4, min(40, $this->percent($position['width'] ?? 10)));
        $height = max(4, min(40, $this->percent($position['height'] ?? 10)));

        if ($x + $width > 100) {
            $x = max(0, 100 - $width);
        }

        if ($y + $height > 100) {
            $y = max(0, 100 - $height);
        }

        return compact('x', 'y', 'width', 'height');
    }

    private function assertMediaUploadsBelongToLesson(array $metadata, ?Lesson $lesson): void
    {
        $mediaIds = $this->mediaUploadIds($metadata);
        if ($mediaIds === []) {
            return;
        }

        $query = MediaUpload::query()->whereIn('id', $mediaIds);
        if ($lesson) {
            $query
                ->where('mediable_type', Lesson::class)
                ->where('mediable_id', $lesson->id);
        }

        $found = $query->pluck('id')->map(fn ($id) => (int) $id)->all();
        $missing = array_values(array_diff($mediaIds, $found));

        if ($missing !== []) {
            throw ValidationException::withMessages([
                'metadata' => 'Media interactive tidak valid atau tidak termasuk lesson ini.',
            ]);
        }
    }

    /**
     * @param  Collection<int, MediaUpload>  $uploads
     */
    private function withMediaPayload(array $media, Collection $uploads): array
    {
        $upload = $uploads[(int) ($media['media_upload_id'] ?? 0)] ?? null;
        if (! $upload) {
            return $media;
        }

        return [
            ...$media,
            'url' => Storage::disk($upload->disk)->url($upload->path),
            'original_name' => $upload->original_name,
            'mime_type' => $upload->mime_type,
            'size' => $upload->size,
        ];
    }

    private function stableId(mixed $value, string $prefix): string
    {
        $id = trim((string) $value);

        return $id !== '' ? Str::limit($id, 80, '') : $prefix.'-'.(string) Str::uuid();
    }

    private function sanitizeText(mixed $value): string
    {
        return trim(preg_replace('/\s+/', ' ', strip_tags((string) $value)) ?? '');
    }

    private function sanitizeLongText(mixed $value): string
    {
        return trim(str_replace(["\r\n", "\r"], "\n", strip_tags((string) $value)));
    }

    private function percent(mixed $value): float
    {
        $number = is_numeric($value) ? (float) $value : 0.0;

        return round(max(0, min(100, $number)), 2);
    }
}
