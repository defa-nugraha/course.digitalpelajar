<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'school_id',
        'requested_school_id',
        'school_verification_status',
        'manual_school_name',
        'manual_school_address',
        'profile_completed_at',
        'name',
        'email',
        'email_verified_at',
        'role',
        'status',
        'google_id',
        'avatar',
        'phone',
        'address',
        'bank_name',
        'bank_account_name',
        'bank_account_number',
        'password',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'profile_completed_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    public function school(): BelongsTo
    {
        return $this->belongsTo(School::class);
    }

    public function enrollments(): HasMany
    {
        return $this->hasMany(Enrollment::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }

    public function quizAttempts(): HasMany
    {
        return $this->hasMany(QuizAttempt::class);
    }

    public function lessonCompletions(): HasMany
    {
        return $this->hasMany(LessonCompletion::class);
    }

    public function forumThreads(): HasMany
    {
        return $this->hasMany(ForumThread::class);
    }

    public function forumPosts(): HasMany
    {
        return $this->hasMany(ForumPost::class);
    }

    public function taughtCourses(): HasMany
    {
        return $this->hasMany(Course::class, 'instructor_id');
    }

    public function teachingSchedules(): HasMany
    {
        return $this->hasMany(TeachingSchedule::class, 'instructor_id');
    }

    public function teachingSessions(): HasMany
    {
        return $this->hasMany(TeachingSession::class, 'instructor_id');
    }

    public function instructorPayRates(): HasMany
    {
        return $this->hasMany(InstructorPayRate::class, 'instructor_id');
    }

    public function instructorPayrolls(): HasMany
    {
        return $this->hasMany(InstructorPayroll::class, 'instructor_id');
    }

    public function hasRole(string|array $roles): bool
    {
        return in_array($this->role, (array) $roles, true);
    }

    public function isAdmin(): bool
    {
        return $this->role === 'admin';
    }

    public function isInstructor(): bool
    {
        return in_array($this->role, ['admin', 'internal_instructor'], true);
    }

    public function isStudent(): bool
    {
        return $this->role === 'student';
    }

    public function isSchoolTeacher(): bool
    {
        return $this->role === 'school_teacher';
    }

    public function canLearnCourses(): bool
    {
        return in_array($this->role, ['student', 'school_teacher'], true);
    }
}
