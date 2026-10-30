<?php

use App\Models\Course;
use App\Models\CourseBill;
use App\Http\Middleware\HandleInertiaRequests;
use App\Models\Payment;
use App\Models\User;
use Illuminate\Support\Facades\Http;
use Inertia\Testing\AssertableInertia as Assert;

test('student accounts receive unique six digit student numbers automatically', function () {
    $firstStudent = User::factory()->student()->create();
    $secondStudent = User::factory()->student()->create();

    expect($firstStudent->student_number)
        ->toMatch('/^\d{6}$/')
        ->not->toBe($secondStudent->student_number);

    expect($secondStudent->student_number)->toMatch('/^\d{6}$/');
});

test('public payment lookup only returns outstanding bills belonging to the submitted student number', function () {
    $student = User::factory()->student()->create();
    $otherStudent = User::factory()->student()->create();
    $course = Course::factory()->paid(250000)->create();

    $bill = CourseBill::query()->create([
        'student_id' => $student->id,
        'course_id' => $course->id,
        'title' => 'Tagihan Robotika Oktober',
        'amount' => 175000,
        'due_at' => now()->addDays(7)->toDateString(),
        'status' => 'pending',
    ]);

    CourseBill::query()->create([
        'student_id' => $otherStudent->id,
        'course_id' => $course->id,
        'title' => 'Tagihan Siswa Lain',
        'amount' => 225000,
        'due_at' => now()->addDays(7)->toDateString(),
        'status' => 'pending',
    ]);

    $this->get('/pembayaran')
        ->assertInertia(fn (Assert $page) => $page
            ->component('payments/public', false)
            ->where('searched', false)
            ->has('bills', 0));

    $this->post('/pembayaran/tagihan', [
        'student_number' => $student->student_number,
    ])->assertInertia(fn (Assert $page) => $page
        ->component('payments/public', false)
        ->where('studentNumber', $student->student_number)
        ->where('searched', true)
        ->has('bills', 1)
        ->where('bills.0.id', $bill->id)
        ->where('bills.0.title', 'Tagihan Robotika Oktober'));
});

test('public checkout creates one grouped payment and marks every selected bill paid', function () {
    config(['midtrans.is_enabled' => false]);

    $student = User::factory()->student()->create();
    $course = Course::factory()->paid(250000)->create();

    $firstBill = CourseBill::query()->create([
        'student_id' => $student->id,
        'course_id' => $course->id,
        'title' => 'Biaya Pendaftaran',
        'amount' => 100000,
        'due_at' => now()->addDays(7)->toDateString(),
        'status' => 'pending',
    ]);

    $secondBill = CourseBill::query()->create([
        'student_id' => $student->id,
        'course_id' => $course->id,
        'title' => 'Biaya Modul',
        'amount' => 150000,
        'due_at' => now()->addDays(7)->toDateString(),
        'status' => 'pending',
    ]);

    $response = $this->withHeader('X-Inertia', 'true')
        ->post('/pembayaran/bayar', [
            'student_number' => $student->student_number,
            'bill_ids' => [$firstBill->id, $secondBill->id],
        ]);

    $response->assertStatus(409)->assertHeader('X-Inertia-Location');

    $payment = Payment::query()->where('user_id', $student->id)->firstOrFail();

    expect($payment->amount)->toBe(250000)
        ->and($payment->course_id)->toBeNull()
        ->and($payment->course_bill_id)->toBeNull()
        ->and($payment->courseBills()->pluck('course_bills.id')->all())
        ->toEqualCanonicalizing([$firstBill->id, $secondBill->id]);

    $mockUrl = $response->headers->get('X-Inertia-Location');
    $inertiaHeaders = ['X-Inertia' => 'true'];
    $assetVersion = app(HandleInertiaRequests::class)->version(request());

    if ($assetVersion !== null) {
        $inertiaHeaders['X-Inertia-Version'] = $assetVersion;
    }

    $mockPage = $this->withHeaders($inertiaHeaders)->get($mockUrl)
        ->assertOk()
        ->assertJsonPath('component', 'payments/mock-checkout')
        ->assertJsonPath('props.payment.amount', 250000)
        ->assertJsonPath('props.payment.type', 'Tagihan kursus');

    $settleUrl = $mockPage->json('props.payment.settleUrl');

    $this->post($settleUrl, ['payment_method' => 'qris'])
        ->assertRedirect('/pembayaran');

    expect($payment->fresh()->status)->toBe('paid')
        ->and($firstBill->fresh()->status)->toBe('paid')
        ->and($secondBill->fresh()->status)->toBe('paid');
});

