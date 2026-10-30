<?php

namespace App\Http\Controllers;

use App\Models\CourseBill;
use App\Models\Payment;
use App\Models\User;
use App\Notifications\PublicPaymentOtp;
use App\Services\AuditLogger;
use App\Services\MidtransService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\URL;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use Throwable;

class PublicPaymentController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('payments/public', [
            'studentNumber' => null,
            'searched' => false,
            'otpSent' => false,
            'otpError' => null,
            'bills' => [],
        ]);
    }

    public function lookup(Request $request): Response
    {
        $request->session()->forget('public_payment_identity');

        abort_if(
            app()->environment('production') && in_array(config('mail.default'), ['log', 'array'], true),
            503,
            'Verifikasi email belum dikonfigurasi. Silakan hubungi administrator.',
        );

        $data = $request->validate([
            'student_number' => ['required', 'digits:6'],
            'email' => ['required', 'email:rfc', 'max:255'],
            'otp' => ['nullable', 'digits:6'],
        ]);

        $normalizedEmail = strtolower(trim($data['email']));
        $emailHash = hash('sha256', $normalizedEmail);
        $student = User::query()
            ->where('role', 'student')
            ->where('status', 'active')
            ->where('student_number', $data['student_number'])
            ->whereRaw('LOWER(email) = ?', [$normalizedEmail])
            ->first();

        $otpRecord = $request->session()->get('public_payment_otp');
        $otpBelongsToRequest = $student
            && is_array($otpRecord)
            && (int) ($otpRecord['student_id'] ?? 0) === $student->id
            && hash_equals((string) ($otpRecord['student_number'] ?? ''), $student->student_number)
            && hash_equals((string) ($otpRecord['email_hash'] ?? ''), $emailHash);

        if (blank($data['otp'] ?? null)) {
            if ($student) {
                $code = (string) random_int(100000, 999999);
                $expiresAt = now()->addMinutes(5);

                $request->session()->put('public_payment_otp', [
                    'student_id' => $student->id,
                    'student_number' => $student->student_number,
                    'email_hash' => $emailHash,
                    'hash' => Hash::make($code),
                    'attempts' => 0,
                    'expires_at' => $expiresAt->timestamp,
                ]);

                try {
                    Notification::route('mail', $student->email)
                        ->notify(new PublicPaymentOtp($code));
                } catch (Throwable $exception) {
                    $request->session()->forget('public_payment_otp');
                    report($exception);
                }
            } else {
                $request->session()->forget('public_payment_otp');
            }

            return Inertia::render('payments/public', [
                'studentNumber' => null,
                'searched' => false,
                'otpSent' => true,
                'otpError' => null,
                'bills' => [],
            ]);
        }

        $isOtpValid = $otpBelongsToRequest
            && (int) ($otpRecord['expires_at'] ?? 0) >= now()->timestamp
            && (int) ($otpRecord['attempts'] ?? 5) < 5
            && Hash::check((string) $data['otp'], (string) ($otpRecord['hash'] ?? ''));

        if (! $isOtpValid || ! $student) {
            if ($otpBelongsToRequest) {
                $attempts = (int) ($otpRecord['attempts'] ?? 0) + 1;

                if ($attempts >= 5 || (int) ($otpRecord['expires_at'] ?? 0) < now()->timestamp) {
                    $request->session()->forget('public_payment_otp');
                } else {
                    $otpRecord['attempts'] = $attempts;
                    $request->session()->put('public_payment_otp', $otpRecord);
                }
            }

            return Inertia::render('payments/public', [
                'studentNumber' => null,
                'searched' => false,
                'otpSent' => true,
                'otpError' => 'Kode tidak valid atau kedaluwarsa. Periksa kembali kode atau minta kode baru.',
                'bills' => [],
            ]);
        }

        $request->session()->forget('public_payment_otp');
        $request->session()->regenerate();
        $request->session()->put('public_payment_identity', [
            'student_id' => $student->id,
            'student_number' => $student->student_number,
            'verified_at' => now()->timestamp,
        ]);

        $bills = CourseBill::query()
            ->with([
                'course:id,title',
                'payments' => fn ($query) => $query->latest('id'),
                'batchPayments' => fn ($query) => $query->latest('payments.id')->with('courseBills:id'),
            ])
            ->where('student_id', $student->id)
            ->where('status', 'pending')
            ->latest('due_at')
            ->get()
            ->map(fn (CourseBill $bill) => $this->billPayload($bill))
            ->values();

        return Inertia::render('payments/public', [
            'studentNumber' => $student->student_number,
            'searched' => true,
            'otpSent' => false,
            'otpError' => null,
            'bills' => $bills,
        ]);
    }

    public function pay(Request $request, MidtransService $midtrans): \Symfony\Component\HttpFoundation\Response
    {
        abort_unless(
            $midtrans->isEnabled() || $midtrans->isMockEnabled(),
            503,
            'Gateway pembayaran sedang tidak tersedia. Silakan hubungi administrator.',
        );

        $data = $request->validate([
            'student_number' => ['required', 'digits:6'],
            'bill_ids' => ['required', 'array', 'min:1', 'max:25'],
            'bill_ids.*' => ['required', 'integer', 'distinct', 'min:1'],
        ]);

        $identity = $request->session()->get('public_payment_identity');
        abort_unless(
            is_array($identity)
                && (int) ($identity['verified_at'] ?? 0) >= now()->subMinutes(10)->timestamp
                && hash_equals((string) ($identity['student_number'] ?? ''), $data['student_number']),
            403,
            'Silakan verifikasi kembali akun siswa melalui kode email sebelum membayar.',
        );

        $student = User::query()
            ->where('id', (int) ($identity['student_id'] ?? 0))
            ->where('role', 'student')
            ->where('status', 'active')
            ->where('student_number', $data['student_number'])
            ->first();

        if (! $student) {
            throw ValidationException::withMessages([
                'student_number' => 'ID siswa tidak ditemukan. Periksa kembali nomor yang dimasukkan.',
            ]);
        }

        $selectedIds = collect($data['bill_ids'])
            ->map(fn ($id) => (int) $id)
            ->unique()
            ->sort()
            ->values()
            ->all();

        $payment = DB::transaction(function () use ($student, $selectedIds, $midtrans) {
            $bills = CourseBill::query()
                ->with('course:id,title')
                ->where('student_id', $student->id)
                ->whereIn('id', $selectedIds)
                ->orderBy('id')
                ->lockForUpdate()
                ->get();

            if ($bills->count() !== count($selectedIds)) {
                throw ValidationException::withMessages([
                    'bill_ids' => 'Sebagian tagihan tidak tersedia untuk ID siswa tersebut.',
                ]);
            }

            if ($bills->contains(fn (CourseBill $bill) => $bill->status !== 'pending')) {
                throw ValidationException::withMessages([
                    'bill_ids' => 'Sebagian tagihan sudah lunas atau tidak lagi dapat dibayarkan. Muat ulang daftar tagihan.',
                ]);
            }

            $total = (int) $bills->sum('amount');
            if ($total > 1_000_000_000) {
                throw ValidationException::withMessages([
                    'bill_ids' => 'Total tagihan yang dipilih melebihi batas transaksi Rp1.000.000.000. Silakan pilih beberapa tagihan dalam transaksi terpisah.',
                ]);
            }

            $activePayments = Payment::query()
                ->where('user_id', $student->id)
                ->where('status', 'pending')
                ->where(function ($query) use ($selectedIds) {
                    $query->whereIn('course_bill_id', $selectedIds)
                        ->orWhereHas('courseBills', fn ($billQuery) => $billQuery->whereIn('course_bills.id', $selectedIds));
                })
                ->with(['courseBills:id,title,course_id', 'courseBill:id'])
                ->lockForUpdate()
                ->get();

            if ($activePayments->isNotEmpty()) {
                if ($activePayments->count() === 1) {
                    $existingPayment = $activePayments->first();
                    $existingBillIds = $existingPayment->courseBills->pluck('id')->map(fn ($id) => (int) $id)->all();

                    if ($existingPayment->course_bill_id) {
                        $existingBillIds[] = (int) $existingPayment->course_bill_id;
                    }

                    $existingBillIds = array_values(array_unique($existingBillIds));
                    sort($existingBillIds);

                    if ($existingBillIds === $selectedIds) {
                        return $existingPayment;
                    }
                }

                throw ValidationException::withMessages([
                    'bill_ids' => 'Sebagian tagihan masih terhubung dengan sesi pembayaran aktif. Pilih kelompok tagihan yang sama dengan transaksi tersebut atau selesaikan transaksi aktif terlebih dahulu.',
                ]);
            }

            $singleBill = $bills->count() === 1 ? $bills->first() : null;
            $payment = Payment::query()->create([
                'user_id' => $student->id,
                'course_id' => $singleBill?->course_id,
                'course_bill_id' => $singleBill?->id,
                'order_id' => $midtrans->generateOrderId(),
                'amount' => $total,
                'status' => 'pending',
            ]);

            if (! $singleBill) {
                $payment->courseBills()->sync($bills->modelKeys());
            }

            AuditLogger::log('course_bill.public_payment_created', $student, $payment, [
                'course_bill_ids' => $bills->modelKeys(),
                'amount' => $total,
            ]);

            return $payment;
        });

        if ($payment->status === 'pending' && filled($payment->checkout_url)) {
            if ($midtrans->isMockEnabled()) {
                $checkoutUrl = URL::temporarySignedRoute('payments.public-mock-checkout', now()->addHours(2), [
                    'order' => $payment->order_id,
                ]);

                $payment->forceFill(['checkout_url' => $checkoutUrl])->save();

                return Inertia::location($checkoutUrl);
            }

            $gatewayStatus = $midtrans->transactionStatus($payment);

            if ($gatewayStatus === 'pending') {
                AuditLogger::log('course_bill.public_payment_resumed', $student, $payment, [
                    'order_id' => $payment->order_id,
                ]);

                return Inertia::location($payment->checkout_url);
            }

            $payment->forceFill([
                'status' => $gatewayStatus,
                'paid_at' => $gatewayStatus === 'paid' ? ($payment->paid_at ?? now()) : null,
            ])->save();

            AuditLogger::log('course_bill.public_payment_status_refreshed', $student, $payment, [
                'order_id' => $payment->order_id,
                'status' => $gatewayStatus,
            ]);

            if ($gatewayStatus === 'paid') {
                $this->markCourseBillsPaid($payment->fresh(['courseBill', 'courseBills']));

                return to_route('public-payments.index')
                    ->with('success', 'Pembayaran sebelumnya telah berhasil dikonfirmasi.');
            }

            $payment = $this->createReplacementPayment($student, $selectedIds, $midtrans);
        }

        if (filled($payment->checkout_url)) {
            return Inertia::location($payment->checkout_url);
        }

        $transaction = $midtrans->createTransaction($payment->loadMissing([
            'user',
            'course',
            'courseBill',
            'courseBills.course',
        ]));

        $payment->forceFill([
            'snap_token' => $transaction['snap_token'],
            'checkout_url' => $transaction['checkout_url'],
        ])->save();

        AuditLogger::log('course_bill.public_payment_started', $student, $payment, [
            'order_id' => $payment->order_id,
            'amount' => $payment->amount,
        ]);

        return Inertia::location($transaction['checkout_url']);
    }

    public function mockCheckout(Request $request, MidtransService $midtrans): Response
    {
        abort_unless($midtrans->isMockEnabled(), 404);

        $payment = Payment::query()
            ->where('order_id', $request->query('order'))
            ->with(['user', 'course', 'courseBill.course', 'courseBills.course'])
            ->firstOrFail();

        abort_unless($payment->course_bill_id || $payment->courseBills->isNotEmpty(), 404);
        abort_unless($payment->status === 'pending', 409, 'Transaksi ini sudah tidak menunggu pembayaran.');

        $description = $payment->courseBills->isNotEmpty()
            ? $payment->courseBills->map(fn (CourseBill $bill) => $bill->title)->join(', ')
            : ($payment->courseBill?->title ?? $payment->course?->title ?? 'Tagihan kursus');

        return Inertia::render('payments/mock-checkout', [
            'payment' => [
                'id' => $payment->id,
                'order_id' => $payment->order_id,
                'amount' => $payment->amount,
                'description' => $description,
                'type' => 'Tagihan kursus',
                'course' => $description,
                'student' => $payment->user?->name ?? 'Siswa',
                'status' => $payment->status,
                'settleUrl' => URL::temporarySignedRoute('payments.public-mock-settle', now()->addHours(2), [
                    'payment' => $payment->id,
                    'order' => $payment->order_id,
                ]),
            ],
        ]);
    }

    public function mockSettle(Request $request, Payment $payment, MidtransService $midtrans): RedirectResponse
    {
        abort_unless($midtrans->isMockEnabled(), 404);
        abort_unless($request->query('order') === $payment->order_id, 403);

        $method = $request->validate([
            'payment_method' => ['required', 'in:bank_transfer,credit_card,qris'],
        ])['payment_method'];

        DB::transaction(function () use ($payment, $method) {
            $lockedPayment = Payment::query()
                ->with(['user', 'courseBill', 'courseBills'])
                ->lockForUpdate()
                ->findOrFail($payment->id);

            abort_unless($lockedPayment->course_bill_id || $lockedPayment->courseBills->isNotEmpty(), 404);
            abort_if($lockedPayment->status !== 'pending', 409, 'Transaksi ini sudah diproses.');

            $lockedPayment->update([
                'status' => 'paid',
                'payment_method' => $method,
                'paid_at' => now(),
                'gateway_payload' => [
                    'transaction_status' => 'settlement',
                    'source' => 'public_mock_checkout',
                ],
            ]);

            $paidAt = $lockedPayment->paid_at ?? now();

            if ($lockedPayment->courseBill) {
                $lockedPayment->courseBill->forceFill([
                    'status' => 'paid',
                    'paid_at' => $lockedPayment->courseBill->paid_at ?? $paidAt,
                ])->save();
            }

            foreach ($lockedPayment->courseBills as $bill) {
                $bill->forceFill([
                    'status' => 'paid',
                    'paid_at' => $bill->paid_at ?? $paidAt,
                ])->save();
            }

            AuditLogger::log('payment.paid', $lockedPayment->user, $lockedPayment, [
                'source' => 'public_mock_checkout',
            ]);
        });

        $request->session()->forget('public_payment_identity');

        return to_route('public-payments.index')->with('success', 'Pembayaran simulasi berhasil dikonfirmasi.');
    }

    private function createReplacementPayment(User $student, array $selectedIds, MidtransService $midtrans): Payment
    {
        return DB::transaction(function () use ($student, $selectedIds, $midtrans) {
            $bills = CourseBill::query()
                ->where('student_id', $student->id)
                ->whereIn('id', $selectedIds)
                ->orderBy('id')
                ->lockForUpdate()
                ->get();

            if ($bills->count() !== count($selectedIds) || $bills->contains(fn (CourseBill $bill) => $bill->status !== 'pending')) {
                throw ValidationException::withMessages([
                    'bill_ids' => 'Status tagihan berubah. Silakan periksa kembali daftar tagihan.',
                ]);
            }

            $existingPayment = Payment::query()
                ->where('user_id', $student->id)
                ->where('status', 'pending')
                ->where(function ($query) use ($selectedIds) {
                    $query->whereIn('course_bill_id', $selectedIds)
                        ->orWhereHas('courseBills', fn ($billQuery) => $billQuery->whereIn('course_bills.id', $selectedIds));
                })
                ->with(['courseBills:id', 'courseBill:id'])
                ->lockForUpdate()
                ->first();

            if ($existingPayment) {
                $existingBillIds = $existingPayment->courseBills->pluck('id')->map(fn ($id) => (int) $id)->all();

                if ($existingPayment->course_bill_id) {
                    $existingBillIds[] = (int) $existingPayment->course_bill_id;
                }

                $existingBillIds = array_values(array_unique($existingBillIds));
                sort($existingBillIds);

                if ($existingBillIds === $selectedIds) {
                    return $existingPayment;
                }

                throw ValidationException::withMessages([
                    'bill_ids' => 'Tagihan terhubung dengan sesi pembayaran lain yang masih aktif. Muat ulang halaman dan pilih kelompok tagihan tersebut.',
                ]);
            }

            $total = (int) $bills->sum('amount');
            if ($total > 1_000_000_000) {
                throw ValidationException::withMessages([
                    'bill_ids' => 'Total tagihan melebihi batas transaksi Rp1.000.000.000.',
                ]);
            }

            $singleBill = $bills->count() === 1 ? $bills->first() : null;
            $replacement = Payment::query()->create([
                'user_id' => $student->id,
                'course_id' => $singleBill?->course_id,
                'course_bill_id' => $singleBill?->id,
                'order_id' => $midtrans->generateOrderId(),
                'amount' => $total,
                'status' => 'pending',
            ]);

            if (! $singleBill) {
                $replacement->courseBills()->sync($bills->modelKeys());
            }

            AuditLogger::log('course_bill.public_payment_recreated', $student, $replacement, [
                'course_bill_ids' => $bills->modelKeys(),
                'amount' => $total,
            ]);

            return $replacement;
        });
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

    private function billPayload(CourseBill $bill): array
    {
        $payments = $bill->payments->concat($bill->batchPayments)->sortByDesc('id');
        $payment = $payments->where('status', 'pending')->first() ?? $payments->first();
        $activeBillIds = [];

        if ($payment?->status === 'pending') {
            $activeBillIds = $payment->courseBills->pluck('id')->map(fn ($id) => (int) $id)->all();

            if ($payment->course_bill_id) {
                $activeBillIds[] = (int) $payment->course_bill_id;
            }
        }

        return [
            'id' => $bill->id,
            'title' => $bill->title,
            'course' => $bill->course?->title ?? 'Kursus',
            'amount' => $bill->amount,
            'amountLabel' => 'Rp '.number_format($bill->amount, 0, ',', '.'),
            'dueAt' => $bill->due_at->format('d M Y'),
            'status' => $bill->status === 'pending' && $bill->isOverdue() ? 'overdue' : $bill->status,
            'hasPendingPayment' => $payment?->status === 'pending',
            'hasExistingSnap' => $payment?->status === 'pending' && filled($payment->checkout_url),
            'activePaymentBillIds' => array_values(array_unique($activeBillIds)),
        ];
    }
}
