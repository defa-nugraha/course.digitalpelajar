<?php

use App\Models\Chapter;
use App\Models\Course;
use App\Models\Enrollment;
use App\Models\InstructorPayRate;
use App\Models\InstructorPayroll;
use App\Models\LearningPath;
use App\Models\Lesson;
use App\Models\School;
use App\Models\SchoolLearningPathAccess;
use App\Models\Submission;
use App\Models\TeachingAttendance;
use App\Models\TeachingSchedule;
use App\Models\TeachingSession;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\URL;
use Inertia\Testing\AssertableInertia as Assert;

test('admin can manage teaching schedules and instructor pay rates', function () {
    $admin = User::factory()->admin()->create();
    $school = School::factory()->create();
    $instructor = User::factory()->instructor()->create(['school_id' => $school->id]);
    $course = Course::factory()->free()->create(['instructor_id' => $instructor->id]);

    $this->actingAs($admin)->post('/admin/teaching-schedules', [
        'school_id' => $school->id,
        'instructor_id' => $instructor->id,
        'course_id' => $course->id,
        'title' => 'Pertemuan Robotik Offline',
        'starts_at' => now()->addDay()->setTime(9, 0)->toDateTimeString(),
        'ends_at' => now()->addDay()->setTime(11, 0)->toDateTimeString(),
        'mode' => 'offline',
        'location' => 'Lab Robotik',
        'status' => 'scheduled',
        'notes' => 'Bawa kit sensor.',
    ])->assertSessionHasNoErrors();

    $schedule = TeachingSchedule::where('title', 'Pertemuan Robotik Offline')->firstOrFail();

    $this->actingAs($admin)->patch("/admin/teaching-schedules/{$schedule->id}", [
        'school_id' => $school->id,
        'instructor_id' => $instructor->id,
        'course_id' => $course->id,
        'title' => 'Pertemuan Robotik Online',
        'starts_at' => now()->addDays(2)->setTime(10, 0)->toDateTimeString(),
        'ends_at' => now()->addDays(2)->setTime(12, 0)->toDateTimeString(),
        'mode' => 'online',
        'meeting_url' => 'https://meet.example.test/robotik',
        'status' => 'rescheduled',
        'notes' => 'Dialihkan online.',
    ])->assertRedirect()->assertSessionHasNoErrors();

    expect($schedule->fresh()->mode)->toBe('online')
        ->and($schedule->fresh()->location)->toBeNull();

    $this->actingAs($admin)->post('/admin/instructor-pay-rates', [
        'instructor_id' => $instructor->id,
        'amount_per_session' => 300000,
        'effective_from' => now()->startOfMonth()->toDateString(),
        'is_active' => true,
    ])->assertSessionHasNoErrors();

    $rate = InstructorPayRate::firstOrFail();

    $this->actingAs($admin)->patch("/admin/instructor-pay-rates/{$rate->id}", [
        'instructor_id' => $instructor->id,
        'amount_per_session' => 350000,
        'effective_from' => now()->startOfMonth()->toDateString(),
        'effective_until' => now()->addMonth()->endOfMonth()->toDateString(),
        'is_active' => true,
        'notes' => 'Tarif revisi.',
    ])->assertSessionHasNoErrors();

    expect($rate->fresh()->amount_per_session)->toBe(350000);

    $this->actingAs($admin)->delete("/admin/instructor-pay-rates/{$rate->id}")
        ->assertSessionHas('success');
    $this->assertDatabaseMissing('instructor_pay_rates', ['id' => $rate->id]);

    $this->actingAs($admin)->delete("/admin/teaching-schedules/{$schedule->id}")
        ->assertSessionHas('success');
    $this->assertDatabaseMissing('teaching_schedules', ['id' => $schedule->id]);
});

