<?php

use App\Models\Certificate;
use App\Models\Chapter;
use App\Models\Course;
use App\Models\Enrollment;
use App\Models\ForumPost;
use App\Models\ForumThread;
use App\Models\LearningPath;
use App\Models\Lesson;
use App\Models\Payment;
use App\Models\Quiz;
use App\Models\QuizAttempt;
use App\Models\School;
use App\Models\User;
use App\Services\CertificateService;
use Illuminate\Http\UploadedFile;

test('inactive users cannot authenticate', function () {
    $user = User::factory()->create([
        'email' => 'inactive@example.test',
        'password' => 'password',
        'status' => 'inactive',
    ]);

    $this->post('/login', [
        'email' => $user->email,
        'password' => 'password',
    ])->assertSessionHasErrors('email');

    $this->assertGuest();
});

test('admin can perform learning path crud', function () {
    $admin = User::factory()->admin()->create();

    $this->actingAs($admin)->post('/admin/learning-paths', [
        'title' => 'Jalur Robotika',
        'description' => 'Dari dasar sampai mahir.',
        'level' => 'beginner-to-advanced',
        'status' => 'draft',
    ])->assertSessionHasNoErrors();

    $path = LearningPath::where('title', 'Jalur Robotika')->firstOrFail();

    $this->actingAs($admin)->patch("/admin/learning-paths/{$path->id}", [
        'title' => 'Jalur Robotika Industri',
        'description' => 'Diperbarui.',
        'level' => 'advanced',
        'status' => 'published',
    ])->assertSessionHasNoErrors();

    expect($path->fresh()->status)->toBe('published');

    $this->actingAs($admin)->delete("/admin/learning-paths/{$path->id}")
        ->assertSessionHas('success');

    $this->assertDatabaseMissing('learning_paths', ['id' => $path->id]);
});

test('course prerequisites are enforced before enrollment', function () {
    $student = User::factory()->student()->create();
    $prerequisite = Course::factory()->free()->create();
    $target = Course::factory()->free()->create();
    $target->prerequisites()->attach($prerequisite);

    $this->actingAs($student)->post("/courses/{$target->id}/enroll")
        ->assertSessionHasErrors('course');

    Enrollment::create([
        'user_id' => $student->id,
        'course_id' => $prerequisite->id,
        'status' => 'completed',
        'progress_percent' => 100,
        'completed_at' => now(),
    ]);

    $this->actingAs($student)->post("/courses/{$target->id}/enroll")
        ->assertRedirect("/learning?course={$target->id}");

    $this->assertDatabaseHas('enrollments', [
        'user_id' => $student->id,
        'course_id' => $target->id,
        'status' => 'active',
    ]);
});

test('admin imports users from csv atomically', function () {
    $admin = User::factory()->admin()->create();
    $school = School::factory()->create(['name' => 'SMK Robot Ngawi']);
    $csv = implode("\n", [
        'name,email,role,school,status,password',
        "Siswa Import,siswa.import@example.test,student,{$school->name},active,password123",
        "Guru Import,guru.import@example.test,school_teacher,{$school->name},active,password123",
    ]);

    $this->actingAs($admin)->post('/admin/users/import', [
        'file' => UploadedFile::fake()->createWithContent('users.csv', $csv),
    ])->assertSessionHasNoErrors();

    $this->assertDatabaseHas('users', [
        'email' => 'siswa.import@example.test',
        'school_id' => $school->id,
        'role' => 'student',
    ]);
    $this->assertDatabaseHas('users', [
        'email' => 'guru.import@example.test',
        'school_id' => $school->id,
        'role' => 'school_teacher',
    ]);
});

test('pdf conversion route is disabled in course builder', function () {
    $admin = User::factory()->admin()->create();
    $course = Course::factory()->create(['instructor_id' => $admin->id]);
    $chapter = Chapter::factory()->create(['course_id' => $course->id]);
    $lesson = Lesson::factory()->create(['chapter_id' => $chapter->id]);

    $this->actingAs($admin)->post("/admin/lessons/{$lesson->id}/pdf", [
        'pdf' => UploadedFile::fake()->create('materi.pdf', 12, 'application/pdf'),
    ])->assertNotFound();
});

