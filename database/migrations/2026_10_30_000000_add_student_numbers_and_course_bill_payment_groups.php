<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('student_number', 6)->nullable()->after('role');
        });

        DB::table('users')
            ->where('role', 'student')
            ->whereNull('student_number')
            ->orderBy('id')
            ->chunkById(100, function ($students) {
                foreach ($students as $student) {
                    do {
                        $studentNumber = (string) random_int(100000, 999999);
                    } while (DB::table('users')->where('student_number', $studentNumber)->exists());

                    DB::table('users')
                        ->where('id', $student->id)
                        ->update(['student_number' => $studentNumber]);
                }
            });

        Schema::table('users', function (Blueprint $table) {
            $table->unique('student_number');
        });

        Schema::create('course_bill_payment', function (Blueprint $table) {
            $table->id();
            $table->foreignId('payment_id')->constrained()->cascadeOnDelete();
            $table->foreignId('course_bill_id')->constrained()->cascadeOnDelete();
            $table->timestamps();
            $table->unique(['payment_id', 'course_bill_id']);
            $table->index('course_bill_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('course_bill_payment');

        Schema::table('users', function (Blueprint $table) {
            $table->dropUnique(['student_number']);
            $table->dropColumn('student_number');
        });
    }
};
