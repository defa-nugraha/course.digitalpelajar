<?php

namespace App\Http\Controllers;

use App\Models\TeachingAttendance;
use App\Models\TeachingFeedback;
use App\Models\TeachingSchedule;
use App\Services\AuditLogger;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class StudentTeachingAttendanceController extends Controller
{
    public function scanner(): Response
    {
        return Inertia::render('student/attendance-scanner');
    }

    public function storeFromQr(Request $request, TeachingSchedule $teachingSchedule): RedirectResponse
    {
        $user = $request->user();
        abort_unless($user->role === 'student', 403);
        abort_unless($user->school_id && $user->school_id === $teachingSchedule->school_id, 403);
        abort_unless($teachingSchedule->mode === 'offline', 403);
        abort_unless(in_array($teachingSchedule->status, ['scheduled', 'rescheduled'], true), 403);
        abort_unless($teachingSchedule->session()->where('status', 'draft')->exists(), 403);

        $attendance = TeachingAttendance::updateOrCreate(
            [
                'teaching_schedule_id' => $teachingSchedule->id,
                'student_id' => $user->id,
            ],
            [
                'status' => 'H',
                'checked_in_at' => now(),
                'source' => 'student_qr',
                'reason' => null,
                'proof_path' => null,
            ],
        );

        AuditLogger::log('teaching_attendance.checked_in', $user, $attendance);

        return to_route('student.teaching-attendances.feedback', $teachingSchedule)
            ->with('success', 'Presensi berhasil disimpan. Silakan isi feedback pertemuan.');
    }

    public function feedback(Request $request, TeachingSchedule $teachingSchedule): Response|RedirectResponse
    {
        $this->authorizeFeedback($request, $teachingSchedule);

        $teachingSchedule->load(['instructor:id,name', 'course:id,title', 'session:id,teaching_schedule_id,topic,status']);
        $feedback = TeachingFeedback::query()
            ->where('teaching_schedule_id', $teachingSchedule->id)
            ->where('student_id', $request->user()->id)
            ->first();

        return Inertia::render('student/attendance-feedback', [
            'schedule' => [
                'id' => $teachingSchedule->id,
                'title' => $teachingSchedule->title,
                'topic' => $teachingSchedule->session?->topic,
                'course' => $teachingSchedule->course?->title ?? 'Umum sekolah',
                'instructor' => $teachingSchedule->instructor?->name ?? '-',
                'startsAtLabel' => optional($teachingSchedule->starts_at)->format('d M Y H:i'),
                'endsAtLabel' => optional($teachingSchedule->ends_at)->format('H:i'),
                'location' => $teachingSchedule->location,
            ],
            'feedback' => $feedback ? [
                'rating' => $feedback->rating,
                'understanding_level' => $feedback->understanding_level,
                'comment' => $feedback->comment,
                'suggestion' => $feedback->suggestion,
            ] : null,
        ]);
    }

    public function storeFeedback(Request $request, TeachingSchedule $teachingSchedule): RedirectResponse
    {
        $this->authorizeFeedback($request, $teachingSchedule);

        $data = $request->validate([
            'rating' => ['required', 'integer', 'between:1,5'],
            'understanding_level' => ['required', Rule::in(['understand', 'partly_understand', 'need_help'])],
            'comment' => ['nullable', 'string', 'max:2000'],
            'suggestion' => ['nullable', 'string', 'max:2000'],
        ]);

        $session = $teachingSchedule->session()->first();
        $feedback = TeachingFeedback::updateOrCreate(
            [
                'teaching_schedule_id' => $teachingSchedule->id,
                'student_id' => $request->user()->id,
            ],
            [
                ...$data,
                'teaching_session_id' => $session?->id,
                'school_id' => $teachingSchedule->school_id,
                'instructor_id' => $teachingSchedule->instructor_id,
                'course_id' => $teachingSchedule->course_id,
            ],
        );

        AuditLogger::log('teaching_feedback.submitted', $request->user(), $feedback);

        return to_route('student.dashboard')->with('success', 'Feedback pertemuan berhasil disimpan. Terima kasih.');
    }

    private function authorizeFeedback(Request $request, TeachingSchedule $teachingSchedule): void
    {
        $user = $request->user();

        abort_unless($user->role === 'student', 403);
        abort_unless($user->school_id && $user->school_id === $teachingSchedule->school_id, 403);
        abort_unless(
            TeachingAttendance::query()
                ->where('teaching_schedule_id', $teachingSchedule->id)
                ->where('student_id', $user->id)
                ->exists(),
            403,
            'Isi presensi terlebih dahulu sebelum memberi feedback.',
        );
    }
}
