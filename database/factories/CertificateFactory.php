<?php

namespace Database\Factories;

use App\Models\Certificate;
use App\Models\Enrollment;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Certificate>
 */
class CertificateFactory extends Factory
{
    public function definition(): array
    {
        return [
            'enrollment_id' => Enrollment::factory(),
            'certificate_template_id' => null,
            'certificate_no' => 'NGT-'.date('Y').'-'.strtoupper(Str::random(5)),
            'qr_token' => Str::uuid()->toString(),
            'status' => 'issued',
            'issued_at' => now(),
        ];
    }
}
