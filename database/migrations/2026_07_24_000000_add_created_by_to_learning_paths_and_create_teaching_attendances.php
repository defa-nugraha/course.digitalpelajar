<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('learning_paths', function (Blueprint $table) {
            if (! Schema::hasColumn('learning_paths', 'created_by')) {
                $table->foreignId('created_by')
                    ->nullable()
                    ->after('id')
                    ->constrained('users')
                    ->nullOnDelete();
            }
        });

        Schema::create('teaching_attendances', function (Blueprint $table) {
            $table->id();
            $table->foreignId('teaching_schedule_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('student_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('status')->default('H');
            $table->timestamp('checked_in_at');
            $table->string('source')->default('student_qr');
            $table->timestamps();

            $table->unique(['teaching_schedule_id', 'student_id']);
            $table->index(['student_id', 'checked_in_at']);
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('teaching_attendances');

        Schema::table('learning_paths', function (Blueprint $table) {
            if (Schema::hasColumn('learning_paths', 'created_by')) {
                $table->dropConstrainedForeignId('created_by');
            }
        });
    }
};
