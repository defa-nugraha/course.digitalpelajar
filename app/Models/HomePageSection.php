<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class HomePageSection extends Model
{
    protected $fillable = [
        'key',
        'name',
        'section_type',
        'eyebrow',
        'title',
        'subtitle',
        'body',
        'primary_label',
        'primary_url',
        'secondary_label',
        'secondary_url',
        'image_url',
        'items',
        'metadata',
        'is_visible',
        'sort_order',
    ];

    protected $casts = [
        'items' => 'array',
        'metadata' => 'array',
        'is_visible' => 'boolean',
        'sort_order' => 'integer',
    ];
}
