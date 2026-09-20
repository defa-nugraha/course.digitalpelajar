<?php

use App\Models\Course;
use App\Models\Enrollment;
use App\Models\School;
use App\Models\StudentProgressNote;
use App\Models\TeachingAttendance;
use App\Models\TeachingSchedule;
use App\Models\TeachingSession;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

test('school teacher sees student progress for each school meeting and can write a note', function () {
    $school = School::factory()->create();
    $admin = User::factory()->admin()->create();
    $teacher = User::factory()->teacher()->create(['school_id' => $school->id]);
    $student = User::factory()->student()->create(['school_id' => $school->id]);
    $course = Course::factory()->free()->create(['status' => 'published']);
    Enrollment::factory()->create([
        'user_id' => $student->id,
        'course_id' => $course->id,
        'progress_percent' => 65,
    ]);
    $schedule = TeachingSchedule::create([
        'school_id' => $school->id,
        'instructor_id' => $teacher->id,
        'course_id' => $course->id,
        'title' => 'Pertemuan Sensor Ultrasonik',
        'starts_at' => now()->subDay()->setTime(9, 0),
        'ends_at' => now()->subDay()->setTime(11, 0),
        'mode' => 'offline',
        'location' => 'Lab Robotik',
        'status' => 'completed',
    ]);
    TeachingSession::create([
        'teaching_schedule_id' => $schedule->id,
        'school_id' => $school->id,
        'instructor_id' => $teacher->id,
        'course_id' => $course->id,
        'actual_date' => now()->subDay()->toDateString(),
        'started_at' => '09:00',
        'ended_at' => '11:00',
        'topic' => 'Praktik Sensor Ultrasonik',
        'student_attendance_count' => 1,
        'report' => 'Siswa mempraktikkan pembacaan jarak dan kalibrasi sensor ultrasonik.',
        'evidence_photo_path' => 'teaching-sessions/sensor.jpg',
        'status' => 'approved',
        'reviewed_by' => $admin->id,
        'reviewed_at' => now(),
        'review_notes' => 'Laporan sudah lengkap.',
    ]);
    TeachingAttendance::create([
        'teaching_schedule_id' => $schedule->id,
        'student_id' => $student->id,
        'status' => 'H',
        'checked_in_at' => $schedule->starts_at->addMinutes(8),
        'late_minutes' => 8,
        'source' => 'student_qr',
    ]);

    $this->actingAs($teacher)
        ->get('/teacher/students')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('teacher/students', false)
            ->where('meetings.0.id', $schedule->id)
            ->where('meetings.0.title', 'Pertemuan Sensor Ultrasonik')
            ->where('meetings.0.topic', 'Praktik Sensor Ultrasonik')
            ->where('meetings.0.reviewStatus', 'approved')
            ->where('meetings.0.students.0.id', $student->id)
            ->where('meetings.0.students.0.progress', 65)
            ->where('meetings.0.students.0.attendanceStatus', 'H')
            ->where('meetings.0.students.0.lateMinutes', 8));

    $this->actingAs($teacher)
        ->put("/teacher/teaching-schedules/{$schedule->id}/students/{$student->id}/progress-note", [
            'note' => 'Pemahaman sensor sudah baik. Latih kembali kalibrasi jarak.',
        ])
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    $this->assertDatabaseHas('student_progress_notes', [
        'school_id' => $school->id,
        'teacher_id' => $teacher->id,
        'student_id' => $student->id,
        'teaching_schedule_id' => $schedule->id,
        'note' => 'Pemahaman sensor sudah baik. Latih kembali kalibrasi jarak.',
    ]);

    $this->actingAs($teacher)
        ->put("/teacher/teaching-schedules/{$schedule->id}/students/{$student->id}/progress-note", [
            'note' => 'Kalibrasi sudah membaik, lanjutkan latihan mandiri.',
        ])
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    expect(StudentProgressNote::query()->count())->toBe(1);
    $this->assertDatabaseHas('student_progress_notes', [
        'teacher_id' => $teacher->id,
        'student_id' => $student->id,
        'teaching_schedule_id' => $schedule->id,
        'note' => 'Kalibrasi sudah membaik, lanjutkan latihan mandiri.',
    ]);

    $this->actingAs($student)
        ->get('/student/dashboard')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('dashboard', false)
            ->where('teacherNotes.0.note', 'Kalibrasi sudah membaik, lanjutkan latihan mandiri.')
            ->where('teacherNotes.0.teacher', $teacher->name)
            ->where('teacherNotes.0.meeting', 'Pertemuan Sensor Ultrasonik'));
});

