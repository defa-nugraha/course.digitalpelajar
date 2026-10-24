<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CourseBill extends Model
{
    protected $fillable = [
        'student_id',
        'course_id',
        'created_by',
        'title',
        'amount',
        'due_at',
        'status',
        'paid_at',
    ];

    protected $casts = [
        'amount' => 'integer',
        'due_at' => 'date',
        'paid_at' => 'datetime',
    ];

    public function student(): BelongsTo
    {
        return $this->belongsTo(User::class, 'student_id');
    }

    public function course(): BelongsTo
    {
        return $this->belongsTo(Course::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }

    public function latestPayment(): ?Payment
    {
        return $this->payments()->latest('id')->first();
    }

    public function isOverdue(): bool
    {
        return $this->status === 'pending' && $this->due_at->isPast() && ! $this->due_at->isToday();
    }
}
