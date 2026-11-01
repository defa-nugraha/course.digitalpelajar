<?php

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

        DB::table('instructor_payrolls')->whereNull('period_start')->update([
            'period_start' => DB::raw('period_month'),
            'period_end' => DB::raw('LAST_DAY(period_month)'),
        ]);
    }

    public function down(): void
    {
        Schema::table('instructor_payrolls', function (Blueprint $table) {
            $table->dropColumn(['period_start', 'period_end']);
        });
    }
};
