<?php

namespace Database\Seeders;

use App\Models\HomePageSection;
use Illuminate\Database\Seeder;

class HomePageSectionSeeder extends Seeder
{
    public function run(): void
    {
        foreach (self::defaultSections() as $section) {
            HomePageSection::query()->firstOrCreate(
                ['key' => $section['key']],
                $section,
            );
        }
    }

    public static function defaultSections(): array
    {
        return [
            [
                'key' => 'hero',
                'name' => 'Hero Utama',
                'section_type' => 'hero',
                'eyebrow' => 'Platform Belajar Robotik Terstruktur',
                'title' => 'Belajar Robotik Lebih Terstruktur, Praktis, dan Bersertifikat',
                'subtitle' => 'Kuasai teori, perakitan hardware, dan coding secara interaktif. Bangun portofolio project nyata dan dapatkan sertifikat digital yang dapat diverifikasi.',
                'primary_label' => 'Mulai Belajar',
                'primary_url' => '/courses',
                'secondary_label' => 'Lihat Kelas',
                'secondary_url' => '/courses',
                'image_url' => null,
                'items' => [],
                'metadata' => [
                    'highlight_word' => 'Terstruktur',
                    'floating_label' => 'Modul Coding',
                    'trust_prefix' => 'Bergabung dengan',
                    'trust_suffix' => 'pelajar',
                ],
                'is_visible' => true,
                'sort_order' => 10,
            ],
            [
                'key' => 'features',
                'name' => 'Fitur Belajar',
                'section_type' => 'features',
                'title' => 'Fitur Belajar Komprehensif',
                'subtitle' => 'Ekosistem pembelajaran dirancang untuk memastikan pemahaman mendalam dari teori hingga praktik.',
                'items' => [
                    [
                        'title' => 'Learning Path Terarah',
                        'description' => 'Kurikulum disusun sistematis dari tingkat dasar hingga mahir, sehingga Anda dapat belajar robotik dengan urutan yang jelas.',
                        'icon' => 'route',
                        'tone' => 'blue',
                        'featured' => true,
                    ],
                    [
                        'title' => 'Modular Content',
                        'description' => 'Materi dibagi dalam modul kecil yang mudah dicerna dan langsung bisa dipraktikkan.',
                        'icon' => 'library',
                        'tone' => 'blue',
                        'featured' => false,
                    ],
                    [
                        'title' => 'Interactive Quizzes',
                        'description' => 'Uji pemahaman setelah menyelesaikan materi dan pantau kesiapan sebelum melanjutkan.',
                        'icon' => 'quiz',
                        'tone' => 'amber',
                        'featured' => false,
                    ],
                    [
                        'title' => 'Project Submission',
                        'description' => 'Kumpulkan hasil rakitan fisik, kode program, laporan, dan video demonstrasi langsung di platform.',
                        'icon' => 'upload',
                        'tone' => 'blue',
                        'featured' => false,
                    ],
                    [
                        'title' => 'Expert Review',
                        'description' => 'Dapatkan masukan dari pengajar untuk memperbaiki proyek dan meningkatkan kualitas portofolio.',
                        'icon' => 'message',
                        'tone' => 'purple',
                        'featured' => false,
                    ],
                ],
                'metadata' => [],
                'is_visible' => true,
                'sort_order' => 20,
            ],
            [
                'key' => 'popular-courses',
                'name' => 'Kelas Populer',
                'section_type' => 'courses',
                'title' => 'Kelas Populer',
                'subtitle' => 'Mulai perjalanan robotik Anda dengan kelas pilihan terbanyak.',
                'primary_label' => 'Lihat Semua Kelas',
                'primary_url' => '/courses',
                'items' => [],
                'metadata' => [
                    'limit' => 3,
                ],
                'is_visible' => true,
                'sort_order' => 30,
            ],
            [
                'key' => 'partner-schools',
                'name' => 'Partner Belajar',
                'section_type' => 'partners',
                'eyebrow' => 'Partner Belajar',
                'title' => 'Dipercaya oleh sekolah dan komunitas belajar',
                'subtitle' => 'Bersama institusi pendidikan yang aktif mengembangkan pembelajaran teknologi dan robotik.',
                'items' => [],
                'metadata' => [],
                'is_visible' => true,
                'sort_order' => 40,
            ],
            [
                'key' => 'benefits',
                'name' => 'Kenapa Belajar',
                'section_type' => 'benefits',
                'eyebrow' => 'Kenapa belajar di RoboAcademy?',
                'title' => 'Belajar robotik lebih mudah, terarah, dan praktis',
                'primary_label' => 'Mulai Belajar',
                'primary_url' => '/courses',
                'items' => [
                    [
                        'title' => 'Learning path jelas',
                        'description' => 'Ikuti urutan kelas dari dasar sampai proyek lanjutan tanpa bingung harus mulai dari mana.',
                        'icon' => 'route',
                    ],
                    [
                        'title' => 'Ujian lebih mudah dipantau',
                        'description' => 'Progress, kuis, submission, dan review pengajar tersimpan dalam satu tempat.',
                        'icon' => 'quiz',
                    ],
                    [
                        'title' => 'Update pembelajaran instan',
                        'description' => 'Siswa dan pengajar mendapat informasi penting terkait kelas, tugas, dan sertifikat.',
                        'icon' => 'bell',
                    ],
                ],
                'metadata' => [
                    'badges' => [
                        ['label' => 'Alur belajar aman', 'icon' => 'shield'],
                        ['label' => 'Sertifikat terverifikasi', 'icon' => 'badge'],
                    ],
                ],
                'is_visible' => true,
                'sort_order' => 50,
            ],
        ];
    }
}
