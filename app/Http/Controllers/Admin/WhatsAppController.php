<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Jobs\SendWhatsAppMessage;
use App\Models\User;
use App\Models\WhatsAppMessage;
use App\Services\AuditLogger;
use App\Services\WhatsAppGateway;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class WhatsAppController extends Controller
{
    public function index(WhatsAppGateway $gateway): Response
    {
        $students = User::query()
            ->where('role', 'student')
            ->where('status', 'active')
            ->whereNotNull('phone')
            ->where('phone', '!=', '')
            ->orderBy('name')
            ->get(['id', 'name', 'student_number', 'phone'])
            ->map(fn (User $student) => [
                'id' => $student->id,
                'name' => $student->name,
                'studentNumber' => $student->student_number,
                'phone' => $student->phone,
                'normalizedPhone' => WhatsAppGateway::normalizePhone($student->phone),
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
                'message' => Str::limit($message->message, 120),
                'status' => $message->status,
                'createdAt' => $message->created_at->format('d-m-Y H:i'),
                'sentAt' => $message->sent_at?->format('d-m-Y H:i'),
            ]);

        return Inertia::render('admin/whatsapp', [
            'students' => $students,
            'messages' => $messages,
            'gatewayConfigured' => $gateway->isConfigured(),
        ]);
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
            'consent_confirmed' => ['accepted'],
        ]);

        $students = User::query()
            ->where('role', 'student')
            ->where('status', 'active')
            ->whereIn('id', $data['student_ids'])
            ->get(['id', 'name', 'student_number', 'phone']);

        $queued = 0;
        $skipped = 0;

        foreach ($students as $student) {
            $number = WhatsAppGateway::normalizePhone($student->phone);

            if (! $number) {
                $skipped++;

                continue;
            }

            $personalizedMessage = str_replace(
                ['{nama}', '{id_siswa}'],
                [$student->name, (string) $student->student_number],
                trim($data['message']),
            );

            $message = WhatsAppMessage::query()->create([
                'user_id' => $student->id,
                'sent_by' => $request->user()->id,
                'recipient_number' => $number,
                'message' => $personalizedMessage,
                'type' => 'campaign',
                'status' => 'queued',
            ]);

            SendWhatsAppMessage::dispatch($message->id);
            $queued++;
        }

        if ($queued === 0) {
            return back()->with('error', 'Tidak ada penerima terpilih dengan nomor WhatsApp yang valid.');
        }

        AuditLogger::log('whatsapp.campaign.queued', $request->user(), null, [
            'queued_count' => $queued,
            'skipped_count' => $skipped,
            'recipient_ids' => $students->pluck('id')->all(),
        ]);

        $feedback = $queued.' pesan WhatsApp masuk antrean.';

        if ($skipped > 0) {
            $feedback .= ' '.$skipped.' siswa dilewati karena nomor WhatsApp tidak valid.';
        }

        return back()->with('success', $feedback);
    }
}
