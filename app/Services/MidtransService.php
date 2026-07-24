<?php

namespace App\Services;

use App\Models\Payment;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
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
    public function createTransaction(Payment $payment): array
    {
        $payment->loadMissing('course', 'user');

        if (! config('midtrans.is_enabled')) {
            $token = 'mock-snap-'.$payment->order_id;

            Log::info('Midtrans mock transaction created', ['order_id' => $payment->order_id]);

            return [
                'snap_token' => $token,
                'checkout_url' => url('/payments/mock-checkout?order='.$payment->order_id),
            ];
        }

        $payload = [
            'transaction_details' => [
                'order_id' => $payment->order_id,
                'gross_amount' => $payment->amount,
            ],
            'item_details' => [[
                'id' => 'course-'.$payment->course_id,
                'name' => Str::limit($payment->course->title, 50, ''),
                'price' => $payment->amount,
                'quantity' => 1,
            ]],
            'customer_details' => [
                'first_name' => $payment->user->name,
                'email' => $payment->user->email,
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
        $serverKey = config('midtrans.server_key');
        $signature = $payload['signature_key'] ?? '';

        $expected = hash('sha512', $orderId.$statusCode.$grossAmount.$serverKey);

        return hash_equals($expected, $signature);
    }

    /**
     * Normalize Midtrans transaction status to internal payment status.
     */
    public function mapStatus(string $transactionStatus, ?string $fraudStatus = null): string
    {
        return match ($transactionStatus) {
            'settlement' => 'paid',
            'capture' => $fraudStatus === null || $fraudStatus === 'accept' ? 'paid' : 'pending',
            'pending' => 'pending',
            'deny', 'cancel', 'expire', 'failure' => 'failed',
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
