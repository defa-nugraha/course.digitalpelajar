<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProductCourseAccess extends Model
{
    protected $fillable = [
        'product_id',
        'course_id',
        'learning_path_id',
        'delivery_mode',
        'code_valid_days',
    ];

    protected $casts = [
        'code_valid_days' => 'integer',
    ];

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function course(): BelongsTo
    {
        return $this->belongsTo(Course::class);
    }

    public function learningPath(): BelongsTo
    {
        return $this->belongsTo(LearningPath::class);
    }
}
