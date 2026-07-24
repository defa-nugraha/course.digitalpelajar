<?php

namespace App\Models;

use Database\Factories\LearningPathFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class LearningPath extends Model
{
    /** @use HasFactory<LearningPathFactory> */
    use HasFactory;

    protected $fillable = [
        'created_by',
        'title',
        'slug',
        'description',
        'level',
        'status',
        'meta_title',
        'meta_description',
    ];

    public function courses(): HasMany
    {
        return $this->hasMany(Course::class)->orderBy('learning_path_order');
    }

    public function schoolAccesses(): HasMany
    {
        return $this->hasMany(SchoolLearningPathAccess::class);
    }
}