test('school teacher only sees admin reviewed school sessions in read only mode', function () {
    $school = School::factory()->create();
    $otherSchool = School::factory()->create();
    $admin = User::factory()->admin()->create();
    $teacher = User::factory()->teacher()->create(['school_id' => $school->id]);
    $instructor = User::factory()->instructor()->create();

    $reviewedSchedule = createProgressSchedule($school->id, $instructor->id, 'Pertemuan Direview');
    $reviewed = createProgressSession($reviewedSchedule, $admin, 'approved');
    $submittedSchedule = createProgressSchedule($school->id, $instructor->id, 'Pertemuan Belum Direview');
    $submitted = createProgressSession($submittedSchedule, null, 'submitted');
    $otherSchedule = createProgressSchedule($otherSchool->id, $instructor->id, 'Pertemuan Sekolah Lain');
    $otherSession = createProgressSession($otherSchedule, $admin, 'approved');

    $this->actingAs($teacher)
        ->get('/teacher/teaching-sessions')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('teaching/sessions', false)
            ->where('scope', 'teacher')
            ->where('permissions.canCreateReport', false)
            ->where('permissions.canReview', false)
            ->where('permissions.canDelete', false)
            ->has('sessions', 1)
            ->where('sessions.0.id', $reviewed->id)
            ->where('sessions.0.payrollStatus', null));

    $this->actingAs($teacher)
        ->get("/teacher/teaching-sessions/{$reviewed->id}")
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('teaching/session-detail', false)
            ->where('scope', 'teacher')
            ->where('session.id', $reviewed->id)
            ->where('session.report', 'Catatan kegiatan pengajar untuk sekolah.')
            ->where('session.evidencePhotoUrl', fn ($url) => str_ends_with($url, '/storage/teaching-sessions/reviewed.jpg'))
            ->where('session.payrolls', []));

    $this->actingAs($teacher)->get("/teacher/teaching-sessions/{$submitted->id}")->assertForbidden();
    $this->actingAs($teacher)->get("/teacher/teaching-sessions/{$otherSession->id}")->assertForbidden();
});

test('school teacher sees detailed attendance recap only from admin reviewed meetings', function () {
    $school = School::factory()->create();
    $otherSchool = School::factory()->create();
    $admin = User::factory()->admin()->create();
    $teacher = User::factory()->teacher()->create(['school_id' => $school->id]);
    $instructor = User::factory()->instructor()->create();
    $student = User::factory()->student()->create([
        'school_id' => $school->id,
        'name' => 'Siswa Monitoring',
    ]);

    $reviewedSchedule = createProgressSchedule($school->id, $instructor->id, 'Pertemuan Direview');
    createProgressSession($reviewedSchedule, $admin, 'approved');
    TeachingAttendance::create([
        'teaching_schedule_id' => $reviewedSchedule->id,
        'student_id' => $student->id,
        'status' => 'H',
        'checked_in_at' => $reviewedSchedule->starts_at->addMinutes(17),
        'late_minutes' => 17,
        'source' => 'student_qr',
    ]);

    $submittedSchedule = createProgressSchedule($school->id, $instructor->id, 'Pertemuan Belum Direview');
    createProgressSession($submittedSchedule, null, 'submitted');
    TeachingAttendance::create([
        'teaching_schedule_id' => $submittedSchedule->id,
        'student_id' => $student->id,
        'status' => 'A',
        'checked_in_at' => $submittedSchedule->starts_at,
        'late_minutes' => 0,
        'source' => 'manual',
    ]);

    $otherSchedule = createProgressSchedule($otherSchool->id, $instructor->id, 'Pertemuan Sekolah Lain');
    createProgressSession($otherSchedule, $admin, 'approved');

    $this->actingAs($teacher)
        ->get('/teacher/students/attendance')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('teacher/attendance-recap', false)
            ->where('summary.students', 1)
            ->where('summary.meetings', 1)
            ->where('summary.averageAttendance', 100)
            ->where('students.0.id', $student->id)
            ->where('students.0.present', 1)
            ->where('students.0.absent', 0)
            ->where('students.0.lateCount', 1)
            ->where('students.0.totalLateMinutes', 17)
            ->has('students.0.meetings', 1)
            ->where('students.0.meetings.0.meeting', 'Pertemuan Direview')
            ->where('students.0.meetings.0.statusLabel', 'Hadir'));

    $this->actingAs($teacher)
        ->get('/teacher/students/attendance?from='.now()->addDay()->toDateString())
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('summary.meetings', 0)
            ->where('students.0.totalMeetings', 0));
});

