<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InteractiveBlockProgress extends Model
{
    protected $table = 'interactive_block_progresses';

    protected $fillable = [
        'enrollment_id',
        'user_id',
        'course_id',
        'lesson_id',
        'content_block_id',
        'current_scene_id',
        'current_scene_index',
        'video_timestamp_seconds',
        'video_watched_percent',
        'completed_element_ids',
        'answered_question_ids',
        'answers',
        'score',
        'status',
        'started_at',
        'last_accessed_at',
        'completed_at',
    ];

    protected $casts = [
        'current_scene_index' => 'integer',
        'video_timestamp_seconds' => 'integer',
        'video_watched_percent' => 'integer',
        'completed_element_ids' => 'array',
        'answered_question_ids' => 'array',
        'answers' => 'array',
        'score' => 'integer',
        'started_at' => 'datetime',
        'last_accessed_at' => 'datetime',
        'completed_at' => 'datetime',
    ];

    public function enrollment(): BelongsTo
    {
        return $this->belongsTo(Enrollment::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function course(): BelongsTo
    {
        return $this->belongsTo(Course::class);
    }

    public function lesson(): BelongsTo
    {
        return $this->belongsTo(Lesson::class);
    }

    public function contentBlock(): BelongsTo
    {
        return $this->belongsTo(ContentBlock::class);
    }
}
