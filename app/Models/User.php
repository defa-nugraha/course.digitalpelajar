<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Facades\DB;

class User extends Authenticatable
{
    protected $attributes = [
        'role' => 'student',
    ];

    protected static function booted(): void
    {
        static::saving(function (User $user) {
            if ($user->exists && $user->isDirty('student_number')) {
                throw new \LogicException('ID siswa bersifat permanen dan tidak dapat diubah.');
            }

            if (! $user->exists) {
                $user->student_number = $user->role === 'student'
                    ? static::reserveStudentNumber()
                    : null;
            } elseif ($user->role === 'student' && blank($user->student_number)) {
                $user->student_number = static::reserveStudentNumber();
            }
        });

        static::saved(function (User $user) {
            if (filled($user->student_number)) {
                DB::table('student_number_reservations')
                    ->where('student_number', $user->student_number)
                    ->whereNull('user_id')
                    ->update([
                        'user_id' => $user->id,
                        'updated_at' => now(),
                    ]);
            }
        });
    }

    private static function reserveStudentNumber(): string
    {
        for ($attempt = 0; $attempt < 1000; $attempt++) {
            $studentNumber = (string) random_int(100000, 999999);

            if (DB::table('users')->where('student_number', $studentNumber)->exists()) {
                continue;
            }

            $reserved = DB::table('student_number_reservations')->insertOrIgnore([
                'student_number' => $studentNumber,
                'user_id' => null,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            if ($reserved === 1) {
                return $studentNumber;
            }
        }

        throw new \RuntimeException('Tidak dapat membuat ID siswa unik. Silakan coba kembali.');
    }

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

    public function receivedProgressNotes(): HasMany
    {
        return $this->hasMany(StudentProgressNote::class, 'student_id');
    }

    public function writtenProgressNotes(): HasMany
    {
        return $this->hasMany(StudentProgressNote::class, 'teacher_id');
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
