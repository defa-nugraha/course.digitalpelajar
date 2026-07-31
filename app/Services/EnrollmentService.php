<?php

namespace App\Services;

use App\Models\Course;
use App\Models\Enrollment;
use App\Models\Lesson;
use App\Models\LessonCompletion;
use App\Models\Payment;
use App\Models\SchoolLearningPathAccess;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class EnrollmentService
{
    public function __construct(
        private readonly MidtransService $midtrans,
        private readonly InteractiveProgressService $interactiveProgress,
    ) {}

    /**
     * Enroll a student in a course following business rules (BR-001, BR-002).
     *
     * Free courses grant immediate active enrollment.
     * Paid courses require a settled payment; if none exists a payment record
     * is created and a Midtrans transaction is requested.
     *
     * @return array{enrollment: Enrollment|null, payment: Payment|null, checkout_url: string|null}
     */
    public function enroll(User $user, Course $course): array
    {
        abort_unless($user->canLearnCourses() && $user->status === 'active', 403);
        abort_unless($course->status === 'published', 404);

        $hasSchoolAccess = $this->hasSchoolLearningPathAccess($user, $course);

        if ($user->isSchoolTeacher() && ! $hasSchoolAccess) {
            abort(403, 'Guru hanya dapat mengakses kursus dari learning path yang diberikan ke sekolahnya.');
        }

        $missingPrerequisites = $course->prerequisites()
            ->whereDoesntHave('enrollments', fn ($query) => $query
                ->where('user_id', $user->id)
                ->where('status', 'completed'))
            ->pluck('title')
            ->all();

        if ($missingPrerequisites !== []) {
            throw ValidationException::withMessages([
                'course' => 'Selesaikan prasyarat terlebih dahulu: '.implode(', ', $missingPrerequisites).'.',
            ]);
        }

        return DB::transaction(function () use ($user, $course, $hasSchoolAccess) {
            $enrollment = Enrollment::firstOrNew([
                'user_id' => $user->id,
                'course_id' => $course->id,
            ]);

            if ($course->isFree() || $hasSchoolAccess) {
                $enrollment->fill([
                    'status' => 'active',
                    'progress_percent' => $enrollment->exists ? $enrollment->progress_percent : 0,
                ])->save();

                AuditLogger::log('enrollment.created', $user, $enrollment, [
                    'price_type' => $course->price_type,
                    'access_source' => $hasSchoolAccess ? 'school_learning_path' : 'free_course',
                ]);

                return ['enrollment' => $enrollment->fresh(), 'payment' => null, 'checkout_url' => null];
            }

            // Paid course: reuse a paid payment, otherwise start a new transaction.
            $paid = Payment::where('user_id', $user->id)
                ->where('course_id', $course->id)
                ->where('status', 'paid')
                ->exists();

            if ($paid) {
                $enrollment->fill(['status' => 'active'])->save();

                return ['enrollment' => $enrollment->fresh(), 'payment' => null, 'checkout_url' => null];
            }

            $payment = Payment::firstOrCreate(
                [
                    'user_id' => $user->id,
                    'course_id' => $course->id,
                    'status' => 'pending',
                ],
                [
                    'order_id' => $this->midtrans->generateOrderId(),
                    'amount' => $course->price,
                ],
            );

            if (! $payment->snap_token) {
                $tx = $this->midtrans->createTransaction($payment);
                $payment->forceFill([
                    'snap_token' => $tx['snap_token'],
                    'checkout_url' => $tx['checkout_url'],
                ])->save();
            }

            return [
                'enrollment' => $enrollment->exists ? $enrollment->fresh() : null,
                'payment' => $payment->fresh(),
                'checkout_url' => $payment->checkout_url,
            ];
        });
    }

    /**
     * Activate a paid enrollment once a payment is confirmed (PG-005).
     */
    public function activateFromPayment(Payment $payment): ?Enrollment
    {
        return DB::transaction(function () use ($payment) {
            $enrollment = Enrollment::firstOrCreate(
                ['user_id' => $payment->user_id, 'course_id' => $payment->course_id],
                ['status' => 'active', 'progress_percent' => 0],
            );

            if (! $enrollment->isActive()) {
                $enrollment->update(['status' => 'active']);
            }

            AuditLogger::log('enrollment.activated', $payment->user, $enrollment, ['payment_id' => $payment->id]);

            return $enrollment->fresh();
        });
    }

    /**
     * Mark a single lesson complete and recompute course progress (FR-016).
     */
    public function completeLesson(User $user, Course $course, int $lessonId): Enrollment
    {
        return DB::transaction(function () use ($user, $course, $lessonId) {
            $enrollment = Enrollment::query()
                ->where('user_id', $user->id)
                ->where('course_id', $course->id)
                ->whereIn('status', ['active', 'completed'])
                ->firstOrFail();

            $lesson = Lesson::query()
                ->whereKey($lessonId)
                ->whereHas('chapter', fn ($query) => $query->where('course_id', $course->id))
                ->firstOrFail();

            $this->assertLessonAccessible($user, $course, $lesson);
            $this->assertLessonStepsCompleted($user, $lesson);
            $this->assertInteractiveBlocksCompleted($user, $lesson);

            $unfinishedQuiz = $lesson->quizzes()
                ->whereDoesntHave('attempts', fn ($query) => $query
                    ->where('user_id', $user->id)
                    ->where('passed', true))
                ->exists();
            if ($unfinishedQuiz) {
                throw ValidationException::withMessages([
                    'lesson' => 'Selesaikan dan lulus seluruh quiz pada lesson ini.',
                ]);
            }

            $requiresSubmission = $lesson->contentBlocks()
                ->where('type', 'submission')
                ->where('status', 'published')
                ->exists();
            if (
                $requiresSubmission
                && ! $enrollment->submissions()->where('lesson_id', $lesson->id)->exists()
            ) {
                throw ValidationException::withMessages([
                    'lesson' => 'Kirim submission lesson ini sebelum menandainya selesai.',
                ]);
            }

            LessonCompletion::firstOrCreate(
                ['user_id' => $user->id, 'lesson_id' => $lesson->id],
                ['completed_at' => now()],
            );

            AuditLogger::log('lesson.completed', $user, $lesson, [
                'course_id' => $course->id,
                'enrollment_id' => $enrollment->id,
            ]);

            return $this->recomputeProgress($user, $course);
        });
    }

    public function assertLessonAccessible(User $user, Course $course, Lesson $lesson): void
    {
        abort_unless($lesson->chapter()->where('course_id', $course->id)->exists(), 404);
        abort_unless($lesson->isScheduleUnlocked(), 403, 'Lesson belum tersedia.');

        if ($course->access_mode !== 'sequential') {
            return;
        }

        $priorLessonIds = Lesson::query()
            ->join('chapters', 'lessons.chapter_id', '=', 'chapters.id')
            ->where('chapters.course_id', $course->id)
            ->where(function ($query) use ($lesson) {
                $query
                    ->where('chapters.order_no', '<', $lesson->chapter->order_no)
                    ->orWhere(function ($query) use ($lesson) {
                        $query
                            ->where('chapters.order_no', $lesson->chapter->order_no)
                            ->where('lessons.order_no', '<', $lesson->order_no);
                    });
            })
            ->pluck('lessons.id');

        $completedPrior = LessonCompletion::query()
            ->where('user_id', $user->id)
            ->whereIn('lesson_id', $priorLessonIds)
            ->count();

        abort_unless(
            $completedPrior === $priorLessonIds->count(),
            403,
            'Selesaikan lesson sebelumnya terlebih dahulu.',
        );
    }

    /**
     * Compute progress as completed lessons / total required lessons (FR-016).
     */
    public function recomputeProgress(User $user, Course $course): Enrollment
    {
        $enrollment = Enrollment::where('user_id', $user->id)
            ->where('course_id', $course->id)
            ->firstOrFail();

        $requiredLessonIds = $course->lessons()
            ->where('is_required', true)
            ->pluck('lessons.id');
        $totalLessons = $requiredLessonIds->count();
        $completed = LessonCompletion::where('user_id', $user->id)
            ->whereIn('lesson_id', $requiredLessonIds)
            ->count();

        $percent = $totalLessons > 0 ? (int) round(($completed / $totalLessons) * 100) : 0;

        $enrollment->forceFill(['progress_percent' => min(100, $percent)])->save();

        if ($percent >= 100 && ! $enrollment->isCompleted()) {
            $enrollment->forceFill([
                'status' => 'completed',
                'completed_at' => now(),
            ])->save();
        }

        return $enrollment->fresh();
    }

    private function assertLessonStepsCompleted(User $user, Lesson $lesson): void
    {
        $stepRequirements = $lesson->contentBlocks()
            ->where('status', 'published')
            ->get(['id', 'metadata'])
            ->map(function ($block) {
                $steps = collect($block->metadata['steps'] ?? [])
                    ->filter(fn ($step) => is_array($step) && $this->stepHasReadableContent($step['content'] ?? null))
                    ->values();

                return [
                    'content_block_id' => $block->id,
                    'last_step_index' => $steps->count() - 1,
                ];
            })
            ->filter(fn (array $item) => $item['last_step_index'] > 0)
            ->values();

        if ($stepRequirements->isEmpty()) {
            return;
        }

        $progress = DB::table('content_block_step_progresses')
            ->where('user_id', $user->id)
            ->whereIn('content_block_id', $stepRequirements->pluck('content_block_id'))
            ->pluck('current_step_index', 'content_block_id');

        $hasUnfinishedStep = $stepRequirements->contains(
            fn (array $item) => (int) ($progress[$item['content_block_id']] ?? 0) < $item['last_step_index'],
        );

        if ($hasUnfinishedStep) {
            throw ValidationException::withMessages([
                'lesson' => 'Buka seluruh step materi sampai step terakhir sebelum menandai lesson selesai.',
            ]);
        }
    }

    private function assertInteractiveBlocksCompleted(User $user, Lesson $lesson): void
    {
        $lesson->contentBlocks()
            ->where('type', 'interactive')
            ->where('status', 'published')
            ->get()
            ->each(fn ($block) => $this->interactiveProgress->assertCompleted($user, $block));
    }

    private function stepHasReadableContent(mixed $content): bool
    {
        $value = (string) $content;

        return trim(str_replace('&nbsp;', ' ', strip_tags($value))) !== ''
            || preg_match('/<(img|video)\b/i', $value) === 1;
    }

    private function hasSchoolLearningPathAccess(User $user, Course $course): bool
    {
        if (! $user->school_id || ! $course->learning_path_id) {
            return false;
        }

        return SchoolLearningPathAccess::query()
            ->where('school_id', $user->school_id)
            ->where('learning_path_id', $course->learning_path_id)
            ->currentlyActive()
            ->exists();
    }
}
