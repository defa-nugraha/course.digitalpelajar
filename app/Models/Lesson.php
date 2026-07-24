<?php

namespace App\Models;

use Database\Factories\LessonFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Lesson extends Model
{
    /** @use HasFactory<LessonFactory> */
    use HasFactory;

    protected $fillable = [
        'chapter_id',
        'title',
        'order_no',
        'is_required',
        'available_at',
    ];

    protected $casts = [
        'is_required' => 'boolean',
        'available_at' => 'datetime',
    ];

    public function chapter(): BelongsTo
    {
        return $this->belongsTo(Chapter::class);
    }

    public function contentBlocks(): HasMany
    {
        return $this->hasMany(ContentBlock::class)->orderBy('order_no');
    }

    public function quizzes(): HasMany
    {
        return $this->hasMany(Quiz::class);
    }

    /**
     * Whether the lesson is accessible given its scheduled availability.
     */
    public function isScheduleUnlocked(): bool
    {
        return ! $this->available_at || $this->available_at->isPast();
    }
}
