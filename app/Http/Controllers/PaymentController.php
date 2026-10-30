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

            $freshPayment = $payment->fresh(['user', 'storeOrder', 'courseBill']);
            if ($freshPayment->store_order_id) {
                $storeOrders->activateFromPayment($freshPayment);
            } elseif ($freshPayment->course_bill_id) {
                $freshPayment->courseBill?->update(['status' => 'paid', 'paid_at' => now()]);
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

        // Midtrans sends an empty probe when the notification URL is tested
        // from the dashboard. Acknowledge the connectivity check without
        // treating it as a payment notification or changing any data.
        if ($payload === []) {
            Log::info('Midtrans notification endpoint probe acknowledged', [
                'ip' => $request->ip(),
                'user_agent' => $request->userAgent(),
            ]);

            return response()->json(['received' => true, 'probe' => true]);
        }

        $request->validate([
            'order_id' => ['required', 'string', 'max:255'],
            'gross_amount' => ['required', 'numeric', 'min:0'],
            'transaction_status' => ['required', 'string', 'max:50'],
            'status_code' => [config('midtrans.is_enabled') ? 'required' : 'nullable', 'string', 'max:10'],
            'signature_key' => [config('midtrans.is_enabled') ? 'required' : 'nullable', 'string'],
        ]);
        abort_unless(
            $midtrans->verifySignature($payload, $request->header('X-Midtrans-Mock-Secret')),
            403,
            'Signature Midtrans tidak valid.',
        );

        $payment = Payment::where('order_id', $payload['order_id'] ?? null)->first();
        if (! $payment) {
            // Dashboard tests can use a synthetic order ID. Only acknowledge
            // it after its Midtrans signature has been verified successfully.
            Log::warning('Valid Midtrans notification ignored for unknown order', [
                'order_id' => $payload['order_id'],
                'transaction_id' => $payload['transaction_id'] ?? null,
            ]);

            return response()->json([
                'received' => true,
                'ignored' => 'unknown_order',
            ]);
        }
        if ((int) round((float) $payload['gross_amount']) !== $payment->amount) {
            throw ValidationException::withMessages([
                'gross_amount' => 'Nominal callback tidak cocok dengan order.',
            ]);
        }

        $status = $midtrans->mapStatus(
            (string) $payload['transaction_status'],
            isset($payload['fraud_status']) ? (string) $payload['fraud_status'] : null,
        );
        if ($payment->isPaid() && $status !== 'paid') {
            $status = 'paid';
        }

        DB::transaction(function () use ($payment, $status, $payload, $enrollments, $storeOrders) {
            $payment->update([
                'status' => $status,
                'gateway_transaction_id' => $payload['transaction_id'] ?? $payment->gateway_transaction_id,
                'payment_method' => $payload['payment_type'] ?? $payment->payment_method,
                'gateway_payload' => $payload,
                'paid_at' => $status === 'paid' ? ($payment->paid_at ?? now()) : null,
            ]);

            if ($status === 'paid') {
                $freshPayment = $payment->fresh(['user', 'storeOrder', 'courseBill']);
                if ($freshPayment->store_order_id) {
                    $storeOrders->activateFromPayment($freshPayment);
                } elseif ($freshPayment->course_bill_id) {
                    $freshPayment->courseBill?->update(['status' => 'paid', 'paid_at' => now()]);
                } else {
                    $enrollments->activateFromPayment($freshPayment);
                }
            }

            AuditLogger::log('payment.notification', $payment->user, $payment, ['status' => $status]);
        });

        return response()->json(['received' => true]);
    }

    public function invoice(Request $request, Payment $payment): Response
    {
        abort_unless($payment->user_id === $request->user()->id || $request->user()->isAdmin(), 403);
        $payment->load('user.school', 'course');

        return Pdf::loadView('payments.invoice', [
            'payment' => $payment,
        ])->download('invoice-'.strtolower($payment->order_id).'.pdf');
    }
}
