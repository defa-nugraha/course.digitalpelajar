<?php

use App\Models\Course;
use App\Models\Enrollment;
use App\Models\LearningPath;
use App\Models\Payment;
use App\Models\School;
use App\Models\SchoolLearningPathAccess;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('admin can manage school learning path accesses', function () {
    $admin = User::factory()->admin()->create();
    $school = School::factory()->create(['status' => 'active']);
    $learningPath = LearningPath::factory()->create(['status' => 'published']);
    Course::factory()->count(2)->create(['learning_path_id' => $learningPath->id]);

    $this->actingAs($admin)
        ->get('/admin/school-learning-path-accesses')
        ->assertOk();

    $this->actingAs($admin)
        ->post('/admin/school-learning-path-accesses', [
            'school_id' => $school->id,
            'learning_path_id' => $learningPath->id,
            'status' => 'active',
            'starts_at' => now()->toDateString(),
            'expires_at' => now()->addMonth()->toDateString(),
            'notes' => 'Kerja sama sekolah.',
        ])
        ->assertSessionHasNoErrors()
        ->assertRedirect();

    $access = SchoolLearningPathAccess::firstOrFail();
    expect($access->school_id)->toBe($school->id)
        ->and($access->learning_path_id)->toBe($learningPath->id)
        ->and($access->status)->toBe('active');

    $this->actingAs($admin)
        ->patch("/admin/school-learning-path-accesses/{$access->id}", [
            'school_id' => $school->id,
            'learning_path_id' => $learningPath->id,
            'status' => 'inactive',
            'starts_at' => now()->toDateString(),
            'expires_at' => now()->addMonths(2)->toDateString(),
            'notes' => 'Dinonaktifkan sementara.',
        ])
        ->assertSessionHasNoErrors()
        ->assertRedirect();

    expect($access->fresh()->status)->toBe('inactive');

    $this->actingAs($admin)
        ->delete("/admin/school-learning-path-accesses/{$access->id}")
        ->assertRedirect();

    expect(SchoolLearningPathAccess::count())->toBe(0);
});

test('school learning path access opens all courses in the path for verified school students', function () {
    $school = School::factory()->create(['status' => 'active']);
    $student = User::factory()->student()->create(['school_id' => $school->id]);
    $learningPath = LearningPath::factory()->create(['status' => 'published']);
    $course = Course::factory()->paid()->create([
        'learning_path_id' => $learningPath->id,
        'status' => 'published',
    ]);

    SchoolLearningPathAccess::create([
        'school_id' => $school->id,
        'learning_path_id' => $learningPath->id,
        'status' => 'active',
    ]);

    $this->actingAs($student)
        ->post("/courses/{$course->id}/enroll")
        ->assertRedirect("/learning?course={$course->id}");

    $this->assertDatabaseHas('enrollments', [
        'user_id' => $student->id,
        'course_id' => $course->id,
        'status' => 'active',
    ]);
    expect(Payment::query()->whereBelongsTo($student)->whereBelongsTo($course)->exists())->toBeFalse();
});

test('school learning path access opens courses for school teachers without payment', function () {
    $school = School::factory()->create(['status' => 'active']);
    $teacher = User::factory()->teacher()->create(['school_id' => $school->id]);
    $learningPath = LearningPath::factory()->create(['status' => 'published']);
    $course = Course::factory()->paid()->create([
        'learning_path_id' => $learningPath->id,
        'status' => 'published',
    ]);

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

    expect(Payment::query()->whereBelongsTo($teacher)->whereBelongsTo($course)->exists())->toBeFalse();
});

test('requested school does not grant learning path access before admin approval', function () {
    $school = School::factory()->create(['status' => 'active']);
    $student = User::factory()->student()->create([
        'school_id' => null,
        'requested_school_id' => $school->id,
        'school_verification_status' => 'pending',
    ]);
    $learningPath = LearningPath::factory()->create(['status' => 'published']);
    $course = Course::factory()->paid()->create([
        'learning_path_id' => $learningPath->id,
        'status' => 'published',
    ]);

    SchoolLearningPathAccess::create([
        'school_id' => $school->id,
        'learning_path_id' => $learningPath->id,
        'status' => 'active',
    ]);

    $this->actingAs($student)
        ->post("/courses/{$course->id}/enroll")
        ->assertRedirectContains('/payments/mock-checkout');

    expect(Enrollment::query()->whereBelongsTo($student)->whereBelongsTo($course)->exists())->toBeFalse();
    expect(Payment::query()->whereBelongsTo($student)->whereBelongsTo($course)->exists())->toBeTrue();
});
