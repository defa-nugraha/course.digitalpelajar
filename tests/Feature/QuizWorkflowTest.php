<?php

use App\Models\Course;
use App\Models\Quiz;
use App\Models\QuizAttempt;
use App\Models\User;
use App\Services\QuizService;

it('normalizes duplicate questions while preserving the first question order', function () {
    $questions = Quiz::normalizeQuestions([
        [
            'id' => 'q-1',
            'question' => 'Apa fungsi sensor?',
            'answer' => 'Membaca kondisi',
            'options' => ['Membaca kondisi', 'Menyalakan motor', 'A', 'A'],
        ],
        [
            'id' => 'q-1',
            'question' => 'Apa fungsi sensor?',
            'answer' => 'Membaca kondisi',
            'options' => ['Membaca kondisi', 'Menyalakan motor'],
        ],
        [
            'question' => 'Soal legacy',
            'answer' => 'Benar',
            'options' => ['Benar', 'Salah'],
        ],
        [
            'question' => 'Soal legacy',
            'answer' => 'Benar',
            'options' => ['Benar', 'Salah'],
        ],
    ]);

    expect($questions)->toHaveCount(2)
        ->and($questions[0]['id'])->toBe('q-1')
        ->and($questions[0]['options'])->toBe(['Membaca kondisi', 'Menyalakan motor', 'A'])
        ->and($questions[1]['id'])->toStartWith('q-');
});

it('uses the quiz configured passing score and records failed attempts', function () {
    $course = Course::factory()->create();
    $quiz = Quiz::factory()->for($course)->create([
        'passing_score' => 80,
        'questions' => [
            [
                'id' => 'q-1',
                'question' => '1 + 1 = ?',
                'answer' => '2',
                'options' => ['1', '2', '3', '4'],
            ],
            [
                'id' => 'q-2',
                'question' => '2 + 2 = ?',
                'answer' => '4',
                'options' => ['2', '3', '4', '5'],
            ],
            [
                'id' => 'q-3',
                'question' => '3 + 3 = ?',
                'answer' => '6',
                'options' => ['5', '6', '7', '8'],
            ],
            [
                'id' => 'q-4',
                'question' => '4 + 4 = ?',
                'answer' => '8',
                'options' => ['6', '7', '8', '9'],
            ],
        ],
    ]);
    $student = User::factory()->student()->create();
    $attempt = app(QuizService::class)->grade($student, $quiz, ['2', '4', '0', '0']);

    expect($attempt)->toBeInstanceOf(QuizAttempt::class)
        ->and($attempt->score)->toBe(50)
        ->and($attempt->passed)->toBeFalse()
        ->and($quiz->attempts()->whereKey($attempt->id)->exists())->toBeTrue();
});

it('passes when the score reaches the configured minimum', function () {
    $course = Course::factory()->create();
    $quiz = Quiz::factory()->for($course)->create([
        'passing_score' => 50,
        'questions' => [
            ['id' => 'q-1', 'question' => 'A', 'answer' => '1', 'options' => ['1', '2']],
            ['id' => 'q-2', 'question' => 'B', 'answer' => '2', 'options' => ['1', '2']],
        ],
    ]);
    $student = User::factory()->student()->create();
    $attempt = app(QuizService::class)->grade($student, $quiz, ['1', '0']);

    expect($attempt->score)->toBe(50)
        ->and($attempt->passed)->toBeTrue();
});

it('only exposes detailed breakdown for passed attempts', function () {
    $course = Course::factory()->create();
    $quiz = Quiz::factory()->for($course)->create([
        'passing_score' => 80,
        'questions' => [
            ['id' => 'q-1', 'question' => 'A', 'answer' => '1', 'options' => ['1', '2']],
            ['id' => 'q-2', 'question' => 'B', 'answer' => '2', 'options' => ['1', '2']],
        ],
    ]);
    $student = User::factory()->student()->create();
    $service = app(QuizService::class);

    $failed = $service->grade($student, $quiz, ['1', '0']);
    $passed = $service->grade($student, $quiz, ['1', '2']);

    expect($service->passedAttemptBreakdown($quiz, $failed))->toBe([])
        ->and($service->passedAttemptBreakdown($quiz, $passed))->toHaveCount(2)
        ->and($service->passedAttemptBreakdown($quiz, $passed)[0]['correct'])->toBeTrue()
        ->and($service->passedAttemptBreakdown($quiz, $passed)[1]['correct'])->toBeTrue();
});
