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
        $this->authorizeReview($request, $teachingSession);

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
        $query = TeachingSession::query()
            ->with([
                'schedule:id,title,starts_at,ends_at,mode,location,meeting_url',
                'school:id,name',
                'instructor:id,name,email',
                'course:id,title',
                'reviewer:id,name',
                'payrollItems.payroll:id,status,period_month',
            ])
            ->when($scope === 'instructor', fn (Builder $query) => $query->where('instructor_id', $request->user()->id))
            ->when($scope === 'teacher', fn (Builder $query) => $query->where('school_id', $request->user()->school_id))
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
                'schools' => DB::table('schools')->where('status', 'active')->select('id', 'name')->orderBy('name')->get(),
                'instructors' => DB::table('users')
                    ->where('role', 'internal_instructor')
                    ->select('id', 'name')
                    ->orderBy('name')
                    ->get(),
                'courses' => DB::table('courses')->select('id', 'title')->orderBy('title')->get(),
            ],
            'permissions' => [
                'canCreateReport' => $scope === 'instructor',
                'canReview' => in_array($scope, ['admin', 'teacher'], true),
                'canDelete' => $scope === 'admin',
            ],
        ]);
    }

    private function sessionPayload(TeachingSession $session, string $scope): array
    {
        $payrollItem = $session->payrollItems->first();
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

    private function authorizeReview(Request $request, TeachingSession $session): void
    {
        $user = $request->user();

        abort_unless(
            $user->isAdmin()
            || ($user->role === 'school_teacher' && $user->school_id === $session->school_id),
            403,
        );
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
}