test('admin can create school based recurring teaching schedules without course', function () {
    $admin = User::factory()->admin()->create();
    $school = School::factory()->create();
    $instructor = User::factory()->instructor()->create();

    $this->actingAs($admin)->post('/admin/teaching-schedules', [
        'schedule_basis' => 'school',
        'school_id' => $school->id,
        'instructor_id' => $instructor->id,
        'title' => 'Pendampingan Robotik Sekolah',
        'schedule_start_date' => '2026-07-27',
        'schedule_end_date' => '2026-08-02',
        'starts_time' => '08:00',
        'ends_time' => '10:00',
        'weekdays' => [1, 3],
        'mode' => 'offline',
        'location' => 'Lab Robotik',
        'status' => 'scheduled',
        'notes' => 'Jadwal rutin sekolah.',
    ])
        ->assertSessionHasNoErrors()
        ->assertSessionHas('success');

    $this->assertDatabaseCount('teaching_schedules', 2);
    $this->assertDatabaseHas('teaching_schedules', [
        'school_id' => $school->id,
        'instructor_id' => $instructor->id,
        'course_id' => null,
        'starts_at' => '2026-07-27 08:00:00',
        'ends_at' => '2026-07-27 10:00:00',
        'mode' => 'offline',
        'location' => 'Lab Robotik',
    ]);
    $this->assertDatabaseHas('teaching_schedules', [
        'school_id' => $school->id,
        'instructor_id' => $instructor->id,
        'course_id' => null,
        'starts_at' => '2026-07-29 08:00:00',
        'ends_at' => '2026-07-29 10:00:00',
    ]);
});

test('instructor dashboard includes courses and students from assigned school learning path access', function () {
    $school = School::factory()->create(['status' => 'active']);
    $instructor = User::factory()->instructor()->create();
    $student = User::factory()->student()->create(['school_id' => $school->id]);
    $unstartedStudent = User::factory()->student()->create(['school_id' => $school->id]);
    $learningPath = LearningPath::factory()->create(['status' => 'published']);
    $course = Course::factory()->free()->create([
        'learning_path_id' => $learningPath->id,
        'instructor_id' => null,
        'status' => 'published',
        'title' => 'Arduino Sekolah',
    ]);

    SchoolLearningPathAccess::create([
        'school_id' => $school->id,
        'learning_path_id' => $learningPath->id,
        'status' => 'active',
    ]);

    TeachingSchedule::create([
        'school_id' => $school->id,
        'instructor_id' => $instructor->id,
        'course_id' => null,
        'title' => 'Kelas Robotik Sekolah',
        'starts_at' => now()->addDay()->setTime(9, 0),
        'ends_at' => now()->addDay()->setTime(11, 0),
        'mode' => 'offline',
        'location' => 'Lab Robotik',
        'status' => 'scheduled',
    ]);

    Enrollment::factory()->create([
        'user_id' => $student->id,
        'course_id' => $course->id,
        'progress_percent' => 60,
    ]);

    $this->actingAs($instructor)
        ->get('/instructor/dashboard')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('instructor/dashboard', false)
            ->where('stats.courses', 1)
            ->where('stats.students', 2)
            ->where('stats.averageProgress', 60)
            ->where('courses.0.title', 'Arduino Sekolah')
            ->where('courses.0.students', 2));

    expect($unstartedStudent->school_id)->toBe($school->id);
});

