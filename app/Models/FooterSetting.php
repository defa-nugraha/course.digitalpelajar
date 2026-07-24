<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class FooterSetting extends Model
{
    public const DEFAULT_KEY = 'default';

    protected $fillable = [
        'key',
        'description',
        'address',
        'email',
        'phone',
        'business_hours',
        'copyright_text',
        'link_columns',
        'bottom_links',
        'is_visible',
    ];

    protected $casts = [
        'link_columns' => 'array',
        'bottom_links' => 'array',
        'is_visible' => 'boolean',
    ];

    public static function defaultAttributes(): array
    {
        return [
            'description' => 'Platform pembelajaran robotik dan teknologi yang membantu sekolah, pengajar, dan siswa menjalankan kelas digital terstruktur dari materi hingga sertifikat.',
            'address' => 'Ngawi, Jawa Timur, Indonesia',
            'email' => 'support@roboacademy.id',
            'phone' => 'Layanan sekolah dan kemitraan',
            'business_hours' => 'Senin–Jumat, 09.00–17.00 WIB',
            'copyright_text' => '© 2026. Seluruh hak cipta dilindungi.',
            'link_columns' => [
                [
                    'title' => 'Perusahaan',
                    'links' => [
                        ['label' => 'Tentang Platform', 'href' => '/'],
                        ['label' => 'Katalog Kelas', 'href' => '/courses'],
                        ['label' => 'Learning Path', 'href' => '/learning-paths'],
                    ],
                ],
                [
                    'title' => 'Layanan',
                    'links' => [
                        ['label' => 'Masuk', 'href' => '/login'],
                        ['label' => 'Daftar Siswa', 'href' => '/register'],
                        ['label' => 'Verifikasi Sertifikat', 'href' => '/certificates/verify'],
                    ],
                ],
            ],
            'bottom_links' => [
                ['label' => 'Kelas', 'href' => '/courses'],
                ['label' => 'Verifikasi', 'href' => '/certificates/verify'],
                ['label' => 'Login', 'href' => '/login'],
            ],
            'is_visible' => true,
        ];
    }

    public static function defaultSetting(): self
    {
        return self::query()->firstOrCreate(
            ['key' => self::DEFAULT_KEY],
            self::defaultAttributes(),
        );
    }

    public static function fallbackPayload(): array
    {
        return self::payloadFromAttributes([
            'id' => null,
            ...self::defaultAttributes(),
            'updated_at' => null,
        ]);
    }

    public function toPayload(): array
    {
        return self::payloadFromAttributes([
            'id' => $this->id,
            'description' => $this->description,
            'address' => $this->address,
            'email' => $this->email,
            'phone' => $this->phone,
            'business_hours' => $this->business_hours,
            'copyright_text' => $this->copyright_text,
            'link_columns' => $this->link_columns ?? [],
            'bottom_links' => $this->bottom_links ?? [],
            'is_visible' => $this->is_visible,
            'updated_at' => optional($this->updated_at)->toDateTimeString(),
        ]);
    }

    private static function payloadFromAttributes(array $attributes): array
    {
        return [
            'id' => $attributes['id'] ?? null,
            'description' => $attributes['description'] ?? null,
            'address' => $attributes['address'] ?? null,
            'email' => $attributes['email'] ?? null,
            'phone' => $attributes['phone'] ?? null,
            'businessHours' => $attributes['business_hours'] ?? null,
            'copyrightText' => $attributes['copyright_text'] ?? null,
            'linkColumns' => $attributes['link_columns'] ?? [],
            'bottomLinks' => $attributes['bottom_links'] ?? [],
            'isVisible' => (bool) ($attributes['is_visible'] ?? true),
            'updatedAt' => $attributes['updated_at'] ?? null,
        ];
    }
}
