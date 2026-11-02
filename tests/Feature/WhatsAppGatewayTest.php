<?php

use App\Jobs\SendWhatsAppMessage;
use App\Models\Course;
use App\Models\CourseBill;
use App\Models\Enrollment;
use App\Models\School;
use App\Models\TeachingSchedule;
use App\Models\User;
use App\Models\WhatsAppMessage;
use App\Services\WhatsAppGateway;
use Illuminate\Http\Client\Request as HttpRequest;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\DB;
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

test('admin can queue WhatsApp schedule notices for the instructor and every active student at the school', function () {
    Bus::fake();

    $school = School::factory()->create();
    $otherSchool = School::factory()->create();
    $admin = User::factory()->admin()->create(['school_id' => $school->id]);
    $instructor = User::factory()->instructor()->create([
        'school_id' => $school->id,
        'phone' => '081234567891',
    ]);
    $student = User::factory()->student()->create([
        'school_id' => $school->id,
        'name' => 'Siswa Jadwal Course',
        'phone' => '081234567892',
    ]);
    $studentWithoutCourse = User::factory()->student()->create([
        'school_id' => $school->id,
        'name' => 'Siswa Jadwal Sekolah',
        'phone' => '081234567893',
    ]);
    User::factory()->student()->create([
        'school_id' => $otherSchool->id,
        'phone' => '081234567894',
    ]);
    $course = Course::factory()->create(['title' => 'Robotik Dasar']);
    Enrollment::factory()->create([
        'user_id' => $student->id,
        'course_id' => $course->id,
        'status' => 'active',
    ]);
    $schedule = TeachingSchedule::query()->create([
        'school_id' => $school->id,
        'instructor_id' => $instructor->id,
        'course_id' => $course->id,
        'title' => 'Pertemuan Robotik',
        'starts_at' => now()->addDay()->setTime(9, 0),
        'ends_at' => now()->addDay()->setTime(10, 0),
        'mode' => 'offline',
        'location' => 'Lab Komputer',
        'status' => 'scheduled',
    ]);

    $this->actingAs($admin)
        ->post('/admin/teaching-schedules/'.$schedule->id.'/whatsapp', ['recipients' => 'both'])
        ->assertRedirect()
        ->assertSessionHas('success');

    $messages = WhatsAppMessage::query()->where('type', 'schedule_notice')->get();

    expect($messages)->toHaveCount(3)
        ->and($messages->pluck('recipient_number')->all())->toContain('6281234567891', '6281234567892', '6281234567893')
        ->and($messages->pluck('recipient_number')->all())->not->toContain('6281234567894')
        ->and($messages->pluck('message')->implode(' '))->toContain('Pertemuan Robotik')
        ->and($messages->pluck('message')->implode(' '))->toContain('Robotik Dasar')
        ->and($messages->every(fn (WhatsAppMessage $message) => $message->status === 'queued'))->toBeTrue();

    Bus::assertDispatchedTimes(SendWhatsAppMessage::class, 3);
});

test('admin can send schedule WhatsApp reminders to students only', function () {
    Bus::fake();

    $school = School::factory()->create();
    $admin = User::factory()->admin()->create();
    $instructor = User::factory()->instructor()->create([
        'school_id' => $school->id,
        'phone' => '081234567895',
    ]);
    $student = User::factory()->student()->create([
        'school_id' => $school->id,
        'phone' => '081234567896',
    ]);
    $schedule = TeachingSchedule::query()->create([
        'school_id' => $school->id,
        'instructor_id' => $instructor->id,
        'course_id' => null,
        'title' => 'Pertemuan Umum Sekolah',
        'starts_at' => now()->addDay()->setTime(9, 0),
        'ends_at' => now()->addDay()->setTime(10, 0),
        'mode' => 'offline',
        'location' => 'Aula',
        'status' => 'scheduled',
    ]);

    $this->actingAs($admin)
        ->post('/admin/teaching-schedules/'.$schedule->id.'/whatsapp', ['recipients' => 'students'])
        ->assertRedirect()
        ->assertSessionHas('success');

    $messages = WhatsAppMessage::query()->where('type', 'schedule_notice')->get();

    expect($messages)->toHaveCount(1)
        ->and($messages->first()->user_id)->toBe($student->id)
        ->and($messages->first()->recipient_number)->toBe('6281234567896');

    Bus::assertDispatchedTimes(SendWhatsAppMessage::class, 1);
});

