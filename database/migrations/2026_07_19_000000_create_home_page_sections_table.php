<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('home_page_sections', function (Blueprint $table) {
            $table->id();
            $table->string('key')->unique();
            $table->string('name');
            $table->string('section_type')->default('custom');
            $table->string('eyebrow')->nullable();
            $table->string('title')->nullable();
            $table->text('subtitle')->nullable();
            $table->text('body')->nullable();
            $table->string('primary_label')->nullable();
            $table->string('primary_url', 2048)->nullable();
            $table->string('secondary_label')->nullable();
            $table->string('secondary_url', 2048)->nullable();
            $table->string('image_url', 2048)->nullable();
            $table->json('items')->nullable();
            $table->json('metadata')->nullable();
            $table->boolean('is_visible')->default(true);
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();
        });

        $now = now();
        $baseSection = [
            'key' => null,
            'name' => null,
            'section_type' => 'custom',
            'eyebrow' => null,
            'title' => null,
            'subtitle' => null,
            'body' => null,
            'primary_label' => null,
            'primary_url' => null,
            'secondary_label' => null,
            'secondary_url' => null,
            'image_url' => null,
            'items' => json_encode([]),
            'metadata' => json_encode([]),
            'is_visible' => true,
            'sort_order' => 0,
            'created_at' => $now,
            'updated_at' => $now,
        ];
        $sections = [
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
                'items' => json_encode([]),
                'metadata' => json_encode([
                    'highlight_word' => 'Terstruktur',
                    'floating_label' => 'Modul Coding',
                    'trust_prefix' => 'Bergabung dengan',
                    'trust_suffix' => 'pelajar',
                ]),
                'is_visible' => true,
                'sort_order' => 10,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'key' => 'features',
                'name' => 'Fitur Belajar',
                'section_type' => 'features',
                'title' => 'Fitur Belajar Komprehensif',
                'subtitle' => 'Ekosistem pembelajaran dirancang untuk memastikan pemahaman mendalam dari teori hingga praktik.',
                'items' => json_encode([
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
                ]),
                'metadata' => json_encode([]),
                'is_visible' => true,
                'sort_order' => 20,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'key' => 'popular-courses',
                'name' => 'Kelas Populer',
                'section_type' => 'courses',
                'title' => 'Kelas Populer',
                'subtitle' => 'Mulai perjalanan robotik Anda dengan kelas pilihan terbanyak.',
                'primary_label' => 'Lihat Semua Kelas',
                'primary_url' => '/courses',
                'items' => json_encode([]),
                'metadata' => json_encode([
                    'limit' => 3,
                ]),
                'is_visible' => true,
                'sort_order' => 30,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'key' => 'partner-schools',
                'name' => 'Partner Belajar',
                'section_type' => 'partners',
                'eyebrow' => 'Partner Belajar',
                'title' => 'Dipercaya oleh sekolah dan komunitas belajar',
                'subtitle' => 'Bersama institusi pendidikan yang aktif mengembangkan pembelajaran teknologi dan robotik.',
                'items' => json_encode([]),
                'metadata' => json_encode([]),
                'is_visible' => true,
                'sort_order' => 40,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'key' => 'benefits',
                'name' => 'Kenapa Belajar',
                'section_type' => 'benefits',
                'eyebrow' => 'Kenapa belajar di RoboAcademy?',
                'title' => 'Belajar robotik lebih mudah, terarah, dan praktis',
                'primary_label' => 'Mulai Belajar',
                'primary_url' => '/courses',
                'items' => json_encode([
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
                ]),
                'metadata' => json_encode([
                    'badges' => [
                        ['label' => 'Alur belajar aman', 'icon' => 'shield'],
                        ['label' => 'Sertifikat terverifikasi', 'icon' => 'badge'],
                    ],
                ]),
                'is_visible' => true,
                'sort_order' => 50,
                'created_at' => $now,
                'updated_at' => $now,
            ],
        ];

        DB::table('home_page_sections')->insert(
            array_map(fn (array $section) => array_merge($baseSection, $section), $sections)
        );
    }

    public function down(): void
    {
        Schema::dropIfExists('home_page_sections');
    }
};
