<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InstructorPayRate extends Model
{
    use HasFactory;

    protected $fillable = [
        'instructor_id',
        'amount_per_session',
        'effective_from',
        'effective_until',
        'notes',
        'is_active',
    ];

    protected $casts = [
        'amount_per_session' => 'integer',
        'effective_from' => 'date',
        'effective_until' => 'date',
        'is_active' => 'boolean',
    ];

    public function instructor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'instructor_id');
    }
}
