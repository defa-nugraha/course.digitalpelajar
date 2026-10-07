<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('quizzes')
            ->select(['id', 'questions'])
            ->orderBy('id')
            ->chunkById(100, function ($quizzes) {
                foreach ($quizzes as $quiz) {
                    $questions = json_decode((string) ($quiz->questions ?? '[]'), true);

                    if (! is_array($questions)) {
                        $questions = [];
                    }

                    $normalized = [];
                    $seen = [];

                    foreach ($questions as $question) {
                        if (! is_array($question)) {
                            continue;
                        }

                        $text = trim((string) ($question['question'] ?? ''));
                        $answer = trim((string) ($question['answer'] ?? ''));

                        if ($text === '' || $answer === '') {
                            continue;
                        }

                        $options = [];
                        foreach (($question['options'] ?? []) as $option) {
                            $value = trim((string) $option);

                            if ($value !== '' && ! in_array($value, $options, true)) {
                                $options[] = $value;
                            }
                        }

                        $fingerprint = sha1(json_encode([
                            'question' => $text,
                            'answer' => $answer,
                            'options' => $options,
                        ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));

                        $id = trim((string) ($question['id'] ?? ''));
                        $dedupeKey = $id !== '' ? 'id:'.$id : 'content:'.$fingerprint;

                        if (isset($seen[$dedupeKey])) {
                            continue;
                        }

                        $seen[$dedupeKey] = true;
                        $normalized[] = [
                            'id' => $id !== '' ? $id : 'q-'.$fingerprint,
                            'question' => $text,
                            'answer' => $answer,
                            'options' => $options,
                        ];
                    }

                    DB::table('quizzes')
                        ->where('id', $quiz->id)
                        ->update([
                            'questions' => json_encode($normalized, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
                        ]);
                }
            });
    }

    public function down(): void
    {
        // Normalization is intentionally not reversible.
    }
};
