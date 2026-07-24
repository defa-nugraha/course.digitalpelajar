<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class AuditLog extends Model
{
    public $timestamps = true;

    protected $fillable = [
        'user_id',
        'event',
        'auditable_type',
        'auditable_id',
        'metadata',
    ];

    protected $casts = [
        'metadata' => 'array',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function auditable(): MorphTo
    {
        return $this->morphTo();
    }

    /**
     * Record a domain event for auditing purposes (NFR-009).
     */
    public static function record(string $event, ?User $user = null, $auditable = null, array $metadata = []): self
    {
        return self::create([
            'user_id' => $user?->id,
            'event' => $event,
            'auditable_type' => $auditable ? $auditable::class : null,
            'auditable_id' => $auditable?->id,
            'metadata' => $metadata,
        ]);
    }
}
