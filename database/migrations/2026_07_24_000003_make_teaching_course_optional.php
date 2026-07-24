<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('teaching_schedules', function (Blueprint $table) {
            $table->dropForeign(['course_id']);
            $table->foreignId('course_id')->nullable()->change();
            $table->foreign('course_id')->references('id')->on('courses')->restrictOnDelete();
        });

        Schema::table('teaching_sessions', function (Blueprint $table) {
            $table->dropForeign(['course_id']);
            $table->foreignId('course_id')->nullable()->change();
            $table->foreign('course_id')->references('id')->on('courses')->restrictOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('teaching_sessions', function (Blueprint $table) {
            $table->dropForeign(['course_id']);
            $table->foreignId('course_id')->nullable(false)->change();
            $table->foreign('course_id')->references('id')->on('courses')->restrictOnDelete();
        });

        Schema::table('teaching_schedules', function (Blueprint $table) {
            $table->dropForeign(['course_id']);
            $table->foreignId('course_id')->nullable(false)->change();
            $table->foreign('course_id')->references('id')->on('courses')->restrictOnDelete();
        });
    }
};
