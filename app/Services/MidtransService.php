<?php

namespace App\Services;

use App\Models\Payment;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Str;

class MidtransService
{
    /**
     * Request a Snap token / checkout URL from Midtrans for a payment (PG-002).
     *
     * When Midtrans is disabled (sandbox/mock mode), a deterministic mock token
     * is produced so QA can exercise the full payment flow without real credentials.
     *
     * @return array{snap_token: string, checkout_url: string}
     */
    public function isEnabled(): bool
    {
        return (bool) config('midtrans.is_enabled');
    }

    /**
     * Mock payment is strictly unavailable in production, even when misconfigured.
     */
    public function isMockEnabled(): bool
    {
        return ! $this->isEnabled()
            && (bool) config('midtrans.mock_enabled')
            && ! app()->environment('production');
    }

    public function createTransaction(Payment $payment): array
    {
        $payment->loadMissing('course', 'storeOrder.items', 'courseBill', 'courseBills.course', 'user');

        if ($this->isMockEnabled()) {
            $token = 'mock-snap-'.$payment->order_id;

            Log::info('Midtrans mock transaction created', ['order_id' => $payment->order_id]);

            $checkoutUrl = $payment->course_bill_id || $payment->courseBills->isNotEmpty()
                ? URL::temporarySignedRoute('payments.public-mock-checkout', now()->addHours(2), [
                    'order' => $payment->order_id,
                ])
                : url('/payments/mock-checkout?order='.$payment->order_id);

            return [
                'snap_token' => $token,
                'checkout_url' => $checkoutUrl,
            ];
        }

        abort_unless($this->isEnabled(), 503, 'Gateway pembayaran belum dikonfigurasi. Silakan hubungi administrator.');

        $itemDetails = $payment->storeOrder
            ? $payment->storeOrder->items->map(fn ($item) => [
                'id' => 'product-'.$item->product_id,
                'name' => Str::limit($item->product_name, 50, ''),
                'price' => $item->unit_price,
                'quantity' => $item->quantity,
            ])->values()->all()
            : ($payment->courseBills->isNotEmpty()
                ? $payment->courseBills->map(fn ($bill) => [
                    'id' => 'course-bill-'.$bill->id,
                    'name' => Str::limit($bill->title, 50, ''),
                    'price' => $bill->amount,
                    'quantity' => 1,
                ])->values()->all()
                : [[
                    'id' => $payment->course_bill_id ? 'course-bill-'.$payment->course_bill_id : 'course-'.$payment->course_id,
                    'name' => Str::limit($payment->courseBill?->title ?? $payment->course?->title ?? 'Tagihan kursus', 50, ''),
                    'price' => $payment->amount,
                    'quantity' => 1,
                ]]);

        $payload = [
            'transaction_details' => [
                'order_id' => $payment->order_id,
                'gross_amount' => $payment->amount,
            ],
            'item_details' => $itemDetails,
            'customer_details' => [
                'first_name' => $payment->user?->name ?? 'Siswa',
                'email' => $payment->user?->email,
            ],
        ];

        $response = Http::withBasicAuth(config('midtrans.server_key'), '')
            ->withHeaders(['Content-Type' => 'application/json'])
            ->post(config('midtrans.snap_url'), $payload);

        $data = $response->json();

        abort_if(! $response->successful() || empty($data['token']), 502, 'Gagal membuat transaksi Midtrans.');

        return [
            'snap_token' => $data['token'],
            'checkout_url' => $data['redirect_url']
                ?? 'https://app.'.config('midtrans.environment').'.midtrans.com/snap/v3/vtweb/'.$data['token'],
        ];
    }

    /**
     * Check the current gateway status before reusing an existing Snap URL.
     */
    public function transactionStatus(Payment $payment): string
    {
        if (! config('midtrans.is_enabled')) {
            return $payment->status;
        }

        try {
            $response = Http::withBasicAuth(config('midtrans.server_key'), '')
                ->acceptJson()
                ->connectTimeout(5)
                ->timeout(10)
                ->get(rtrim((string) config('midtrans.api_url'), '/').'/v2/'.rawurlencode($payment->order_id).'/status');
        } catch (ConnectionException $exception) {
            report($exception);
            abort(502, 'Status pembayaran Midtrans belum dapat dihubungi. Silakan coba kembali.');
        }

        if ($response->status() === 404) {
            return 'expired';
        }

        abort_if(! $response->successful(), 502, 'Status pembayaran Midtrans belum dapat diverifikasi. Silakan coba kembali.');

        $data = $response->json();
        abort_if(
            ! is_array($data)
                || ($data['order_id'] ?? null) !== $payment->order_id
                || (int) round((float) ($data['gross_amount'] ?? 0)) !== $payment->amount,
            502,
            'Informasi transaksi dari Midtrans tidak sesuai dengan tagihan.',
        );

        return $this->mapStatus(
            strtolower((string) ($data['transaction_status'] ?? 'pending')),
            isset($data['fraud_status']) ? strtolower((string) $data['fraud_status']) : null,
        );
    }

    /**
     * Verify a Midtrans notification callback signature (PG-004, NFR-003).
     */
    public function verifySignature(array $payload, ?string $mockSecret = null): bool
    {
        if (! config('midtrans.is_enabled')) {
            $configuredSecret = (string) config('midtrans.mock_notification_secret');

            return $configuredSecret !== ''
                && $mockSecret !== null
                && hash_equals($configuredSecret, $mockSecret);
        }

        $orderId = $payload['order_id'] ?? '';
        $statusCode = $payload['status_code'] ?? '';
        $grossAmount = $payload['gross_amount'] ?? '';
        $serverKey = (string) config('midtrans.server_key');
        $signature = $payload['signature_key'] ?? '';

        if ($serverKey === '') {
            return false;
        }

        $expected = hash('sha512', $orderId.$statusCode.$grossAmount.$serverKey);

        return hash_equals($expected, $signature);
    }

    /**
     * Normalize Midtrans transaction status to internal payment status.
     */
    public function mapStatus(string $transactionStatus, ?string $fraudStatus = null): string
    {
        return match ($transactionStatus) {
            'settlement' => $fraudStatus === null || $fraudStatus === 'accept' ? 'paid' : ($fraudStatus === 'deny' ? 'failed' : 'pending'),
            'capture' => $fraudStatus === null || $fraudStatus === 'accept' ? 'paid' : ($fraudStatus === 'deny' ? 'failed' : 'pending'),
            'pending' => 'pending',
            'expire' => 'expired',
            'deny', 'cancel', 'failure', 'refund', 'partial_refund', 'chargeback' => 'failed',
            default => 'pending',
        };
    }

    /**
     * Generate a unique order id following the configured prefix (PG-001).
     */
    public function generateOrderId(): string
    {
        return config('midtrans.order_prefix').'-'.strtoupper(Str::random(8));
    }
}
