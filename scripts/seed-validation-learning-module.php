<?php

use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

require __DIR__.'/../vendor/autoload.php';

$app = require __DIR__.'/../bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();

$now = now();
$studentId = DB::table('users')->where('email', 'siswa@ngawitekno.test')->value('id');
$instructorId = DB::table('users')->where('email', 'pengajar@ngawitekno.test')->value('id');
$templateId = DB::table('certificate_templates')->where('status', 'published')->value('id');
$pathId = DB::table('learning_paths')->where('status', 'published')->value('id');

if (! $studentId || ! $instructorId || ! $templateId || ! $pathId) {
    fwrite(STDERR, "Data dasar tidak lengkap. Jalankan php artisan db:seed terlebih dahulu.\n");
    exit(1);
}

$courseTitle = 'Modul Validasi: Line Follower Robot';
$courseId = DB::table('courses')->where('title', $courseTitle)->value('id');

if (! $courseId) {
    $courseId = DB::table('courses')->insertGetId([
        'learning_path_id' => $pathId,
        'instructor_id' => $instructorId,
        'title' => $courseTitle,
        'description' => 'Modul validasi end-to-end untuk membuat, mengakses, menyelesaikan, dan menerbitkan sertifikat pembelajaran robot line follower.',
        'level' => 'beginner',
        'price_type' => 'free',
        'price' => 0,
        'access_mode' => 'sequential',
        'status' => 'published',
        'created_at' => $now,
        'updated_at' => $now,
    ]);
} else {
    DB::table('courses')->where('id', $courseId)->update([
        'learning_path_id' => $pathId,
        'instructor_id' => $instructorId,
        'description' => 'Modul validasi end-to-end untuk membuat, mengakses, menyelesaikan, dan menerbitkan sertifikat pembelajaran robot line follower.',
        'level' => 'beginner',
        'price_type' => 'free',
        'price' => 0,
        'access_mode' => 'sequential',
        'status' => 'published',
        'updated_at' => $now,
    ]);
}

$chapterId = DB::table('chapters')->where('course_id', $courseId)->where('order_no', 1)->value('id');
if (! $chapterId) {
    $chapterId = DB::table('chapters')->insertGetId([
        'course_id' => $courseId,
        'title' => 'Chapter 1: Rangkaian dan Kalibrasi Sensor',
        'order_no' => 1,
        'created_at' => $now,
        'updated_at' => $now,
    ]);
} else {
    DB::table('chapters')->where('id', $chapterId)->update([
        'title' => 'Chapter 1: Rangkaian dan Kalibrasi Sensor',
        'updated_at' => $now,
    ]);
}

$lessonId = DB::table('lessons')->where('chapter_id', $chapterId)->where('order_no', 1)->value('id');
if (! $lessonId) {
    $lessonId = DB::table('lessons')->insertGetId([
        'chapter_id' => $chapterId,
        'title' => 'Merakit Sensor Line Follower',
        'order_no' => 1,
        'is_required' => true,
        'available_at' => null,
        'created_at' => $now,
        'updated_at' => $now,
    ]);
} else {
    DB::table('lessons')->where('id', $lessonId)->update([
        'title' => 'Merakit Sensor Line Follower',
        'is_required' => true,
        'updated_at' => $now,
    ]);
}

