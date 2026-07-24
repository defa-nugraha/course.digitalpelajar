<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InstructorPayrollItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'instructor_payroll_id',
        'teaching_session_id',
        'rate_amount',
        'amount',
    ];

    protected $casts = [
        'rate_amount' => 'integer',
        'amount' => 'integer',
    ];

    public function payroll(): BelongsTo
    {
        return $this->belongsTo(InstructorPayroll::class, 'instructor_payroll_id');
    }

    public function teachingSession(): BelongsTo
    {
        return $this->belongsTo(TeachingSession::class);
    }
}
