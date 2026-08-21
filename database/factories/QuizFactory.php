<?php

namespace Database\Factories;

use App\Models\Course;
use App\Models\Lesson;
use App\Models\Quiz;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Quiz>
 */
class QuizFactory extends Factory
{
    public function definition(): array
    {
        return [
            'lesson_id' => Lesson::factory(),
            'course_id' => Course::factory(),
            'title' => 'Quiz: '.fake()->words(3, true),
            'passing_score' => 70,
            'time_limit_mode' => 'none',
            'time_limit_seconds' => null,
            'is_final_exam' => false,
            'questions' => [
                [
                    'question' => 'Berapa pin trigger sensor ultrasonik pada contoh kode?',
                    'options' => ['Pin 9', 'Pin 10', 'Pin 13', 'Pin A0'],
                    'answer' => 'Pin 9',
                ],
                [
                    'question' => 'Apa fungsi passing score default quiz?',
                    'options' => ['50', '60', '70', '80'],
                    'answer' => '70',
                ],
            ],
        ];
    }

    public function finalExam(): static
    {
        return $this->state(fn () => [
            'lesson_id' => null,
            'is_final_exam' => true,
            'passing_score' => 75,
        ]);
    }
}
