<?php

namespace Database\Factories;

use App\Models\Course;
use App\Models\ForumThread;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ForumThread>
 */
class ForumThreadFactory extends Factory
{
    public function definition(): array
    {
        return [
            'course_id' => Course::factory(),
            'lesson_id' => null,
            'user_id' => User::factory()->student(),
            'title' => fake()->sentence(5),
            'status' => 'open',
        ];
    }
}
