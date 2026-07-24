<?php

namespace Database\Factories;

use App\Models\Enrollment;
use App\Models\Lesson;
use App\Models\Submission;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Submission>
 */
class SubmissionFactory extends Factory
{
    public function definition(): array
    {
        return [
            'enrollment_id' => Enrollment::factory(),
            'lesson_id' => Lesson::factory(),
            'code' => "#define TRIG_PIN 9\nvoid setup(){}",
            'report_path' => null,
            'image_path' => null,
            'video_url' => null,
            'score' => null,
            'feedback' => null,
            'status' => 'submitted',
        ];
    }

    public function accepted(int $score = 88): static
    {
        return $this->state(fn () => [
            'status' => 'accepted',
            'score' => $score,
            'feedback' => 'Kerja bagus, wiring sudah benar.',
        ]);
    }
}
