<?php

namespace Database\Factories;

use App\Models\ContentBlock;
use App\Models\Lesson;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ContentBlock>
 */
class ContentBlockFactory extends Factory
{
    public function definition(): array
    {
        return [
            'lesson_id' => Lesson::factory(),
            'type' => fake()->randomElement(['text', 'code', 'image', 'video', 'file', 'submission', 'quiz']),
            'content' => fake()->paragraph(),
            'metadata' => null,
            'order_no' => 1,
            'status' => 'published',
        ];
    }
}
