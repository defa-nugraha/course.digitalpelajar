<?php

use App\Models\Course;
use App\Models\Enrollment;
use App\Models\LearningPath;
use App\Models\School;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;

uses(RefreshDatabase::class);

test('guests are redirected to the login page', function () {
    $this->get('/dashboard')->assertRedirect('/login');
});

test('authenticated users are redirected to their role dashboard', function () {
    $this->actingAs($user = User::factory()->create());

    $this->get('/dashboard')->assertRedirect('/student/dashboard');
});

test('student learning entry and internal catalog are accessible without opening player directly', function () {
    $student = User::factory()->student()->create();
    $course = Course::factory()->free()->create(['status' => 'published']);
    Enrollment::factory()->create([
        'user_id' => $student->id,
        'course_id' => $course->id,
        'status' => 'active',
    ]);

    $this->actingAs($student)
        ->get('/student/learning')
        ->assertOk();

    $this->actingAs($student)
        ->get('/student/catalog')
        ->assertOk();

    $this->actingAs($student)
        ->get('/student/upcoming')
        ->assertOk();

    $this->actingAs($student)
        ->get('/learning')
        ->assertRedirect('/student/learning');
});

test('school teacher uses internal catalog and learning entry pages', function () {
    $school = School::factory()->create();
    $teacher = User::factory()->teacher()->create(['school_id' => $school->id]);
    $path = LearningPath::factory()->create(['status' => 'published']);
    Course::factory()->free()->create([
        'learning_path_id' => $path->id,
        'status' => 'published',
    ]);
    DB::table('school_learning_path_accesses')->insert([
        'school_id' => $school->id,
        'learning_path_id' => $path->id,
        'status' => 'active',
        'starts_at' => null,
        'expires_at' => null,
        'notes' => null,
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    $this->actingAs($teacher)
        ->get('/teacher/catalog')
        ->assertOk();

    $this->actingAs($teacher)
        ->get('/teacher/learning')
        ->assertOk();

    $this->actingAs($teacher)
        ->get('/learning')
        ->assertRedirect('/teacher/learning');
});
