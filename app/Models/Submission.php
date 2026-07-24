<?php

namespace App\Models;

use Database\Factories\SubmissionFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Submission extends Model
{
    /** @use HasFactory<SubmissionFactory> */
    use HasFactory;

    protected $fillable = [
        'enrollment_id',
        'lesson_id',
        'reviewer_id',
        'code',
        'report_path',
        'image_path',
        'video_url',
        'score',
        'feedback',
        'status',
        'reviewed_at',
    ];

    protected $casts = [
        'score' => 'integer',
        'reviewed_at' => 'datetime',
    ];

    public function enrollment(): BelongsTo
    {
        return $this->belongsTo(Enrollment::class);
    }

    public function lesson(): BelongsTo
    {
        return $this->belongsTo(Lesson::class);
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewer_id');
    }

    public function isAccepted(): bool
    {
        return $this->status === 'accepted';
    }

    public function isReviewed(): bool
    {
        return in_array($this->status, ['accepted', 'rejected', 'revised'], true);
    }
}