test('instructor report requires evidence photo and can be approved by admin', function () {
    Storage::fake('public');

    $school = School::factory()->create();
    $admin = User::factory()->admin()->create();
    $instructor = User::factory()->instructor()->create();
    $course = Course::factory()->free()->create(['instructor_id' => $instructor->id]);
    $schedule = TeachingSchedule::create([
        'school_id' => $school->id,
        'instructor_id' => $instructor->id,
        'course_id' => $course->id,
        'title' => 'Offline Sensor',
        'starts_at' => now()->subDay()->setTime(9, 0),
        'ends_at' => now()->subDay()->setTime(11, 0),
        'mode' => 'offline',
        'location' => 'Lab Sensor',
        'status' => 'scheduled',
    ]);

    $payload = [
        'teaching_schedule_id' => $schedule->id,
        'actual_date' => now()->toDateString(),
        'started_at' => '09:00',
        'ended_at' => '11:00',
        'topic' => 'Sensor ultrasonik',
        'student_attendance_count' => 28,
        'report' => 'Siswa melakukan praktik wiring sensor ultrasonik dan menguji pembacaan jarak.',
    ];

    $this->actingAs($instructor)->post('/instructor/teaching-sessions', $payload)
        ->assertSessionHasErrors('evidence_photo');

    $this->actingAs($instructor)->post('/instructor/teaching-sessions', [
        ...$payload,
        'evidence_photo' => UploadedFile::fake()->image('laporan.jpg'),
    ])->assertSessionHasNoErrors();

    $session = TeachingSession::firstOrFail();
    Storage::disk('public')->assertExists($session->evidence_photo_path);

    expect($session->status)->toBe('submitted')
        ->and($session->evidence_photo_path)->toStartWith('teaching-sessions/');

    $this->actingAs($admin)->patch("/admin/teaching-sessions/{$session->id}/review", [
        'status' => 'approved',
        'review_notes' => 'Laporan dan bukti foto sesuai.',
    ])->assertSessionHasNoErrors();

    expect($session->fresh()->status)->toBe('approved')
        ->and($schedule->fresh()->status)->toBe('completed');
});

test('admin generates payroll from approved teaching sessions only once', function () {
    Storage::fake('public');
    $this->travelTo(CarbonImmutable::parse('2026-07-20 10:00:00', config('app.timezone')));

    $admin = User::factory()->admin()->create();
    $school = School::factory()->create();
    $instructor = User::factory()->instructor()->create();
    $course = Course::factory()->free()->create(['instructor_id' => $instructor->id]);
    $schedule = TeachingSchedule::create([
        'school_id' => $school->id,
        'instructor_id' => $instructor->id,
        'course_id' => $course->id,
        'title' => 'Pertemuan Payroll',
        'starts_at' => now()->subDay()->setTime(9, 0),
        'ends_at' => now()->subDay()->setTime(11, 0),
        'mode' => 'offline',
        'location' => 'Lab',
        'status' => 'completed',
    ]);
    InstructorPayRate::create([
        'instructor_id' => $instructor->id,
        'amount_per_session' => 275000,
        'effective_from' => now()->startOfMonth()->toDateString(),
        'is_active' => true,
    ]);
    TeachingSession::create([
        'teaching_schedule_id' => $schedule->id,
        'school_id' => $school->id,
        'instructor_id' => $instructor->id,
        'course_id' => $course->id,
        'actual_date' => now()->toDateString(),
        'started_at' => '09:00',
        'ended_at' => '11:00',
        'topic' => 'Payroll eligible session',
        'student_attendance_count' => 20,
        'report' => 'Laporan lengkap untuk payroll pengajar.',
        'evidence_photo_path' => 'teaching-sessions/test/laporan.jpg',
        'status' => 'approved',
        'reviewed_by' => $admin->id,
        'reviewed_at' => now(),
    ]);

    $this->actingAs($instructor)->patch('/instructor/payrolls/bank-account', [
        'bank_name' => 'BCA',
        'bank_account_name' => $instructor->name,
        'bank_account_number' => '1234567890',
    ])->assertSessionHasNoErrors();

    $this->assertDatabaseHas('users', [
        'id' => $instructor->id,
        'bank_name' => 'BCA',
        'bank_account_number' => '1234567890',
    ]);

    $this->actingAs($admin)->post('/admin/instructor-payrolls', [
        'instructor_id' => $instructor->id,
        'period_month' => now()->format('Y-m'),
        'notes' => 'Payroll bulan berjalan.',
    ])->assertSessionHasNoErrors();

    $payroll = InstructorPayroll::firstOrFail();

    expect($payroll->total_sessions)->toBe(1)
        ->and($payroll->total_amount)->toBe(275000)
        ->and($payroll->items()->count())->toBe(1);

    $this->actingAs($admin)->post('/admin/instructor-payrolls', [
        'instructor_id' => $instructor->id,
        'period_month' => now()->format('Y-m'),
    ])->assertSessionHasErrors('period_month');

    $this->actingAs($admin)->patch("/admin/instructor-payrolls/{$payroll->id}", [
        'status' => 'paid',
        'notes' => 'Sudah dibayar.',
        'payment_proof' => UploadedFile::fake()->image('bukti-transfer.jpg'),
    ])->assertSessionHasNoErrors();

    expect($payroll->fresh()->status)->toBe('paid')
        ->and($payroll->fresh()->paid_at)->not->toBeNull()
        ->and($payroll->fresh()->payment_proof_path)->toStartWith('payroll-proofs/');
    Storage::disk('public')->assertExists($payroll->fresh()->payment_proof_path);

    $this->actingAs($admin)->delete("/admin/instructor-payrolls/{$payroll->id}")
        ->assertSessionHas('error');
});

