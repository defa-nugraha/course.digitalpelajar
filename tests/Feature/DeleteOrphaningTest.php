<?php

use App\Models\Course;
use App\Models\Enrollment;
use App\Models\Payment;
use App\Models\School;
use App\Models\User;

test('admin can delete user with learning history and related records become orphaned safely', function () {
    $school = School::factory()->create();
    $admin = User::factory()->admin()->create(['school_id' => $school->id]);
    $student = User::factory()->student()->create(['school_id' => $school->id]);
    $course = Course::factory()->free()->create();
    $enrollment = Enrollment::factory()->create([
        'user_id' => $student->id,
        'course_id' => $course->id,
    ]);
    $payment = Payment::factory()->create([
        'user_id' => $student->id,
        'course_id' => $course->id,
        'status' => 'paid',
    ]);

    $this->actingAs($admin)
        ->delete("/admin/users/{$student->id}")
        ->assertSessionHas('success');

    expect(User::query()->whereKey($student->id)->exists())->toBeFalse()
        ->and($enrollment->fresh()->user_id)->toBeNull()
        ->and($payment->fresh()->user_id)->toBeNull();
});

test('admin can delete course with enrollment and payment history', function () {
    $admin = User::factory()->admin()->create();
    $student = User::factory()->student()->create();
    $course = Course::factory()->free()->create();
    $enrollment = Enrollment::factory()->create([
        'user_id' => $student->id,
        'course_id' => $course->id,
    ]);
    $payment = Payment::factory()->create([
        'user_id' => $student->id,
        'course_id' => $course->id,
        'status' => 'paid',
    ]);

    $this->actingAs($admin)
        ->delete("/admin/courses/{$course->id}")
        ->assertSessionHas('success');

    expect(Course::query()->whereKey($course->id)->exists())->toBeFalse()
        ->and($enrollment->fresh()->course_id)->toBeNull()
        ->and($payment->fresh()->course_id)->toBeNull();
});
