<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SeoSetting extends Model
{
    public const HOME = 'home';

    public const COURSES = 'courses';

    public const LEARNING_PATHS = 'learning_paths';

    public const CERTIFICATE_VERIFY = 'certificate_verify';

    protected $fillable = [
        'key',
        'label',
        'path',
        'title',
        'description',
        'canonical_url',
        'og_image',
        'type',
        'noindex',
        'keywords',
        'is_active',
    ];

    protected $casts = [
        'keywords' => 'array',
        'noindex' => 'boolean',
        'is_active' => 'boolean',
    ];

    public static function defaults(): array
    {
        return [
            self::HOME => [
                'label' => 'Homepage',
                'path' => '/',
                'title' => 'Platform Belajar Robotik Terstruktur | RoboAcademy',
                'description' => 'Belajar robotik, coding, dan proyek teknologi secara terstruktur dengan kelas praktik, learning path, dan sertifikat digital.',
                'canonical_url' => null,
                'og_image' => null,
                'type' => 'website',
                'noindex' => false,
                'keywords' => ['robotik', 'arduino', 'kelas robotik', 'coding', 'sertifikat digital'],
                'is_active' => true,
            ],
            self::COURSES => [
                'label' => 'Katalog Kelas',
                'path' => '/courses',
                'title' => 'Katalog Kelas Robotik | RoboAcademy',
                'description' => 'Temukan kelas robotik dan coding berdasarkan level, harga, dan jalur belajar. Semua kelas publish dapat dibuka publik dan punya halaman detail.',
                'canonical_url' => null,
                'og_image' => null,
                'type' => 'website',
                'noindex' => false,
                'keywords' => ['katalog kelas robotik', 'kelas arduino', 'kelas coding'],
                'is_active' => true,
            ],
            self::LEARNING_PATHS => [
                'label' => 'Learning Path',
                'path' => '/learning-paths',
                'title' => 'Learning Path Robotik | RoboAcademy',
                'description' => 'Pilih jalur belajar robotik yang berurutan dari dasar sampai lanjutan, lengkap dengan daftar kelas publish di setiap kategori.',
                'canonical_url' => null,
                'og_image' => null,
                'type' => 'website',
                'noindex' => false,
                'keywords' => ['learning path robotik', 'jalur belajar arduino', 'kurikulum robotik'],
                'is_active' => true,
            ],
            self::CERTIFICATE_VERIFY => [
                'label' => 'Verifikasi Sertifikat',
                'path' => '/certificates/verify',
                'title' => 'Verifikasi Sertifikat Digital | RoboAcademy',
                'description' => 'Validasi nomor sertifikat digital untuk memastikan credential pembelajaran robotik diterbitkan resmi dan masih berlaku.',
                'canonical_url' => null,
                'og_image' => null,
                'type' => 'website',
                'noindex' => false,
                'keywords' => ['verifikasi sertifikat', 'sertifikat robotik', 'sertifikat digital'],
                'is_active' => true,
            ],
        ];
    }

    public static function defaultFor(string $key): array
    {
        return self::defaults()[$key] ?? self::defaults()[self::HOME];
    }

    public static function settingFor(string $key): self
    {
        return self::query()->firstOrCreate(
            ['key' => $key],
            ['key' => $key, ...self::defaultFor($key)],
        );
    }

    public static function ensureDefaults(): void
    {
        foreach (array_keys(self::defaults()) as $key) {
            self::settingFor($key);
        }
    }

    public function toPayload(): array
    {
        return [
            'id' => $this->id,
            'key' => $this->key,
            'label' => $this->label,
            'path' => $this->path,
            'title' => $this->title,
            'description' => $this->description,
            'canonicalUrl' => $this->canonical_url,
            'ogImage' => $this->og_image,
            'type' => $this->type,
            'noindex' => $this->noindex,
            'keywords' => $this->keywords ?? [],
            'isActive' => $this->is_active,
            'updatedAt' => optional($this->updated_at)->toDateTimeString(),
        ];
    }
}
