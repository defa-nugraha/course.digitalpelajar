<?php

namespace App\Http\Controllers;

use App\Models\Course;
use App\Models\ContentBlock;
use App\Models\Enrollment;
use App\Models\Quiz;
use App\Models\Submission;
use App\Services\CertificateService;
use App\Services\EnrollmentService;
use App\Services\QuizService;
use App\Services\SubmissionService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class LearningActionController extends Controller
{
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
        ]);

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

        $attempt = $quizzes->grade($request->user(), $quiz, $data['answers']);
        $certificates->issueIfEligible($request->user(), $enrollment->fresh(['course']));

        return back()->with(
            $attempt->passed ? 'success' : 'warning',
            "Nilai kuis {$attempt->score}. ".($attempt->passed ? 'Anda lulus.' : 'Silakan coba lagi.'),
        );
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
}
