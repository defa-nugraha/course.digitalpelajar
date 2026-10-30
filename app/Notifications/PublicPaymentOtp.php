<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class PublicPaymentOtp extends Notification
{
    use Queueable;

    public function __construct(public readonly string $code) {}

    /**
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('Kode verifikasi pembayaran Digital Pelajar')
            ->greeting('Halo!')
            ->line('Gunakan kode berikut untuk membuka tagihan kursus Anda:')
            ->line('**'.$this->code.'**')
            ->line('Kode berlaku selama 5 menit dan hanya dapat digunakan satu kali.')
            ->line('Jangan bagikan kode ini kepada siapa pun, termasuk pihak yang mengaku sebagai administrator.');
    }
}