test('forum topics and posts have persisted crud with course access control', function () {
    $student = User::factory()->student()->create();
    $outsider = User::factory()->student()->create();
    $course = Course::factory()->create();
    Enrollment::factory()->create(['user_id' => $student->id, 'course_id' => $course->id]);

    $this->actingAs($student)->post("/courses/{$course->id}/forum", [
        'title' => 'Sensor tidak stabil',
        'body' => 'Bagaimana melakukan filtering?',
    ])->assertSessionHasNoErrors();

    $thread = ForumThread::firstOrFail();
    $firstPost = ForumPost::firstOrFail();

    $this->actingAs($student)->patch("/forum/threads/{$thread->id}", [
        'title' => 'Sensor ultrasonik tidak stabil',
        'status' => 'open',
    ])->assertSessionHasNoErrors();

    $this->actingAs($student)->post("/forum/threads/{$thread->id}/posts", [
        'body' => 'Saya mencoba moving average.',
    ])->assertSessionHasNoErrors();

    $this->actingAs($student)->patch("/forum/posts/{$firstPost->id}", [
        'body' => 'Bagaimana melakukan moving average?',
    ])->assertSessionHasNoErrors();

    $this->actingAs($outsider)->get("/courses/{$course->id}/forum")->assertForbidden();

    $this->actingAs($student)->delete("/forum/threads/{$thread->id}")
        ->assertSessionHas('success');
    $this->assertDatabaseMissing('forum_threads', ['id' => $thread->id]);
});

test('midtrans callback checks amount and activates enrollment only after valid payment', function () {
    config([
        'midtrans.is_enabled' => false,
        'midtrans.mock_notification_secret' => 'test-webhook-secret',
    ]);
    $student = User::factory()->student()->create();
    $course = Course::factory()->paid(500000)->create();
    $payment = Payment::factory()->create([
        'user_id' => $student->id,
        'course_id' => $course->id,
        'amount' => 500000,
    ]);
    $payload = [
        'order_id' => $payment->order_id,
        'gross_amount' => '499999.00',
        'transaction_status' => 'settlement',
        'status_code' => '200',
        'signature_key' => 'mock-signature',
    ];

    $this->withHeader('X-Midtrans-Mock-Secret', 'test-webhook-secret')
        ->postJson('/payments/midtrans/notification', $payload)
        ->assertUnprocessable()
        ->assertJsonValidationErrors('gross_amount');

    expect($payment->fresh()->status)->toBe('pending');

    $payload['gross_amount'] = '500000.00';
    $payload['transaction_id'] = 'transaction-123';
    $this->withHeader('X-Midtrans-Mock-Secret', 'test-webhook-secret')
        ->postJson('/payments/midtrans/notification', $payload)
        ->assertOk();

    expect($payment->fresh()->status)->toBe('paid')
        ->and($payment->fresh()->gateway_transaction_id)->toBe('transaction-123');
    $this->assertDatabaseHas('enrollments', [
        'user_id' => $student->id,
        'course_id' => $course->id,
        'status' => 'active',
    ]);
});

test('midtrans notification endpoint acknowledges dashboard probes safely', function () {
    config(['midtrans.is_enabled' => true]);

    $this->postJson('/payments/midtrans/notification')
        ->assertOk()
        ->assertJson([
            'received' => true,
            'probe' => true,
        ]);
});

test('midtrans notification acknowledges signed synthetic orders without changing payments', function () {
    config([
        'midtrans.is_enabled' => true,
        'midtrans.server_key' => 'SB-Mid-server-test-key',
        'midtrans.merchant_id' => 'G123456789',
    ]);

    $payload = [
        'order_id' => 'midtrans-dashboard-test',
        'gross_amount' => '10000.00',
        'transaction_status' => 'pending',
        'status_code' => '201',
        'merchant_id' => 'G123456789',
        'currency' => 'IDR',
    ];
    $payload['signature_key'] = hash(
        'sha512',
        $payload['order_id'].$payload['status_code'].$payload['gross_amount'].config('midtrans.server_key'),
    );

    $this->postJson('/payments/midtrans/notification', $payload)
        ->assertOk()
        ->assertJson([
            'received' => true,
            'ignored' => 'unknown_order',
        ]);

    expect(Payment::query()->count())->toBe(0);
});