test('school teacher can learn courses from school learning path access only', function () {
    $school = School::factory()->create();
    $teacher = User::factory()->teacher()->create(['school_id' => $school->id]);
    $learningPath = LearningPath::factory()->create(['status' => 'published']);
    $course = Course::factory()->paid()->create([
        'learning_path_id' => $learningPath->id,
        'status' => 'published',
    ]);
    $chapter = Chapter::factory()->create(['course_id' => $course->id, 'order_no' => 1]);
    Lesson::factory()->create(['chapter_id' => $chapter->id, 'order_no' => 1]);
    $outsideCourse = Course::factory()->free()->create(['status' => 'published']);

    SchoolLearningPathAccess::create([
        'school_id' => $school->id,
        'learning_path_id' => $learningPath->id,
        'status' => 'active',
    ]);

    $this->actingAs($teacher)
        ->post("/courses/{$course->id}/enroll")
        ->assertRedirect("/learning?course={$course->id}");

    $this->assertDatabaseHas('enrollments', [
        'user_id' => $teacher->id,
        'course_id' => $course->id,
        'status' => 'active',
    ]);

    $this->actingAs($teacher)->get("/learning?course={$course->id}")
        ->assertOk();

    $this->actingAs($teacher)
        ->post("/courses/{$outsideCourse->id}/enroll")
        ->assertForbidden();
});