test('school teacher cannot write progress notes outside their school', function () {
    $teacherSchool = School::factory()->create();
    $otherSchool = School::factory()->create();
    $teacher = User::factory()->teacher()->create(['school_id' => $teacherSchool->id]);
    $otherStudent = User::factory()->student()->create(['school_id' => $otherSchool->id]);
    $otherSchedule = TeachingSchedule::create([
        'school_id' => $otherSchool->id,
        'instructor_id' => null,
        'course_id' => null,
        'title' => 'Pertemuan Sekolah Lain',
        'starts_at' => now()->addDay(),
        'ends_at' => now()->addDay()->addHours(2),
        'mode' => 'offline',
        'location' => 'Lab Robotik',
        'status' => 'scheduled',
    ]);

    $this->actingAs($teacher)
        ->put("/teacher/teaching-schedules/{$otherSchedule->id}/students/{$otherStudent->id}/progress-note", [
            'note' => 'Catatan tidak sah.',
        ])
        ->assertForbidden();

    expect(StudentProgressNote::query()->count())->toBe(0);
});

test('student only sees progress notes addressed to their account', function () {
    $school = School::factory()->create();
    $teacher = User::factory()->teacher()->create(['school_id' => $school->id]);
    $firstStudent = User::factory()->student()->create(['school_id' => $school->id]);
    $secondStudent = User::factory()->student()->create(['school_id' => $school->id]);
    $schedule = TeachingSchedule::create([
        'school_id' => $school->id,
        'instructor_id' => $teacher->id,
        'course_id' => null,
        'title' => 'Praktik Robot Line Follower',
        'starts_at' => now()->subDay(),
        'ends_at' => now()->subDay()->addHours(2),
        'mode' => 'offline',
        'location' => 'Lab Robotik',
        'status' => 'completed',
    ]);
    StudentProgressNote::create([
        'school_id' => $school->id,
        'teacher_id' => $teacher->id,
        'student_id' => $firstStudent->id,
        'teaching_schedule_id' => $schedule->id,
        'note' => 'Catatan khusus siswa pertama.',
    ]);

    $this->actingAs($secondStudent)
        ->get('/student/dashboard')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->where('teacherNotes', []));
});

function createProgressSchedule(int $schoolId, int $instructorId, string $title): TeachingSchedule
{
    return TeachingSchedule::create([
        'school_id' => $schoolId,
        'instructor_id' => $instructorId,
        'course_id' => null,
        'title' => $title,
        'starts_at' => now()->subDay()->setTime(9, 0),
        'ends_at' => now()->subDay()->setTime(11, 0),
        'mode' => 'offline',
        'location' => 'Lab Robotik',
        'status' => 'completed',
    ]);
}

function createProgressSession(TeachingSchedule $schedule, ?User $reviewer, string $status): TeachingSession
{
    return TeachingSession::create([
        'teaching_schedule_id' => $schedule->id,
        'school_id' => $schedule->school_id,
        'instructor_id' => $schedule->instructor_id,
        'course_id' => null,
        'actual_date' => now()->subDay()->toDateString(),
        'started_at' => '09:00',
        'ended_at' => '11:00',
        'topic' => $schedule->title,
        'student_attendance_count' => 0,
        'report' => 'Catatan kegiatan pengajar untuk sekolah.',
        'evidence_photo_path' => 'teaching-sessions/reviewed.jpg',
        'status' => $status,
        'reviewed_by' => $reviewer?->id,
        'reviewed_at' => $reviewer ? now() : null,
        'review_notes' => $reviewer ? 'Sudah direview admin.' : null,
    ]);
}
