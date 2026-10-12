<?php

namespace App\Http\Controllers;

use App\Models\ContentBlock;
use App\Models\Course;
use App\Models\Enrollment;
use App\Models\Quiz;
use App\Models\Submission;
use App\Services\CertificateService;
use App\Services\EnrollmentService;
use App\Services\InteractiveProgressService;
use App\Services\QuizService;
use App\Services\SubmissionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Response;

class LearningActionController extends Controller
{
    public function startQuizAttempt(
        Request $request,
        Quiz $quiz,
        EnrollmentService $enrollments,
    ): Response {
        $quiz->loadMissing('course', 'lesson.chapter');
        $enrollment = Enrollment::query()
            ->where('user_id', $request->user()->id)
            ->where('course_id', $quiz->course_id)
            ->whereIn('status', ['active', 'completed'])
            ->firstOrFail();

        abort_if(
            $quiz->is_final_exam && $enrollment->progress_percent < 100,
            403,
            'Selesaikan seluruh lesson sebelum mengerjakan ujian akhir.',
        );

        if ($quiz->lesson_id) {
            $enrollments->assertLessonAccessible($request->user(), $quiz->course, $quiz->lesson);
        }

        $questions = $quiz->studentQuestions();
        abort_if($questions === [], 422, 'Quiz belum memiliki soal yang dapat dikerjakan.');

        $sessionKey = "quiz_attempt_started_at.{$request->user()->id}.{$quiz->id}";
        $startedAt = (int) $request->session()->get($sessionKey, 0);

        if ($startedAt <= 0) {
            $startedAt = now()->timestamp;
            $request->session()->put($sessionKey, $startedAt);
        }

        $timeLimitMode = $quiz->time_limit_mode ?? 'none';
        $timeLimitSeconds = (int) ($quiz->time_limit_seconds ?? 0);
        $deadlineAt = $timeLimitMode === 'total' && $timeLimitSeconds > 0
            ? $startedAt + $timeLimitSeconds
            : null;

        return Inertia::render('student/quiz-attempt', [
            'quiz' => [
                'id' => $quiz->id,
                'title' => $quiz->title,
                'passingScore' => (int) $quiz->passing_score,
                'timeLimitMode' => $timeLimitMode,
                'timeLimitSeconds' => $timeLimitSeconds > 0 ? $timeLimitSeconds : null,
                'questions' => $questions,
            ],
            'courseTitle' => $quiz->course->title,
            'startedAt' => $startedAt,
            'deadlineAt' => $deadlineAt,
        ]);
    }

    public function submitQuiz(
        Request $request,
        Quiz $quiz,
        QuizService $quizzes,
        CertificateService $certificates,
        EnrollmentService $enrollments,
    ): RedirectResponse {
        $data = $request->validate([
            'answers' => ['required', 'array'],
            'answers.*' => ['nullable', 'string', 'max:2000'],
            'auto_submitted' => ['nullable', 'boolean'],
        ]);

        $quiz->loadMissing('course', 'lesson.chapter');
        $questionCount = count(Quiz::normalizeQuestions($quiz->questions));
        $answers = array_values($data['answers']);

        $answers = array_slice($answers, 0, $questionCount);

        $enrollment = Enrollment::query()
            ->where('user_id', $request->user()->id)
            ->where('course_id', $quiz->course_id)
            ->whereIn('status', ['active', 'completed'])
            ->firstOrFail();

        abort_if(
            $quiz->is_final_exam && $enrollment->progress_percent < 100,
            403,
            'Selesaikan seluruh lesson sebelum mengerjakan ujian akhir.',
        );

        if ($quiz->lesson_id) {
            $quiz->load('lesson.chapter');
            $enrollments->assertLessonAccessible($request->user(), $enrollment->course, $quiz->lesson);
        }

        $sessionKey = "quiz_attempt_started_at.{$request->user()->id}.{$quiz->id}";
        $startedAt = (int) $request->session()->get($sessionKey, 0);
        abort_if($startedAt <= 0, 403, 'Mulai quiz melalui halaman konfirmasi terlebih dahulu.');

        $elapsedSeconds = max(0, now()->timestamp - $startedAt);
        $timeLimitMode = $quiz->time_limit_mode ?? 'none';
        $timeLimitSeconds = (int) ($quiz->time_limit_seconds ?? 0);
        $timeExpired = $timeLimitMode === 'total'
            && $timeLimitSeconds > 0
            && $elapsedSeconds >= $timeLimitSeconds;

        if ($timeExpired) {
            $data['auto_submitted'] = true;
        } elseif ($request->boolean('auto_submitted')) {
            abort_unless(
                $timeLimitMode === 'per_question' && $timeLimitSeconds > 0 && $elapsedSeconds >= $timeLimitSeconds,
                422,
                'Quiz tidak dapat dikirim otomatis sebelum batas waktu tercapai.',
            );
        }

        if (! ($data['auto_submitted'] ?? false)) {
            for ($index = 0; $index < $questionCount; $index++) {
                if (blank($answers[$index] ?? null)) {
                    throw ValidationException::withMessages([
                        "answers.{$index}" => 'Semua soal wajib dijawab sebelum quiz dikirim.',
                    ]);
                }
            }
        }

        $attempt = $quizzes->grade($request->user(), $quiz, $answers);
        $request->session()->forget($sessionKey);
        $certificates->issueIfEligible($request->user(), $enrollment->fresh(['course']));

        $result = [
            'quizId' => $quiz->id,
            'attemptId' => $attempt->id,
            'score' => $attempt->score,
            'passingScore' => (int) $quiz->passing_score,
            'passed' => $attempt->passed,
            'questionResults' => $attempt->passed
                ? $quizzes->passedAttemptBreakdown($quiz, $attempt)
                : [],
        ];

        $message = $attempt->passed
            ? "Nilai kuis {$attempt->score}. Anda lulus."
            : "Nilai kuis {$attempt->score}. Nilai minimal {$quiz->passing_score}. Silakan ulangi quiz.";

        $learningUrl = route('learning.show', array_filter([
            'course' => $quiz->course_id,
            'lesson' => $quiz->lesson_id,
        ], fn ($value) => $value !== null));

        return redirect()->to($learningUrl)
            ->with($attempt->passed ? 'success' : 'warning', $message)
            ->with('quiz_result', $result);
    }

