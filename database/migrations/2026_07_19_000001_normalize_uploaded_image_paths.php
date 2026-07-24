<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        $this->normalizeTableColumn('home_page_sections', 'image_url');
        $this->normalizeTableColumn('schools', 'logo_path');
        $this->normalizeCourses();
    }

    public function down(): void
    {
        // Data migration only. Original host-specific URLs are intentionally not restored.
    }

    private function normalizeTableColumn(string $table, string $column): void
    {
        if (! Schema::hasTable($table) || ! Schema::hasColumn($table, $column)) {
            return;
        }

        DB::table($table)
            ->select('id', $column)
            ->whereNotNull($column)
            ->orderBy('id')
            ->get()
            ->each(function (object $row) use ($table, $column) {
                $path = $this->normalizeStoragePath($row->{$column});

                if ($path !== $row->{$column}) {
                    DB::table($table)
                        ->where('id', $row->id)
                        ->update([$column => $path]);
                }
            });
    }

    private function normalizeCourses(): void
    {
        if (! Schema::hasTable('courses')) {
            return;
        }

        DB::table('courses')
            ->select('id', 'slug', 'canonical_url', 'og_image')
            ->orderBy('id')
            ->get()
            ->each(function (object $course) {
                $data = [];
                $ogImage = $this->normalizeStoragePath($course->og_image);

                if ($ogImage !== $course->og_image) {
                    $data['og_image'] = $ogImage;
                }

                if ($this->isGeneratedProductCanonical($course->canonical_url, $course->slug)) {
                    $data['canonical_url'] = null;
                }

                if ($data !== []) {
                    DB::table('courses')
                        ->where('id', $course->id)
                        ->update($data);
                }
            });
    }

    private function normalizeStoragePath(?string $value): ?string
    {
        if (! filled($value)) {
            return null;
        }

        $path = trim($value);
        $urlPath = parse_url($path, PHP_URL_PATH);

        if (is_string($urlPath) && str_starts_with($urlPath, '/storage/')) {
            return Str::after($urlPath, '/storage/');
        }

        if ($this->isGeneratedPublicLogo($path, $urlPath)) {
            return '/logo.png';
        }

        if (str_contains($path, '/storage/')) {
            return Str::after($path, '/storage/');
        }

        $relativePath = ltrim($path, '/');

        if (str_starts_with($relativePath, 'storage/')) {
            return Str::after($relativePath, 'storage/');
        }

        return $path;
    }

    private function isGeneratedPublicLogo(string $value, mixed $urlPath): bool
    {
        if ($urlPath !== '/logo.png') {
            return false;
        }

        $host = parse_url($value, PHP_URL_HOST);
        $appHost = parse_url((string) config('app.url'), PHP_URL_HOST);

        return $host === null || $host === $appHost || in_array($host, ['localhost', '127.0.0.1'], true);
    }

    private function isGeneratedProductCanonical(?string $canonicalUrl, ?string $slug): bool
    {
        if (! filled($canonicalUrl) || ! filled($slug)) {
            return false;
        }

        return parse_url($canonicalUrl, PHP_URL_PATH) === '/produk/'.$slug;
    }
};
