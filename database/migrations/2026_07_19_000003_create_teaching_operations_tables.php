<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('teaching_schedules', function (Blueprint $table) {
            $table->id();
            $table->foreignId('school_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('instructor_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('course_id')->nullable()->constrained()->nullOnDelete();
            $table->string('title');
            $table->timestamp('starts_at');
            $table->timestamp('ends_at');
            $table->string('mode')->default('offline');
            $table->string('location')->nullable();
            $table->string('meeting_url')->nullable();
            $table->string('status')->default('scheduled');
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index(['instructor_id', 'starts_at']);
            $table->index(['school_id', 'starts_at']);
            $table->index(['course_id', 'starts_at']);
            $table->index('status');
        });

        Schema::create('teaching_sessions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('teaching_schedule_id')->nullable()->unique()->constrained()->nullOnDelete();
            $table->foreignId('school_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('instructor_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('course_id')->nullable()->constrained()->nullOnDelete();
            $table->date('actual_date');
            $table->time('started_at');
            $table->time('ended_at');
            $table->string('topic');
            $table->unsignedSmallInteger('student_attendance_count')->default(0);
            $table->text('report');
            $table->string('evidence_photo_path');
            $table->string('status')->default('submitted');
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable();
            $table->text('review_notes')->nullable();
            $table->timestamps();

            $table->index(['instructor_id', 'actual_date']);
            $table->index(['school_id', 'actual_date']);
            $table->index(['course_id', 'actual_date']);
            $table->index('status');
        });

        Schema::create('instructor_pay_rates', function (Blueprint $table) {
            $table->id();
            $table->foreignId('instructor_id')->nullable()->constrained('users')->nullOnDelete();
            $table->unsignedInteger('amount_per_session');
            $table->date('effective_from');
            $table->date('effective_until')->nullable();
            $table->text('notes')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index(['instructor_id', 'effective_from']);
            $table->index('is_active');
        });

        Schema::create('instructor_payrolls', function (Blueprint $table) {
            $table->id();
            $table->foreignId('instructor_id')->nullable()->constrained('users')->nullOnDelete();
            $table->date('period_month');
            $table->unsignedInteger('total_sessions')->default(0);
            $table->unsignedInteger('total_amount')->default(0);
            $table->string('status')->default('draft');
            $table->timestamp('paid_at')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->unique(['instructor_id', 'period_month']);
            $table->index('status');
        });

        Schema::create('instructor_payroll_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('instructor_payroll_id')->constrained()->cascadeOnDelete();
            $table->foreignId('teaching_session_id')->nullable()->unique()->constrained()->nullOnDelete();
            $table->unsignedInteger('rate_amount');
            $table->unsignedInteger('amount');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('instructor_payroll_items');
        Schema::dropIfExists('instructor_payrolls');
        Schema::dropIfExists('instructor_pay_rates');
        Schema::dropIfExists('teaching_sessions');
        Schema::dropIfExists('teaching_schedules');
    }
};
