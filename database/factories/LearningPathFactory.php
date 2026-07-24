<?php

namespace Database\Factories;

use App\Models\LearningPath;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<LearningPath>
 */
class LearningPathFactory extends Factory
{
    public function definition(): array
    {
        return [
            'title' => $title = Str::title(fake()->words(3, true)),
            'slug' => Str::slug($title).'-'.fake()->unique()->numberBetween(1000, 9999),
            'description' => fake()->sentence(),
            'level' => fake()->randomElement(['beginner', 'intermediate', 'advanced', 'beginner-to-advanced']),
            'status' => 'published',
            'meta_title' => $title.' | RoboAcademy',
            'meta_description' => fake()->sentence(16),
        ];
    }
}
