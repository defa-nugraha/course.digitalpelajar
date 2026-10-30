<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('student_number_reservations', function (Blueprint $table) {
            $table->string('student_number', 6)->primary();
            $table->foreignId('user_id')->nullable()->unique()->constrained()->nullOnDelete();
            $table->timestamps();
        });

        DB::table('users')
            ->whereNotNull('student_number')
            ->orderBy('id')
            ->chunkById(100, function ($students) {
                $now = now();
                $reservations = $students->map(fn ($student) => [
                    'student_number' => $student->student_number,
                    'user_id' => $student->id,
                    'created_at' => $now,
                    'updated_at' => $now,
                ])->all();

                DB::table('student_number_reservations')->insertOrIgnore($reservations);
            });
    }

    public function down(): void
    {
        Schema::dropIfExists('student_number_reservations');
    }
};
