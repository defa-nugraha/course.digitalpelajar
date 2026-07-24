<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class TeachingFeedbackController extends Controller
{
    public function adminIndex(Request $request): Response
    {
        return $this->renderIndex($request, 'admin');
    }

    public function instructorIndex(Request $request): Response
    {
        return $this->renderIndex($request, 'instructor');
    }

    private function renderIndex(Request $request, string $scope): Response
    {
        $user = $request->user();

        abort_unless(
            $scope === 'admin'
                ? $user?->role === 'admin'
                : $user?->role === 'internal_instructor',
            403,
        );

        $rows = DB::table('teaching_feedbacks')
            ->leftJoin('teaching_schedules', 'teaching_feedbacks.teaching_schedule_id', '=', 'teaching_schedules.id')
            ->leftJoin('schools', 'teaching_feedbacks.school_id', '=', 'schools.id')
            ->leftJoin('users as instructors', 'teaching_feedbacks.instructor_id', '=', 'instructors.id')
            ->leftJoin('users as students', 'teaching_feedbacks.student_id', '=', 'students.id')
            ->leftJoin('courses', 'teaching_feedbacks.course_id', '=', 'courses.id')
            ->leftJoin('teaching_sessions', 'teaching_feedbacks.teaching_session_id', '=', 'teaching_sessions.id')
            ->when($scope === 'instructor', fn ($query) => $query->where('teaching_feedbacks.instructor_id', $user->id))
            ->when($request->integer('school'), fn ($query, int $schoolId) => $query->where('teaching_feedbacks.school_id', $schoolId))
            ->when($request->integer('instructor'), fn ($query, int $instructorId) => $query->where('teaching_feedbacks.instructor_id', $instructorId))
            ->when($request->filled('understanding'), fn ($query) => $query->where('teaching_feedbacks.understanding_level', (string) $request->string('understanding')))
            ->select(
                'teaching_feedbacks.id',
                'teaching_feedbacks.teaching_schedule_id as scheduleId',
                'teaching_feedbacks.teaching_session_id as sessionId',
                'teaching_feedbacks.rating',
                'teaching_feedbacks.understanding_level as understandingLevel',
                'teaching_feedbacks.comment',
                'teaching_feedbacks.suggestion',
                'teaching_feedbacks.created_at as createdAt',
                DB::raw("COALESCE(teaching_schedules.title, 'Jadwal tidak tersedia') as scheduleTitle"),
                'teaching_schedules.starts_at as startsAt',
                'teaching_schedules.ends_at as endsAt',
                'teaching_schedules.mode',
                DB::raw("COALESCE(schools.name, 'Sekolah tidak tersedia') as school"),
                DB::raw("COALESCE(instructors.name, 'Pengajar tidak tersedia') as instructor"),
                DB::raw("COALESCE(students.name, 'User tidak tersedia') as student"),
                DB::raw("COALESCE(courses.title, 'Umum sekolah') as course"),
                'teaching_sessions.topic as topic',
                'teaching_sessions.status as sessionStatus',
            )
            ->orderByDesc('teaching_schedules.starts_at')
            ->orderByDesc('teaching_feedbacks.created_at')
            ->get();

        $meetings = $rows
            ->groupBy('scheduleId')
            ->map(function ($items) {
                $first = $items->first();

                return [
                    'id' => (int) $first->scheduleId,
                    'sessionId' => $first->sessionId ? (int) $first->sessionId : null,
                    'title' => $first->scheduleTitle,
                    'topic' => $first->topic,
                    'sessionStatus' => $first->sessionStatus,
                    'school' => $first->school,
                    'instructor' => $first->instructor,
                    'course' => $first->course,
                    'mode' => $first->mode,
                    'startsAtLabel' => $first->startsAt ? date('d M Y H:i', strtotime($first->startsAt)) : '-',
                    'endsAtLabel' => $first->endsAt ? date('H:i', strtotime($first->endsAt)) : '-',
                    'feedbackCount' => $items->count(),
                    'averageRating' => round($items->avg('rating') ?: 0, 1),
                    'needHelp' => $items->where('understandingLevel', 'need_help')->count(),
                    'items' => $items->map(fn ($feedback) => [
                        'id' => (int) $feedback->id,
                        'student' => $feedback->student,
                        'rating' => (int) $feedback->rating,
                        'understandingLevel' => $feedback->understandingLevel,
                        'understandingLabel' => $this->understandingLabel($feedback->understandingLevel),
                        'comment' => $feedback->comment,
                        'suggestion' => $feedback->suggestion,
                        'createdAt' => $feedback->createdAt ? date('d M Y H:i', strtotime($feedback->createdAt)) : '-',
                    ])->values(),
                ];
            })
            ->values();

        return Inertia::render('teaching/feedbacks', [
            'scope' => $scope,
            'title' => $scope === 'admin' ? 'Feedback Pertemuan' : 'Feedback Siswa',
            'stats' => [
                'meetings' => $meetings->count(),
                'feedbacks' => $rows->count(),
                'averageRating' => round($rows->avg('rating') ?: 0, 1),
                'needHelp' => $rows->where('understandingLevel', 'need_help')->count(),
            ],
            'meetings' => $meetings,
            'options' => [
                'schools' => DB::table('schools')->where('status', 'active')->select('id', 'name')->orderBy('name')->get(),
                'instructors' => DB::table('users')
                    ->where('role', 'internal_instructor')
                    ->where('status', 'active')
                    ->select('id', 'name')
                    ->orderBy('name')
                    ->get(),
                'understandingLevels' => [
                    ['value' => 'all', 'label' => 'Semua pemahaman'],
                    ['value' => 'understand', 'label' => 'Paham'],
                    ['value' => 'partly_understand', 'label' => 'Sebagian paham'],
                    ['value' => 'need_help', 'label' => 'Butuh bantuan'],
                ],
            ],
        ]);
    }

    private function understandingLabel(?string $level): string
    {
        return match ($level) {
            'understand' => 'Paham',
            'partly_understand' => 'Sebagian paham',
            'need_help' => 'Butuh bantuan',
            default => 'Belum diketahui',
        };
    }
}
