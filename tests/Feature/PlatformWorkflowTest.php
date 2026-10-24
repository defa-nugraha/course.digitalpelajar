<?php

use App\Models\Certificate;
use App\Models\CertificateTemplate;
use App\Models\Chapter;
use App\Models\ContentBlock;
use App\Models\Course;
use App\Models\Enrollment;
use App\Models\Lesson;
use App\Models\Payment;
use App\Models\Quiz;
use App\Models\School;
use App\Models\Submission;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

test('admin can manage schools users and course curriculum', function () {
    $admin = User::factory()->admin()->create();

    $this->actingAs($admin)
        ->post('/admin/schools', [
            'name' => 'SMK Robotika',
            'address' => 'Ngawi',
            'pic' => 'Budi',
            'status' => 'active',
        ])
        ->assertSessionHasNoErrors();

    $school = School::where('name', 'SMK Robotika')->firstOrFail();

    $this->actingAs($admin)
        ->post('/admin/users', [
            'school_id' => $school->id,
            'name' => 'Pengajar Baru',
            'email' => 'pengajar-baru@example.test',
            'role' => 'internal_instructor',
            'status' => 'active',
            'password' => 'password',
            'password_confirmation' => 'password',
        ])
        ->assertSessionHasNoErrors();

    $instructor = User::where('email', 'pengajar-baru@example.test')->firstOrFail();

    $this->actingAs($admin)
        ->post('/admin/courses', [
            'learning_path_id' => null,
            'instructor_id' => $instructor->id,
            'title' => 'Robotika CRUD',
            'description' => 'Kursus uji CRUD.',
            'level' => 'beginner',
            'price_type' => 'free',
            'price' => 0,
            'access_mode' => 'sequential',
            'status' => 'published',
        ])
        ->assertSessionHasNoErrors();

    $course = Course::where('title', 'Robotika CRUD')->firstOrFail();

    $this->actingAs($admin)
        ->post("/admin/courses/{$course->id}/chapters", [
            'title' => 'Bab Sensor',
            'order_no' => 1,
        ])
        ->assertSessionHasNoErrors();

    $chapter = Chapter::where('course_id', $course->id)->firstOrFail();

    $this->actingAs($admin)
        ->post("/admin/chapters/{$chapter->id}/lessons", [
            'title' => 'Sensor Ultrasonik',
            'order_no' => 1,
            'is_required' => true,
            'available_at' => null,
            'add_initial_block' => true,
            'initial_block_type' => 'text',
            'initial_block_content' => 'Materi awal dapat dibuat tanpa upload PDF.',
            'initial_block_metadata' => '{}',
            'initial_block_status' => 'published',
        ])
        ->assertSessionHasNoErrors();

    $lesson = Lesson::where('chapter_id', $chapter->id)->firstOrFail();

    expect(ContentBlock::where('lesson_id', $lesson->id)->where('content', 'Materi awal dapat dibuat tanpa upload PDF.')->exists())->toBeTrue();

    $this->actingAs($admin)
        ->patch("/admin/courses/{$course->id}", [
            'learning_path_id' => null,
            'instructor_id' => $instructor->id,
            'title' => 'Robotika CRUD Diperbarui',
            'description' => 'Kursus uji CRUD.',
            'level' => 'intermediate',
            'price_type' => 'free',
            'price' => 0,
            'access_mode' => 'open',
            'status' => 'published',
        ])
        ->assertSessionHasNoErrors();

    expect($course->fresh()->title)->toBe('Robotika CRUD Diperbarui');
});

test('student workflow persists progress quiz submission review and certificate', function () {
    $school = School::factory()->create();
    $admin = User::factory()->admin()->create(['school_id' => $school->id]);
    $student = User::factory()->student()->create(['school_id' => $school->id]);
    $instructor = User::factory()->instructor()->create(['school_id' => $school->id]);
    $course = Course::factory()->free()->create(['instructor_id' => $instructor->id]);
    $chapter = Chapter::factory()->create(['course_id' => $course->id, 'order_no' => 1]);
    $lesson = Lesson::factory()->create(['chapter_id' => $chapter->id, 'order_no' => 1]);

    ContentBlock::create([
        'lesson_id' => $lesson->id,
        'type' => 'submission',
        'content' => 'Kirim proyek.',
        'metadata' => [],
        'order_no' => 1,
        'status' => 'published',
    ]);

    $quiz = Quiz::factory()->finalExam()->create([
        'course_id' => $course->id,
        'questions' => [
            ['question' => 'Jawaban benar?', 'answer' => 'Ya'],
        ],
    ]);

    CertificateTemplate::factory()->create(['status' => 'published']);

    $otherCourse = Course::factory()->free()->create();
    $this->actingAs($student)->get("/learning?course={$otherCourse->id}")->assertForbidden();

    $this->actingAs($student)
        ->post("/courses/{$course->id}/enroll")
        ->assertRedirect("/learning?course={$course->id}");

    expect(Enrollment::whereBelongsTo($student)->whereBelongsTo($course)->exists())->toBeTrue();

    $this->actingAs($student)
        ->post("/quizzes/{$quiz->id}/attempts", ['answers' => ['Ya']])
        ->assertForbidden();

    $this->actingAs($student)
        ->post("/courses/{$course->id}/submissions", [
            'lesson_id' => $lesson->id,
            'code' => 'void setup() {}',
        ])
        ->assertSessionHasNoErrors();

    $this->actingAs($student)
        ->post("/courses/{$course->id}/lessons/{$lesson->id}/complete")
        ->assertSessionHasNoErrors();

    $enrollment = Enrollment::whereBelongsTo($student)->whereBelongsTo($course)->firstOrFail();
    expect($enrollment->fresh()->progress_percent)->toBe(100);

    $this->actingAs($student)
        ->get("/quizzes/{$quiz->id}/start")
        ->assertOk();

    $this->actingAs($student)
        ->post("/quizzes/{$quiz->id}/attempts", ['answers' => ['Ya']])
        ->assertSessionHasNoErrors();

    expect(Certificate::count())->toBe(0);

    $submission = Submission::firstOrFail();

    $this->actingAs($admin)
        ->patch("/admin/submissions/{$submission->id}/review", [
            'score' => 90,
            'feedback' => 'Proyek memenuhi kriteria.',
            'status' => 'accepted',
        ])
        ->assertSessionHasNoErrors();

    expect($submission->fresh()->status)->toBe('accepted')
        ->and(Certificate::where('enrollment_id', $enrollment->id)->exists())->toBeTrue();
});

