<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TeachingFeedback extends Model
{
    protected $table = 'teaching_feedbacks';

    protected $fillable = [
        'teaching_schedule_id',
        'teaching_session_id',
        'school_id',
        'instructor_id',
        'course_id',
        'student_id',
        'rating',
        'understanding_level',
        'comment',
        'suggestion',
    ];

    protected $casts = [
        'rating' => 'integer',
    ];

    public function schedule(): BelongsTo
    {
        return $this->belongsTo(TeachingSchedule::class, 'teaching_schedule_id');
    }

    public function session(): BelongsTo
    {
        return $this->belongsTo(TeachingSession::class, 'teaching_session_id');
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

    public function student(): BelongsTo
    {
        return $this->belongsTo(User::class, 'student_id');
    }
}
