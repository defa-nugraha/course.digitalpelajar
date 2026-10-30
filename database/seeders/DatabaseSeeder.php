<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $now = now();

        Schema::disableForeignKeyConstraints();

        foreach ([
            'audit_logs',
            'instructor_payroll_items',
            'instructor_payrolls',
            'instructor_pay_rates',
            'teaching_sessions',
            'teaching_schedules',
            'seo_settings',
            'footer_settings',
            'home_page_sections',
            'media_uploads',
            'lesson_completions',
            'quiz_attempts',
            'forum_posts',
            'forum_threads',
            'certificates',
            'certificate_templates',
            'submissions',
            'payments',
            'enrollments',
            'quizzes',
            'content_blocks',
            'lessons',
            'chapters',
            'course_prerequisites',
            'courses',
            'learning_paths',
            'student_number_reservations',
            'users',
            'schools',
            'password_reset_tokens',
            'cache',
            'cache_locks',
            'jobs',
            'job_batches',
            'failed_jobs',
        ] as $table) {
            DB::table($table)->truncate();
        }

        Schema::enableForeignKeyConstraints();

        $academySchoolId = DB::table('schools')->insertGetId([
            'name' => 'Robotics Academy',
            'address' => 'Jl. Raya Ngawi Techno Park, Ngawi, Jawa Timur',
            'pic' => 'Nadia Prameswari',
            'logo_path' => '/logo.png',
            'status' => 'active',
            'partnered_at' => '2024-01-15',
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        $smanSchoolId = DB::table('schools')->insertGetId([
            'name' => 'SMAN 1 Jakarta',
            'address' => 'Jl. Pendidikan No. 1, Jakarta Selatan',
            'pic' => 'Budi Hartono',
            'logo_path' => '/logo.png',
            'status' => 'active',
            'partnered_at' => '2025-07-01',
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        $futureSchoolId = DB::table('schools')->insertGetId([
            'name' => 'SMP Techno Future Ngawi',
            'address' => 'Jl. Industri Kreatif No. 7, Ngawi',
            'pic' => 'Sarah Wijaya',
            'logo_path' => null,
            'status' => 'pending',
            'partnered_at' => null,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        $password = Hash::make('password');

        $adminId = DB::table('users')->insertGetId([
            'school_id' => $academySchoolId,
            'name' => 'Admin Pusat',
            'email' => 'admin@example.test',
            'email_verified_at' => $now,
            'role' => 'admin',
            'status' => 'active',
            'password' => $password,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        $instructorId = DB::table('users')->insertGetId([
            'school_id' => $academySchoolId,
            'name' => 'Nadia Prameswari',
            'email' => 'pengajar@example.test',
            'email_verified_at' => $now,
            'role' => 'internal_instructor',
            'status' => 'active',
            'password' => $password,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        $teacherId = DB::table('users')->insertGetId([
            'school_id' => $smanSchoolId,
            'name' => 'Budi Hartono',
            'email' => 'guru@example.test',
            'email_verified_at' => $now,
            'role' => 'school_teacher',
            'status' => 'active',
            'password' => $password,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        $studentId = User::query()->create([
            'school_id' => $smanSchoolId,
            'name' => 'Andi Saputra',
            'email' => 'siswa@example.test',
            'email_verified_at' => $now,
            'role' => 'student',
            'status' => 'active',
            'password' => $password,
        ])->id;

        $secondStudentId = User::query()->create([
            'school_id' => $futureSchoolId,
            'name' => 'Rina Melati',
            'email' => 'rina@example.test',
            'email_verified_at' => $now,
            'role' => 'student',
            'status' => 'active',
            'password' => $password,
        ])->id;

        $pathId = DB::table('learning_paths')->insertGetId([
            'title' => 'Robotics Engineer Path',
            'slug' => 'robotics-engineer-path',
            'description' => 'Jalur belajar dari elektronika dasar, pemrograman mikrokontroler, sensor, aktuator, hingga otomasi robot industri.',
            'level' => 'beginner-to-advanced',
            'status' => 'published',
            'meta_title' => 'Robotics Engineer Path | RoboAcademy',
            'meta_description' => 'Jalur belajar dari elektronika dasar, pemrograman mikrokontroler, sensor, aktuator, hingga otomasi robot industri.',
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        $basicCourseId = DB::table('courses')->insertGetId([
            'learning_path_id' => $pathId,
            'learning_path_order' => 1,
            'instructor_id' => $instructorId,
            'title' => 'Dasar Robotik dan Arduino',
            'slug' => 'dasar-robotik-dan-arduino',
            'description' => 'Kelas gratis untuk memahami komponen dasar robotik, wiring, sensor ultrasonik, dan pemrograman Arduino.',
            'level' => 'beginner',
            'price_type' => 'free',
            'price' => 0,
            'access_mode' => 'sequential',
            'status' => 'published',
            'meta_title' => 'Dasar Robotik dan Arduino | RoboAcademy',
            'meta_description' => 'Kelas gratis untuk memahami komponen dasar robotik, wiring, sensor ultrasonik, dan pemrograman Arduino.',
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        $paidCourseId = DB::table('courses')->insertGetId([
            'learning_path_id' => $pathId,
            'learning_path_order' => 2,
            'instructor_id' => $instructorId,
            'title' => 'Industrial Automation & Kinematics Masterclass',
            'slug' => 'industrial-automation-kinematics-masterclass',
            'description' => 'Kelas berbayar untuk forward kinematics, inverse kinematics, Denavit-Hartenberg, dan simulasi lengan robot industri.',
            'level' => 'intermediate',
            'price_type' => 'paid',
            'price' => 1500000,
            'access_mode' => 'scheduled',
            'status' => 'published',
            'meta_title' => 'Industrial Automation & Kinematics Masterclass | RoboAcademy',
            'meta_description' => 'Kelas berbayar untuk forward kinematics, inverse kinematics, Denavit-Hartenberg, dan simulasi lengan robot industri.',
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        DB::table('instructor_pay_rates')->insert([
            'instructor_id' => $instructorId,
            'amount_per_session' => 250000,
            'effective_from' => $now->copy()->startOfYear()->toDateString(),
            'effective_until' => null,
            'notes' => 'Tarif default per pertemuan offline sekolah mitra.',
            'is_active' => true,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        DB::table('teaching_schedules')->insert([
            'school_id' => $smanSchoolId,
            'instructor_id' => $instructorId,
            'course_id' => $basicCourseId,
            'title' => 'Pertemuan Offline Dasar Robotik - SMAN 1 Jakarta',
            'starts_at' => $now->copy()->addDays(2)->setTime(9, 0),
            'ends_at' => $now->copy()->addDays(2)->setTime(11, 0),
            'mode' => 'offline',
            'location' => 'Laboratorium Komputer SMAN 1 Jakarta',
            'meeting_url' => null,
            'status' => 'scheduled',
            'notes' => 'Pengajar wajib mengisi laporan dan upload bukti foto setelah pertemuan selesai.',
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        $chapterIntroId = DB::table('chapters')->insertGetId([
            'course_id' => $basicCourseId,
            'title' => 'Chapter 1: Pengenalan Robotika',
            'order_no' => 1,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        $chapterSensorId = DB::table('chapters')->insertGetId([
            'course_id' => $basicCourseId,
            'title' => 'Chapter 2: Sensor & Aktuator',
            'order_no' => 2,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        $chapterKinematicsId = DB::table('chapters')->insertGetId([
            'course_id' => $paidCourseId,
            'title' => 'Chapter 1: Industrial Kinematics',
            'order_no' => 1,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        $lessonRobotikaId = DB::table('lessons')->insertGetId([
            'chapter_id' => $chapterIntroId,
            'title' => 'Apa itu Robotika?',
            'order_no' => 1,
            'is_required' => true,
            'available_at' => null,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        $lessonSensorId = DB::table('lessons')->insertGetId([
            'chapter_id' => $chapterSensorId,
            'title' => 'Mengenal Sensor Ultrasonik HC-SR04',
            'order_no' => 1,
            'is_required' => true,
            'available_at' => null,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        $lessonKinematicsId = DB::table('lessons')->insertGetId([
            'chapter_id' => $chapterKinematicsId,
            'title' => 'Denavit-Hartenberg Parameters',
            'order_no' => 1,
            'is_required' => true,
            'available_at' => $now->copy()->addDays(3),
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        DB::table('content_blocks')->insert([
            [
                'lesson_id' => $lessonRobotikaId,
                'type' => 'text',
                'content' => 'Robotika adalah bidang multidisiplin yang menggabungkan mekanika, elektronika, sensor, aktuator, dan pemrograman.',
                'metadata' => json_encode(['source' => 'manual_editor']),
                'order_no' => 1,
                'status' => 'published',
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'lesson_id' => $lessonSensorId,
                'type' => 'code',
                'content' => "#define TRIG_PIN 9\n#define ECHO_PIN 10\n\nvoid loop() {\n  digitalWrite(TRIG_PIN, HIGH);\n}",
                'metadata' => json_encode(['language' => 'cpp', 'file' => 'ultrasonic_basic.ino']),
                'order_no' => 1,
                'status' => 'published',
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'lesson_id' => $lessonSensorId,
                'type' => 'submission',
                'content' => 'Upload foto wiring, kode Arduino, laporan singkat, dan link video demonstrasi.',
                'metadata' => json_encode(['allowed' => ['code', 'report', 'image', 'video_url']]),
                'order_no' => 2,
                'status' => 'published',
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'lesson_id' => $lessonKinematicsId,
                'type' => 'file',
                'content' => 'Draft hasil konversi PDF materi Denavit-Hartenberg.',
                'metadata' => json_encode(['file' => 'denavit-hartenberg.pdf', 'conversion_status' => 'review_required']),
                'order_no' => 1,
                'status' => 'draft',
                'created_at' => $now,
                'updated_at' => $now,
            ],
        ]);

        DB::table('quizzes')->insert([
            [
                'lesson_id' => $lessonSensorId,
                'course_id' => $basicCourseId,
                'title' => 'Quiz: Kalibrasi Sensor Ultrasonik',
                'order_no' => 2,
                'passing_score' => 70,
                'is_final_exam' => false,
                'questions' => json_encode([
                    ['question' => 'Pin trigger HC-SR04 digunakan untuk apa?', 'answer' => 'Mengirim pulsa ultrasonik'],
                    ['question' => 'Berapa passing score default quiz?', 'answer' => '70'],
                ]),
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'lesson_id' => null,
                'course_id' => $paidCourseId,
                'title' => 'Ujian Akhir: Industrial Kinematics',
                'order_no' => 1,
                'passing_score' => 75,
                'is_final_exam' => true,
                'questions' => json_encode([
                    ['question' => 'Jelaskan fungsi parameter DH.', 'answer' => 'Merepresentasikan transformasi antar link robot'],
                ]),
                'created_at' => $now,
                'updated_at' => $now,
            ],
        ]);

        $basicEnrollmentId = DB::table('enrollments')->insertGetId([
            'user_id' => $studentId,
            'course_id' => $basicCourseId,
            'status' => 'active',
            'progress_percent' => 50,
            'completed_at' => null,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        $paidEnrollmentId = DB::table('enrollments')->insertGetId([
            'user_id' => $studentId,
            'course_id' => $paidCourseId,
            'status' => 'completed',
            'progress_percent' => 100,
            'completed_at' => $now->copy()->subDays(7),
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        DB::table('enrollments')->insert([
            'user_id' => $secondStudentId,
            'course_id' => $basicCourseId,
            'status' => 'active',
            'progress_percent' => 0,
            'completed_at' => null,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        DB::table('lesson_completions')->insert([
            [
                'user_id' => $studentId,
                'lesson_id' => $lessonRobotikaId,
                'completed_at' => $now->copy()->subDays(3),
                'created_at' => $now->copy()->subDays(3),
                'updated_at' => $now->copy()->subDays(3),
            ],
            [
                'user_id' => $studentId,
                'lesson_id' => $lessonKinematicsId,
                'completed_at' => $now->copy()->subDays(8),
                'created_at' => $now->copy()->subDays(8),
                'updated_at' => $now->copy()->subDays(8),
            ],
        ]);

        $finalQuizId = DB::table('quizzes')
            ->where('course_id', $paidCourseId)
            ->where('is_final_exam', true)
            ->value('id');

        DB::table('quiz_attempts')->insert([
            'quiz_id' => $finalQuizId,
            'user_id' => $studentId,
            'score' => 100,
            'passed' => true,
            'answers' => json_encode(['Merepresentasikan transformasi antar link robot']),
            'created_at' => $now->copy()->subDays(7),
            'updated_at' => $now->copy()->subDays(7),
        ]);

        DB::table('payments')->insert([
            [
                'user_id' => $studentId,
                'course_id' => $paidCourseId,
                'order_id' => 'NGW-872914',
                'gateway_transaction_id' => 'mock-transaction-paid',
                'amount' => 1500000,
                'status' => 'paid',
                'payment_method' => 'credit_card',
                'snap_token' => 'snap-token-demo-paid',
                'checkout_url' => 'https://app.sandbox.midtrans.com/snap/v2/vtweb/snap-token-demo-paid',
                'gateway_payload' => json_encode(['transaction_status' => 'settlement', 'gross_amount' => '1500000.00']),
                'paid_at' => $now->copy()->subDays(7),
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'user_id' => $secondStudentId,
                'course_id' => $paidCourseId,
                'order_id' => 'NGW-882910',
                'gateway_transaction_id' => null,
                'amount' => 1500000,
                'status' => 'pending',
                'payment_method' => 'bank_transfer',
                'snap_token' => 'snap-token-demo-pending',
                'checkout_url' => 'https://app.sandbox.midtrans.com/snap/v2/vtweb/snap-token-demo-pending',
                'gateway_payload' => json_encode(['transaction_status' => 'pending', 'va_number' => '8801234567890123']),
                'paid_at' => null,
                'created_at' => $now,
                'updated_at' => $now,
            ],
        ]);

        DB::table('submissions')->insert([
            [
                'enrollment_id' => $basicEnrollmentId,
                'lesson_id' => $lessonSensorId,
                'reviewer_id' => $teacherId,
                'code' => "#define TRIG_PIN 9\n#define ECHO_PIN 10",
                'report_path' => 'submissions/andi/laporan-sensor-ultrasonik.pdf',
                'image_path' => 'submissions/andi/wiring-sensor.jpg',
                'video_url' => 'https://youtu.be/demo-ultrasonic',
                'score' => 88,
                'feedback' => 'Wiring sudah benar. Tambahkan komentar pada kode untuk menjelaskan perhitungan jarak.',
                'status' => 'accepted',
                'reviewed_at' => $now,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'enrollment_id' => $paidEnrollmentId,
                'lesson_id' => $lessonKinematicsId,
                'reviewer_id' => $instructorId,
                'code' => null,
                'report_path' => 'submissions/andi/final-project-kinematics.pdf',
                'image_path' => 'submissions/andi/robot-arm-demo.jpg',
                'video_url' => 'https://youtu.be/demo-robot-arm',
                'score' => 92,
                'feedback' => 'Final project diterima. Analisis inverse kinematics sudah lengkap.',
                'status' => 'accepted',
                'reviewed_at' => $now,
                'created_at' => $now,
                'updated_at' => $now,
            ],
        ]);

        $templateId = DB::table('certificate_templates')->insertGetId([
            'name' => 'Industrial Certificate',
            'layout' => json_encode([
                'title' => 'Certificate of Completion',
                'primary_color' => '#1C7DE8',
                'accent_color' => '#FED635',
                'elements' => ['student_name', 'course_title', 'issue_date', 'qr_code', 'instructor_signature'],
            ]),
            'status' => 'published',
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        DB::table('certificates')->insert([
            'enrollment_id' => $paidEnrollmentId,
            'certificate_template_id' => $templateId,
            'certificate_no' => 'NGT-2026-8F92A',
            'qr_token' => Str::uuid()->toString(),
            'status' => 'issued',
            'issued_at' => $now->copy()->subDays(6),
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        $threadId = DB::table('forum_threads')->insertGetId([
            'course_id' => $basicCourseId,
            'lesson_id' => $lessonSensorId,
            'user_id' => $studentId,
            'title' => 'Nilai sensor ultrasonik tidak stabil',
            'status' => 'open',
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        DB::table('forum_posts')->insert([
            [
                'forum_thread_id' => $threadId,
                'user_id' => $studentId,
                'body' => 'Jarak yang terbaca berubah cepat walaupun objek diam. Apakah perlu filter tambahan?',
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'forum_thread_id' => $threadId,
                'user_id' => $instructorId,
                'body' => 'Gunakan median filter sederhana dari 5 pembacaan dan pastikan ground sensor tersambung stabil.',
                'created_at' => $now,
                'updated_at' => $now,
            ],
        ]);

        DB::table('audit_logs')->insert([
            [
                'user_id' => $adminId,
                'event' => 'school.created',
                'auditable_type' => 'school',
                'auditable_id' => $smanSchoolId,
                'metadata' => json_encode(['source' => 'database_seeder']),
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'user_id' => $teacherId,
                'event' => 'submission.reviewed',
                'auditable_type' => 'submission',
                'auditable_id' => 1,
                'metadata' => json_encode(['status' => 'accepted', 'score' => 88]),
                'created_at' => $now,
                'updated_at' => $now,
            ],
        ]);

        DB::table('password_reset_tokens')->insert([
            'email' => 'siswa@example.test',
            'token' => Hash::make('demo-reset-token'),
            'created_at' => $now,
        ]);

        DB::table('cache')->insert([
            'key' => 'platform_seed_summary',
            'value' => 'Robotics learning platform demo data seeded.',
            'expiration' => $now->copy()->addDay()->timestamp,
        ]);

        DB::table('cache_locks')->insert([
            'key' => 'platform_seed_lock',
            'owner' => 'database-seeder',
            'expiration' => $now->copy()->addMinutes(10)->timestamp,
        ]);

        DB::table('jobs')->insert([
            'queue' => 'default',
            'payload' => json_encode(['displayName' => 'DemoCertificateGenerationJob', 'job' => 'demo']),
            'attempts' => 0,
            'reserved_at' => null,
            'available_at' => $now->copy()->addYears(10)->timestamp,
            'created_at' => $now->timestamp,
        ]);

        DB::table('job_batches')->insert([
            'id' => (string) Str::uuid(),
            'name' => 'Demo certificate batch',
            'total_jobs' => 1,
            'pending_jobs' => 0,
            'failed_jobs' => 0,
            'failed_job_ids' => json_encode([]),
            'options' => json_encode(['source' => 'database_seeder']),
            'cancelled_at' => null,
            'created_at' => $now->timestamp,
            'finished_at' => $now->timestamp,
        ]);

        DB::table('failed_jobs')->insert([
            'uuid' => (string) Str::uuid(),
            'connection' => 'sync',
            'queue' => 'default',
            'payload' => json_encode(['displayName' => 'DemoFailedMidtransCallbackJob']),
            'exception' => 'Demo failed job row for table coverage.',
            'failed_at' => $now,
        ]);

        $this->call(ArduinoBasicsCourseSeeder::class);
        $this->call(HomePageSectionSeeder::class);
        $this->call(FooterSettingSeeder::class);
        $this->call(SeoSettingSeeder::class);
    }
}
