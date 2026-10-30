<?php

namespace App\Http\Controllers;

use App\Models\Payment;
use App\Services\AuditLogger;
use App\Services\EnrollmentService;
use App\Services\MidtransService;
use App\Services\StoreOrderService;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\Response;

class PaymentController extends Controller
{
    public function destroy(Request $request, Payment $payment): RedirectResponse
    {
        abort_unless($request->user()->isAdmin(), 403);
        abort_if($payment->isPaid(), 409, 'Pembayaran yang sudah paid tidak dapat dihapus.');

        DB::transaction(function () use ($payment) {
            $lockedPayment = Payment::query()->lockForUpdate()->findOrFail($payment->id);
            abort_if($lockedPayment->isPaid(), 409, 'Pembayaran yang sudah paid tidak dapat dihapus.');
            $lockedPayment->delete();
        });

        return to_route('admin.payments')->with('success', 'Data pembayaran berhasil dihapus.');
    }

    /** Resume a pending payment after ownership and status checks on the server. */
    public function continuePayment(Request $request, Payment $payment): RedirectResponse
    {
        abort_unless($payment->user_id === $request->user()->id, 403);
        abort_unless($payment->isPending(), 409, 'Pembayaran ini sudah tidak berstatus pending.');
        abort_unless(filled($payment->checkout_url), 422, 'Tautan pembayaran belum tersedia. Silakan buat pesanan baru atau hubungi admin.');

        return redirect()->away($payment->checkout_url);
    }

    public function mockSettle(
        Request $request,
        Payment $payment,
        EnrollmentService $enrollments,
        StoreOrderService $storeOrders,
    ): RedirectResponse {
        abort_if(config('midtrans.is_enabled'), 404);
        abort_unless($payment->user_id === $request->user()->id, 403);

        $method = $request->validate([
            'payment_method' => ['required', 'in:bank_transfer,credit_card,qris'],
        ])['payment_method'];

        DB::transaction(function () use ($payment, $method, $enrollments, $storeOrders, $request) {
            $payment->update([
                'status' => 'paid',
                'payment_method' => $method,
                'paid_at' => now(),
                'gateway_payload' => [
                    'transaction_status' => 'settlement',
                    'source' => 'mock_checkout',
                ],
            ]);

            $freshPayment = $payment->fresh(['user', 'storeOrder', 'courseBill', 'courseBills']);
            if ($freshPayment->store_order_id) {
                $storeOrders->activateFromPayment($freshPayment);
            } elseif ($freshPayment->course_bill_id || $freshPayment->courseBills->isNotEmpty()) {
                $this->markCourseBillsPaid($freshPayment);
            } else {
                $enrollments->activateFromPayment($freshPayment);
            }

            AuditLogger::log('payment.paid', $request->user(), $payment, ['source' => 'mock']);
        });

        if ($payment->store_order_id) {
            return to_route('store.orders')->with('success', 'Pembayaran order toko berhasil dikonfirmasi.');
        }

        if ($payment->course_bill_id) {
            return to_route('student.bills')->with('success', 'Pembayaran tagihan berhasil dikonfirmasi.');
        }

        return to_route('payments.success')->with('success', 'Pembayaran berhasil dikonfirmasi.');
    }