test('student can check in by qr and instructor can edit attendance before submitting report', function () {
    Storage::fake('public');

    $school = School::factory()->create();
    $student = User::factory()->student()->create(['school_id' => $school->id]);
    $manualStudent = User::factory()->student()->create(['school_id' => $school->id]);
    $instructor = User::factory()->instructor()->create();
    $course = Course::factory()->free()->create(['instructor_id' => $instructor->id]);
    $schedule = TeachingSchedule::create([
        'school_id' => $school->id,
        'instructor_id' => $instructor->id,
        'course_id' => $course->id,
        'title' => 'Offline Arduino',
        'starts_at' => now()->setTime(9, 0),
        'ends_at' => now()->setTime(11, 0),
        'mode' => 'offline',
        'location' => 'Lab Robotik',
        'status' => 'scheduled',
    ]);

    $this->actingAs($instructor)
        ->post('/instructor/teaching-sessions/draft', [
            'teaching_schedule_id' => $schedule->id,
            'actual_date' => now()->toDateString(),
            'started_at' => now()->format('H:i'),
            'topic' => 'Dasar board Arduino',
        ])
        ->assertRedirect('/instructor/teaching-sessions')
        ->assertSessionHas('success');

    $session = TeachingSession::firstOrFail();

    expect($session->status)->toBe('draft')
        ->and($session->report)->toBe('')
        ->and($session->evidence_photo_path)->toBe('');

    $signedQrUrl = URL::temporarySignedRoute(
        'student.teaching-attendances.scan.store',
        now()->addHour(),
        ['teachingSchedule' => $schedule->id],
    );

    $this->actingAs($student)
        ->get($signedQrUrl)
        ->assertRedirect("/student/teaching-schedules/{$schedule->id}/feedback")
        ->assertSessionHas('success');

    $this->assertDatabaseHas('teaching_attendances', [
        'teaching_schedule_id' => $schedule->id,
        'student_id' => $student->id,
        'status' => 'H',
        'source' => 'student_qr',
    ]);

    $this->actingAs($student)
        ->post("/student/teaching-schedules/{$schedule->id}/feedback", [
            'rating' => 5,
            'understanding_level' => 'understand',
            'comment' => 'Materi Arduino jelas dan mudah diikuti.',
            'suggestion' => 'Tambahkan waktu praktik sensor.',
        ])
        ->assertRedirect('/student/dashboard')
        ->assertSessionHas('success');

    $this->assertDatabaseHas('teaching_feedbacks', [
        'teaching_schedule_id' => $schedule->id,
        'student_id' => $student->id,
        'instructor_id' => $instructor->id,
        'rating' => 5,
        'understanding_level' => 'understand',
        'comment' => 'Materi Arduino jelas dan mudah diikuti.',
    ]);

    $this->actingAs($student)
        ->get('/student/dashboard')
        ->assertInertia(fn (Assert $page) => $page
            ->component('dashboard', false)
            ->where('offlineAttendances.0.status', 'H')
            ->where('offlineAttendances.0.statusLabel', 'Hadir'));

    $this->actingAs($instructor)
        ->get("/instructor/teaching-sessions/{$session->id}/attendances")
        ->assertOk();

    $this->actingAs($instructor)
        ->getJson("/instructor/teaching-sessions/{$session->id}/attendances/data")
        ->assertOk()
        ->assertJsonPath('summary.present', 1)
        ->assertJsonPath('feedbackSummary.total', 1)
        ->assertJsonPath('feedbackSummary.averageRating', 5)
        ->assertJsonFragment([
            'id' => $student->id,
            'status' => 'H',
            'source' => 'student_qr',
        ]);

    $this->actingAs($instructor)
        ->patch("/instructor/teaching-sessions/{$session->id}/attendances", [
            'attendances' => [
                [
                    'student_id' => $student->id,
                    'status' => 'H',
                    'reason' => '',
                ],
                [
                    'student_id' => $manualStudent->id,
                    'status' => 'S',
                    'reason' => 'Sakit demam dan izin tidak mengikuti kelas.',
                    'proof' => UploadedFile::fake()->image('surat-sakit.jpg'),
                ],
            ],
        ])
        ->assertSessionHas('success');

    $this->assertDatabaseHas('teaching_attendances', [
        'teaching_schedule_id' => $schedule->id,
        'student_id' => $manualStudent->id,
        'status' => 'S',
        'reason' => 'Sakit demam dan izin tidak mengikuti kelas.',
        'source' => 'instructor_manual',
    ]);

    $this->actingAs($instructor)
        ->patch("/instructor/teaching-sessions/{$session->id}/submit", [
            'report' => 'Pengajar menjelaskan board Arduino, pin digital, pin analog, dan praktik rangkaian LED pertama.',
            'evidence_photo' => UploadedFile::fake()->image('bukti-laporan.jpg'),
        ])
        ->assertSessionHas('success');

    expect($session->fresh()->status)->toBe('submitted')
        ->and($session->fresh()->student_attendance_count)->toBe(1)
        ->and($session->fresh()->evidence_photo_path)->toStartWith('teaching-sessions/');

    Storage::disk('public')->assertExists($session->fresh()->evidence_photo_path);
    Storage::disk('public')->assertExists(TeachingAttendance::where('student_id', $manualStudent->id)->firstOrFail()->proof_path);
    expect(TeachingAttendance::count())->toBe(2);

    $this->actingAs($instructor)
        ->patch("/instructor/teaching-sessions/{$session->id}/attendances", [
            'attendances' => [
                [
                    'student_id' => $student->id,
                    'status' => 'H',
                    'reason' => '',
                ],
            ],
        ])
        ->assertForbidden();
});