test('public checkout rejects a bill that belongs to another student', function () {
    config(['midtrans.is_enabled' => false]);

    $student = User::factory()->student()->create();
    $otherStudent = User::factory()->student()->create();
    $course = Course::factory()->paid(250000)->create();

    $otherBill = CourseBill::query()->create([
        'student_id' => $otherStudent->id,
        'course_id' => $course->id,
        'title' => 'Tagihan Privat',
        'amount' => 125000,
        'due_at' => now()->addDays(7)->toDateString(),
        'status' => 'pending',
    ]);

    $this->post('/pembayaran/bayar', [
        'student_number' => $student->student_number,
        'bill_ids' => [$otherBill->id],
    ])->assertSessionHasErrors('bill_ids');

    expect(Payment::query()->exists())->toBeFalse();
});

test('public checkout creates a fresh payment when the previous Midtrans Snap has expired', function () {
    config([
        'midtrans.is_enabled' => true,
        'midtrans.server_key' => 'test-server-key',
        'midtrans.api_url' => 'https://api.sandbox.midtrans.com',
        'midtrans.snap_url' => 'https://app.sandbox.midtrans.com/snap/v1/transactions',
        'midtrans.environment' => 'sandbox',
    ]);

    $student = User::factory()->student()->create();
    $course = Course::factory()->paid(250000)->create();

    $bill = CourseBill::query()->create([
        'student_id' => $student->id,
        'course_id' => $course->id,
        'title' => 'Tagihan Robotika',
        'amount' => 125000,
        'due_at' => now()->addDays(7)->toDateString(),
        'status' => 'pending',
    ]);

    $oldPayment = Payment::query()->create([
        'user_id' => $student->id,
        'course_id' => $course->id,
        'course_bill_id' => $bill->id,
        'order_id' => 'OLD-ORDER-123',
        'amount' => 125000,
        'status' => 'pending',
        'snap_token' => 'old-token',
        'checkout_url' => 'https://app.sandbox.midtrans.com/snap/v3/vtweb/old-token',
    ]);

    Http::fake([
        'https://api.sandbox.midtrans.com/v2/OLD-ORDER-123/status' => Http::response([
            'order_id' => 'OLD-ORDER-123',
            'gross_amount' => '125000.00',
            'transaction_status' => 'expire',
        ], 200),
        'https://app.sandbox.midtrans.com/snap/v1/transactions' => Http::response([
            'token' => 'new-snap-token',
            'redirect_url' => 'https://app.sandbox.midtrans.com/snap/v3/vtweb/new-snap-token',
        ], 201),
    ]);

    $this->withHeader('X-Inertia', 'true')
        ->post('/pembayaran/bayar', [
            'student_number' => $student->student_number,
            'bill_ids' => [$bill->id],
        ])
        ->assertStatus(409)
        ->assertHeader('X-Inertia-Location', 'https://app.sandbox.midtrans.com/snap/v3/vtweb/new-snap-token');

    $newPayment = Payment::query()->where('user_id', $student->id)->where('id', '!=', $oldPayment->id)->firstOrFail();

    expect($oldPayment->fresh()->status)->toBe('expired')
        ->and($newPayment->status)->toBe('pending')
        ->and($newPayment->snap_token)->toBe('new-snap-token')
        ->and($newPayment->amount)->toBe(125000);

    Http::assertSent(fn ($request) => str_contains($request->url(), '/v2/OLD-ORDER-123/status'));
});
