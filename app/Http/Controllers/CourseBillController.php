<?php

namespace App\Http\Controllers;

use App\Jobs\SendWhatsAppMessage;
use App\Models\Course;
use App\Models\CourseBill;
use App\Models\Payment;
use App\Models\User;
use App\Models\WhatsAppMessage;
use App\Services\AuditLogger;
use App\Services\MidtransService;
use App\Services\WhatsAppGateway;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class CourseBillController extends Controller
{
    public function adminIndex(): Response
    {
        return Inertia::render('admin/course-bills', $this->adminData());
    }

    public function adminData(): array
    {
        return [
            'students' => User::query()
                ->where('role', 'student')
                ->where('status', 'active')
                ->orderBy('name')
                ->get(['id', 'name', 'email', 'student_number', 'phone'])
                ->map(fn (User $student) => [
                    'id' => $student->id,
                    'name' => $student->name,
                    'studentNumber' => $student->student_number,
                    'email' => $student->email,
                    'phone' => $student->phone,
                ]),
            'courses' => Course::query()
                ->where('status', 'published')
                ->orderBy('title')
                ->get(['id', 'title']),
            'bills' => CourseBill::query()
                ->with([
                    'student:id,name,email,student_number,phone',
                    'course:id,title',
                    'payments' => fn ($query) => $query->latest('id'),
                    'batchPayments' => fn ($query) => $query->latest('payments.id')->with('courseBills:id'),
                ])
                ->latest('created_at')
                ->get()
                ->map(function (CourseBill $bill) {
                    $payment = $bill->payments->concat($bill->batchPayments)->sortByDesc('id')->first();

                    return [
                        'id' => $bill->id,
                        'studentId' => $bill->student_id,
                        'studentNumber' => $bill->student->student_number,
                        'courseId' => $bill->course_id,
                        'title' => $bill->title,
                        'student' => $bill->student->name,
                        'email' => $bill->student->email,
                        'studentPhone' => $bill->student->phone,
                        'course' => $bill->course->title,
                        'amount' => $bill->amount,
                        'amountLabel' => $this->rupiah($bill->amount),
                        'dueAt' => $bill->due_at->format('Y-m-d'),
                        'status' => $bill->status === 'pending' && $bill->isOverdue() ? 'overdue' : $bill->status,
                        'checkoutUrl' => $payment?->checkout_url,
                        'orderId' => $payment?->order_id,
                        'createdAt' => $bill->created_at->format('d M Y'),
                        'canDelete' => $bill->status !== 'paid'
                            && ! $bill->payments->concat($bill->batchPayments)->contains(fn (Payment $item) => $item->isPaid()),
                        'canEdit' => $bill->status !== 'paid'
                            && $bill->payments->isEmpty()
                            && $bill->batchPayments->isEmpty(),
                    ];
                }),
        ];
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'student_id' => [
                'required',
                'integer',
                Rule::exists('users', 'id')->where('role', 'student')->where('status', 'active'),
            ],
            'course_id' => ['required', 'integer', 'exists:courses,id'],
            'title' => ['required', 'string', 'max:160'],
            'amount' => ['required', 'integer', 'min:1000', 'max:1000000000'],
            'due_at' => ['required', 'date', 'after_or_equal:today'],
        ]);

        $course = Course::query()->where('status', 'published')->findOrFail($data['course_id']);
        $bill = CourseBill::query()->create([
            'student_id' => $data['student_id'],
            'course_id' => $course->id,
            'created_by' => $request->user()->id,
            'title' => $data['title'],
            'amount' => $data['amount'],
            'due_at' => $data['due_at'],
            'status' => 'pending',
        ]);

        AuditLogger::log('course_bill.created', $request->user(), $bill, [
            'student_id' => $bill->student_id,
            'course_id' => $bill->course_id,
            'amount' => $bill->amount,
            'due_at' => $bill->due_at->toDateString(),
        ]);

        return to_route('admin.payments')->with('success', 'Tagihan berhasil dibuat. Tautan Midtrans akan dibuat saat siswa menekan tombol bayar.');
    }

    public function update(Request $request, CourseBill $courseBill): RedirectResponse
    {
        abort_if(
            $courseBill->status === 'paid' || $courseBill->payments()->exists() || $courseBill->batchPayments()->exists(),
            409,
            'Tagihan yang sudah memiliki transaksi pembayaran tidak dapat diedit.',
        );

        $data = $request->validate([
            'student_id' => [
                'required',
                'integer',
                Rule::exists('users', 'id')->where('role', 'student')->where('status', 'active'),
            ],
            'course_id' => ['required', 'integer', 'exists:courses,id'],
            'title' => ['required', 'string', 'max:160'],
            'amount' => ['required', 'integer', 'min:1000', 'max:1000000000'],
            'due_at' => ['required', 'date', 'after_or_equal:today'],
        ]);

        $course = Course::query()->where('status', 'published')->findOrFail($data['course_id']);

        DB::transaction(function () use ($request, $courseBill, $data, $course) {
            $lockedBill = CourseBill::query()->lockForUpdate()->findOrFail($courseBill->id);
            abort_if(
                $lockedBill->status === 'paid' || $lockedBill->payments()->exists() || $lockedBill->batchPayments()->exists(),
                409,
                'Tagihan yang sudah memiliki transaksi pembayaran tidak dapat diedit.',
            );

            $lockedBill->update([
                'student_id' => $data['student_id'],
                'course_id' => $course->id,
                'title' => $data['title'],
                'amount' => $data['amount'],
                'due_at' => $data['due_at'],
            ]);

            AuditLogger::log('course_bill.updated', $request->user(), $lockedBill, [
                'student_id' => $lockedBill->student_id,
                'course_id' => $lockedBill->course_id,
                'amount' => $lockedBill->amount,
                'due_at' => $lockedBill->due_at->toDateString(),
            ]);
        });

        return to_route('admin.payments')->with('success', 'Tagihan berhasil diperbarui.');
    }

    public function invoice(Request $request, CourseBill $courseBill): \Symfony\Component\HttpFoundation\Response
    {
        abort_unless($request->user()->isAdmin(), 403);
        $courseBill->load(['student.school', 'course']);

        return Pdf::loadView('payments.course-bill-invoice', [
            'bill' => $courseBill,
        ])->download('invoice-tagihan-'.$courseBill->id.'.pdf');
    }

    public function pay(Request $request, CourseBill $courseBill, MidtransService $midtrans): \Symfony\Component\HttpFoundation\Response
    {
        abort_unless($courseBill->student_id === $request->user()->id, 403);
        abort_unless($courseBill->status !== 'paid', 409, 'Tagihan ini sudah lunas.');

        $directPayment = $courseBill->payments()->latest('id')->first();
        $batchPayment = $courseBill->batchPayments()->latest('payments.id')->first();
        $payment = collect([$directPayment, $batchPayment])
            ->filter()
            ->sortByDesc('id')
            ->first();

        if ($payment?->status === 'pending' && filled($payment->checkout_url)) {
            if (! config('midtrans.is_enabled')) {
                try {
                    $transaction = $midtrans->createTransaction($payment);
                } catch (\Throwable $exception) {
                    report($exception);

                    return back()->with('error', 'Pembayaran gagal dimulai. Silakan coba kembali.');
                }

                $payment->forceFill([
                    'snap_token' => $transaction['snap_token'],
                    'checkout_url' => $transaction['checkout_url'],
                ])->save();

                return Inertia::location($transaction['checkout_url']);
            }

            try {
                $gatewayStatus = $midtrans->transactionStatus($payment);
            } catch (\Throwable $exception) {
                report($exception);

                return back()->with('error', 'Status pembayaran belum dapat diperiksa. Silakan coba kembali.');
            }
            if ($gatewayStatus === 'pending') {
                return Inertia::location($payment->checkout_url);
            }

            $payment->forceFill([
                'status' => $gatewayStatus,
                'paid_at' => $gatewayStatus === 'paid' ? ($payment->paid_at ?? now()) : null,
            ])->save();

            if ($gatewayStatus === 'paid') {
                $this->markCourseBillsPaid($payment->fresh(['courseBill', 'courseBills']));

                return to_route('student.bills')->with('success', 'Pembayaran tagihan berhasil dikonfirmasi.');
            }

            $payment = null;
        }

        if (! $payment || $payment->status !== 'pending') {
            $payment = Payment::query()->create([
                'user_id' => $courseBill->student_id,
                'course_id' => $courseBill->course_id,
                'course_bill_id' => $courseBill->id,
                'order_id' => $midtrans->generateOrderId(),
                'amount' => $courseBill->amount,
                'status' => 'pending',
            ]);
        }

        try {
            $transaction = $midtrans->createTransaction($payment);
        } catch (\Throwable $exception) {
            report($exception);

            return back()->with('error', 'Pembayaran gagal dimulai. Silakan coba kembali.');
        }

        $payment->forceFill([
            'snap_token' => $transaction['snap_token'],
            'checkout_url' => $transaction['checkout_url'],
        ])->save();

        AuditLogger::log('course_bill.payment_started', $request->user(), $courseBill, [
            'payment_id' => $payment->id,
            'order_id' => $payment->order_id,
        ]);

        return Inertia::location($transaction['checkout_url']);
    }

    public function sendWhatsAppReminder(Request $request, CourseBill $courseBill, WhatsAppGateway $gateway): RedirectResponse
    {
        abort_if($courseBill->status !== 'pending', 409, 'Pengingat WhatsApp hanya dapat dikirim untuk tagihan yang belum lunas.');

        if (! $gateway->isConfigured()) {
            return back()->with('error', 'Gateway WhatsApp belum dikonfigurasi. Isi WHATSAPP_GATEWAY_API_KEY dan WHATSAPP_GATEWAY_SENDER di .env.');
        }

        $courseBill->loadMissing(['student', 'course']);
        $recipientNumber = WhatsAppGateway::normalizePhone($courseBill->student->phone);

        if (! $recipientNumber) {
            return back()->with('error', 'Nomor WhatsApp siswa belum diisi atau formatnya tidak valid.');
        }

        $recentReminderExists = WhatsAppMessage::query()
            ->where('course_bill_id', $courseBill->id)
            ->where('type', 'bill_reminder')
            ->whereIn('status', ['queued', 'sent'])
            ->where('created_at', '>=', now()->subDay())
            ->exists();

        if ($recentReminderExists) {
            return back()->with('error', 'Pengingat untuk tagihan ini sudah antre atau terkirim dalam 24 jam terakhir.');
        }

        $storedTemplate = DB::table('whatsapp_templates')->where('key', 'bill_reminder')->value('configuration');
        $template = $storedTemplate ? json_decode((string) $storedTemplate, true) : null;
        if (! is_array($template)) {
            $template = [
                'mode' => 'text',
                'message' => "Halo {nama},\n\nIni pengingat tagihan kursus Digital Pelajar.\nTagihan: {tagihan}\nKursus: {kursus}\nNominal: {nominal}\nJatuh tempo: {jatuh_tempo}\nID Siswa: {id_siswa}\n\nSilakan lihat dan lanjutkan pembayaran melalui {url_pembayaran}.\n\nJika sudah membayar, abaikan pesan ini. Terima kasih.",
                'media_type' => null,
                'media_url' => null,
                'footer' => null,
                'template_buttons' => [],
            ];
        }

        $message = str_replace(
            ['{nama}', '{id_siswa}', '{tagihan}', '{kursus}', '{nominal}', '{jatuh_tempo}', '{url_pembayaran}'],
            [
                $courseBill->student->name,
                (string) $courseBill->student->student_number,
                $courseBill->title,
                $courseBill->course->title,
                'Rp '.number_format($courseBill->amount, 0, ',', '.'),
                $courseBill->due_at->format('d-m-Y'),
                route('public-payments.index'),
            ],
            (string) ($template['message'] ?? ''),
        );

        $whatsAppMessage = WhatsAppMessage::query()->create([
            'user_id' => $courseBill->student_id,
            'course_bill_id' => $courseBill->id,
            'sent_by' => $request->user()->id,
            'recipient_number' => $recipientNumber,
            'message' => $message,
            'type' => 'bill_reminder',
            'status' => 'queued',
            'send_mode' => $template['mode'] ?? 'text',
            'media_type' => $template['media_type'] ?? null,
            'media_url' => $template['media_url'] ?? null,
            'footer' => $template['footer'] ?? null,
            'template_buttons' => $template['template_buttons'] ?? null,
        ]);

        SendWhatsAppMessage::dispatch($whatsAppMessage->id);

        AuditLogger::log('whatsapp.bill_reminder.queued', $request->user(), $courseBill, [
            'whatsapp_message_id' => $whatsAppMessage->id,
            'recipient_user_id' => $courseBill->student_id,
            'mode' => $template['mode'] ?? 'text',
        ]);

        return back()->with('success', 'Pengingat WhatsApp masuk antrean pengiriman.');
    }

    public function destroy(Request $request, CourseBill $courseBill): RedirectResponse
    {
        abort_if(
            $courseBill->status === 'paid'
                || $courseBill->payments()->whereIn('status', ['paid', 'settlement', 'capture', 'success'])->exists()
                || $courseBill->batchPayments()->whereIn('payments.status', ['paid', 'settlement', 'capture', 'success'])->exists(),
            409,
            'Tagihan yang sudah dibayar tidak dapat dihapus.',
        );

        DB::transaction(function () use ($request, $courseBill) {
            $courseBill->refresh();
            abort_if(
                $courseBill->status === 'paid'
                    || $courseBill->payments()->whereIn('status', ['paid', 'settlement', 'capture', 'success'])->exists()
                    || $courseBill->batchPayments()->whereIn('payments.status', ['paid', 'settlement', 'capture', 'success'])->exists(),
                409,
                'Tagihan yang sudah dibayar tidak dapat dihapus.',
            );
            $batchPaymentIds = $courseBill->batchPayments()->pluck('payments.id')->all();
            $paymentIds = array_values(array_unique(array_merge(
                $courseBill->payments()->pluck('id')->all(),
                $batchPaymentIds,
            )));

            AuditLogger::log('course_bill.deleted', $request->user(), $courseBill, [
                'student_id' => $courseBill->student_id,
                'amount' => $courseBill->amount,
                'related_payment_ids' => $paymentIds,
            ]);

            $courseBill->payments()->delete();
            Payment::query()->whereIn('id', $batchPaymentIds)->delete();
            $courseBill->delete();
        });

        return back()->with('success', 'Tagihan dan data pembayaran terkait berhasil dihapus dari akun siswa.');
    }

    public function studentIndex(Request $request): Response
    {
        $bills = CourseBill::query()
            ->with([
                'course:id,title',
                'payments' => fn ($query) => $query->latest('id'),
                'batchPayments' => fn ($query) => $query->latest('payments.id')->with('courseBills:id'),
            ])
            ->where('student_id', $request->user()->id)
            ->latest('due_at')
            ->get()
            ->map(function (CourseBill $bill) {
                $payment = $bill->payments->concat($bill->batchPayments)->sortByDesc('id')->first();

                return [
                    'id' => $bill->id,
                    'title' => $bill->title,
                    'course' => $bill->course->title,
                    'amountLabel' => $this->rupiah($bill->amount),
                    'dueAt' => $bill->due_at->format('d M Y'),
                    'status' => $bill->status === 'pending' && $bill->isOverdue() ? 'overdue' : $bill->status,
                    'checkoutUrl' => $payment?->checkout_url,
                    'paymentId' => $payment?->id,
                    'orderId' => $payment?->order_id,
                ];
            });

        return Inertia::render('student/bills', [
            'bills' => $bills,
            'studentNumber' => $request->user()->student_number,
        ]);
    }

    private function markCourseBillsPaid(Payment $payment): void
    {
        $paidAt = $payment->paid_at ?? now();

        if ($payment->courseBill) {
            $payment->courseBill->forceFill([
                'status' => 'paid',
                'paid_at' => $payment->courseBill->paid_at ?? $paidAt,
            ])->save();
        }

        foreach ($payment->courseBills as $bill) {
            $bill->forceFill([
                'status' => 'paid',
                'paid_at' => $bill->paid_at ?? $paidAt,
            ])->save();
        }
    }

    private function rupiah(int $amount): string
    {
        return 'Rp '.number_format($amount, 0, ',', '.');
    }
}
