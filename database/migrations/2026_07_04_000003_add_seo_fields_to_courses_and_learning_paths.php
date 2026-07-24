<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('courses', function (Blueprint $table) {
            $table->string('slug')->nullable()->after('title');
            $table->string('meta_title')->nullable()->after('status');
            $table->text('meta_description')->nullable()->after('meta_title');
            $table->string('canonical_url', 2048)->nullable()->after('meta_description');
            $table->string('og_image', 2048)->nullable()->after('canonical_url');
        });

        Schema::table('learning_paths', function (Blueprint $table) {
            $table->string('slug')->nullable()->after('title');
            $table->string('meta_title')->nullable()->after('status');
            $table->text('meta_description')->nullable()->after('meta_title');
        });

        Schema::table('courses', function (Blueprint $table) {
            $table->unique('slug');
        });

        Schema::table('learning_paths', function (Blueprint $table) {
            $table->unique('slug');
        });

        $this->backfillSlugs('courses');
        $this->backfillSlugs('learning_paths');
    }

    public function down(): void
    {
        Schema::table('courses', function (Blueprint $table) {
            $table->dropUnique(['slug']);
            $table->dropColumn(['slug', 'meta_title', 'meta_description', 'canonical_url', 'og_image']);
        });

        Schema::table('learning_paths', function (Blueprint $table) {
            $table->dropUnique(['slug']);
            $table->dropColumn(['slug', 'meta_title', 'meta_description']);
        });
    }

    private function backfillSlugs(string $table): void
    {
        $used = [];

        DB::table($table)
            ->select('id', 'title')
            ->orderBy('id')
            ->get()
            ->each(function (object $row) use ($table, &$used) {
                $base = Str::slug($row->title) ?: $table.'-'.$row->id;
                $slug = $base;
                $counter = 2;

                while (isset($used[$slug])) {
                    $slug = $base.'-'.$counter;
                    $counter++;
                }

                $used[$slug] = true;

                DB::table($table)
                    ->where('id', $row->id)
                    ->update([
                        'slug' => $slug,
                        'meta_title' => $row->title.' | RoboAcademy',
                    ]);
            });
    }
};
