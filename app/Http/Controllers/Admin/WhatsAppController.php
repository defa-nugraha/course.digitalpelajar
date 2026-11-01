<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Jobs\SendWhatsAppMessage;
use App\Models\User;
use App\Models\Course;
use App\Models\School;
use App\Models\WhatsAppMessage;
use App\Services\AuditLogger;
use App\Services\WhatsAppGateway;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class WhatsAppController extends Controller
{
    private function defaultBillTemplate(): array
    {
        return [
            'mode' => 'text',
            'audience' => 'student',
            'message' => "Halo {nama},\n\nIni pengingat tagihan kursus Digital Pelajar.\nTagihan: {tagihan}\nKursus: {kursus}\nNominal: {nominal}\nJatuh tempo: {jatuh_tempo}\nID Siswa: {id_siswa}\n\nSilakan lihat dan lanjutkan pembayaran melalui {url_pembayaran}.\n\nJika sudah membayar, abaikan pesan ini. Terima kasih.",
            'media_type' => 'image',
            'media_url' => '',
            'footer' => 'Digital Pelajar',
            'template_buttons' => ['url|Lihat tagihan|https://digitalpelajar.id/pembayaran'],
        ];
    }

    private function billTemplate(): array
    {
        $stored = DB::table('whatsapp_templates')->where('key', 'bill_reminder')->value('configuration');

        if (! $stored) {
            return $this->defaultBillTemplate();
        }

        $decoded = is_array($stored) ? $stored : json_decode((string) $stored, true);

        return is_array($decoded) ? array_merge($this->defaultBillTemplate(), $decoded) : $this->defaultBillTemplate();
    }

    public function index(WhatsAppGateway $gateway): Response
    {
        $students = User::query()
            ->with(['school:id,name', 'enrollments.course:id,title'])
            ->where('role', 'student')
            ->where('status', 'active')
            ->orderBy('name')
            ->get(['id', 'name', 'student_number', 'phone', 'whatsapp_phone', 'parent_whatsapp_phone', 'school_id'])
            ->map(fn (User $student) => [
                'id' => $student->id,
                'name' => $student->name,
                'studentNumber' => $student->student_number,
                'phone' => $student->whatsapp_phone ?: $student->phone,
                'parentPhone' => $student->parent_whatsapp_phone,
                'normalizedPhone' => WhatsAppGateway::normalizePhone($student->whatsapp_phone ?: $student->phone),
                'normalizedParentPhone' => WhatsAppGateway::normalizePhone($student->parent_whatsapp_phone),
                'schoolId' => $student->school_id,
                'schoolName' => $student->school?->name ?? 'Belum diatur',
                'courseIds' => $student->enrollments->pluck('course_id')->unique()->values(),
                'courseNames' => $student->enrollments->pluck('course.title')->filter()->unique()->values(),
            ]);

        $messages = WhatsAppMessage::query()
            ->with(['recipient:id,name'])
            ->latest('id')
            ->limit(30)
            ->get()
            ->map(fn (WhatsAppMessage $message) => [
                'id' => $message->id,
                'recipientName' => $message->recipient?->name ?? 'Kontak tidak tersedia',
                'recipientNumber' => $message->recipient_number,
                'type' => $message->type,
                'mode' => $message->send_mode ?? 'text',
                'message' => Str::limit($message->message, 120),
                'status' => $message->status,
                'error' => $message->status === 'failed' ? data_get($message->gateway_response, 'msg') : null,
                'createdAt' => $message->created_at->format('d-m-Y H:i'),
                'sentAt' => $message->sent_at?->format('d-m-Y H:i'),
            ]);

        return Inertia::render('admin/whatsapp', [
            'students' => $students,
            'messages' => $messages,
            'gatewayConfigured' => $gateway->isConfigured(),
            'billTemplate' => $this->billTemplate(),
            'schools' => School::query()->orderBy('name')->get(['id', 'name']),
            'courses' => Course::query()->orderBy('title')->get(['id', 'title']),
        ]);
    }

    public function saveBillTemplate(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'mode' => ['required', Rule::in(['text', 'media', 'button'])],
            'audience' => ['required', Rule::in(['student', 'parent', 'both'])],
            'message' => ['required', 'string', 'min:3', 'max:1500'],
            'media_type' => ['nullable', Rule::in(['image', 'video', 'audio', 'pdf', 'xls', 'xlsx', 'doc', 'docx', 'zip'])],
            'media_url' => ['nullable', 'url', 'max:2000'],
            'footer' => ['nullable', 'string', 'max:500'],
            'template_buttons' => ['nullable', 'array', 'min:1', 'max:3'],
            'template_buttons.*' => ['required', 'string', 'max:300', 'regex:/^(call|url)\|[^|]+\|.+$/u'],
        ]);

        if ($data['mode'] === 'media' && (blank($data['media_type'] ?? null) || blank($data['media_url'] ?? null))) {
            return back()->withErrors(['media_url' => 'Tipe dan URL media wajib diisi untuk mode media.']);
        }

        if ($data['mode'] === 'button' && empty($data['template_buttons'])) {
            return back()->withErrors(['template_buttons' => 'Mode tombol membutuhkan 1 sampai 3 tombol.']);
        }

        DB::table('whatsapp_templates')->updateOrInsert(
            ['key' => 'bill_reminder'],
            [
                'configuration' => json_encode([
                    'mode' => $data['mode'],
                    'audience' => $data['audience'],
                    'message' => $data['message'],
                    'media_type' => $data['media_type'] ?? null,
                    'media_url' => $data['media_url'] ?? null,
                    'footer' => $data['footer'] ?? null,
                    'template_buttons' => $data['template_buttons'] ?? [],
                ], JSON_THROW_ON_ERROR),
                'updated_at' => now(),
                'created_at' => now(),
            ],
        );

        return back()->with('success', 'Template pengingat tagihan berhasil disimpan.');
    }

    public function destroyMessage(Request $request, WhatsAppMessage $whatsAppMessage): RedirectResponse
    {
        $messageId = $whatsAppMessage->id;

        AuditLogger::log('whatsapp.message.deleted', $request->user(), $whatsAppMessage, [
            'status' => $whatsAppMessage->status,
            'mode' => $whatsAppMessage->send_mode ?? 'text',
        ]);

        // A queued job checks this row before sending, so deleting it also cancels a not-yet-started message.
        $whatsAppMessage->delete();

        return back()->with('success', 'Riwayat pesan WhatsApp #'.$messageId.' berhasil dihapus.');
    }

    public function sendCampaign(Request $request, WhatsAppGateway $gateway): RedirectResponse
    {
        if (! $gateway->isConfigured()) {
            return back()->with('error', 'Gateway WhatsApp belum dikonfigurasi. Isi kredensial WHATSAPP_GATEWAY_* di .env.');
        }

        $data = $request->validate([
            'student_ids' => ['required', 'array', 'min:1', 'max:100'],
            'student_ids.*' => [
                'required',
                'integer',
                'distinct',
                Rule::exists('users', 'id')->where('role', 'student')->where('status', 'active'),
            ],
            'message' => ['required', 'string', 'min:3', 'max:1500'],
            'audience' => ['required', Rule::in(['student', 'parent', 'both'])],
            'school_id' => ['nullable', 'integer', Rule::exists('schools', 'id')],
            'course_id' => ['nullable', 'integer', Rule::exists('courses', 'id')],
            'send_mode' => ['sometimes', Rule::in(['text', 'media', 'button'])],
            'media_type' => ['nullable', Rule::in(['image', 'video', 'audio', 'pdf', 'xls', 'xlsx', 'doc', 'docx', 'zip'])],
            'media_url' => ['nullable', 'url', 'max:2000'],
            'footer' => ['nullable', 'string', 'max:500'],
            'template_buttons' => ['nullable', 'array', 'min:1', 'max:3'],
            'template_buttons.*' => ['required', 'string', 'max:300', 'regex:/^(call|url)\|[^|]+\|.+$/u'],
            'consent_confirmed' => ['accepted'],
        ]);

        $sendMode = $data['send_mode'] ?? 'text';

        if ($sendMode === 'media' && (blank($data['media_type'] ?? null) || blank($data['media_url'] ?? null))) {
            return back()->withErrors(['media_url' => 'Tipe dan URL media wajib diisi untuk mode media.']);
        }

        if ($sendMode === 'button' && empty($data['template_buttons'])) {
            return back()->withErrors(['template_buttons' => 'Mode tombol membutuhkan 1 sampai 3 tombol.']);
        }

        $students = User::query()
            ->where('role', 'student')
            ->where('status', 'active')
            ->whereIn('id', $data['student_ids'])
            ->when(! empty($data['school_id']), fn ($query) => $query->where('school_id', $data['school_id']))
            ->when(! empty($data['course_id']), fn ($query) => $query->whereHas('enrollments', fn ($enrollments) => $enrollments->where('course_id', $data['course_id'])))
            ->get(['id', 'name', 'student_number', 'phone', 'whatsapp_phone', 'parent_whatsapp_phone']);

        $queued = 0;
        $skipped = 0;

        foreach ($students as $student) {
            $targets = [];
            if (in_array($data['audience'], ['student', 'both'], true)) {
                $targets[] = ['number' => WhatsAppGateway::normalizePhone($student->whatsapp_phone ?: $student->phone), 'kind' => 'siswa'];
            }
            if (in_array($data['audience'], ['parent', 'both'], true)) {
                $targets[] = ['number' => WhatsAppGateway::normalizePhone($student->parent_whatsapp_phone), 'kind' => 'orang tua'];
            }

            foreach ($targets as $target) {
                if (! $target['number']) {
                    $skipped++;
                    continue;
                }
                $personalizedMessage = str_replace(
                    ['{nama}', '{id_siswa}', '{jenis_penerima}'],
                    [$student->name, (string) $student->student_number, $target['kind']],
                    trim($data['message']),
                );
                $message = WhatsAppMessage::query()->create([
                    'user_id' => $student->id,
                    'sent_by' => $request->user()->id,
                    'recipient_number' => $target['number'],
                    'message' => $personalizedMessage,
                    'type' => 'campaign',
                    'status' => 'queued',
                    'send_mode' => $sendMode,
                    'media_type' => $data['media_type'] ?? null,
                    'media_url' => $data['media_url'] ?? null,
                    'footer' => $data['footer'] ?? null,
                    'template_buttons' => $data['template_buttons'] ?? null,
                ]);
                SendWhatsAppMessage::dispatch($message->id);
                $queued++;
            }
        }

        if ($queued === 0) {
            return back()->with('error', 'Tidak ada penerima terpilih dengan nomor WhatsApp yang valid.');
        }

        AuditLogger::log('whatsapp.campaign.queued', $request->user(), null, [
            'queued_count' => $queued,
            'skipped_count' => $skipped,
            'mode' => $sendMode,
            'audience' => $data['audience'],
            'school_id' => $data['school_id'] ?? null,
            'course_id' => $data['course_id'] ?? null,
            'recipient_ids' => $students->pluck('id')->all(),
        ]);

        $feedback = $queued.' pesan WhatsApp masuk antrean.';

        if ($skipped > 0) {
            $feedback .= ' '.$skipped.' siswa dilewati karena nomor WhatsApp tidak valid.';
        }

        return back()->with('success', $feedback);
    }
}