test('instructor can open legacy submission file when assigned to student school', function () {
    Storage::fake('local');

    $school = School::factory()->create();
    $student = User::factory()->student()->create(['school_id' => $school->id]);
    $instructor = User::factory()->instructor()->create();
    $otherInstructor = User::factory()->instructor()->create();
    $course = Course::factory()->free()->create(['instructor_id' => $otherInstructor->id]);
    TeachingSchedule::create([
        'school_id' => $school->id,
        'instructor_id' => $instructor->id,
        'course_id' => $course->id,
        'title' => 'Penugasan Sekolah Lama',
        'starts_at' => now()->addDay()->setTime(9, 0),
        'ends_at' => now()->addDay()->setTime(11, 0),
        'mode' => 'offline',
        'location' => 'Lab Robotik',
        'status' => 'scheduled',
    ]);
    $enrollment = Enrollment::factory()->create([
        'user_id' => $student->id,
        'course_id' => $course->id,
    ]);
    Storage::disk('local')->put('submissions/legacy-image.jpg', 'legacy image content');
    $submission = Submission::factory()->create([
        'enrollment_id' => $enrollment->id,
        'image_path' => 'submissions/legacy-image.jpg',
    ]);

    $this->actingAs($instructor)
        ->get("/submissions/{$submission->id}/files/image")
        ->assertOk();
});

test('admin and instructor can view teaching feedback grouped by meeting', function () {
    $admin = User::factory()->admin()->create();
    $school = School::factory()->create();
    $instructor = User::factory()->instructor()->create();
    $otherInstructor = User::factory()->instructor()->create();
    $student = User::factory()->student()->create(['school_id' => $school->id]);
    $course = Course::factory()->free()->create(['instructor_id' => $instructor->id]);
    $schedule = TeachingSchedule::create([
        'school_id' => $school->id,
        'instructor_id' => $instructor->id,
        'course_id' => $course->id,
        'title' => 'Feedback Robotik',
        'starts_at' => now()->subDay()->setTime(9, 0),
        'ends_at' => now()->subDay()->setTime(11, 0),
        'mode' => 'offline',
        'location' => 'Lab Robotik',
        'status' => 'completed',
    ]);
    $session = TeachingSession::create([
        'teaching_schedule_id' => $schedule->id,
        'school_id' => $school->id,
        'instructor_id' => $instructor->id,
        'course_id' => $course->id,
        'actual_date' => now()->toDateString(),
        'started_at' => '09:00',
        'ended_at' => '11:00',
        'topic' => 'Materi LED',
        'student_attendance_count' => 1,
        'report' => 'Pertemuan berjalan baik.',
        'evidence_photo_path' => 'teaching-sessions/test.jpg',
        'status' => 'approved',
    ]);

    DB::table('teaching_feedbacks')->insert([
        'teaching_schedule_id' => $schedule->id,
        'teaching_session_id' => $session->id,
        'school_id' => $school->id,
        'instructor_id' => $instructor->id,
        'course_id' => $course->id,
        'student_id' => $student->id,
        'rating' => 5,
        'understanding_level' => 'partly_understand',
        'comment' => 'Materi jelas, praktik perlu ditambah.',
        'suggestion' => 'Tambahkan waktu wiring.',
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    $this->actingAs($admin)
        ->get('/admin/teaching-feedbacks')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('teaching/feedbacks', false)
            ->where('stats.feedbacks', 1)
            ->where('stats.meetings', 1)
            ->where('meetings.0.items.0.student', $student->name));

    $this->actingAs($instructor)
        ->get('/instructor/teaching-feedbacks')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('teaching/feedbacks', false)
            ->where('stats.feedbacks', 1)
            ->where('meetings.0.instructor', $instructor->name));

    $this->actingAs($otherInstructor)
        ->get('/instructor/teaching-feedbacks')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('teaching/feedbacks', false)
            ->where('stats.feedbacks', 0)
            ->where('stats.meetings', 0));
});
