<?php

namespace App\Models;

use Database\Factories\SchoolFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class School extends Model
{
    /** @use HasFactory<SchoolFactory> */
    use HasFactory;

    protected $fillable = [
        'name',
        'address',
        'pic',
        'logo_path',
        'status',
        'partnered_at',
    ];

    protected $casts = [
        'partnered_at' => 'date',
    ];

    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    public function students(): HasMany
    {
        return $this->hasMany(User::class)->where('role', 'student');
    }

    public function teachers(): HasMany
    {
        return $this->hasMany(User::class)->whereIn('role', ['school_teacher', 'internal_instructor']);
    }

    public function teachingSchedules(): HasMany
    {
        return $this->hasMany(TeachingSchedule::class);
    }

    public function teachingSessions(): HasMany
    {
        return $this->hasMany(TeachingSession::class);
    }

    public function learningPathAccesses(): HasMany
    {
        return $this->hasMany(SchoolLearningPathAccess::class);
    }
}
