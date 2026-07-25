<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class StoreOrder extends Model
{
    protected $fillable = [
        'user_id',
        'order_number',
        'subtotal',
        'shipping_total',
        'discount_total',
        'total',
        'payment_status',
        'fulfillment_status',
        'digital_status',
        'recipient_name',
        'recipient_phone',
        'shipping_address',
        'courier',
        'tracking_number',
        'notes',
        'paid_at',
    ];

    protected $casts = [
        'subtotal' => 'integer',
        'shipping_total' => 'integer',
        'discount_total' => 'integer',
        'total' => 'integer',
        'paid_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(StoreOrderItem::class);
    }

    public function payment(): HasOne
    {
        return $this->hasOne(Payment::class);
    }

    public function activationCodes(): HasMany
    {
        return $this->hasMany(ActivationCode::class);
    }
}
