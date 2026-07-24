<?php

namespace App\Models;

use Database\Factories\CertificateTemplateFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CertificateTemplate extends Model
{
    /** @use HasFactory<CertificateTemplateFactory> */
    use HasFactory;

    protected $fillable = [
        'name',
        'layout',
        'status',
    ];

    protected $casts = [
        'layout' => 'array',
    ];

    public function certificates(): HasMany
    {
        return $this->hasMany(Certificate::class);
    }
}
