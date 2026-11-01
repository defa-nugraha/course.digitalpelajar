<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WhatsAppMessage extends Model
{
    protected $table = 'whatsapp_messages';

    protected $fillable = [
        'user_id',
        'course_bill_id',
        'sent_by',
        'recipient_number',
        'message',
        'type',
        'status',
        'send_mode',
        'media_type',
        'media_url',
        'footer',
        'template_buttons',
        'gateway_response',
        'sent_at',
    ];

    protected function casts(): array
    {
        return [
            'gateway_response' => 'array',
            'template_buttons' => 'array',
            'sent_at' => 'datetime',
        ];
    }

    public function recipient(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function courseBill(): BelongsTo
    {
        return $this->belongsTo(CourseBill::class);
    }

    public function sender(): BelongsTo
    {
        return $this->belongsTo(User::class, 'sent_by');
    }
}
