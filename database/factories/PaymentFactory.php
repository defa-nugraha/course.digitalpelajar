<?php

namespace Database\Factories;

use App\Models\Course;
use App\Models\Payment;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Payment>
 */
class PaymentFactory extends Factory
{
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'course_id' => Course::factory(),
            'order_id' => 'NGW-'.strtoupper(Str::random(8)),
            'amount' => 1_500_000,
            'status' => 'pending',
            'payment_method' => null,
            'snap_token' => null,
            'checkout_url' => null,
            'gateway_payload' => null,
            'paid_at' => null,
        ];
    }

    public function paid(): static
    {
        return $this->state(fn () => [
            'status' => 'paid',
            'payment_method' => 'credit_card',
            'paid_at' => now(),
        ]);
    }
}
