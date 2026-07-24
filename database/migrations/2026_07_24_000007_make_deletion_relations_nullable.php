<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Relasi histori utama dibuat nullable agar data lama tetap tersimpan saat
     * master data dihapus. UI akan menampilkan fallback seperti "User tidak tersedia".
     */
    public function up(): void
    {
        if (DB::connection()->getDriverName() === 'sqlite') {
            return;
        }

        foreach ($this->nullableRelations() as [$table, $column, $references]) {
            $this->replaceForeignWithNullOnDelete($table, $column, $references);
        }
    }

    public function down(): void
    {
        // Tidak dikembalikan ke cascade/restrict agar rollback tidak berisiko menghapus histori.
    }

    private function nullableRelations(): array
    {
        return [
            ['enrollments', 'user_id', 'users'],
            ['enrollments', 'course_id', 'courses'],
            ['payments', 'user_id', 'users'],
            ['payments', 'course_id', 'courses'],
            ['quizzes', 'course_id', 'courses'],
            ['forum_threads', 'course_id', 'courses'],
            ['forum_threads', 'user_id', 'users'],
            ['forum_posts', 'user_id', 'users'],
            ['quiz_attempts', 'quiz_id', 'quizzes'],
            ['quiz_attempts', 'user_id', 'users'],
            ['lesson_completions', 'user_id', 'users'],
            ['lesson_completions', 'lesson_id', 'lessons'],
            ['media_uploads', 'user_id', 'users'],
            ['teaching_schedules', 'school_id', 'schools'],
            ['teaching_schedules', 'instructor_id', 'users'],
            ['teaching_schedules', 'course_id', 'courses'],
            ['teaching_sessions', 'teaching_schedule_id', 'teaching_schedules'],
            ['teaching_sessions', 'school_id', 'schools'],
            ['teaching_sessions', 'instructor_id', 'users'],
            ['teaching_sessions', 'course_id', 'courses'],
            ['instructor_pay_rates', 'instructor_id', 'users'],
            ['instructor_payrolls', 'instructor_id', 'users'],
            ['instructor_payroll_items', 'teaching_session_id', 'teaching_sessions'],
            ['school_learning_path_accesses', 'school_id', 'schools'],
            ['school_learning_path_accesses', 'learning_path_id', 'learning_paths'],
            ['teaching_attendances', 'teaching_schedule_id', 'teaching_schedules'],
            ['teaching_attendances', 'student_id', 'users'],
            ['content_block_step_progresses', 'user_id', 'users'],
            ['content_block_step_progresses', 'content_block_id', 'content_blocks'],
            ['teaching_feedbacks', 'teaching_schedule_id', 'teaching_schedules'],
            ['teaching_feedbacks', 'school_id', 'schools'],
            ['teaching_feedbacks', 'instructor_id', 'users'],
            ['teaching_feedbacks', 'student_id', 'users'],
        ];
    }

    private function replaceForeignWithNullOnDelete(string $table, string $column, string $references): void
    {
        if (! Schema::hasTable($table) || ! Schema::hasColumn($table, $column)) {
            return;
        }

        try {
            Schema::table($table, function (Blueprint $blueprint) use ($column) {
                $blueprint->dropForeign([$column]);
            });
        } catch (Throwable) {
            // Constraint mungkin sudah tidak ada pada sebagian environment.
        }

        Schema::table($table, function (Blueprint $blueprint) use ($column) {
            $blueprint->unsignedBigInteger($column)->nullable()->change();
        });

        try {
            Schema::table($table, function (Blueprint $blueprint) use ($column, $references) {
                $blueprint->foreign($column)->references('id')->on($references)->nullOnDelete();
            });
        } catch (Throwable) {
            // Constraint mungkin sudah sama pada fresh database.
        }
    }
};
