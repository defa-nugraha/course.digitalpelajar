<?php

namespace App\Jobs;

use App\Models\WhatsAppMessage;
use App\Services\WhatsAppGateway;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\Middleware\RateLimited;
use Illuminate\Queue\SerializesModels;
use Throwable;

class SendWhatsAppMessage implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 100;

    public function __construct(public int $messageId)
    {
    }

    public function middleware(): array
    {
        return [new RateLimited('whatsapp-outbound')];
    }

    public function retryUntil(): \DateTimeInterface
    {
        return now()->addHours(12);
    }

    public function handle(WhatsAppGateway $gateway): void
    {
        $message = WhatsAppMessage::query()->find($this->messageId);

        if (! $message || $message->status !== 'queued') {
            return;
        }

        try {
            $result = $gateway->sendMessage($message->recipient_number, $message->message);
            $message->forceFill([
                'status' => $result['success'] ? 'sent' : 'failed',
                'gateway_response' => $result['response'],
                'sent_at' => $result['success'] ? now() : null,
            ])->save();
        } catch (Throwable $exception) {
            report($exception);

            $message->forceFill([
                'status' => 'failed',
                'gateway_response' => [
                    'status' => false,
                    'msg' => 'Terjadi kesalahan internal saat mengirim pesan.',
                ],
            ])->save();
        }
    }

    public function failed(?Throwable $exception): void
    {
        WhatsAppMessage::query()
            ->whereKey($this->messageId)
            ->where('status', 'queued')
            ->update([
                'status' => 'failed',
                'gateway_response' => json_encode([
                    'status' => false,
                    'msg' => 'Pesan tidak berhasil diproses oleh antrean.',
                ]),
                'updated_at' => now(),
            ]);
    }
}
