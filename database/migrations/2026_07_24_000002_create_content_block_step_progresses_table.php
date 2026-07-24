<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('content_block_step_progresses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('content_block_id')->nullable()->constrained()->nullOnDelete();
            $table->unsignedInteger('current_step_index')->default(0);
            $table->timestamps();

            $table->unique(['user_id', 'content_block_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('content_block_step_progresses');
    }
};
