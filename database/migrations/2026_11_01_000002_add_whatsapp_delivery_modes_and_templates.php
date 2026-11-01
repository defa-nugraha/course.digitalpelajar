<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('whatsapp_messages', function (Blueprint $table) {
            $table->string('send_mode', 20)->default('text')->after('status');
            $table->string('media_type', 20)->nullable()->after('send_mode');
            $table->text('media_url')->nullable()->after('media_type');
            $table->string('footer', 500)->nullable()->after('media_url');
            $table->json('template_buttons')->nullable()->after('footer');
        });

        Schema::create('whatsapp_templates', function (Blueprint $table) {
            $table->id();
            $table->string('key', 80)->unique();
            $table->json('configuration');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('whatsapp_templates');

        Schema::table('whatsapp_messages', function (Blueprint $table) {
            $table->dropColumn(['send_mode', 'media_type', 'media_url', 'footer', 'template_buttons']);
        });
    }
};
