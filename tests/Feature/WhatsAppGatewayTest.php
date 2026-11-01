<?php

use App\Jobs\SendWhatsAppMessage;
use App\Models\Course;
use App\Models\CourseBill;
use App\Models\User;
use App\Models\WhatsAppMessage;
use App\Services\WhatsAppGateway;
use Illuminate\Http\Client\Request as HttpRequest;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\Http;

beforeEach(function () {
    config([
        'services.whatsapp.base_url' => 'https://wa.digitalpelajar.id',
        'services.whatsapp.api_key' => 'test-api-key',
        'services.whatsapp.sender' => '6281234567890',
        'services.whatsapp.timeout' => 5,
    ]);
});

test('admin can queue a WhatsApp campaign for selected opted-in student contacts', function () {
    Bus::fake();

    $admin = User::factory()->admin()->create();
    $student = User::factory()->student()->create([
        'name' => 'Siswa Contoh',
        'phone' => '0812-3456-7890',
    ]);

    $this->actingAs($admin)
        ->post('/admin/whatsapp/send', [
            'student_ids' => [$student->id],
            'message' => 'Halo {nama}, ID kamu {id_siswa}.',
            'consent_confirmed' => true,
        ])
        ->assertRedirect();

    $message = WhatsAppMessage::query()->firstOrFail();

    expect($message->recipient_number)->toBe('6281234567890')
        ->and($message->message)->toBe('Halo Siswa Contoh, ID kamu '.$student->student_number.'.')
        ->and($message->status)->toBe('queued')
        ->and($message->type)->toBe('campaign');

    Bus::assertDispatched(SendWhatsAppMessage::class);
});

test('WhatsApp campaign requires consent confirmation', function () {
    Bus::fake();

    $admin = User::factory()->admin()->create();
    $student = User::factory()->student()->create(['phone' => '081234567890']);

    $this->actingAs($admin)
        ->post('/admin/whatsapp/send', [
            'student_ids' => [$student->id],
            'message' => 'Informasi Digital Pelajar.',
            'consent_confirmed' => false,
        ])
        ->assertSessionHasErrors('consent_confirmed');

    expect(WhatsAppMessage::query()->count())->toBe(0);
    Bus::assertNotDispatched(SendWhatsAppMessage::class);
});

test('admin can queue a WhatsApp reminder for a pending course bill', function () {
    Bus::fake();

    $admin = User::factory()->admin()->create();
    $student = User::factory()->student()->create([
        'name' => 'Siswa Tagihan',
        'phone' => '081234567890',
    ]);
    $course = Course::factory()->paid(250000)->create();
    $bill = CourseBill::query()->create([
        'student_id' => $student->id,
        'course_id' => $course->id,
        'created_by' => $admin->id,
        'title' => 'Tagihan Bulanan',
        'amount' => 175000,
        'due_at' => now()->addDays(4)->toDateString(),
        'status' => 'pending',
    ]);

    $this->actingAs($admin)
        ->post('/admin/course-bills/'.$bill->id.'/whatsapp-reminder')
        ->assertRedirect();

    $message = WhatsAppMessage::query()->firstOrFail();

    expect($message->user_id)->toBe($student->id)
        ->and($message->course_bill_id)->toBe($bill->id)
        ->and($message->recipient_number)->toBe('6281234567890')
        ->and($message->message)->toContain('Tagihan Bulanan')
        ->and($message->message)->toContain($student->student_number)
        ->and($message->status)->toBe('queued')
        ->and($message->type)->toBe('bill_reminder');

    Bus::assertDispatched(SendWhatsAppMessage::class);
});

test('bill reminder cannot be sent for a paid bill', function () {
    Bus::fake();

    $admin = User::factory()->admin()->create();
    $student = User::factory()->student()->create(['phone' => '081234567890']);
    $course = Course::factory()->paid(250000)->create();
    $bill = CourseBill::query()->create([
        'student_id' => $student->id,
        'course_id' => $course->id,
        'created_by' => $admin->id,
        'title' => 'Tagihan Lunas',
        'amount' => 175000,
        'due_at' => now()->toDateString(),
        'status' => 'paid',
        'paid_at' => now(),
    ]);

    $this->actingAs($admin)
        ->post('/admin/course-bills/'.$bill->id.'/whatsapp-reminder')
        ->assertStatus(409);

    expect(WhatsAppMessage::query()->count())->toBe(0);
    Bus::assertNotDispatched(SendWhatsAppMessage::class);
});

