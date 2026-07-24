<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('teaching_attendances', function (Blueprint $table) {
            if (! Schema::hasColumn('teaching_attendances', 'reason')) {
                $table->text('reason')->nullable()->after('source');
            }

            if (! Schema::hasColumn('teaching_attendances', 'proof_path')) {
                $table->string('proof_path')->nullable()->after('reason');
            }
        });

        DB::table('teaching_attendances')->where('status', 'present')->update(['status' => 'H']);
    }

    public function down(): void
    {
        Schema::table('teaching_attendances', function (Blueprint $table) {
            if (Schema::hasColumn('teaching_attendances', 'proof_path')) {
                $table->dropColumn('proof_path');
            }

            if (Schema::hasColumn('teaching_attendances', 'reason')) {
                $table->dropColumn('reason');
            }
        });
    }
};
