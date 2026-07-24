<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TeachingAttendance extends Model
{
    use HasFactory;

    protected $fillable = [
        'teaching_schedule_id',
        'student_id',
        'status',
        'checked_in_at',
        'source',
        'reason',
        'proof_path',
    ];

    protected $casts = [
        'checked_in_at' => 'datetime',
    ];

    public function schedule(): BelongsTo
    {
        return $this->belongsTo(TeachingSchedule::class, 'teaching_schedule_id');
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(User::class, 'student_id');
    }
}
