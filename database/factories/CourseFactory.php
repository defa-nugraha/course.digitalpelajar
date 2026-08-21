<?php

namespace Database\Factories;

use App\Models\Course;
use App\Models\LearningPath;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Course>
 */
class CourseFactory extends Factory
{
    public function definition(): array
    {
        return [
            'learning_path_id' => LearningPath::factory(),
            'instructor_id' => User::factory()->instructor(),
            'title' => $title = Str::title(fake()->words(4, true)),
            'slug' => Str::slug($title).'-'.fake()->unique()->numberBetween(1000, 9999),
            'description' => fake()->paragraph(),
            'level' => fake()->randomElement(['beginner', 'intermediate', 'advanced']),
            'price_type' => 'free',
            'price' => 0,
            'access_mode' => 'sequential',
            'learning_format' => 'guided',
            'status' => 'published',
            'meta_title' => $title.' | RoboAcademy',
            'meta_description' => fake()->sentence(18),
        ];
    }

    public function paid(int $price = 1_500_000): static
    {
        return $this->state(fn () => [
            'price_type' => 'paid',
            'price' => $price,
        ]);
    }

    public function free(): static
    {
        return $this->state(fn () => [
            'price_type' => 'free',
            'price' => 0,
        ]);
    }
}
