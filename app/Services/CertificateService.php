<?php

namespace App\Services;

use App\Models\Certificate;
use App\Models\CertificateTemplate;
use App\Models\Enrollment;
use App\Models\User;
use Endroid\QrCode\Builder\Builder;
use Endroid\QrCode\Encoding\Encoding;
use Endroid\QrCode\ErrorCorrectionLevel;
use Endroid\QrCode\RoundBlockSizeMode;
use Endroid\QrCode\Writer\PngWriter;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class CertificateService
{
    public function __construct(private readonly QuizService $quizzes) {}

    /**
     * Eligibility check: progress 100% AND final exam passed AND
     * any required submission accepted (BR-003 completion rules).
     */
    public function isEligible(User $user, Enrollment $enrollment): bool
    {
        if ($enrollment->progress_percent < 100) {
            return false;
        }

        if (! $this->quizzes->hasCompletedRequiredQuizzes($user, $enrollment)) {
            return false;
        }

        if ($this->quizzes->averageRequiredQuizScore($user, $enrollment) < 70) {
            return false;
        }

        if (! $this->quizzes->hasPassedFinalExam($user, $enrollment)) {
            return false;
        }

        $submissionLessonIds = $enrollment->course->lessons()
            ->whereHas('contentBlocks', fn ($q) => $q->where('type', 'submission'))
            ->pluck('lessons.id');

        foreach ($submissionLessonIds as $lessonId) {
            if (! $enrollment->submissions()->where('lesson_id', $lessonId)->where('status', 'accepted')->exists()) {
                return false;
            }
        }

        return true;
    }

    /**
     * Issue a certificate for a completed enrollment (CT-003).
     * Idempotent: returns existing certificate if already issued.
     */
    public function issue(User $user, Enrollment $enrollment): Certificate
    {
        return DB::transaction(function () use ($user, $enrollment) {
            Enrollment::query()->whereKey($enrollment->id)->lockForUpdate()->firstOrFail();
            $existing = $enrollment->certificates()->first();

            if ($existing) {
                return $existing;
            }

            $template = $enrollment->course->certificateTemplate;
            if ($template?->status !== 'published') {
                $template = CertificateTemplate::where('status', 'published')->first();
            }

            $certificate = Certificate::create([
                'enrollment_id' => $enrollment->id,
                'certificate_template_id' => $template?->id,
                'certificate_no' => $this->generateNumber(),
                'qr_token' => Str::uuid()->toString(),
                'status' => 'issued',
                'issued_at' => now(),
            ]);

            AuditLogger::log('certificate.issued', $user, $certificate, [
                'course_id' => $enrollment->course_id,
            ]);

            return $certificate->fresh();
        });
    }

    /**
     * Issue automatically when eligibility is met (CT-003 automatic path).
     */
    public function issueIfEligible(User $user, Enrollment $enrollment): ?Certificate
    {
        if ($enrollment->certificates()->exists()) {
            return $enrollment->certificates()->first();
        }

        return $this->isEligible($user, $enrollment)
            ? $this->issue($user, $enrollment)
            : null;
    }

    /**
     * Build an SVG/PDF-friendly data payload for a certificate (CT-005).
     */
    public function buildRenderPayload(Certificate $certificate): array
    {
        $certificate->load([
            'enrollment.user.school',
            'enrollment.course',
            'template',
        ]);

        $verifyUrl = url('/certificates/verify?credential='.$certificate->qr_token);

        return [
            'no' => $certificate->certificate_no,
            'qr_token' => $certificate->qr_token,
            'student' => $certificate->enrollment->user->name,
            'course' => $certificate->enrollment->course->title,
            'school' => $certificate->enrollment->user->school?->name ?? 'Penerbit Resmi',
            'issued_at' => $certificate->issued_at?->format('d M Y'),
            'status' => $certificate->status,
            'revocation_reason' => $certificate->revocation_reason,
            'verify_url' => $verifyUrl,
            'qr_data_uri' => $this->qrDataUri($verifyUrl),
            'layout' => $certificate->template?->layout ?? [
                'title' => 'Certificate of Completion',
                'primary_color' => '#1C7DE8',
                'accent_color' => '#FED635',
            ],
        ];
    }

    public function qrDataUri(string $data): string
    {
        return Builder::create()
            ->writer(new PngWriter)
            ->data($data)
            ->encoding(new Encoding('UTF-8'))
            ->errorCorrectionLevel(ErrorCorrectionLevel::High)
            ->size(260)
            ->margin(10)
            ->roundBlockSizeMode(RoundBlockSizeMode::Margin)
            ->validateResult(false)
            ->build()
            ->getDataUri();
    }

    private function generateNumber(): string
    {
        do {
            $number = 'NGT-'.date('Y').'-'.strtoupper(Str::random(5));
        } while (Certificate::where('certificate_no', $number)->exists());

        return $number;
    }
}