test('certificate eligibility requires all quizzes average final exam and submissions', function () {
    $student = User::factory()->student()->create();
    $course = Course::factory()->create();
    $enrollment = Enrollment::factory()->completed()->create([
        'user_id' => $student->id,
        'course_id' => $course->id,
        'progress_percent' => 100,
    ]);
    $quizOne = Quiz::factory()->create(['course_id' => $course->id, 'lesson_id' => null]);
    $quizTwo = Quiz::factory()->create(['course_id' => $course->id, 'lesson_id' => null]);
    $final = Quiz::factory()->finalExam()->create(['course_id' => $course->id]);

    QuizAttempt::factory()->create(['quiz_id' => $quizOne->id, 'user_id' => $student->id, 'score' => 60, 'passed' => false]);
    QuizAttempt::factory()->create(['quiz_id' => $final->id, 'user_id' => $student->id, 'score' => 75, 'passed' => true]);

    expect(app(CertificateService::class)->isEligible($student, $enrollment->load('course')))->toBeFalse();

    QuizAttempt::factory()->create(['quiz_id' => $quizTwo->id, 'user_id' => $student->id, 'score' => 80, 'passed' => true]);

    expect(app(CertificateService::class)->isEligible($student, $enrollment->fresh('course')))->toBeTrue();
});

test('certificate endpoints return real pdf and qr content', function () {
    $student = User::factory()->student()->create();
    $course = Course::factory()->create();
    $enrollment = Enrollment::factory()->completed()->create([
        'user_id' => $student->id,
        'course_id' => $course->id,
    ]);
    $certificate = Certificate::factory()->create(['enrollment_id' => $enrollment->id]);

    $this->actingAs($student)->get("/certificates/{$certificate->id}/download")
        ->assertOk()
        ->assertHeader('content-type', 'application/pdf');

    $this->get("/certificates/{$certificate->id}/qr")
        ->assertOk()
        ->assertHeader('content-type', 'image/png');
});

test('new role scoped pages render without leaking access', function () {
    $school = School::factory()->create();
    $admin = User::factory()->admin()->create();
    $instructor = User::factory()->instructor()->create();
    $teacher = User::factory()->teacher()->create(['school_id' => $school->id]);
    $student = User::factory()->student()->create(['school_id' => $school->id]);
    $course = Course::factory()->create(['instructor_id' => $instructor->id]);
    Enrollment::factory()->create(['user_id' => $student->id, 'course_id' => $course->id]);

    $this->get('/learning-paths')->assertOk();

    foreach (['/admin/learning-paths', '/admin/payments', '/admin/certificates', '/reviews', '/reports'] as $url) {
        $this->actingAs($admin)->get($url)->assertOk();
    }

    foreach (['/instructor/dashboard', '/instructor/course-builder', '/instructor/learning-paths', '/reviews', '/instructor/payrolls'] as $url) {
        $this->actingAs($instructor)->get($url)->assertOk();
    }

    foreach (['/reports', '/admin/reports', '/admin/course-builder', '/admin/certificates'] as $url) {
        $this->actingAs($instructor)->get($url)->assertForbidden();
    }

    foreach (['/courses', '/learning-paths', "/produk/{$course->slug}"] as $url) {
        $this->actingAs($instructor)->get($url)->assertOk();
    }

    foreach (['/teacher/dashboard', '/teacher/students', '/teacher/students/attendance'] as $url) {
        $this->actingAs($teacher)->get($url)->assertOk();
    }

    foreach (['/reviews', '/reports', '/courses', '/learning-paths', "/produk/{$course->slug}"] as $url) {
        $response = $this->actingAs($teacher)->get($url);

        in_array($url, ['/courses', '/learning-paths', "/produk/{$course->slug}"], true)
            ? $response->assertOk()
            : $response->assertForbidden();
    }

    $this->actingAs($teacher)->get('/learning')->assertRedirect('/teacher/learning');

    $this->actingAs($teacher)->get('/teacher/schedules')->assertNotFound();
    $this->actingAs($teacher)->get('/teacher/teaching-sessions')->assertOk();

    $this->actingAs($student)->get('/admin/payments')->assertForbidden();
    $this->actingAs($student)->get('/teacher/students')->assertForbidden();
    $this->actingAs($student)->get('/teacher/students/attendance')->assertForbidden();
});
