<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('quizzes', function (Blueprint $table) {
            if (! Schema::hasColumn('quizzes', 'time_limit_mode')) {
                $table->string('time_limit_mode', 20)->default('none')->after('passing_score');
            }

            if (! Schema::hasColumn('quizzes', 'time_limit_seconds')) {
                $table->unsignedInteger('time_limit_seconds')->nullable()->after('time_limit_mode');
            }
        });
    }

    public function down(): void
    {
        Schema::table('quizzes', function (Blueprint $table) {
            if (Schema::hasColumn('quizzes', 'time_limit_seconds')) {
                $table->dropColumn('time_limit_seconds');
            }

            if (Schema::hasColumn('quizzes', 'time_limit_mode')) {
                $table->dropColumn('time_limit_mode');
            }
        });
    }
};
