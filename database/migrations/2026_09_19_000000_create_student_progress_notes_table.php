<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('student_progress_notes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('school_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('teacher_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('student_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('teaching_schedule_id')->nullable()->constrained()->nullOnDelete();
            $table->text('note');
            $table->timestamps();

            $table->unique(
                ['teacher_id', 'student_id', 'teaching_schedule_id'],
                'student_progress_notes_teacher_student_schedule_unique',
            );
            $table->index(['student_id', 'created_at']);
            $table->index(['school_id', 'teaching_schedule_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('student_progress_notes');
    }
};
