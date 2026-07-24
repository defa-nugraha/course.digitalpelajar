<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Relations\HasMany;

class TeachingSchedule extends Model
{
    use HasFactory;

    protected $fillable = [
        'school_id',
        'instructor_id',
        'course_id',
        'title',
        'starts_at',
        'ends_at',
        'mode',
        'location',
        'meeting_url',
        'status',
        'notes',
    ];

    protected $casts = [
        'starts_at' => 'datetime',
        'ends_at' => 'datetime',
    ];

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

    public function session(): HasOne
    {
        return $this->hasOne(TeachingSession::class);
    }

    public function attendances(): HasMany
    {
        return $this->hasMany(TeachingAttendance::class);
    }

    public function feedbacks(): HasMany
    {
        return $this->hasMany(TeachingFeedback::class);
    }

    public function isOffline(): bool
    {
        return $this->mode === 'offline';
    }

    public function isOnline(): bool
    {
        return $this->mode === 'online';
    }
}
