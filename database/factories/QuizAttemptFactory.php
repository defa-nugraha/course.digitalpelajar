<?php

namespace Database\Factories;

use App\Models\Quiz;
use App\Models\QuizAttempt;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<QuizAttempt>
 */
class QuizAttemptFactory extends Factory
{
    public function definition(): array
    {
        $score = fake()->numberBetween(40, 100);

        return [
            'quiz_id' => Quiz::factory(),
            'user_id' => User::factory(),
            'score' => $score,
            'passed' => $score >= 70,
            'answers' => [],
        ];
    }
}
