<?php

namespace App\Models;

use Database\Factories\PaymentFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Payment extends Model
{
    /** @use HasFactory<PaymentFactory> */
    use HasFactory;

    protected $fillable = [
        'user_id',
        'course_id',
        'store_order_id',
        'course_bill_id',
        'order_id',
        'gateway_transaction_id',
        'amount',
        'status',
        'payment_method',
        'snap_token',
        'checkout_url',
        'gateway_payload',
        'paid_at',
    ];

    protected $casts = [
        'amount' => 'integer',
        'gateway_payload' => 'array',
        'paid_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function course(): BelongsTo
    {
        return $this->belongsTo(Course::class);
    }

    public function storeOrder(): BelongsTo
    {
        return $this->belongsTo(StoreOrder::class);
    }

    public function courseBill(): BelongsTo
    {
        return $this->belongsTo(CourseBill::class);
    }

    public function isPaid(): bool
    {
        return in_array($this->status, ['paid', 'settlement', 'capture', 'success'], true);
    }

    public function isPending(): bool
    {
        return $this->status === 'pending';
    }
}