    public function notification(
        Request $request,
        MidtransService $midtrans,
        EnrollmentService $enrollments,
        StoreOrderService $storeOrders,
    ): JsonResponse {
        $payload = $request->all();

        // Midtrans sends an empty probe when the notification URL is tested.
        if ($payload === []) {
            Log::info('Midtrans notification endpoint probe acknowledged', [
                'ip' => $request->ip(),
                'user_agent' => $request->userAgent(),
            ]);

            return response()->json(['received' => true, 'probe' => true]);
        }

        $request->validate([
            'order_id' => ['required', 'string', 'max:255'],
            'gross_amount' => ['required', 'numeric', 'min:0', 'max:1000000000'],
            'transaction_status' => ['required', 'string', 'max:50'],
            'status_code' => ['required', 'string', 'max:10'],
            'signature_key' => ['required', 'string', 'max:512'],
            'merchant_id' => [config('midtrans.is_enabled') ? 'required' : 'nullable', 'string', 'max:50'],
            'currency' => [config('midtrans.is_enabled') ? 'required' : 'nullable', 'string', 'size:3', 'in:IDR'],
            'fraud_status' => ['sometimes', 'nullable', 'string', 'max:30'],
            'transaction_id' => ['sometimes', 'nullable', 'string', 'max:255'],
            'payment_type' => ['sometimes', 'nullable', 'string', 'max:100'],
        ]);

        if ($midtrans->isEnabled()) {
            abort_unless(
                filled(config('midtrans.server_key')) && filled(config('midtrans.merchant_id')),
                503,
                'Konfigurasi Midtrans belum lengkap.',
            );
        }

        abort_unless(
            $midtrans->verifySignature($payload, $request->header('X-Midtrans-Mock-Secret')),
            403,
            'Signature Midtrans tidak valid.',
        );

        if (filled(config('midtrans.merchant_id'))) {
            abort_unless(
                ($payload['merchant_id'] ?? null) === config('midtrans.merchant_id'),
                403,
                'Merchant ID pada notifikasi tidak sesuai.',
            );
        }

        if (isset($payload['currency'])) {
            abort_unless(strtoupper($payload['currency']) === 'IDR', 422, 'Mata uang transaksi tidak sesuai.');
        }

        $payment = Payment::query()->where('order_id', $payload['order_id'])->first();

        if (! $payment) {
            Log::warning('Valid Midtrans notification ignored for unknown order', [
                'order_id' => $payload['order_id'],
                'transaction_id' => $payload['transaction_id'] ?? null,
            ]);

            return response()->json([
                'received' => true,
                'ignored' => 'unknown_order',
            ]);
        }

        if (! $this->grossAmountMatches((string) $payload['gross_amount'], $payment->amount)) {
            throw ValidationException::withMessages([
                'gross_amount' => 'Nominal callback tidak cocok dengan order.',
            ]);
        }

        $status = $midtrans->mapStatus(
            strtolower((string) $payload['transaction_status']),
            isset($payload['fraud_status']) ? strtolower((string) $payload['fraud_status']) : null,
        );

        if ($status === 'paid') {
            abort_unless($payload['status_code'] === '200', 403, 'Status code transaksi belum menyatakan pembayaran berhasil.');
        }

        DB::transaction(function () use ($payment, $status, $payload, $enrollments, $storeOrders) {
            $lockedPayment = Payment::query()
                ->lockForUpdate()
                ->findOrFail($payment->id);

            $wasPaid = $lockedPayment->isPaid();
            $finalStatus = $status;

            // Delayed notifications must not downgrade paid or terminal payments.
            if ($wasPaid && $status !== 'paid') {
                $finalStatus = $lockedPayment->status;
            } elseif (in_array($lockedPayment->status, ['expired', 'failed'], true) && $status !== 'paid') {
                $finalStatus = $lockedPayment->status;
            }

            $statusChanged = $lockedPayment->status !== $finalStatus;
            $lockedPayment->update([
                'status' => $finalStatus,
                'gateway_transaction_id' => $payload['transaction_id'] ?? $lockedPayment->gateway_transaction_id,
                'payment_method' => $payload['payment_type'] ?? $lockedPayment->payment_method,
                'gateway_payload' => $payload,
                'paid_at' => $finalStatus === 'paid' ? ($lockedPayment->paid_at ?? now()) : null,
            ]);

            // Fulfillment side effects run only on the first transition to paid.
            if (! $wasPaid && $finalStatus === 'paid') {
                $freshPayment = $lockedPayment->fresh(['user', 'storeOrder', 'courseBill', 'courseBills']);

                if ($freshPayment->store_order_id) {
                    $storeOrders->activateFromPayment($freshPayment);
                } elseif ($freshPayment->course_bill_id || $freshPayment->courseBills->isNotEmpty()) {
                    $this->markCourseBillsPaid($freshPayment);
                } else {
                    $enrollments->activateFromPayment($freshPayment);
                }
            }

            if ($statusChanged) {
                AuditLogger::log('payment.notification', $lockedPayment->user, $lockedPayment, [
                    'status' => $finalStatus,
                ]);
            }
        });

        return response()->json(['received' => true]);
    }

    private function grossAmountMatches(string $grossAmount, int $expectedAmount): bool
    {
        if (! preg_match('/^\\d+(?:\\.\\d{1,2})?$/D', $grossAmount)) {
            return false;
        }

        [$units, $fraction] = array_pad(explode('.', $grossAmount, 2), 2, '0');
        $receivedCents = ((int) $units * 100) + (int) str_pad($fraction, 2, '0');

        return $receivedCents === ($expectedAmount * 100);
    }

    public function invoice(Request $request, Payment $payment): Response
    {
        abort_unless($payment->user_id === $request->user()->id || $request->user()->isAdmin(), 403);
        $payment->load('user.school', 'course', 'courseBill.course', 'courseBills.course');

        return Pdf::loadView('payments.invoice', [
            'payment' => $payment,
        ])->download('invoice-'.strtolower($payment->order_id).'.pdf');
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

        foreach ($payment->courseBills as $courseBill) {
            $courseBill->forceFill([
                'status' => 'paid',
                'paid_at' => $courseBill->paid_at ?? $paidAt,
            ])->save();
        }
    }
}
