<?php

namespace App\Services;

use App\Models\AuditLog;
use App\Models\User;

class AuditLogger
{
    /**
     * Thin convenience wrapper around AuditLog::record so services can audit
     * without depending on the auth context (e.g. webhook handlers).
     */
    public static function log(string $event, ?User $user = null, $auditable = null, array $metadata = []): AuditLog
    {
        return AuditLog::record($event, $user, $auditable, $metadata);
    }
}
