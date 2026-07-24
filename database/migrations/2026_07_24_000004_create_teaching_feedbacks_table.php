<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('teaching_feedbacks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('teaching_schedule_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('teaching_session_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('school_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('instructor_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('course_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('student_id')->nullable()->constrained('users')->nullOnDelete();
            $table->unsignedTinyInteger('rating');
            $table->string('understanding_level');
            $table->text('comment')->nullable();
            $table->text('suggestion')->nullable();
            $table->timestamps();

            $table->unique(['teaching_schedule_id', 'student_id']);
            $table->index(['instructor_id', 'created_at']);
            $table->index(['school_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('teaching_feedbacks');
    }
};
