<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\HomePageSection;
use App\Services\AuditLogger;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class HomePageSectionController extends Controller
{
    public function store(Request $request): RedirectResponse
    {
        $data = $this->validated($request);
        $data['key'] = $this->uniqueKey($data['name']);
        $data['section_type'] = 'custom';
        $data = $this->withUploadedImage($request, $data);

        $section = HomePageSection::create($data);
        AuditLogger::log('home_page_section.created', $request->user(), $section);

        return back()->with('success', 'Section home berhasil ditambahkan.');
    }

    public function update(Request $request, HomePageSection $homePageSection): RedirectResponse
    {
        $data = $this->validated($request);

        if ($homePageSection->section_type !== 'custom') {
            $data['section_type'] = $homePageSection->section_type;
        }

        $data = $this->withUploadedImage($request, $data, $homePageSection);

        $homePageSection->update($data);
        AuditLogger::log('home_page_section.updated', $request->user(), $homePageSection);

        return back()->with('success', 'Section home berhasil diperbarui.');
    }

    public function destroy(Request $request, HomePageSection $homePageSection): RedirectResponse
    {
        if ($homePageSection->section_type !== 'custom') {
            return back()->with('error', 'Section bawaan tidak dapat dihapus. Nonaktifkan section jika tidak ingin ditampilkan.');
        }

        AuditLogger::log('home_page_section.deleted', $request->user(), $homePageSection, [
            'name' => $homePageSection->name,
        ]);
        $homePageSection->delete();

        return back()->with('success', 'Section custom berhasil dihapus.');
    }

    private function validated(Request $request): array
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'section_type' => ['required', Rule::in(['hero', 'features', 'courses', 'partners', 'benefits', 'custom'])],
            'eyebrow' => ['nullable', 'string', 'max:255'],
            'title' => ['nullable', 'string', 'max:255'],
            'subtitle' => ['nullable', 'string', 'max:1000'],
            'body' => ['nullable', 'string', 'max:5000'],
            'primary_label' => ['nullable', 'string', 'max:100'],
            'primary_url' => ['nullable', 'string', 'max:2048'],
            'secondary_label' => ['nullable', 'string', 'max:100'],
            'secondary_url' => ['nullable', 'string', 'max:2048'],
            'image_url' => ['nullable', 'string', 'max:2048'],
            'image' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:2048'],
            'is_visible' => ['required'],
            'sort_order' => ['required', 'integer', 'min:0', 'max:1000'],
            'items' => ['sometimes', 'array'],
            'items.*.title' => ['nullable', 'string', 'max:255'],
            'items.*.description' => ['nullable', 'string', 'max:1000'],
            'items.*.icon' => ['nullable', 'string', 'max:50'],
            'items.*.tone' => ['nullable', Rule::in(['blue', 'amber', 'purple', 'slate'])],
            'items.*.featured' => ['sometimes', 'boolean'],
            'metadata' => ['sometimes', 'array'],
            'metadata.highlight_word' => ['nullable', 'string', 'max:100'],
            'metadata.floating_label' => ['nullable', 'string', 'max:100'],
            'metadata.trust_prefix' => ['nullable', 'string', 'max:100'],
            'metadata.trust_suffix' => ['nullable', 'string', 'max:100'],
            'metadata.limit' => ['nullable', 'integer', 'min:1', 'max:12'],
            'metadata.badges' => ['sometimes', 'array'],
            'metadata.badges.*.label' => ['nullable', 'string', 'max:100'],
            'metadata.badges.*.icon' => ['nullable', 'string', 'max:50'],
        ]);
        $data['is_visible'] = filter_var($data['is_visible'], FILTER_VALIDATE_BOOL);

        foreach ([
            'eyebrow',
            'title',
            'subtitle',
            'body',
            'primary_label',
            'primary_url',
            'secondary_label',
            'secondary_url',
        ] as $field) {
            $data[$field] = filled($data[$field] ?? null) ? $data[$field] : null;
        }
        $data['image_url'] = $this->normalizePublicImagePath($data['image_url'] ?? null);

        $data['items'] = collect($data['items'] ?? [])
            ->filter(fn (array $item) => filled($item['title'] ?? null) || filled($item['description'] ?? null))
            ->map(fn (array $item) => [
                'title' => $item['title'] ?? '',
                'description' => $item['description'] ?? '',
                'icon' => $item['icon'] ?? 'route',
                'tone' => $item['tone'] ?? 'blue',
                'featured' => filter_var($item['featured'] ?? false, FILTER_VALIDATE_BOOL),
            ])
            ->values()
            ->all();

        $metadata = $data['metadata'] ?? [];
        $metadata['badges'] = collect($metadata['badges'] ?? [])
            ->filter(fn (array $badge) => filled($badge['label'] ?? null))
            ->map(fn (array $badge) => [
                'label' => $badge['label'],
                'icon' => $badge['icon'] ?? 'badge',
            ])
            ->values()
            ->all();
        $data['metadata'] = $metadata;

        return $data;
    }

    private function withUploadedImage(Request $request, array $data, ?HomePageSection $section = null): array
    {
        if ($request->hasFile('image')) {
            $path = $request->file('image')->store('home-page', 'public');

            $this->deletePreviousPublicImage($section?->image_url);

            $data['image_url'] = $path;
        }

        unset($data['image']);

        return $data;
    }

    private function deletePreviousPublicImage(?string $imagePath): void
    {
        if (! filled($imagePath)) {
            return;
        }

        $path = str_contains($imagePath, '/storage/')
            ? Str::after($imagePath, '/storage/')
            : ltrim($imagePath, '/');

        if (str_starts_with($path, 'storage/')) {
            $path = Str::after($path, 'storage/');
        }

        if ($path && str_starts_with($path, 'home-page/')) {
            Storage::disk('public')->delete($path);
        }
    }

    private function normalizePublicImagePath(?string $imagePath): ?string
    {
        if (! filled($imagePath)) {
            return null;
        }

        $path = trim($imagePath);

        if (str_contains($path, '/storage/')) {
            return Str::after($path, '/storage/');
        }

        if (str_starts_with($path, 'storage/')) {
            return Str::after($path, 'storage/');
        }

        return $path;
    }

    private function uniqueKey(string $name): string
    {
        $base = Str::slug($name) ?: 'section-home';
        $key = $base;
        $counter = 2;

        while (HomePageSection::query()->where('key', $key)->exists()) {
            $key = $base.'-'.$counter;
            $counter++;
        }

        return $key;
    }
}
