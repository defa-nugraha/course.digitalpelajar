<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('footer_settings', function (Blueprint $table) {
            $table->id();
            $table->string('key')->unique();
            $table->text('description')->nullable();
            $table->string('address', 1000)->nullable();
            $table->string('email')->nullable();
            $table->string('phone')->nullable();
            $table->string('business_hours')->nullable();
            $table->string('copyright_text')->nullable();
            $table->json('link_columns')->nullable();
            $table->json('bottom_links')->nullable();
            $table->boolean('is_visible')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('footer_settings');
    }
};
