<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('phone')->nullable()->after('avatar');
            $table->text('address')->nullable()->after('phone');
            $table->string('manual_school_name')->nullable()->after('school_id');
            $table->text('manual_school_address')->nullable()->after('manual_school_name');
            $table->timestamp('profile_completed_at')->nullable()->after('manual_school_address');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'phone',
                'address',
                'manual_school_name',
                'manual_school_address',
                'profile_completed_at',
            ]);
        });
    }
};
