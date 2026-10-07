<?php

declare(strict_types=1);

namespace App\Models;

use Database\Factories\QuizFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Quiz extends Model
{
    /** @use HasFactory<QuizFactory> */
    use HasFactory;

    protected $fillable = [
        'lesson_id',
        'course_id',
        'title',
        'order_no',
        'passing_score',
        'time_limit_mode',
        'time_limit_seconds',
        'is_final_exam',
        'questions',
    ];

    protected $casts = [
        'passing_score' => 'integer',
        'time_limit_seconds' => 'integer',
        'order_no' => 'integer',
        'is_final_exam' => 'boolean',
        'questions' => 'array',
    ];

    public function lesson(): BelongsTo
    {
        return $this->belongsTo(Lesson::class);
    }

    public function course(): BelongsTo
    {
        return $this->belongsTo(Course::class);
    }

    public function attempts(): HasMany
    {
        return $this->hasMany(QuizAttempt::class);
    }

    /**
     * Normalize quiz questions into one canonical snapshot.
     *
     * Stable editor IDs are preferred for deduplication. Legacy questions
     * without IDs receive a deterministic ID from their content.
     *
     * @return array<int, array<string, mixed>>
     */
    public static function normalizeQuestions(mixed $questions): array
    {
        if (!is_array($questions)) {
            return [];
        }

        $normalized = [];
        $seen = [];

        foreach ($questions as $question) {
            if (!is_array($question)) {
                continue;
            }

            $text = trim((string) ($question['question'] ?? ''));
            $answer = trim((string) ($question['answer'] ?? ''));

            if ($text === '' || $answer === '') {
                continue;
            }

            $options = collect($question['options'] ?? [])
                ->map(fn ($option) => trim((string) $option))
                ->filter(fn (string $option) => $option !== '')
                ->unique()
                ->values()
                ->all();

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

        return array_values($normalized);
    }

    /**
     * Return only question data that is safe to expose to students.
     *
     * @return array<int, array{index:int,id:string,question:string,options:array<int,string>}>
     */
    public function studentQuestions(): array
    {
        return collect(static::normalizeQuestions($this->questions))
            ->values()
            ->map(fn (array $question, int $index) => [
                'index' => $index,
                'id' => (string) $question['id'],
                'question' => $question['question'],
                'options' => $question['options'],
            ])
            ->all();
    }
}
