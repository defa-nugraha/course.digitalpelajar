<?php

namespace App\Http\Controllers;

use App\Models\TeachingSchedule;
use App\Models\TeachingSession;
use App\Services\AuditLogger;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class TeachingSessionController extends Controller
{
    public function adminIndex(Request $request): Response
    {
        return $this->renderIndex($request, 'admin');
    }

    public function instructorIndex(Request $request): Response
    {
        return $this->renderIndex($request, 'instructor');
    }

    public function teacherIndex(Request $request): Response
    {
        abort_if(! $request->user()->school_id, 403);

        return $this->renderIndex($request, 'teacher');
    }

    public function create(Request $request): Response
    {
        abort_unless($request->user()->role === 'internal_instructor', 403);

        $now = now();

        return Inertia::render('teaching/session-create', [
            'title' => 'Isi Laporan Pertemuan',
            'schedules' => $this->availableSchedulesForInstructor($request->user()->id),
            'defaults' => [
                'actual_date' => $now->toDateString(),
                'started_at' => $now->format('H:i'),
            ],
            'backUrl' => route('instructor.teaching-sessions'),
        ]);
    }

    public function storeDraft(Request $request): RedirectResponse
    {
        abort_unless($request->user()->role === 'internal_instructor', 403);

        $data = $request->validate([
            'teaching_schedule_id' => ['required', 'integer', 'exists:teaching_schedules,id'],
            'actual_date' => ['required', 'date', 'before_or_equal:today'],
            'started_at' => ['required', 'date_format:H:i'],
            'topic' => ['required', 'string', 'max:255'],
        ]);

        $schedule = TeachingSchedule::query()
            ->whereKey($data['teaching_schedule_id'])
            ->where('instructor_id', $request->user()->id)
            ->firstOrFail();

        if ($schedule->session()->exists()) {
            throw ValidationException::withMessages([
                'teaching_schedule_id' => 'Jadwal ini sudah memiliki laporan pertemuan.',
            ]);
        }

        $session = TeachingSession::create([
            ...$data,
            'school_id' => $schedule->school_id,
            'instructor_id' => $schedule->instructor_id,
            'course_id' => $schedule->course_id,
            'ended_at' => now()->format('H:i'),
            'student_attendance_count' => 0,
            'report' => '',
            'evidence_photo_path' => '',
            'status' => 'draft',
        ]);

        AuditLogger::log('teaching_session.draft_created', $request->user(), $session);

        return redirect()->route('instructor.teaching-sessions')->with('success', 'Draft laporan pertemuan berhasil disimpan.');
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $this->validatedReport($request, true);
        $schedule = TeachingSchedule::query()
            ->whereKey($data['teaching_schedule_id'])
            ->where('instructor_id', $request->user()->id)
            ->firstOrFail();

        if ($schedule->session()->exists()) {
            throw ValidationException::withMessages([
                'teaching_schedule_id' => 'Jadwal ini sudah memiliki laporan pertemuan.',
            ]);
        }

        $data['school_id'] = $schedule->school_id;
        $data['instructor_id'] = $schedule->instructor_id;
        $data['course_id'] = $schedule->course_id;
        $data['evidence_photo_path'] = $this->storeEvidence($request);
        $data['status'] = 'submitted';

        $session = TeachingSession::create($data);

        AuditLogger::log('teaching_session.submitted', $request->user(), $session);

        return back()->with('success', 'Laporan pertemuan berhasil dikirim dan menunggu review.');
    }

    public function update(Request $request, TeachingSession $teachingSession): RedirectResponse
    {
        abort_unless($teachingSession->instructor_id === $request->user()->id, 403);

        if ($teachingSession->payrollItems()->exists()) {
            return back()->with('error', 'Laporan yang sudah masuk payroll tidak dapat diubah.');
        }

        $data = $this->validatedReport($request, false);

        unset($data['teaching_schedule_id']);

        if ($request->hasFile('evidence_photo')) {
            $this->deleteEvidence($teachingSession->evidence_photo_path);
            $data['evidence_photo_path'] = $this->storeEvidence($request);
        }

        if (! filled($teachingSession->evidence_photo_path) && ! filled($data['evidence_photo_path'] ?? null)) {
            throw ValidationException::withMessages([
                'evidence_photo' => 'Bukti foto laporan wajib diunggah.',
            ]);
        }

        $data['status'] = 'submitted';
        $data['reviewed_by'] = null;
        $data['reviewed_at'] = null;
        $data['review_notes'] = null;

        $teachingSession->update($data);

        AuditLogger::log('teaching_session.updated', $request->user(), $teachingSession);

        return back()->with('success', 'Laporan pertemuan berhasil diperbarui dan masuk ulang ke review.');
    }

    public function submitDraft(Request $request, TeachingSession $teachingSession): RedirectResponse
    {
        abort_unless($request->user()->role === 'internal_instructor' && $teachingSession->instructor_id === $request->user()->id, 403);

        if ($teachingSession->payrollItems()->exists()) {
            return back()->with('error', 'Laporan yang sudah masuk payroll tidak dapat diubah.');
        }

        if ($teachingSession->status !== 'draft') {
            return back()->with('error', 'Hanya draft laporan yang dapat dilengkapi dari aksi ini.');
        }

        $data = $request->validate([
            'report' => ['required', 'string', 'min:20', 'max:5000'],
            'evidence_photo' => ['required', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
        ]);

        $attendanceCount = DB::table('teaching_attendances')
            ->where('teaching_schedule_id', $teachingSession->teaching_schedule_id)
            ->whereIn('status', ['H', 'present'])
            ->count();

        $teachingSession->update([
            'report' => $data['report'],
            'evidence_photo_path' => $this->storeEvidence($request),
            'student_attendance_count' => $attendanceCount,
            'ended_at' => now()->format('H:i'),
            'status' => 'submitted',
            'reviewed_by' => null,
            'reviewed_at' => null,
            'review_notes' => null,
        ]);

        AuditLogger::log('teaching_session.submitted', $request->user(), $teachingSession);

        return back()->with('success', 'Laporan kegiatan dan bukti foto berhasil disubmit.');
    }

    public function review(Request $request, TeachingSession $teachingSession): RedirectResponse
    {
        $this->authorizeReview($request);

        $data = $request->validate([
            'status' => ['required', Rule::in(['approved', 'rejected'])],
            'review_notes' => [Rule::requiredIf($request->input('status') === 'rejected'), 'nullable', 'string', 'max:2000'],
        ]);

        $teachingSession->update([
            'status' => $data['status'],
            'reviewed_by' => $request->user()->id,
            'reviewed_at' => now(),
            'review_notes' => $data['review_notes'] ?? null,
        ]);

        if ($data['status'] === 'approved') {
            $teachingSession->schedule()->update(['status' => 'completed']);
        }

        AuditLogger::log('teaching_session.reviewed', $request->user(), $teachingSession, [
            'status' => $data['status'],
        ]);

        return back()->with('success', 'Review laporan pertemuan berhasil disimpan.');
    }

    public function show(Request $request, TeachingSession $teachingSession): Response
    {
        abort_unless($request->user()->isAdmin(), 403);

        $teachingSession->load([
            'schedule:id,title,starts_at,ends_at,mode,location,meeting_url,status,notes',
            'school:id,name,address',
            'instructor:id,name,email,phone',
            'course:id,title',
            'reviewer:id,name,email',
            'payrollItems.payroll:id,status,period_month,total_amount,paid_at,payment_proof_path,notes',
        ]);

        return Inertia::render('teaching/session-detail', [
            'title' => 'Detail Laporan Pertemuan',
            'scope' => 'admin',
            'session' => $this->sessionDetailPayload($teachingSession, 'admin'),
            'backUrl' => route('admin.teaching-sessions'),
        ]);
    }

    public function teacherShow(Request $request, TeachingSession $teachingSession): Response
    {
        $user = $request->user();
        abort_unless(
            $user->school_id
            && $teachingSession->school_id === $user->school_id
            && in_array($teachingSession->status, ['approved', 'rejected'], true)
            && $teachingSession->reviewed_at
            && $teachingSession->reviewer()->where('role', 'admin')->exists(),
            403,
        );

        $teachingSession->load([
            'schedule:id,title,starts_at,ends_at,mode,location,meeting_url,status,notes',
            'school:id,name,address',
            'instructor:id,name,email,phone',
            'course:id,title',
            'reviewer:id,name,email',
        ]);

        return Inertia::render('teaching/session-detail', [
            'title' => 'Detail Pertemuan Sekolah',
            'scope' => 'teacher',
            'session' => $this->sessionDetailPayload($teachingSession, 'teacher'),
            'backUrl' => route('teacher.teaching-sessions'),
        ]);
    }

    public function destroy(Request $request, TeachingSession $teachingSession): RedirectResponse
    {
        if ($teachingSession->payrollItems()->exists()) {
            return back()->with('error', 'Laporan yang sudah masuk payroll tidak dapat dihapus.');
        }

        AuditLogger::log('teaching_session.deleted', $request->user(), $teachingSession, [
            'topic' => $teachingSession->topic,
        ]);
        $this->deleteEvidence($teachingSession->evidence_photo_path);
        $teachingSession->delete();

        return back()->with('success', 'Laporan pertemuan berhasil dihapus.');
    }

    private function renderIndex(Request $request, string $scope): Response
    {
        $relations = [
            'schedule:id,title,starts_at,ends_at,mode,location,meeting_url',
            'school:id,name',
            'instructor:id,name,email',
            'course:id,title',
            'reviewer:id,name',
        ];
        if ($scope !== 'teacher') {
            $relations[] = 'payrollItems.payroll:id,status,period_month';
        }

        $query = TeachingSession::query()
            ->with($relations)
            ->when($scope === 'instructor', fn (Builder $query) => $query->where('instructor_id', $request->user()->id))
            ->when($scope === 'teacher', fn (Builder $query) => $query
                ->where('school_id', $request->user()->school_id)
                ->whereIn('status', ['approved', 'rejected'])
                ->whereNotNull('reviewed_at')
                ->whereHas('reviewer', fn (Builder $query) => $query->where('role', 'admin')))
            ->when($request->filled('status'), fn (Builder $query) => $query->where('status', $request->string('status')))
            ->when($request->integer('school'), fn (Builder $query, int $schoolId) => $query->where('school_id', $schoolId))
            ->when($request->integer('instructor'), fn (Builder $query, int $instructorId) => $query->where('instructor_id', $instructorId))
            ->when($request->integer('course'), fn (Builder $query, int $courseId) => $query->where('course_id', $courseId))
            ->latest('actual_date');

        $sessions = $query->get();

        return Inertia::render('teaching/sessions', [
            'scope' => $scope,
            'title' => match ($scope) {
                'admin' => 'Laporan Pertemuan',
                'instructor' => 'Laporan Saya',
                default => 'Laporan Pertemuan Sekolah',
            },
            'sessions' => $sessions->map(fn (TeachingSession $session) => $this->sessionPayload($session, $scope)),
            'availableSchedules' => $scope === 'instructor'
                ? $this->availableSchedulesForInstructor($request->user()->id)
                : collect(),
            'stats' => [
                'total' => $sessions->count(),
                'submitted' => $sessions->where('status', 'submitted')->count(),
                'approved' => $sessions->where('status', 'approved')->count(),
                'rejected' => $sessions->where('status', 'rejected')->count(),
                'averageAttendance' => round($sessions->avg('student_attendance_count') ?: 0),
            ],
            'options' => [
                'schools' => $scope === 'teacher'
                    ? collect()
                    : DB::table('schools')->where('status', 'active')->select('id', 'name')->orderBy('name')->get(),
                'instructors' => $scope === 'teacher'
                    ? collect()
                    : DB::table('users')
                        ->where('role', 'internal_instructor')
                        ->select('id', 'name')
                        ->orderBy('name')
                        ->get(),
                'courses' => $scope === 'teacher'
                    ? collect()
                    : DB::table('courses')->select('id', 'title')->orderBy('title')->get(),
            ],
            'permissions' => [
                'canCreateReport' => $scope === 'instructor',
                'canReview' => $scope === 'admin',
                'canDelete' => $scope === 'admin',
            ],
        ]);
    }

    private function sessionPayload(TeachingSession $session, string $scope): array
    {
        $payrollItem = $scope === 'teacher' ? null : $session->payrollItems->first();
        $studentAttendanceCount = $session->status === 'draft'
            ? DB::table('teaching_attendances')
                ->where('teaching_schedule_id', $session->teaching_schedule_id)
                ->whereIn('status', ['H', 'present'])
                ->count()
            : $session->student_attendance_count;

        return [
            'id' => $session->id,
            'teachingScheduleId' => $session->teaching_schedule_id,
            'scheduleTitle' => $session->schedule?->title ?? 'Jadwal tidak tersedia',
            'schoolId' => $session->school_id,
            'school' => $session->school?->name ?? 'Sekolah tidak tersedia',
            'instructorId' => $session->instructor_id,
            'instructor' => $session->instructor?->name ?? 'Pengajar tidak tersedia',
            'courseId' => $session->course_id,
            'course' => $session->course?->title ?? 'Course tidak tersedia',
            'actualDate' => optional($session->actual_date)->format('Y-m-d'),
            'actualDateLabel' => optional($session->actual_date)->format('d M Y'),
            'startedAt' => substr((string) $session->started_at, 0, 5),
            'endedAt' => substr((string) $session->ended_at, 0, 5),
            'topic' => $session->topic,
            'studentAttendanceCount' => $studentAttendanceCount,
            'report' => $session->report,
            'evidencePhotoPath' => $session->evidence_photo_path,
            'evidencePhotoUrl' => $this->evidenceUrl($session->evidence_photo_path),
            'status' => $session->status,
            'reviewer' => $session->reviewer?->name,
            'reviewedAt' => optional($session->reviewed_at)->format('d M Y H:i'),
            'reviewNotes' => $session->review_notes,
            'payrollStatus' => $scope === 'admin' ? $payrollItem?->payroll?->status : null,
            'payrollPeriod' => $scope === 'admin' ? $payrollItem?->payroll?->period_month?->format('Y-m') : null,
            'canEdit' => $scope === 'instructor' && $session->status !== 'draft' && ! $payrollItem,
            'canComplete' => $scope === 'instructor' && $session->status === 'draft' && ! $payrollItem,
            'canDelete' => $scope === 'admin' && ! $payrollItem,
        ];
    }

    private function sessionDetailPayload(TeachingSession $session, string $scope): array
    {
        $base = $this->sessionPayload($session, $scope);
        $attendanceRows = $this->attendanceRows($session);
        $feedbackRows = $this->feedbackRows($session);
        $payrollRows = $scope === 'admin'
            ? $session->payrollItems->map(fn ($item) => [
                'id' => $item->id,
                'status' => $item->payroll?->status ?? 'Payroll tidak tersedia',
                'period' => $item->payroll?->period_month?->format('Y-m'),
                'rateAmount' => $item->rate_amount,
                'amount' => $item->amount,
                'paidAt' => optional($item->payroll?->paid_at)->format('d M Y H:i'),
                'proofUrl' => $this->evidenceUrl($item->payroll?->payment_proof_path),
                'notes' => $item->payroll?->notes,
            ])->values()
            : collect();

        return [
            ...$base,
            'schedule' => [
                'id' => $session->teaching_schedule_id,
                'title' => $session->schedule?->title ?? 'Jadwal tidak tersedia',
                'startsAt' => optional($session->schedule?->starts_at)->format('d M Y H:i'),
                'endsAt' => optional($session->schedule?->ends_at)->format('d M Y H:i'),
                'mode' => $session->schedule?->mode ?? '-',
                'location' => $session->schedule?->location,
                'meetingUrl' => $session->schedule?->meeting_url,
                'status' => $session->schedule?->status,
                'notes' => $session->schedule?->notes,
            ],
            'schoolDetail' => [
                'name' => $session->school?->name ?? 'Sekolah tidak tersedia',
                'address' => $session->school?->address,
            ],
            'instructorDetail' => [
                'name' => $session->instructor?->name ?? 'Pengajar tidak tersedia',
                'email' => $session->instructor?->email,
                'phone' => $session->instructor?->phone,
            ],
            'review' => [
                'reviewer' => $session->reviewer?->name,
                'reviewerEmail' => $session->reviewer?->email,
                'reviewedAt' => optional($session->reviewed_at)->format('d M Y H:i'),
                'notes' => $session->review_notes,
            ],
            'attendanceSummary' => $this->attendanceSummary($attendanceRows),
            'attendances' => $attendanceRows,
            'feedbackSummary' => [
                'total' => $feedbackRows->count(),
                'averageRating' => round($feedbackRows->avg('rating') ?: 0, 1),
                'needHelp' => $feedbackRows->where('understandingLevel', 'need_help')->count(),
            ],
            'feedbacks' => $feedbackRows,
            'payrolls' => $payrollRows,
        ];
    }

    private function attendanceRows(TeachingSession $session)
    {
        if (! $session->teaching_schedule_id || ! $session->school_id) {
            return collect();
        }

        return DB::table('users')
            ->leftJoin('teaching_attendances', function ($join) use ($session) {
                $join->on('users.id', '=', 'teaching_attendances.student_id')
                    ->where('teaching_attendances.teaching_schedule_id', '=', $session->teaching_schedule_id);
            })
            ->where('users.role', 'student')
            ->where('users.school_id', $session->school_id)
            ->select(
                'users.id',
                'users.name',
                'users.email',
                'teaching_attendances.status',
                'teaching_attendances.checked_in_at as checkedInAt',
                'teaching_attendances.late_minutes as lateMinutes',
                'teaching_attendances.source',
                'teaching_attendances.reason',
                'teaching_attendances.proof_path as proofPath',
            )
            ->orderBy('users.name')
            ->get()
            ->map(function ($row) {
                $status = $this->normalizedAttendanceStatus($row->status);
                $lateMinutes = (int) ($row->lateMinutes ?? 0);

                return [
                    'studentId' => $row->id,
                    'student' => $row->name,
                    'email' => $row->email,
                    'status' => $status,
                    'statusLabel' => $this->attendanceStatusLabel($row->status),
                    'checkedInAt' => $row->checkedInAt ? date('d M Y H:i', strtotime($row->checkedInAt)) : null,
                    'source' => $row->source,
                    'sourceLabel' => $this->attendanceSourceLabel($row->source),
                    'reason' => $row->reason,
                    'proofUrl' => $this->evidenceUrl($row->proofPath),
                    'lateMinutes' => $lateMinutes,
                    'lateLabel' => $status === 'H' ? $this->lateLabel($lateMinutes) : null,
                ];
            });
    }

    private function attendanceSummary($attendanceRows): array
    {
        return [
            'total' => $attendanceRows->count(),
            'present' => $attendanceRows->where('status', 'H')->count(),
            'sick' => $attendanceRows->where('status', 'S')->count(),
            'permit' => $attendanceRows->where('status', 'I')->count(),
            'absent' => $attendanceRows->where('status', 'A')->count(),
            'lateStudents' => $attendanceRows->where('status', 'H')->where('lateMinutes', '>', 0)->count(),
            'totalLateMinutes' => (int) $attendanceRows->where('status', 'H')->sum('lateMinutes'),
            'missing' => $attendanceRows->whereNull('status')->count(),
        ];
    }

    private function feedbackRows(TeachingSession $session)
    {
        if (! $session->teaching_schedule_id) {
            return collect();
        }

        return DB::table('teaching_feedbacks')
            ->leftJoin('users', 'teaching_feedbacks.student_id', '=', 'users.id')
            ->where(function ($query) use ($session) {
                $query->where('teaching_feedbacks.teaching_session_id', $session->id)
                    ->orWhere(function ($query) use ($session) {
                        $query->whereNull('teaching_feedbacks.teaching_session_id')
                            ->where('teaching_feedbacks.teaching_schedule_id', $session->teaching_schedule_id);
                    });
            })
            ->select(
                'teaching_feedbacks.id',
                'teaching_feedbacks.rating',
                'teaching_feedbacks.understanding_level as understandingLevel',
                'teaching_feedbacks.comment',
                'teaching_feedbacks.suggestion',
                'teaching_feedbacks.created_at as createdAt',
                'users.name as student',
                'users.email as email',
            )
            ->latest('teaching_feedbacks.created_at')
            ->get()
            ->map(fn ($row) => [
                'id' => $row->id,
                'student' => $row->student ?? 'Siswa tidak tersedia',
                'email' => $row->email,
                'rating' => (int) $row->rating,
                'understandingLevel' => $row->understandingLevel,
                'understandingLabel' => $this->understandingLabel($row->understandingLevel),
                'comment' => $row->comment,
                'suggestion' => $row->suggestion,
                'createdAt' => $row->createdAt ? date('d M Y H:i', strtotime($row->createdAt)) : null,
            ]);
    }

    private function availableSchedulesForInstructor(int $instructorId)
    {
        return TeachingSchedule::query()
            ->with(['school:id,name', 'course:id,title'])
            ->where('instructor_id', $instructorId)
            ->whereDoesntHave('session')
            ->whereIn('status', ['scheduled', 'rescheduled'])
            ->orderByDesc('starts_at')
            ->get()
            ->map(fn (TeachingSchedule $schedule) => [
                'id' => $schedule->id,
                'title' => $schedule->title,
                'school' => $schedule->school?->name ?? '-',
                'course' => $schedule->course?->title ?? '-',
                'startsAtLabel' => optional($schedule->starts_at)->format('d M Y H:i'),
            ]);
    }

    private function validatedReport(Request $request, bool $isCreate): array
    {
        return $request->validate([
            'teaching_schedule_id' => [$isCreate ? 'required' : 'sometimes', 'integer', 'exists:teaching_schedules,id'],
            'actual_date' => ['required', 'date', 'before_or_equal:today'],
            'started_at' => ['required', 'date_format:H:i'],
            'ended_at' => ['required', 'date_format:H:i', 'after:started_at'],
            'topic' => ['required', 'string', 'max:255'],
            'student_attendance_count' => ['required', 'integer', 'min:0', 'max:500'],
            'report' => ['required', 'string', 'min:20', 'max:5000'],
            'evidence_photo' => [$isCreate ? 'required' : 'nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
        ]);
    }

    private function authorizeReview(Request $request): void
    {
        abort_unless($request->user()->isAdmin(), 403);
    }

    private function storeEvidence(Request $request): string
    {
        return $request->file('evidence_photo')->store("teaching-sessions/{$request->user()->id}", 'public');
    }

    private function deleteEvidence(?string $path): void
    {
        if (filled($path) && str_starts_with($path, 'teaching-sessions/')) {
            Storage::disk('public')->delete($path);
        }
    }

    private function evidenceUrl(?string $path): ?string
    {
        if (! filled($path)) {
            return null;
        }

        return url('/storage/'.ltrim($path, '/'));
    }

    private function normalizedAttendanceStatus(?string $status): ?string
    {
        return match ($status) {
            'H', 'present' => 'H',
            'S' => 'S',
            'I' => 'I',
            'A' => 'A',
            default => null,
        };
    }

    private function attendanceStatusLabel(?string $status): string
    {
        return match ($this->normalizedAttendanceStatus($status)) {
            'H' => 'Hadir',
            'S' => 'Sakit',
            'I' => 'Izin',
            'A' => 'Alpa',
            default => 'Belum tercatat',
        };
    }

    private function attendanceSourceLabel(?string $source): string
    {
        return match ($source) {
            'student_qr' => 'Scan QR siswa',
            'instructor_manual' => 'Input manual pengajar',
            default => $source ?: '-',
        };
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

    private function understandingLabel(?string $level): string
    {
        return match ($level) {
            'understand' => 'Paham',
            'partly_understand' => 'Sebagian paham',
            'need_help' => 'Butuh bantuan',
            default => $level ?: '-',
        };
    }
}
