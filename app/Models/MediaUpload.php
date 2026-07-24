<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class MediaUpload extends Model
{
    protected $fillable = [
        'user_id',
        'mediable_type',
        'mediable_id',
        'disk',
        'path',
        'original_name',
        'mime_type',
        'size',
        'conversion_status',
    ];

    protected $casts = [
        'size' => 'integer',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function mediable(): MorphTo
    {
        return $this->morphTo();
    }
}