    public function submitProject(
        Request $request,
        Course $course,
        SubmissionService $submissions,
    ): RedirectResponse {
        $data = $request->validate([
            'lesson_id' => ['nullable', 'integer', 'exists:lessons,id'],
            'code' => ['nullable', 'string', 'max:20000'],
            'report' => ['nullable', 'file', 'mimes:pdf,doc,docx', 'max:10240'],
            'image' => ['nullable', 'image', 'max:5120'],
            'video_url' => ['nullable', 'url', 'max:1000'],
        ]);

        if (
            blank($data['code'] ?? null)
            && ! $request->hasFile('report')
            && ! $request->hasFile('image')
            && blank($data['video_url'] ?? null)
        ) {
            throw ValidationException::withMessages([
                'code' => 'Isi minimal satu bukti submission.',
            ]);
        }

        $enrollment = Enrollment::query()
            ->where('user_id', $request->user()->id)
            ->where('course_id', $course->id)
            ->whereIn('status', ['active', 'completed'])
            ->firstOrFail();

        if (filled($data['lesson_id'] ?? null)) {
            if (! $course->lessons()->where('lessons.id', $data['lesson_id'])->exists()) {
                throw ValidationException::withMessages([
                    'lesson_id' => 'Lesson tidak termasuk dalam kursus.',
                ]);
            }
        }

        $submissions->submit($request->user(), $enrollment, $data, $data['lesson_id'] ?? null);

        return back()->with('success', 'Submission berhasil dikirim dan menunggu review.');
    }

    public function reviewSubmission(
        Request $request,
        Submission $submission,
        SubmissionService $submissions,
        CertificateService $certificates,
    ): RedirectResponse {
        $data = $request->validate([
            'score' => [
                Rule::requiredIf(in_array($request->input('status'), ['accepted', 'rejected'], true)),
                'nullable',
                'integer',
                'between:0,100',
            ],
            'feedback' => ['required', 'string', 'max:3000'],
            'status' => ['required', 'in:accepted,revised,rejected'],
        ]);

        $submission->load('enrollment.course', 'enrollment.user');
        $user = $request->user();
        $course = $submission->enrollment->course;

        abort_unless(
            $user->isAdmin()
            || ($user->role === 'internal_instructor' && $course->instructor_id === $user->id)
            || ($user->role === 'school_teacher' && $submission->enrollment->user->school_id === $user->school_id),
            403,
        );

        $submissions->review($user, $submission, $data);
        $certificates->issueIfEligible(
            $submission->enrollment->user,
            $submission->enrollment,
        );

        return back()->with('success', 'Review submission berhasil disimpan.');
    }

    public function updateBlockStep(Request $request, ContentBlock $contentBlock): RedirectResponse
    {
        $data = $request->validate([
            'step_index' => ['required', 'integer', 'min:0'],
        ]);

        $contentBlock->load('lesson.chapter.course');
        $course = $contentBlock->lesson->chapter->course;
        $enrollment = Enrollment::query()
            ->where('user_id', $request->user()->id)
            ->where('course_id', $course->id)
            ->whereIn('status', ['active', 'completed'])
            ->firstOrFail();

        $steps = collect($contentBlock->metadata['steps'] ?? [])
            ->filter(fn ($step) => is_array($step) && filled($step['content'] ?? null))
            ->values();
        $maxIndex = max(0, $steps->count() - 1);
        abort_if((int) $data['step_index'] > $maxIndex, 422, 'Step materi tidak valid.');

        DB::table('content_block_step_progresses')->updateOrInsert(
            [
                'user_id' => $request->user()->id,
                'content_block_id' => $contentBlock->id,
            ],
            [
                'current_step_index' => (int) $data['step_index'],
                'updated_at' => now(),
                'created_at' => now(),
            ],
        );

        return back();
    }

    public function updateInteractiveProgress(
        Request $request,
        ContentBlock $contentBlock,
        InteractiveProgressService $interactiveProgress,
    ): JsonResponse {
        $data = $request->validate([
            'scene_id' => ['required', 'string', 'max:120'],
            'scene_index' => ['required', 'integer', 'min:0'],
            'completed_element_ids' => ['nullable', 'array'],
            'completed_element_ids.*' => ['string', 'max:120'],
            'video_timestamp_seconds' => ['nullable', 'integer', 'min:0'],
            'video_watched_percent' => ['nullable', 'integer', 'between:0,100'],
        ]);

        $progress = $interactiveProgress->update($request->user(), $contentBlock, $data);

        return response()->json([
            'progress' => $interactiveProgress->progressPayload($progress, $contentBlock->metadata ?? []),
        ]);
    }
}
