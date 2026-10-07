<?php

namespace App\Services;

use App\Models\Enrollment;
use App\Models\Quiz;
use App\Models\QuizAttempt;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class QuizService
{
    /**
     * Grade a quiz submission and persist an attempt (FR-012, FR-013, FR-016).
     *
     * Every submitted attempt is persisted, including failed attempts.
     * Answers remain stored for grading/history, while detailed per-question
     * feedback is only exposed for passed attempts.
     *
     * @param array<int, string|null> $answers
     */
    public function grade(User $user, Quiz $quiz, array $answers): QuizAttempt
    {
        return DB::transaction(function () use ($user, $quiz, $answers) {
            $questions = Quiz::normalizeQuestions($quiz->questions);
            $total = count($questions);
            $correct = 0;

            foreach ($questions as $index => $question) {
                $given = $answers[$index] ?? null;

                if ($given !== null && $this->isCorrect($question, $given)) {
                    $correct++;
                }
            }

            $score = $total > 0 ? (int) round(($correct / $total) * 100) : 0;
            $passed = $score >= (int) $quiz->passing_score;

            $attempt = QuizAttempt::create([
                'quiz_id' => $quiz->id,
                'user_id' => $user->id,
                'score' => $score,
                'passed' => $passed,
                'answers' => array_values(array_slice($answers, 0, $total)),
            ]);

            AuditLogger::log('quiz.attempted', $user, $quiz, [
                'score' => $score,
                'passed' => $passed,
                'passing_score' => (int) $quiz->passing_score,
                'attempt_id' => $attempt->id,
            ]);

            return $attempt;
        });
    }

    /**
     * Best score the user has earned for this quiz.
     */
    public function bestScore(User $user, Quiz $quiz): int
    {
        return (int) ($quiz->attempts()->where('user_id', $user->id)->max('score') ?? 0);
    }

    /**
     * Whether the user has passed the final exam for a course.
     */
    public function hasPassedFinalExam(User $user, Enrollment $enrollment): bool
    {
        $final = $enrollment->course->quizzes()->where('is_final_exam', true)->first();

        if (! $final) {
            return false;
        }

        return $final->attempts()
            ->where('user_id', $user->id)
            ->where('passed', true)
            ->exists();
    }

    public function hasCompletedRequiredQuizzes(User $user, Enrollment $enrollment): bool
    {
        $quizzes = $enrollment->course->quizzes()
            ->where('is_final_exam', false)
            ->get();

        return $quizzes->every(fn (Quiz $quiz) => $quiz->attempts()
            ->where('user_id', $user->id)
            ->where('passed', true)
            ->exists());
    }

    public function averageRequiredQuizScore(User $user, Enrollment $enrollment): float
    {
        $quizzes = $enrollment->course->quizzes()
            ->where('is_final_exam', false)
            ->get();

        if ($quizzes->isEmpty()) {
            return 100;
        }

        return round($quizzes->avg(fn (Quiz $quiz) => $this->bestScore($user, $quiz)), 2);
    }

    /**
     * Build detailed feedback for a passed attempt only.
     *
     * @return array<int, array<string, mixed>>
     */
    public function passedAttemptBreakdown(Quiz $quiz, QuizAttempt $attempt): array
    {
        if (! $attempt->passed) {
            return [];
        }

        $questions = Quiz::normalizeQuestions($quiz->questions);
        $answers = $attempt->answers ?? [];

        return collect($questions)
            ->values()
            ->map(fn (array $question, int $index) => [
                'index' => $index,
                'question' => $question['question'],
                'options' => $question['options'],
                'yourAnswer' => $answers[$index] ?? '',
                'correctAnswer' => $question['answer'],
                'correct' => $this->isCorrect($question, $answers[$index] ?? null),
            ])
            ->all();
    }

    private function isCorrect(array $question, mixed $given): bool
    {
        $expected = $question['answer'] ?? null;

        if ($expected === null || $given === null) {
            return false;
        }

        return strcasecmp(trim((string) $expected), trim((string) $given)) === 0;
    }
}
