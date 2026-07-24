<?php

use Database\Seeders\ArduinoBasicsCourseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;

uses(RefreshDatabase::class);

test('arduino basics seeder creates complete published course content', function () {
    $this->seed(ArduinoBasicsCourseSeeder::class);

    $course = DB::table('courses')->where('slug', 'dasar-arduino-lengkap-dari-nol')->first();

    expect($course)->not->toBeNull()
        ->and($course->status)->toBe('published')
        ->and($course->price_type)->toBe('free');

    $chapterIds = DB::table('chapters')->where('course_id', $course->id)->pluck('id');
    $lessonIds = DB::table('lessons')->whereIn('chapter_id', $chapterIds)->pluck('id');

    expect($chapterIds)->toHaveCount(8)
        ->and($lessonIds)->toHaveCount(24)
        ->and(DB::table('content_blocks')->whereIn('lesson_id', $lessonIds)->count())->toBeGreaterThanOrEqual(70)
        ->and(DB::table('content_blocks')->whereIn('lesson_id', $lessonIds)->where('type', 'submission')->count())->toBeGreaterThanOrEqual(6)
        ->and(DB::table('quizzes')->where('course_id', $course->id)->where('is_final_exam', false)->count())->toBe(8)
        ->and(DB::table('quizzes')->where('course_id', $course->id)->where('is_final_exam', true)->count())->toBe(1);
});
