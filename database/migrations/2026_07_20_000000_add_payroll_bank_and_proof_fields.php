<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('bank_name')->nullable()->after('avatar');
            $table->string('bank_account_name')->nullable()->after('bank_name');
            $table->string('bank_account_number')->nullable()->after('bank_account_name');
        });

        Schema::table('instructor_payrolls', function (Blueprint $table) {
            $table->string('payment_proof_path')->nullable()->after('paid_at');
        });
    }

    public function down(): void
    {
        Schema::table('instructor_payrolls', function (Blueprint $table) {
            $table->dropColumn('payment_proof_path');
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['bank_name', 'bank_account_name', 'bank_account_number']);
        });
    }
};
