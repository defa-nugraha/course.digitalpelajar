<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('schools', function (Blueprint $table) {
            $table->date('partnered_at')->nullable()->after('status');
        });

        Schema::table('courses', function (Blueprint $table) {
            $table->unsignedInteger('learning_path_order')->default(0)->after('learning_path_id');
            $table->foreignId('certificate_template_id')
                ->nullable()
                ->after('instructor_id')
                ->constrained('certificate_templates')
                ->nullOnDelete();
        });

        Schema::create('course_prerequisites', function (Blueprint $table) {
            $table->foreignId('course_id')->constrained()->cascadeOnDelete();
            $table->foreignId('prerequisite_course_id')->constrained('courses')->cascadeOnDelete();
            $table->timestamps();
            $table->primary(['course_id', 'prerequisite_course_id']);
        });

        Schema::table('quizzes', function (Blueprint $table) {
            $table->unsignedInteger('order_no')->default(0)->after('title');
        });

        Schema::table('submissions', function (Blueprint $table) {
            $table->foreignId('reviewer_id')
                ->nullable()
                ->after('lesson_id')
                ->constrained('users')
                ->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable()->after('status');
        });

        Schema::table('payments', function (Blueprint $table) {
            $table->string('gateway_transaction_id')->nullable()->after('order_id')->index();
        });

        Schema::table('certificates', function (Blueprint $table) {
            $table->timestamp('revoked_at')->nullable()->after('issued_at');
            $table->text('revocation_reason')->nullable()->after('revoked_at');
        });
    }

    public function down(): void
    {
        Schema::table('certificates', function (Blueprint $table) {
            $table->dropColumn(['revoked_at', 'revocation_reason']);
        });

        Schema::table('payments', function (Blueprint $table) {
            $table->dropIndex(['gateway_transaction_id']);
            $table->dropColumn('gateway_transaction_id');
        });

        Schema::table('submissions', function (Blueprint $table) {
            $table->dropConstrainedForeignId('reviewer_id');
            $table->dropColumn('reviewed_at');
        });

        Schema::table('quizzes', function (Blueprint $table) {
            $table->dropColumn('order_no');
        });

        Schema::dropIfExists('course_prerequisites');

        Schema::table('courses', function (Blueprint $table) {
            $table->dropConstrainedForeignId('certificate_template_id');
            $table->dropColumn('learning_path_order');
        });

        Schema::table('schools', function (Blueprint $table) {
            $table->dropColumn('partnered_at');
        });
    }
};
