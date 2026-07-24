<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class InstructorPayroll extends Model
{
    use HasFactory;

    protected $fillable = [
        'instructor_id',
        'period_month',
        'total_sessions',
        'total_amount',
        'status',
        'paid_at',
        'payment_proof_path',
        'notes',
    ];

    protected $casts = [
        'period_month' => 'date',
        'total_sessions' => 'integer',
        'total_amount' => 'integer',
        'paid_at' => 'datetime',
    ];

    public function instructor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'instructor_id');
    }

    public function items(): HasMany
    {
        return $this->hasMany(InstructorPayrollItem::class);
    }
}
