<?php

namespace Database\Factories;

use App\Models\CertificateTemplate;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<CertificateTemplate>
 */
class CertificateTemplateFactory extends Factory
{
    public function definition(): array
    {
        return [
            'name' => fake()->words(3, true).' Certificate',
            'layout' => [
                'title' => 'Certificate of Completion',
                'primary_color' => '#1C7DE8',
                'accent_color' => '#FED635',
                'elements' => ['student_name', 'course_title', 'issue_date', 'qr_code'],
            ],
            'status' => 'published',
        ];
    }
}
