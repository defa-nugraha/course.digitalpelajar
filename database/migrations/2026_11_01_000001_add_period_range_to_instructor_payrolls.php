<?php

use Carbon\CarbonImmutable;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('instructor_payrolls', function (Blueprint $table) {
            $table->date('period_start')->nullable()->after('period_month');
            $table->date('period_end')->nullable()->after('period_start');
        });

        DB::table('instructor_payrolls')
            ->whereNull('period_start')
            ->orderBy('id')
            ->chunkById(100, function ($payrolls): void {
                foreach ($payrolls as $payroll) {
                    $start = CarbonImmutable::parse($payroll->period_month);

                    DB::table('instructor_payrolls')
                        ->where('id', $payroll->id)
                        ->update([
                            'period_start' => $start->toDateString(),
                            'period_end' => $start->endOfMonth()->toDateString(),
                        ]);
                }
            });

        Schema::table('instructor_payrolls', function (Blueprint $table) {
            // Create the replacement index first: MySQL also uses the old
            // composite unique index to support the instructor_id foreign key.
            $table->unique(['instructor_id', 'period_start', 'period_end']);
            $table->dropUnique(['instructor_id', 'period_month']);
        });
    }

    public function down(): void
    {
        Schema::table('instructor_payrolls', function (Blueprint $table) {
            $table->dropUnique(['instructor_id', 'period_start', 'period_end']);
            $table->unique(['instructor_id', 'period_month']);
            $table->dropColumn(['period_start', 'period_end']);
        });
    }
};