test('WhatsApp job records a successful gateway response without exposing credentials', function () {
    Http::fake([
        'wa.digitalpelajar.id/send-message' => Http::response([
            'status' => true,
            'msg' => 'Message sent successfully!',
        ], 200),
    ]);

    $message = WhatsAppMessage::query()->create([
        'recipient_number' => '6281234567890',
        'message' => 'Halo dari Digital Pelajar',
        'type' => 'campaign',
        'status' => 'queued',
    ]);

    (new SendWhatsAppMessage($message->id))->handle(app(WhatsAppGateway::class));

    expect($message->fresh()->status)->toBe('sent')
        ->and($message->fresh()->sent_at)->not->toBeNull()
        ->and($message->fresh()->gateway_response['status'])->toBeTrue();

    Http::assertSent(fn (HttpRequest $request) => $request->url() === 'https://wa.digitalpelajar.id/send-message'
        && $request['api_key'] === 'test-api-key'
        && $request['sender'] === '6281234567890'
        && $request['number'] === '6281234567890'
        && $request['message'] === 'Halo dari Digital Pelajar');

    expect(json_encode($message->fresh()->gateway_response))->not->toContain('test-api-key');
});

test('WhatsApp job records gateway rejection as failed', function () {
    Http::fake([
        'wa.digitalpelajar.id/send-message' => Http::response([
            'status' => false,
            'msg' => 'Message failed to send!',
        ], 200),
    ]);

    $message = WhatsAppMessage::query()->create([
        'recipient_number' => '6281234567890',
        'message' => 'Pesan yang gagal',
        'type' => 'campaign',
        'status' => 'queued',
    ]);

    (new SendWhatsAppMessage($message->id))->handle(app(WhatsAppGateway::class));

    expect($message->fresh()->status)->toBe('failed')
        ->and($message->fresh()->sent_at)->toBeNull()
        ->and($message->fresh()->gateway_response['status'])->toBeFalse();
});

test('WhatsApp gateway normalizes Indonesian phone numbers and rejects invalid values', function () {
    expect(WhatsAppGateway::normalizePhone('0812-3456-7890'))->toBe('6281234567890')
        ->and(WhatsAppGateway::normalizePhone('81234567890'))->toBe('6281234567890')
        ->and(WhatsAppGateway::normalizePhone('+62 812 3456 7890'))->toBe('6281234567890')
        ->and(WhatsAppGateway::normalizePhone('not a phone'))->toBeNull()
        ->and(WhatsAppGateway::normalizePhone(null))->toBeNull();
});

test('WhatsApp gateway sends button and template messages with Indonesian country code', function () {
    Http::fake([
        'wa.digitalpelajar.id/send-button' => Http::response(['status' => true, 'msg' => 'sent'], 200),
        'wa.digitalpelajar.id/send-template' => Http::response(['status' => true, 'msg' => 'sent'], 200),
    ]);

    $gateway = app(WhatsAppGateway::class);

    expect($gateway->sendButton('0812-3456-7890', 'Pilih menu', ['Menu A'])['success'])->toBeTrue()
        ->and($gateway->sendTemplate('0812-3456-7890', 'Hubungi kami', ['url|Website|https://digitalpelajar.id'])['success'])->toBeTrue();

    Http::assertSent(fn (HttpRequest $request) => str_ends_with($request->url(), '/send-button')
        && $request['number'] === '6281234567890');
    Http::assertSent(fn (HttpRequest $request) => str_ends_with($request->url(), '/send-template')
        && $request['number'] === '6281234567890');
});

test('WhatsApp admin center is restricted to administrators', function () {
    $student = User::factory()->student()->create();

    $this->actingAs($student)
        ->get('/admin/whatsapp')
        ->assertForbidden();
});
