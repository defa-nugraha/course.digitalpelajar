<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\SeoSetting;
use App\Services\AuditLogger;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class SeoSettingController extends Controller
{
    public function edit(): Response
    {
        SeoSetting::ensureDefaults();

        $order = array_flip(array_keys(SeoSetting::defaults()));

        return Inertia::render('admin/seo-settings', [
            'settings' => SeoSetting::query()
                ->get()
                ->sortBy(fn (SeoSetting $setting) => $order[$setting->key] ?? 999)
                ->map(fn (SeoSetting $setting) => $setting->toPayload())
                ->values(),
        ]);
    }

    public function update(Request $request, SeoSetting $seoSetting): RedirectResponse
    {
        $data = $request->validate([
            'title' => ['required', 'string', 'max:70'],
            'description' => ['required', 'string', 'max:170'],
            'canonical_url' => ['nullable', 'url', 'max:2048'],
            'og_image' => ['nullable', 'string', 'max:2048'],
            'seo_image' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:4096'],
            'type' => ['required', Rule::in(['website', 'article'])],
            'noindex' => ['required', 'boolean'],
            'keywords' => ['nullable', 'array', 'max:12'],
            'keywords.*' => ['nullable', 'string', 'max:80'],
            'is_active' => ['required', 'boolean'],
        ]);

        if ($request->hasFile('seo_image')) {
            $this->deleteSeoImage($seoSetting->og_image);
            $data['og_image'] = $request->file('seo_image')->store('seo-images', 'public');
        } else {
            $data['og_image'] = $this->normalizePublicImagePath($request, $data['og_image'] ?? null);
        }

        unset($data['seo_image']);

        $data['keywords'] = collect($data['keywords'] ?? [])
            ->map(fn ($keyword) => trim((string) $keyword))
            ->filter()
            ->unique(fn ($keyword) => Str::lower($keyword))
            ->take(12)
            ->values()
            ->all();

        $seoSetting->update($data);
        AuditLogger::log('seo_setting.updated', $request->user(), $seoSetting);

        return back()->with('success', 'Pengaturan SEO berhasil diperbarui.');
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

    private function deleteSeoImage(?string $imagePath): void
    {
        if (! filled($imagePath)) {
            return;
        }

        $path = $this->normalizeStoredImagePath($imagePath);

        if (! $path || ! str_starts_with($path, 'seo-images/')) {
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
}
