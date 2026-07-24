<?php

namespace Database\Factories;

use App\Models\Chapter;
use App\Models\Lesson;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Lesson>
 */
class LessonFactory extends Factory
{
    public function definition(): array
    {
        return [
            'chapter_id' => Chapter::factory(),
            'title' => fake()->sentence(3),
            'order_no' => Lesson::max('order_no') + 1 ?? 1,
            'is_required' => true,
            'available_at' => null,
        ];
    }
}
