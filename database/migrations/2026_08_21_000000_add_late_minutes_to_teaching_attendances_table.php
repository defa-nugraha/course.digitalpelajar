<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasColumn('teaching_attendances', 'late_minutes')) {
            return;
        }

        Schema::table('teaching_attendances', function (Blueprint $table) {
            $table->unsignedInteger('late_minutes')->default(0)->after('checked_in_at');
        });

        $this->backfillExistingAttendances();
    }

    public function down(): void
    {
        if (! Schema::hasColumn('teaching_attendances', 'late_minutes')) {
            return;
        }

        Schema::table('teaching_attendances', function (Blueprint $table) {
            $table->dropColumn('late_minutes');
        });
    }

    private function backfillExistingAttendances(): void
    {
        DB::table('teaching_attendances')
            ->whereIn('status', ['H', 'present'])
            ->whereNotNull('checked_in_at')
            ->orderBy('id')
            ->chunkById(100, function ($attendances) {
                $scheduleStarts = DB::table('teaching_schedules')
                    ->whereIn('id', $attendances->pluck('teaching_schedule_id')->filter()->unique())
                    ->pluck('starts_at', 'id');

                foreach ($attendances as $attendance) {
                    $startsAt = $scheduleStarts->get($attendance->teaching_schedule_id);

                    if (! $startsAt) {
                        continue;
                    }

                    $lateMinutes = max(0, (int) Carbon::parse($startsAt)->diffInMinutes(Carbon::parse($attendance->checked_in_at), false));

                    DB::table('teaching_attendances')
                        ->where('id', $attendance->id)
                        ->update(['late_minutes' => $lateMinutes]);
                }
            });
    }
};