test('schedule WhatsApp recipient choice is required and validated', function () {
    Bus::fake();

    $admin = User::factory()->admin()->create();
    $school = School::factory()->create();
    $instructor = User::factory()->instructor()->create(['school_id' => $school->id]);
    $schedule = TeachingSchedule::query()->create([
        'school_id' => $school->id,
        'instructor_id' => $instructor->id,
        'course_id' => null,
        'title' => 'Jadwal Validasi',
        'starts_at' => now()->addDay()->setTime(9, 0),
        'ends_at' => now()->addDay()->setTime(10, 0),
        'mode' => 'offline',
        'location' => 'Aula',
        'status' => 'scheduled',
    ]);

    $this->actingAs($admin)
        ->post('/admin/teaching-schedules/'.$schedule->id.'/whatsapp', ['recipients' => 'invalid'])
        ->assertSessionHasErrors('recipients');

    expect(WhatsAppMessage::query()->where('type', 'schedule_notice')->count())->toBe(0);
    Bus::assertNotDispatched(SendWhatsAppMessage::class);
});

test('admin can save separate WhatsApp templates for teaching schedule recipients', function () {
    $admin = User::factory()->admin()->create();

    $this->actingAs($admin)
        ->patch('/admin/whatsapp/schedule-template', [
            'instructor_message' => 'Halo {nama_pengajar}, jadwal {judul_jadwal}.',
            'student_message' => 'Halo {nama}, jadwal {judul_jadwal}.',
        ])
        ->assertRedirect()
        ->assertSessionHas('success');

    $configuration = json_decode(
        (string) DB::table('whatsapp_templates')->where('key', 'teaching_schedule')->value('configuration'),
        true,
    );

    expect($configuration['instructor_message'])->toBe('Halo {nama_pengajar}, jadwal {judul_jadwal}.')
        ->and($configuration['student_message'])->toBe('Halo {nama}, jadwal {judul_jadwal}.');
});

test('WhatsApp button mode calls send-template with button definitions', function () {
    Http::fake([
        'wa.digitalpelajar.id/send-template' => Http::response([
            'status' => true,
            'msg' => 'Template sent successfully!',
        ], 200),
    ]);

    $message = WhatsAppMessage::query()->create([
        'recipient_number' => '6281234567890',
        'message' => 'Halo, silakan pilih tindakan.',
        'type' => 'campaign',
        'status' => 'queued',
        'send_mode' => 'button',
        'template_buttons' => [
            'url|Lihat tagihan|https://digitalpelajar.id/pembayaran',
            'call|Hubungi kami|6281234567890',
        ],
        'footer' => 'Digital Pelajar',
    ]);

    (new SendWhatsAppMessage($message->id))->handle(app(WhatsAppGateway::class));

    expect($message->fresh()->status)->toBe('sent')
        ->and($message->fresh()->gateway_response['status'])->toBeTrue();

    Http::assertSent(fn (HttpRequest $request) => $request->url() === 'https://wa.digitalpelajar.id/send-template'
        && $request['api_key'] === 'test-api-key'
        && $request['sender'] === '6281234567890'
        && $request['number'] === '6281234567890'
        && $request['message'] === 'Halo, silakan pilih tindakan.'
        && $request['footer'] === 'Digital Pelajar'
        && $request['template'] === [
            'url|Lihat tagihan|https://digitalpelajar.id/pembayaran',
            'call|Hubungi kami|6281234567890',
        ]);
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
