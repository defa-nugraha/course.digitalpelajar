<?php

namespace App\Services;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

class WhatsAppGateway
{
    public function isConfigured(): bool
    {
        return filled(config('services.whatsapp.api_key'))
            && filled(config('services.whatsapp.sender'))
            && filled(config('services.whatsapp.base_url'));
    }

    public static function normalizePhone(?string $phone): ?string
    {
        if (blank($phone)) {
            return null;
        }

        $number = preg_replace('/\D+/', '', $phone) ?? '';

        if (str_starts_with($number, '0')) {
            $number = '62'.substr($number, 1);
        } elseif (str_starts_with($number, '8')) {
            $number = '62'.$number;
        }

        return preg_match('/^62\d{8,13}$/', $number) === 1 ? $number : null;
    }

    public function sendMessage(string $number, string $message): array
    {
        $number = self::normalizePhone($number);

        if (! $number) {
            return $this->failure('Nomor WhatsApp tidak valid.');
        }

        return $this->request('send-message', [
            'number' => $number,
            'message' => $message,
        ]);
    }

    public function sendMedia(
        string $number,
        string $mediaType,
        string $url,
        ?string $caption = null,
    ): array {
        $number = self::normalizePhone($number);
        $allowedTypes = ['image', 'video', 'audio', 'pdf', 'xls', 'xlsx', 'doc', 'docx', 'zip'];

        if (! $number || ! in_array($mediaType, $allowedTypes, true) || ! filter_var($url, FILTER_VALIDATE_URL) || ! in_array(parse_url($url, PHP_URL_SCHEME), ['https', 'http'], true)) {
            return $this->failure('Nomor, tipe media, atau URL media tidak valid.');
        }

        return $this->request('send-media', [
            'number' => $number,
            'media_type' => $mediaType,
            'url' => $url,
            'caption' => $caption,
        ]);
    }

    public function sendTemplate(
        string $number,
        string $message,
        array $template,
        ?string $footer = null,
        ?string $url = null,
    ): array {
        $number = self::normalizePhone($number);
        $validTemplates = count($template) >= 1
            && count($template) <= 3
            && collect($template)->every(fn ($item) => is_string($item)
                && preg_match('/^(call|url)\|[^|]+\|.+$/u', $item) === 1);

        if (! $number || ! $validTemplates) {
            return $this->failure('Nomor atau format template WhatsApp tidak valid.');
        }

        return $this->request('send-template', [
            'number' => $number,
            'message' => $message,
            'template' => array_values($template),
            'footer' => $footer,
            'url' => $url,
        ]);
    }

    private function request(string $endpoint, array $payload): array
    {
        if (! $this->isConfigured()) {
            return $this->failure('Gateway WhatsApp belum dikonfigurasi.');
        }

        try {
            $response = Http::asJson()
                ->timeout((int) config('services.whatsapp.timeout', 15))
                ->post(rtrim((string) config('services.whatsapp.base_url'), '/').'/'.$endpoint, [
                    'api_key' => config('services.whatsapp.api_key'),
                    'sender' => config('services.whatsapp.sender'),
                    ...$payload,
                ]);

            $body = $response->json();
            $success = $response->successful()
                && is_array($body)
                && ($body['status'] ?? false) === true;
            $message = is_array($body) && is_string($body['msg'] ?? null)
                ? Str::limit($body['msg'], 250)
                : ($success ? 'Pesan berhasil dikirim.' : 'Gateway WhatsApp menolak pengiriman pesan.');

            return [
                'success' => $success,
                'message' => $message,
                'response' => [
                    'status' => $success,
                    'msg' => $message,
                    'http_status' => $response->status(),
                ],
            ];
        } catch (ConnectionException $exception) {
            report($exception);

            return $this->failure('Tidak dapat terhubung ke gateway WhatsApp: '.$exception->getMessage());
        } catch (\Throwable $exception) {
            report($exception);

            return $this->failure('Kesalahan saat menghubungi gateway WhatsApp: '.$exception->getMessage());
        }
    }

    private function failure(string $message): array
    {
        return [
            'success' => false,
            'message' => $message,
            'response' => [
                'status' => false,
                'msg' => $message,
            ],
        ];
    }
}
