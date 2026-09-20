<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StudentProgressNote extends Model
{
    use HasFactory;

    protected $fillable = [
        'school_id',
        'teacher_id',
        'student_id',
        'teaching_schedule_id',
        'note',
    ];

    public function school(): BelongsTo
    {
        return $this->belongsTo(School::class);
    }

    public function teacher(): BelongsTo
    {
        return $this->belongsTo(User::class, 'teacher_id');
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(User::class, 'student_id');
    }

    public function teachingSchedule(): BelongsTo
    {
        return $this->belongsTo(TeachingSchedule::class);
    }
}
