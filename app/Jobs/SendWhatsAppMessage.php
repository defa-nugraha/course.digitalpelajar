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
use Illuminate\Support\Facades\Log;
use Throwable;

class SendWhatsAppMessage implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 100;

    public function __construct(public int $messageId) {}

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
            $result = match ($message->send_mode ?? 'text') {
                'media' => $gateway->sendMedia(
                    $message->recipient_number,
                    (string) $message->media_type,
                    (string) $message->media_url,
                    $message->message,
                ),
                'button' => $gateway->sendTemplate(
                    $message->recipient_number,
                    $message->message,
                    $message->template_buttons ?? [],
                    $message->footer,
                    $message->media_url,
                ),
                default => $gateway->sendMessage($message->recipient_number, $message->message),
            };

            $message->forceFill([
                'status' => $result['success'] ? 'sent' : 'failed',
                'gateway_response' => $result['response'],
                'sent_at' => $result['success'] ? now() : null,
            ])->save();

            if (! $result['success']) {
                Log::warning('WhatsApp gateway rejected message.', [
                    'whatsapp_message_id' => $message->id,
                    'mode' => $message->send_mode ?? 'text',
                    'http_status' => $result['response']['http_status'] ?? null,
                    'gateway_message' => $result['message'] ?? 'Unknown gateway error',
                ]);
            }
        } catch (Throwable $exception) {
            report($exception);
            Log::error('WhatsApp queue job threw an exception.', [
                'whatsapp_message_id' => $this->messageId,
                'exception' => $exception->getMessage(),
            ]);

            $message->forceFill([
                'status' => 'failed',
                'gateway_response' => [
                    'status' => false,
                    'msg' => 'Kesalahan pengiriman: '.$exception->getMessage(),
                ],
            ])->save();
        }
    }

    public function failed(?Throwable $exception): void
    {
        Log::error('WhatsApp queue job permanently failed.', [
            'whatsapp_message_id' => $this->messageId,
            'exception' => $exception?->getMessage(),
        ]);

        WhatsAppMessage::query()
            ->whereKey($this->messageId)
            ->where('status', 'queued')
            ->update([
                'status' => 'failed',
                'gateway_response' => json_encode([
                    'status' => false,
                    'msg' => 'Job antrean gagal diproses: '.($exception?->getMessage() ?? 'alasan tidak diketahui'),
                ]),
                'updated_at' => now(),
            ]);
    }
}
