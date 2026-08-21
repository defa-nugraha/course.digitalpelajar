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
            ->flatMap(fn (array $scene) => collect($scene['hotspots'])
                ->pluck('id')
                ->merge(collect($scene['buttons'])->pluck('id'))
                ->merge(collect($scene['assets'])->pluck('id')));

        if ($elementIds->duplicates()->isNotEmpty()) {
            throw ValidationException::withMessages([
                'metadata' => 'ID hotspot atau tombol interactive tidak boleh duplikat.',
            ]);
        }

        $normalized = [
            'schema_version' => self::SCHEMA_VERSION,
            'canvas' => $this->normalizeCanvas($metadata['canvas'] ?? null),
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

        $this->assertButtonTargetsExist($normalized);
        $this->assertMediaUploadsBelongToLesson($normalized, $lesson);

        return $normalized;
    }

    public function assertPublishable(array $metadata): void
    {
        $missingLabels = collect($metadata['scenes'] ?? [])
            ->filter(fn ($scene) => is_array($scene))
            ->flatMap(function (array $scene) {
                $missing = [];

                if (isset($scene['background']) && is_array($scene['background']) && in_array(($scene['background']['type'] ?? null), ['image', 'video'], true) && blank($scene['background']['media_upload_id'] ?? null)) {
                    $missing[] = ($scene['title'] ?? 'Scene').' background';
                }

                if (isset($scene['narration']) && is_array($scene['narration']) && ($scene['narration']['type'] ?? null) === 'audio' && blank($scene['narration']['media_upload_id'] ?? null)) {
                    $missing[] = ($scene['title'] ?? 'Scene').' narasi';
                }

                foreach (($scene['assets'] ?? []) as $asset) {
                    if (
                        is_array($asset)
                        && ! ($asset['hidden'] ?? false)
                        && in_array(($asset['type'] ?? null), ['image', 'video', 'audio'], true)
                        && blank($asset['media']['media_upload_id'] ?? null)
                    ) {
                        $missing[] = $asset['label'] ?? $asset['id'] ?? 'Media';
                    }
                }

                return $missing;
            })
            ->values()
            ->all();

        if ($missingLabels !== []) {
            throw ValidationException::withMessages([
                'metadata' => 'Lengkapi media sebelum publish: '.implode(', ', $missingLabels).'.',
            ]);
        }
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

                $scene['assets'] = collect($scene['assets'] ?? [])
                    ->map(function ($asset) use ($uploads) {
                        if (! is_array($asset)) {
                            return $asset;
                        }

                        if (isset($asset['media']) && is_array($asset['media'])) {
                            $asset['media'] = $this->withMediaPayload($asset['media'], $uploads);
                        }

                        return $asset;
                    })
                    ->values()
                    ->all();

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
                    ($scene['narration']['type'] ?? null) === 'audio' ? ($scene['narration']['media_upload_id'] ?? null) : null,
                    ...collect($scene['assets'] ?? [])
                        ->filter(fn ($asset) => is_array($asset))
                        ->map(fn (array $asset) => $asset['media']['media_upload_id'] ?? null)
                        ->all(),
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
                ->filter(fn ($element) => is_array($element) && (bool) ($element['required'] ?? false) && ! (bool) ($element['hidden'] ?? false))
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
        $narration = $this->normalizeNarration($scene['narration'] ?? null);
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
        $assets = collect($scene['assets'] ?? [])
            ->filter(fn ($asset) => is_array($asset))
            ->map(fn (array $asset) => $this->normalizeAsset($asset))
            ->values()
            ->all();

        if (blank($title)) {
            throw ValidationException::withMessages([
                'metadata' => 'Setiap scene interactive wajib memiliki judul.',
            ]);
        }

        if (blank($text) && ! $background && ! $narration && $hotspots === [] && $buttons === [] && $assets === []) {
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
            'assets' => $assets,
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
            ...$this->normalizeElementState($hotspot),
        ];
    }

    private function normalizeButton(array $button): array
    {
        $label = $this->sanitizeText($button['label'] ?? '');
        $explanation = $this->sanitizeLongText($button['explanation'] ?? '');
        $action = in_array(($button['action'] ?? 'show_explanation'), ['show_explanation', 'next_scene', 'go_to_scene'], true)
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
            'target_scene_id' => filled($button['target_scene_id'] ?? null)
                ? Str::limit($this->sanitizeText($button['target_scene_id']), 80, '')
                : null,
            'position' => $this->normalizePosition($button['position'] ?? ['x' => 58, 'y' => 76, 'width' => 22, 'height' => 10]),
            ...$this->normalizeElementState($button),
        ];
    }

    private function normalizeAsset(array $asset): array
    {
        $type = in_array(($asset['type'] ?? 'shape'), ['shape', 'icon', 'text', 'image', 'video', 'audio'], true)
            ? (string) $asset['type']
            : 'shape';
        $label = Str::limit($this->sanitizeText($asset['label'] ?? 'Asset'), 120, '');
        $content = Str::limit($this->sanitizeLongText($asset['content'] ?? ''), 1000, '');
        $media = match ($type) {
            'image' => $this->normalizeMedia($asset['media'] ?? null, ['image']),
            'video' => $this->normalizeMedia($asset['media'] ?? null, ['video']),
            'audio' => $this->normalizeMedia($asset['media'] ?? null, ['audio']),
            default => null,
        };
        $style = is_array($asset['style'] ?? null) ? $asset['style'] : [];

        if ($type === 'text' && blank($content)) {
            throw ValidationException::withMessages([
                'metadata' => 'Asset teks interactive wajib memiliki isi teks.',
            ]);
        }

        return [
            'id' => $this->stableId($asset['id'] ?? null, 'asset'),
            'type' => $type,
            'label' => $label ?: 'Asset',
            'content' => $content,
            'position' => $this->normalizePosition($asset['position'] ?? ['x' => 12, 'y' => 12, 'width' => 18, 'height' => 14]),
            'style' => [
                'shape' => $this->sanitizeToken($style['shape'] ?? 'rounded-rectangle', 'rounded-rectangle'),
                'icon' => $this->sanitizeToken($style['icon'] ?? 'Lightbulb', 'Lightbulb'),
                'color' => $this->sanitizeCssColor($style['color'] ?? '#1d4ed8', '#1d4ed8'),
                'backgroundColor' => $this->sanitizeCssColor($style['backgroundColor'] ?? '#dbeafe', '#dbeafe'),
                'borderColor' => $this->sanitizeCssColor($style['borderColor'] ?? '#dbeafe', '#dbeafe'),
                'fontSize' => max(8, min(96, (int) ($style['fontSize'] ?? 16))),
                'fontWeight' => in_array(($style['fontWeight'] ?? '700'), ['400', '500', '600', '700', '800'], true) ? (string) ($style['fontWeight'] ?? '700') : '700',
                'textAlign' => in_array(($style['textAlign'] ?? 'center'), ['left', 'center', 'right'], true) ? (string) ($style['textAlign'] ?? 'center') : 'center',
                'lineHeight' => max(1, min(2.2, (float) ($style['lineHeight'] ?? 1.25))),
                'borderWidth' => max(0, min(12, (int) ($style['borderWidth'] ?? 0))),
                'borderRadius' => max(0, min(80, (int) ($style['borderRadius'] ?? 12))),
                'objectFit' => in_array(($style['objectFit'] ?? 'contain'), ['contain', 'cover', 'fill'], true) ? (string) ($style['objectFit'] ?? 'contain') : 'contain',
            ],
            'media' => $media,
            ...$this->normalizeElementState($asset),
        ];
    }

    private function normalizeCanvas(mixed $canvas): array
    {
        $canvas = is_array($canvas) ? $canvas : [];
        $width = max(640, min(3840, (int) ($canvas['width'] ?? 1280)));
        $height = max(360, min(2160, (int) ($canvas['height'] ?? 720)));

        return [
            'width' => $width,
            'height' => $height,
            'aspect_ratio' => Str::limit($this->sanitizeText($canvas['aspect_ratio'] ?? '16:9'), 20, ''),
            'background_color' => $this->sanitizeCssColor($canvas['background_color'] ?? '#f8fafc', '#f8fafc'),
        ];
    }

    private function normalizeElementState(array $element): array
    {
        return [
            'rotation' => max(-180, min(180, (float) ($element['rotation'] ?? 0))),
            'opacity' => max(0.1, min(1, (float) ($element['opacity'] ?? 1))),
            'layer_order' => max(0, min(9999, (int) ($element['layer_order'] ?? 0))),
            'locked' => (bool) ($element['locked'] ?? false),
            'hidden' => (bool) ($element['hidden'] ?? false),
        ];
    }

    private function normalizeNarration(mixed $narration): ?array
    {
        if (! is_array($narration)) {
            return null;
        }

        if (($narration['type'] ?? null) === 'tts') {
            $text = Str::limit($this->sanitizeLongText($narration['text'] ?? ''), 3000, '');

            if (blank($text)) {
                throw ValidationException::withMessages([
                    'metadata' => 'Teks narator wajib diisi jika mode text-to-speech digunakan.',
                ]);
            }

            return [
                'type' => 'tts',
                'text' => $text,
                'lang' => Str::limit($this->sanitizeText($narration['lang'] ?? 'id-ID'), 20, ''),
                'voice_name' => Str::limit($this->sanitizeText($narration['voice_name'] ?? ''), 160, ''),
                'rate' => max(0.6, min(1.4, (float) ($narration['rate'] ?? 1))),
                'pitch' => max(0.6, min(1.4, (float) ($narration['pitch'] ?? 1))),
            ];
        }

        return $this->normalizeMedia($narration, ['audio']);
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
        $width = max(2, min(100, $this->percent($position['width'] ?? 10)));
        $height = max(2, min(100, $this->percent($position['height'] ?? 10)));

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

    private function assertButtonTargetsExist(array $metadata): void
    {
        $sceneIds = collect($metadata['scenes'] ?? [])->pluck('id')->filter()->values();
        $invalidTarget = collect($metadata['scenes'] ?? [])
            ->filter(fn ($scene) => is_array($scene))
            ->flatMap(fn (array $scene) => collect($scene['buttons'] ?? []))
            ->first(fn ($button) => is_array($button)
                && ($button['action'] ?? null) === 'go_to_scene'
                && ! $sceneIds->contains($button['target_scene_id'] ?? null));

        if ($invalidTarget) {
            throw ValidationException::withMessages([
                'metadata' => 'Target scene pada tombol interactive tidak valid.',
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

    private function sanitizeCssColor(mixed $value, string $fallback): string
    {
        $color = trim((string) $value);

        return preg_match('/^#[0-9a-fA-F]{6}$/', $color) ? strtolower($color) : $fallback;
    }

    private function sanitizeToken(mixed $value, string $fallback): string
    {
        $token = trim((string) $value);

        return preg_match('/^[A-Za-z0-9_-]{1,80}$/', $token) ? $token : $fallback;
    }
}
