<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class TeachingSession extends Model
{
    use HasFactory;

    protected $fillable = [
        'teaching_schedule_id',
        'school_id',
        'instructor_id',
        'course_id',
        'actual_date',
        'started_at',
        'ended_at',
        'topic',
        'student_attendance_count',
        'report',
        'evidence_photo_path',
        'status',
        'reviewed_by',
        'reviewed_at',
        'review_notes',
    ];

    protected $casts = [
        'actual_date' => 'date',
        'student_attendance_count' => 'integer',
        'reviewed_at' => 'datetime',
    ];

    public function schedule(): BelongsTo
    {
        return $this->belongsTo(TeachingSchedule::class, 'teaching_schedule_id');
    }

    public function school(): BelongsTo
    {
        return $this->belongsTo(School::class);
    }

    public function instructor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'instructor_id');
    }

    public function course(): BelongsTo
    {
        return $this->belongsTo(Course::class);
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }

    public function payrollItems(): HasMany
    {
        return $this->hasMany(InstructorPayrollItem::class);
    }

    public function feedbacks(): HasMany
    {
        return $this->hasMany(TeachingFeedback::class, 'teaching_session_id');
    }

    public function isApproved(): bool
    {
        return $this->status === 'approved';
    }
}
