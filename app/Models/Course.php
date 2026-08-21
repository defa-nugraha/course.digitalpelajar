<?php

namespace App\Models;

use Database\Factories\CourseFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasManyThrough;

class Course extends Model
{
    /** @use HasFactory<CourseFactory> */
    use HasFactory;

    protected $fillable = [
        'learning_path_id',
        'learning_path_order',
        'instructor_id',
        'certificate_template_id',
        'title',
        'slug',
        'description',
        'level',
        'price_type',
        'price',
        'access_mode',
        'learning_format',
        'status',
        'meta_title',
        'meta_description',
        'canonical_url',
        'og_image',
    ];

    protected $casts = [
        'price' => 'integer',
        'learning_path_order' => 'integer',
    ];

    public function learningPath(): BelongsTo
    {
        return $this->belongsTo(LearningPath::class);
    }

    public function instructor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'instructor_id');
    }

    public function certificateTemplate(): BelongsTo
    {
        return $this->belongsTo(CertificateTemplate::class);
    }

    public function prerequisites(): BelongsToMany
    {
        return $this->belongsToMany(
            self::class,
            'course_prerequisites',
            'course_id',
            'prerequisite_course_id',
        )->withTimestamps();
    }

    public function requiredBy(): BelongsToMany
    {
        return $this->belongsToMany(
            self::class,
            'course_prerequisites',
            'prerequisite_course_id',
            'course_id',
        )->withTimestamps();
    }

    public function chapters(): HasMany
    {
        return $this->hasMany(Chapter::class)->orderBy('order_no');
    }

    public function lessons(): HasManyThrough
    {
        return $this->hasManyThrough(Lesson::class, Chapter::class);
    }

    public function enrollments(): HasMany
    {
        return $this->hasMany(Enrollment::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }

    public function quizzes(): HasMany
    {
        return $this->hasMany(Quiz::class);
    }

    public function forumThreads(): HasMany
    {
        return $this->hasMany(ForumThread::class);
    }

    public function teachingSchedules(): HasMany
    {
        return $this->hasMany(TeachingSchedule::class);
    }

    public function teachingSessions(): HasMany
    {
        return $this->hasMany(TeachingSession::class);
    }

    public function scopePublished(Builder $query): Builder
    {
        return $query->where('status', 'published');
    }

    public function scopePaid(Builder $query): Builder
    {
        return $query->where('price_type', 'paid');
    }

    public function scopeFree(Builder $query): Builder
    {
        return $query->where('price_type', 'free');
    }

    public function isFree(): bool
    {
        return $this->price_type === 'free';
    }

    public function isPaid(): bool
    {
        return $this->price_type === 'paid';
    }
}
