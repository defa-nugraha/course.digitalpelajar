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
     * Each question is matched against the stored answer. The score is the
     * percentage of correct answers; passing is determined by the quiz threshold.
     *
     * @param  array<int, string>  $answers  Index-position answers keyed by question order.
     */
    public function grade(User $user, Quiz $quiz, array $answers): QuizAttempt
    {
        return DB::transaction(function () use ($user, $quiz, $answers) {
            $questions = $quiz->questions ?? [];
            $total = count($questions);
            $correct = 0;

            foreach ($questions as $index => $question) {
                $given = $answers[$index] ?? null;
                if ($given !== null && $this->isCorrect($question, $given)) {
                    $correct++;
                }
            }

            $score = $total > 0 ? (int) round(($correct / $total) * 100) : 0;
            $passed = $score >= $quiz->passing_score;

            $attempt = QuizAttempt::create([
                'quiz_id' => $quiz->id,
                'user_id' => $user->id,
                'score' => $score,
                'passed' => $passed,
                'answers' => $answers,
            ]);

            AuditLogger::log('quiz.attempted', $user, $quiz, [
                'score' => $score,
                'passed' => $passed,
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
     * Whether the user has passed the final exam for a course (FR-013).
     */
    public function hasPassedFinalExam(User $user, Enrollment $enrollment): bool
    {
        $final = $enrollment->course->quizzes()->where('is_final_exam', true)->first();

        if (! $final) {
            return false;
        }

        return $final->attempts()
            ->where('user_id', $user->id)
            ->where('score', '>=', max(75, $final->passing_score))
            ->exists();
    }

    public function hasCompletedRequiredQuizzes(User $user, Enrollment $enrollment): bool
    {
        $quizzes = $enrollment->course->quizzes()
            ->where('is_final_exam', false)
            ->get();

        return $quizzes->every(fn (Quiz $quiz) => $quiz->attempts()
            ->where('user_id', $user->id)
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

    private function isCorrect(array $question, mixed $given): bool
    {
        $expected = $question['answer'] ?? null;

        if ($expected === null) {
            return false;
        }

        return is_string($expected)
            ? strcasecmp(trim($expected), trim((string) $given)) === 0
            : $expected == $given;
    }
}