test('paid course activates only after mock payment is settled', function () {
    $student = User::factory()->student()->create();
    $course = Course::factory()->paid(500000)->create();

    $this->actingAs($student)
        ->post("/courses/{$course->id}/enroll")
        ->assertRedirectContains('/payments/mock-checkout');

    expect(Enrollment::whereBelongsTo($student)->whereBelongsTo($course)->exists())->toBeFalse();

    $payment = Payment::whereBelongsTo($student)->whereBelongsTo($course)->firstOrFail();

    $this->actingAs($student)
        ->post("/payments/{$payment->id}/mock-settle", ['payment_method' => 'qris'])
        ->assertRedirect('/payments/success');

    expect($payment->fresh()->status)->toBe('paid')
        ->and(Enrollment::whereBelongsTo($student)->whereBelongsTo($course)->where('status', 'active')->exists())->toBeTrue();
});

test('inertia checkout uses a location response for the payment gateway', function () {
    $student = User::factory()->student()->create();
    $course = Course::factory()->paid(250000)->create();

    $response = $this->actingAs($student)
        ->withHeader('X-Inertia', 'true')
        ->post('/checkout', ['course_id' => $course->id]);

    $payment = Payment::query()
        ->whereBelongsTo($student)
        ->whereBelongsTo($course)
        ->firstOrFail();

    $response
        ->assertStatus(409)
        ->assertHeader('X-Inertia-Location', $payment->checkout_url);
});

test('students can continue only their own pending payment and admins receive its payment link', function () {
    $student = User::factory()->student()->create();
    $otherStudent = User::factory()->student()->create();
    $admin = User::factory()->admin()->create();
    $course = Course::factory()->paid(250000)->create();
    $payment = Payment::factory()->create([
        'user_id' => $student->id,
        'course_id' => $course->id,
        'amount' => 250000,
        'status' => 'pending',
        'checkout_url' => 'https://app.sandbox.midtrans.com/snap/v4/redirection/test-token',
    ]);

    $this->actingAs($student)
        ->get("/payments/{$payment->id}/continue")
        ->assertRedirect($payment->checkout_url);

    $this->actingAs($otherStudent)
        ->get("/payments/{$payment->id}/continue")
        ->assertForbidden();

    $this->actingAs($student)
        ->get('/payments')
        ->assertInertia(fn (Assert $page) => $page
            ->component('payments/index', false)
            ->where('payments.0.id', $payment->id)
            ->where('payments.0.checkoutUrl', $payment->checkout_url));

    $this->actingAs($admin)
        ->get('/admin/payments')
        ->assertInertia(fn (Assert $page) => $page
            ->component('admin/payments', false)
            ->where('payments.0.id', $payment->id)
            ->where('payments.0.checkoutUrl', $payment->checkout_url));
});

test('role middleware prevents students from accessing admin crud', function () {
    $student = User::factory()->student()->create();

    $this->actingAs($student)->get('/admin/users')->assertForbidden();
    $this->actingAs($student)->post('/admin/schools', [])->assertForbidden();
});

test('admin can configure quiz timer and student receives timer payload', function () {
    $admin = User::factory()->admin()->create();
    $student = User::factory()->student()->create();
    $course = Course::factory()->free()->create();
    $chapter = Chapter::factory()->create(['course_id' => $course->id, 'order_no' => 1]);
    $lesson = Lesson::factory()->create(['chapter_id' => $chapter->id, 'order_no' => 1]);

    $this->actingAs($admin)
        ->post("/admin/courses/{$course->id}/quizzes", [
            'lesson_id' => $lesson->id,
            'title' => 'Kuis Timer Sensor',
            'order_no' => 1,
            'passing_score' => 70,
            'time_limit_mode' => 'per_question',
            'time_limit_seconds' => 45,
            'is_final_exam' => false,
            'questions' => json_encode([
                [
                    'question' => 'Pin trigger sensor ultrasonik?',
                    'options' => ['Pin 9', 'Pin 10'],
                    'answer' => 'Pin 9',
                ],
            ]),
        ])
        ->assertSessionHasNoErrors();

    $quiz = Quiz::where('title', 'Kuis Timer Sensor')->firstOrFail();

    expect($quiz->time_limit_mode)->toBe('per_question')
        ->and($quiz->time_limit_seconds)->toBe(45);

    Enrollment::factory()->create([
        'user_id' => $student->id,
        'course_id' => $course->id,
        'status' => 'active',
    ]);

    $this->actingAs($student)
        ->get("/learning?course={$course->id}&lesson={$lesson->id}")
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('student/learning', false)
            ->where('lessonItems.0.timeLimitMode', 'per_question')
            ->where('lessonItems.0.timeLimitSeconds', 45));
});
