<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->foreignId('requested_school_id')->nullable()->after('school_id')->constrained('schools')->nullOnDelete();
            $table->string('school_verification_status')->nullable()->after('requested_school_id');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropConstrainedForeignId('requested_school_id');
            $table->dropColumn('school_verification_status');
        });
    }
};
