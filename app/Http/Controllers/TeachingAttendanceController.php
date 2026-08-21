<?php

namespace App\Http\Controllers;

use App\Models\TeachingAttendance;
use App\Models\TeachingSession;
use App\Services\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class TeachingAttendanceController extends Controller
{
    public function index(Request $request, TeachingSession $teachingSession): Response
    {
        $this->authorizeInstructor($request, $teachingSession);
        $teachingSession->load(['schedule:id,title,starts_at,ends_at,mode,location,status', 'school:id,name', 'course:id,title']);

        return Inertia::render('teaching/attendances', [
            'session' => $this->sessionPayload($teachingSession),
            'students' => $this->studentRows($teachingSession),
            'summary' => $this->summary($teachingSession),
            'feedbackSummary' => $this->feedbackSummary($teachingSession),
            ...$this->qrPayload($teachingSession),
            'canEdit' => $this->canEdit($teachingSession),
            'backUrl' => route('instructor.teaching-sessions'),
        ]);
    }

    public function data(Request $request, TeachingSession $teachingSession): JsonResponse
    {
        $this->authorizeInstructor($request, $teachingSession);

        return response()->json([
            'students' => $this->studentRows($teachingSession),
            'summary' => $this->summary($teachingSession),
            'feedbackSummary' => $this->feedbackSummary($teachingSession),
            ...$this->qrPayload($teachingSession),
            'canEdit' => $this->canEdit($teachingSession),
        ]);
    }

    public function update(Request $request, TeachingSession $teachingSession): RedirectResponse
    {
        $this->authorizeInstructor($request, $teachingSession);
        abort_unless($this->canEdit($teachingSession), 403);
        $teachingSession->loadMissing('schedule:id,starts_at');

        $data = $request->validate([
            'attendances' => ['required', 'array'],
            'attendances.*.student_id' => [
                'required',
                'integer',
                Rule::exists('users', 'id')->where(fn ($query) => $query
                    ->where('role', 'student')
                    ->where('school_id', $teachingSession->school_id)),
            ],
            'attendances.*.status' => ['required', Rule::in(['H', 'S', 'I', 'A'])],
            'attendances.*.reason' => ['nullable', 'string', 'max:1000'],
            'attendances.*.proof' => ['nullable', 'file', 'mimes:jpg,jpeg,png,webp,pdf', 'max:5120'],
        ]);

        foreach ($data['attendances'] as $index => $attendance) {
            if (in_array($attendance['status'], ['S', 'I'], true) && blank($attendance['reason'] ?? null)) {
                throw ValidationException::withMessages([
                    "attendances.$index.reason" => 'Alasan wajib diisi untuk status Sakit atau Izin.',
                ]);
            }
        }

        $studentIds = DB::table('users')
            ->where('role', 'student')
            ->where('school_id', $teachingSession->school_id)
            ->pluck('id');
        $payloadByStudent = collect($data['attendances'])->keyBy(fn (array $attendance) => (int) $attendance['student_id']);

        DB::transaction(function () use ($teachingSession, $studentIds, $payloadByStudent) {
            $studentIds->each(function (int $studentId) use ($teachingSession, $payloadByStudent) {
                $payload = $payloadByStudent->get($studentId);

                if (! $payload) {
                    return;
                }

                $existing = TeachingAttendance::query()
                    ->where('teaching_schedule_id', $teachingSession->teaching_schedule_id)
                    ->where('student_id', $studentId)
                    ->first();
                $status = $payload['status'];
                $proofPath = $existing?->proof_path;

                $proof = $payload['proof'] ?? null;
                if ($proof) {
                    $this->deleteProof($proofPath);
                    $proofPath = $proof->store("teaching-attendances/{$teachingSession->id}", 'public');
                }

                if (in_array($status, ['H', 'A'], true)) {
                    $this->deleteProof($proofPath);
                    $proofPath = null;
                }

                $source = $existing?->source === 'student_qr' && $status === 'H'
                    ? 'student_qr'
                    : 'instructor_manual';
                $checkedInAt = $existing?->checked_in_at ?: now();

                TeachingAttendance::updateOrCreate(
                    [
                        'teaching_schedule_id' => $teachingSession->teaching_schedule_id,
                        'student_id' => $studentId,
                    ],
                    [
                        'status' => $status,
                        'checked_in_at' => $checkedInAt,
                        'late_minutes' => $status === 'H' ? $this->lateMinutes($teachingSession, $checkedInAt) : 0,
                        'source' => $source,
                        'reason' => in_array($status, ['S', 'I'], true) ? ($payload['reason'] ?? null) : null,
                        'proof_path' => $proofPath,
                    ],
                );
            });
        });

        AuditLogger::log('teaching_attendance.manual_updated', $request->user(), $teachingSession, [
            'present_count' => DB::table('teaching_attendances')
                ->where('teaching_schedule_id', $teachingSession->teaching_schedule_id)
                ->whereIn('status', ['H', 'present'])
                ->count(),
        ]);

        return back()->with('success', 'Presensi siswa berhasil disimpan.');
    }

    private function authorizeInstructor(Request $request, TeachingSession $teachingSession): void
    {
        abort_unless(
            $request->user()?->role === 'internal_instructor'
            && $teachingSession->instructor_id === $request->user()->id,
            403,
        );
    }

    private function canEdit(TeachingSession $teachingSession): bool
    {
        return $teachingSession->status === 'draft' && ! $teachingSession->payrollItems()->exists();
    }

    private function sessionPayload(TeachingSession $teachingSession): array
    {
        return [
            'id' => $teachingSession->id,
            'teachingScheduleId' => $teachingSession->teaching_schedule_id,
            'topic' => $teachingSession->topic,
            'status' => $teachingSession->status,
            'school' => $teachingSession->school?->name ?? '-',
            'course' => $teachingSession->course?->title ?? '-',
            'scheduleTitle' => $teachingSession->schedule?->title ?? '-',
            'scheduleMode' => $teachingSession->schedule?->mode ?? '-',
            'location' => $teachingSession->schedule?->location,
            'startsAtLabel' => optional($teachingSession->schedule?->starts_at)->format('d M Y H:i'),
            'endsAtLabel' => optional($teachingSession->schedule?->ends_at)->format('H:i'),
        ];
    }

    private function studentRows(TeachingSession $teachingSession)
    {
        return DB::table('users')
            ->leftJoin('teaching_attendances', function ($join) use ($teachingSession) {
                $join->on('users.id', '=', 'teaching_attendances.student_id')
                    ->where('teaching_attendances.teaching_schedule_id', '=', $teachingSession->teaching_schedule_id);
            })
            ->where('users.role', 'student')
            ->where('users.school_id', $teachingSession->school_id)
            ->select(
                'users.id',
                'users.name',
                'users.email',
                'teaching_attendances.id as attendanceId',
                'teaching_attendances.status',
                'teaching_attendances.checked_in_at as checkedInAt',
                'teaching_attendances.late_minutes as lateMinutes',
                'teaching_attendances.source',
                'teaching_attendances.reason',
                'teaching_attendances.proof_path as proofPath',
            )
            ->orderBy('users.name')
            ->get()
            ->map(function ($student) {
                $status = $this->normalizedStatus($student->status ?? null);
                $lateMinutes = (int) ($student->lateMinutes ?? 0);

                return [
                    'id' => $student->id,
                    'name' => $student->name,
                    'email' => $student->email,
                    'status' => $status,
                    'present' => in_array($status, ['H'], true),
                    'checkedInAt' => $student->checkedInAt ? date('d M Y H:i', strtotime($student->checkedInAt)) : null,
                    'source' => $student->source,
                    'reason' => $student->reason,
                    'proofUrl' => $this->proofUrl($student->proofPath),
                    'lateMinutes' => $lateMinutes,
                    'lateLabel' => $status === 'H' ? $this->lateLabel($lateMinutes) : null,
                ];
            });
    }

    private function summary(TeachingSession $teachingSession): array
    {
        $total = DB::table('users')
            ->where('role', 'student')
            ->where('school_id', $teachingSession->school_id)
            ->count();
        $baseQuery = DB::table('teaching_attendances')
            ->join('users', 'teaching_attendances.student_id', '=', 'users.id')
            ->where('teaching_attendances.teaching_schedule_id', $teachingSession->teaching_schedule_id)
            ->where('users.school_id', $teachingSession->school_id)
            ->where('users.role', 'student');
        $present = (clone $baseQuery)->whereIn('teaching_attendances.status', ['H', 'present'])->count();
        $sick = (clone $baseQuery)->where('teaching_attendances.status', 'S')->count();
        $permit = (clone $baseQuery)->where('teaching_attendances.status', 'I')->count();
        $absent = (clone $baseQuery)->where('teaching_attendances.status', 'A')->count();
        $recorded = (clone $baseQuery)->whereIn('teaching_attendances.status', ['H', 'S', 'I', 'A', 'present'])->count();
        $lateStudents = (clone $baseQuery)->whereIn('teaching_attendances.status', ['H', 'present'])->where('late_minutes', '>', 0)->count();
        $totalLateMinutes = (int) (clone $baseQuery)->whereIn('teaching_attendances.status', ['H', 'present'])->sum('late_minutes');

        return [
            'total' => $total,
            'present' => $present,
            'sick' => $sick,
            'permit' => $permit,
            'absent' => $absent,
            'lateStudents' => $lateStudents,
            'totalLateMinutes' => $totalLateMinutes,
            'missing' => max(0, $total - $recorded),
            'complete' => $total > 0 && $recorded >= $total,
        ];
    }

    private function feedbackSummary(TeachingSession $teachingSession): array
    {
        $feedbacks = DB::table('teaching_feedbacks')
            ->join('users', 'teaching_feedbacks.student_id', '=', 'users.id')
            ->where('teaching_feedbacks.teaching_schedule_id', $teachingSession->teaching_schedule_id)
            ->select(
                'teaching_feedbacks.id',
                'teaching_feedbacks.rating',
                'teaching_feedbacks.understanding_level as understandingLevel',
                'teaching_feedbacks.comment',
                'teaching_feedbacks.suggestion',
                'teaching_feedbacks.created_at as createdAt',
                'users.name as student',
            )
            ->latest('teaching_feedbacks.created_at')
            ->get();

        return [
            'total' => $feedbacks->count(),
            'averageRating' => round($feedbacks->avg('rating') ?: 0, 1),
            'needHelp' => $feedbacks->where('understandingLevel', 'need_help')->count(),
            'items' => $feedbacks->map(fn ($feedback) => [
                'id' => $feedback->id,
                'student' => $feedback->student,
                'rating' => (int) $feedback->rating,
                'understandingLevel' => $feedback->understandingLevel,
                'understandingLabel' => $this->understandingLabel($feedback->understandingLevel),
                'comment' => $feedback->comment,
                'suggestion' => $feedback->suggestion,
                'createdAt' => date('d M Y H:i', strtotime($feedback->createdAt)),
            ]),
        ];
    }

    private function understandingLabel(string $level): string
    {
        return match ($level) {
            'understand' => 'Paham',
            'partly_understand' => 'Sebagian paham',
            'need_help' => 'Butuh bantuan',
            default => $level,
        };
    }

    private function qrPayload(TeachingSession $teachingSession): array
    {
        if (! $this->canEdit($teachingSession)) {
            return [
                'qrUrl' => null,
                'qrExpiresAt' => null,
            ];
        }

        $qrExpiresAt = now()->addMinutes(2);

        return [
            'qrUrl' => URL::temporarySignedRoute(
                'student.teaching-attendances.scan.store',
                $qrExpiresAt,
                [
                    'teachingSchedule' => $teachingSession->teaching_schedule_id,
                    'nonce' => Str::random(16),
                ],
            ),
            'qrExpiresAt' => $qrExpiresAt->toIso8601String(),
        ];
    }

    private function normalizedStatus(?string $status): ?string
    {
        return match ($status) {
            'H', 'present' => 'H',
            'S' => 'S',
            'I' => 'I',
            'A' => 'A',
            default => null,
        };
    }

    private function lateMinutes(TeachingSession $teachingSession, $checkedInAt): int
    {
        if (! $teachingSession->schedule?->starts_at || ! $checkedInAt) {
            return 0;
        }

        return max(0, (int) $teachingSession->schedule->starts_at->diffInMinutes($checkedInAt, false));
    }

    private function lateLabel(int $minutes): string
    {
        if ($minutes <= 0) {
            return 'Tepat waktu';
        }

        $hours = intdiv($minutes, 60);
        $remainingMinutes = $minutes % 60;

        return collect([
            $hours > 0 ? "{$hours} jam" : null,
            $remainingMinutes > 0 ? "{$remainingMinutes} menit" : null,
        ])->filter()->implode(' ');
    }

    private function proofUrl(?string $path): ?string
    {
        if (! filled($path)) {
            return null;
        }

        return url('/storage/'.ltrim($path, '/'));
    }

    private function deleteProof(?string $path): void
    {
        if (filled($path) && str_starts_with($path, 'teaching-attendances/')) {
            Storage::disk('public')->delete($path);
        }
    }
}