DB::table('content_blocks')->where('lesson_id', $lessonId)->delete();
DB::table('content_blocks')->insert([
    [
        'lesson_id' => $lessonId,
        'type' => 'text',
        'content' => 'Siswa merakit sensor infrared, menghubungkan pin sensor ke Arduino, lalu menguji pembacaan garis hitam dan putih sebelum menjalankan robot line follower.',
        'metadata' => json_encode(['source' => 'validation_module']),
        'order_no' => 1,
        'status' => 'published',
        'created_at' => $now,
        'updated_at' => $now,
    ],
    [
        'lesson_id' => $lessonId,
        'type' => 'code',
        'content' => "#define LEFT_SENSOR 2\n#define RIGHT_SENSOR 3\n\nvoid loop() {\n  int left = digitalRead(LEFT_SENSOR);\n  int right = digitalRead(RIGHT_SENSOR);\n  // kontrol motor berdasarkan pembacaan garis\n}",
        'metadata' => json_encode(['language' => 'cpp', 'file' => 'line_follower_validation.ino']),
        'order_no' => 2,
        'status' => 'published',
        'created_at' => $now,
        'updated_at' => $now,
    ],
    [
        'lesson_id' => $lessonId,
        'type' => 'submission',
        'content' => 'Upload kode Arduino, foto rangkaian sensor, laporan kalibrasi, dan video robot mengikuti garis.',
        'metadata' => json_encode(['allowed' => ['code', 'report', 'image', 'video_url']]),
        'order_no' => 3,
        'status' => 'published',
        'created_at' => $now,
        'updated_at' => $now,
    ],
]);

DB::table('quizzes')->where('course_id', $courseId)->delete();
DB::table('quizzes')->insert([
    'lesson_id' => $lessonId,
    'course_id' => $courseId,
    'title' => 'Quiz Validasi: Kalibrasi Sensor Garis',
    'passing_score' => 70,
    'is_final_exam' => false,
    'questions' => json_encode([
        ['question' => 'Apa fungsi sensor infrared pada robot line follower?', 'answer' => 'Mendeteksi perbedaan pantulan garis hitam dan putih'],
    ]),
    'created_at' => $now,
    'updated_at' => $now,
]);

$enrollmentId = DB::table('enrollments')->where('user_id', $studentId)->where('course_id', $courseId)->value('id');
if (! $enrollmentId) {
    $enrollmentId = DB::table('enrollments')->insertGetId([
        'user_id' => $studentId,
        'course_id' => $courseId,
        'status' => 'completed',
        'progress_percent' => 100,
        'completed_at' => $now,
        'created_at' => $now,
        'updated_at' => $now,
    ]);
} else {
    DB::table('enrollments')->where('id', $enrollmentId)->update([
        'status' => 'completed',
        'progress_percent' => 100,
        'completed_at' => $now,
        'updated_at' => $now,
    ]);
}

DB::table('submissions')->where('enrollment_id', $enrollmentId)->where('lesson_id', $lessonId)->delete();
DB::table('submissions')->insert([
    'enrollment_id' => $enrollmentId,
    'lesson_id' => $lessonId,
    'code' => "#define LEFT_SENSOR 2\n#define RIGHT_SENSOR 3",
    'report_path' => 'submissions/validasi/line-follower-report.pdf',
    'image_path' => 'submissions/validasi/line-follower-wiring.jpg',
    'video_url' => 'https://youtu.be/validasi-line-follower',
    'score' => 95,
    'feedback' => 'Submission validasi diterima. Rangkaian, kode, dan demonstrasi robot sudah memenuhi syarat.',
    'status' => 'accepted',
    'created_at' => $now,
    'updated_at' => $now,
]);

$certificateNo = 'NGT-2026-FLOW1';
$certificateId = DB::table('certificates')->where('certificate_no', $certificateNo)->value('id');
if (! $certificateId) {
    DB::table('certificates')->insert([
        'enrollment_id' => $enrollmentId,
        'certificate_template_id' => $templateId,
        'certificate_no' => $certificateNo,
        'qr_token' => (string) Str::uuid(),
        'status' => 'issued',
        'issued_at' => $now,
        'created_at' => $now,
        'updated_at' => $now,
    ]);
} else {
    DB::table('certificates')->where('id', $certificateId)->update([
        'enrollment_id' => $enrollmentId,
        'certificate_template_id' => $templateId,
        'status' => 'issued',
        'issued_at' => $now,
        'updated_at' => $now,
    ]);
}

echo json_encode([
    'course_id' => $courseId,
    'lesson_id' => $lessonId,
    'enrollment_id' => $enrollmentId,
    'certificate_no' => $certificateNo,
], JSON_PRETTY_PRINT).PHP_EOL;
