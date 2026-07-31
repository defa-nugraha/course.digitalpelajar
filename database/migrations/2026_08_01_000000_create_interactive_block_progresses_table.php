<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('interactive_block_progresses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('enrollment_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('course_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('lesson_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('content_block_id')->nullable()->constrained()->nullOnDelete();
            $table->string('current_scene_id')->nullable();
            $table->unsignedInteger('current_scene_index')->default(0);
            $table->unsignedInteger('video_timestamp_seconds')->default(0);
            $table->unsignedTinyInteger('video_watched_percent')->default(0);
            $table->json('completed_element_ids')->nullable();
            $table->json('answered_question_ids')->nullable();
            $table->json('answers')->nullable();
            $table->unsignedTinyInteger('score')->nullable();
            $table->string('status')->default('in_progress');
            $table->timestamp('started_at')->nullable();
            $table->timestamp('last_accessed_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();

            $table->unique(['user_id', 'content_block_id'], 'ibp_user_block_unique');
            $table->index(['enrollment_id', 'content_block_id'], 'ibp_enrollment_block_index');
            $table->index(['lesson_id', 'status'], 'ibp_lesson_status_index');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('interactive_block_progresses');
    }
};
