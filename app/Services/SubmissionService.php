<?php

namespace App\Services;

use App\Models\Enrollment;
use App\Models\Submission;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;

class SubmissionService
{
    /**
     * Store a student project submission (FR-014).
     *
     * Accepts code text, optional report/image uploads, and a demo video URL.
     */
    public function submit(User $user, Enrollment $enrollment, array $payload, ?int $lessonId = null): Submission
    {
        return DB::transaction(function () use ($user, $enrollment, $payload, $lessonId) {
            $submission = Submission::create([
                'enrollment_id' => $enrollment->id,
                'lesson_id' => $lessonId,
                'code' => $payload['code'] ?? null,
                'report_path' => $this->storeFile($payload['report'] ?? null, $user, 'reports'),
                'image_path' => $this->storeFile($payload['image'] ?? null, $user, 'images'),
                'video_url' => $payload['video_url'] ?? null,
                'status' => 'submitted',
            ]);

            AuditLogger::log('submission.created', $user, $submission);

            return $submission->fresh();
        });
    }

    /**
     * Review a submission with score, feedback, and status (FR-015).
     */
    public function review(User $reviewer, Submission $submission, array $payload): Submission
    {
        return DB::transaction(function () use ($reviewer, $submission, $payload) {
            $submission->update([
                'reviewer_id' => $reviewer->id,
                'score' => $payload['score'] ?? null,
                'feedback' => $payload['feedback'] ?? null,
                'status' => $payload['status'],
                'reviewed_at' => now(),
            ]);

            AuditLogger::log('submission.reviewed', $reviewer, $submission, [
                'status' => $submission->status,
                'score' => $submission->score,
            ]);

            return $submission->fresh();
        });
    }

    private function storeFile(mixed $file, User $user, string $folder): ?string
    {
        if (! $file instanceof UploadedFile) {
            return null;
        }

        return $file->store("submissions/{$user->id}/{$folder}", 'local');
    }
}
