<?php

namespace App\Http\Controllers;

use App\Models\TeachingSchedule;
use App\Services\AuditLogger;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class TeachingScheduleController extends Controller
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

    public function store(Request $request): RedirectResponse
    {
        if ($request->input('schedule_basis') === 'school') {
            return $this->storeSchoolBasedSchedules($request);
        }

        $schedule = TeachingSchedule::create($this->validated($request));

        AuditLogger::log('teaching_schedule.created', $request->user(), $schedule);

        return back()->with('success', 'Jadwal mengajar berhasil ditambahkan.');
    }

    public function update(Request $request, TeachingSchedule $teachingSchedule): RedirectResponse
    {
        $teachingSchedule->update($this->validated($request, $teachingSchedule));

        AuditLogger::log('teaching_schedule.updated', $request->user(), $teachingSchedule);

        return back()->with('success', 'Jadwal mengajar berhasil diperbarui.');
    }

    public function destroy(Request $request, TeachingSchedule $teachingSchedule): RedirectResponse
    {
        if ($teachingSchedule->session()->exists()) {
            return back()->with('error', 'Jadwal yang sudah memiliki laporan pertemuan tidak dapat dihapus.');
        }

        AuditLogger::log('teaching_schedule.deleted', $request->user(), $teachingSchedule, [
            'title' => $teachingSchedule->title,
        ]);
        $teachingSchedule->delete();

        return back()->with('success', 'Jadwal mengajar berhasil dihapus.');
    }

    private function renderIndex(Request $request, string $scope): Response
    {
        $query = TeachingSchedule::query()
            ->with([
                'school:id,name',
                'instructor:id,name,email',
                'course:id,title',
                'session:id,teaching_schedule_id,status',
            ])
            ->when($scope === 'instructor', fn (Builder $query) => $query->where('instructor_id', $request->user()->id))
            ->when($scope === 'teacher', fn (Builder $query) => $query->where('school_id', $request->user()->school_id))
            ->when($request->filled('status'), fn (Builder $query) => $query->where('status', $request->string('status')))
            ->when($request->filled('mode'), fn (Builder $query) => $query->where('mode', $request->string('mode')))
            ->when($request->integer('school'), fn (Builder $query, int $schoolId) => $query->where('school_id', $schoolId))
            ->when($request->integer('instructor'), fn (Builder $query, int $instructorId) => $query->where('instructor_id', $instructorId))
            ->when($request->integer('course'), fn (Builder $query, int $courseId) => $query->where('course_id', $courseId))
            ->latest('starts_at');

        $schedules = $query->get();

        return Inertia::render('teaching/schedules', [
            'scope' => $scope,
            'title' => match ($scope) {
                'admin' => 'Jadwal Mengajar',
                'instructor' => 'Jadwal Saya',
                default => 'Jadwal Sekolah',
            },
            'schedules' => $schedules->map(fn (TeachingSchedule $schedule) => $this->schedulePayload($schedule, $scope)),
            'stats' => [
                'total' => $schedules->count(),
                'scheduled' => $schedules->where('status', 'scheduled')->count(),
                'completed' => $schedules->where('status', 'completed')->count(),
                'cancelled' => $schedules->where('status', 'cancelled')->count(),
            ],
            'options' => [
                'schools' => DB::table('schools')->where('status', 'active')->select('id', 'name')->orderBy('name')->get(),
                'instructors' => DB::table('users')
                    ->where('role', 'internal_instructor')
                    ->where('status', 'active')
                    ->select('id', 'name')
                    ->orderBy('name')
                    ->get(),
                'courses' => DB::table('courses')->select('id', 'title')->orderBy('title')->get(),
            ],
            'permissions' => [
                'canManage' => $scope === 'admin',
            ],
        ]);
    }

    private function schedulePayload(TeachingSchedule $schedule, string $scope): array
    {
        return [
            'id' => $schedule->id,
            'schoolId' => $schedule->school_id,
            'school' => $schedule->school?->name ?? 'Sekolah tidak tersedia',
            'instructorId' => $schedule->instructor_id,
            'instructor' => $schedule->instructor?->name ?? 'Pengajar tidak tersedia',
            'courseId' => $schedule->course_id,
            'course' => $schedule->course?->title ?? ($schedule->course_id ? 'Course tidak tersedia' : 'Umum sekolah'),
            'scheduleBasis' => $schedule->course_id ? 'course' : 'school',
            'title' => $schedule->title,
            'startsAt' => optional($schedule->starts_at)->format('Y-m-d\TH:i'),
            'startsAtLabel' => optional($schedule->starts_at)->format('d M Y H:i'),
            'endsAt' => optional($schedule->ends_at)->format('Y-m-d\TH:i'),
            'endsAtLabel' => optional($schedule->ends_at)->format('d M Y H:i'),
            'mode' => $schedule->mode,
            'location' => $schedule->location,
            'meetingUrl' => $schedule->meeting_url,
            'status' => $schedule->status,
            'notes' => $schedule->notes,
            'sessionId' => $schedule->session?->id,
            'sessionStatus' => $schedule->session?->status,
            'canEdit' => $scope === 'admin',
            'canDelete' => $scope === 'admin' && ! $schedule->session,
        ];
    }

    private function validated(Request $request, ?TeachingSchedule $schedule = null): array
    {
        $data = $request->validate([
            'school_id' => ['required', 'exists:schools,id'],
            'instructor_id' => [
                'required',
                Rule::exists('users', 'id')->where(fn ($query) => $query->where('role', 'internal_instructor')->where('status', 'active')),
            ],
            'course_id' => [$schedule ? 'nullable' : 'required', 'integer', 'exists:courses,id'],
            'title' => ['required', 'string', 'max:255'],
            'starts_at' => ['required', 'date'],
            'ends_at' => ['required', 'date', 'after:starts_at'],
            'mode' => ['required', Rule::in(['offline', 'online'])],
            'location' => [Rule::requiredIf($request->input('mode') === 'offline'), 'nullable', 'string', 'max:255'],
            'meeting_url' => [Rule::requiredIf($request->input('mode') === 'online'), 'nullable', 'url', 'max:1000'],
            'status' => ['required', Rule::in(['scheduled', 'completed', 'cancelled', 'rescheduled'])],
            'notes' => ['nullable', 'string', 'max:2000'],
        ]);

        if ($data['mode'] === 'offline') {
            $data['meeting_url'] = null;
        }

        if ($data['mode'] === 'online') {
            $data['location'] = ($data['location'] ?? null) ?: null;
        }

        return $data;
    }

    private function storeSchoolBasedSchedules(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'schedule_basis' => ['required', Rule::in(['school'])],
            'school_id' => ['required', 'exists:schools,id'],
            'instructor_id' => [
                'required',
                Rule::exists('users', 'id')->where(fn ($query) => $query->where('role', 'internal_instructor')->where('status', 'active')),
            ],
            'title' => ['required', 'string', 'max:255'],
            'schedule_start_date' => ['required', 'date'],
            'schedule_end_date' => ['required', 'date', 'after_or_equal:schedule_start_date'],
            'starts_time' => ['required', 'date_format:H:i'],
            'ends_time' => ['required', 'date_format:H:i', 'after:starts_time'],
            'weekdays' => ['required', 'array', 'min:1'],
            'weekdays.*' => ['integer', 'between:1,7'],
            'mode' => ['required', Rule::in(['offline', 'online'])],
            'location' => [Rule::requiredIf($request->input('mode') === 'offline'), 'nullable', 'string', 'max:255'],
            'meeting_url' => [Rule::requiredIf($request->input('mode') === 'online'), 'nullable', 'url', 'max:1000'],
            'status' => ['required', Rule::in(['scheduled', 'completed', 'cancelled', 'rescheduled'])],
            'notes' => ['nullable', 'string', 'max:2000'],
        ]);

        $startDate = Carbon::parse($data['schedule_start_date'])->startOfDay();
        $endDate = Carbon::parse($data['schedule_end_date'])->startOfDay();

        if ($startDate->diffInDays($endDate) > 180) {
            throw ValidationException::withMessages([
                'schedule_end_date' => 'Rentang jadwal sekolah maksimal 180 hari.',
            ]);
        }

        $selectedDays = collect($data['weekdays'])->map(fn ($day) => (int) $day)->unique()->values();
        $rows = collect();

        for ($date = $startDate->copy(); $date->lessThanOrEqualTo($endDate); $date->addDay()) {
            if (! $selectedDays->contains($date->dayOfWeekIso)) {
                continue;
            }

            $rows->push([
                'school_id' => $data['school_id'],
                'instructor_id' => $data['instructor_id'],
                'course_id' => null,
                'title' => $data['title'].' - '.$date->translatedFormat('l'),
                'starts_at' => $date->copy()->setTimeFromTimeString($data['starts_time']),
                'ends_at' => $date->copy()->setTimeFromTimeString($data['ends_time']),
                'mode' => $data['mode'],
                'location' => $data['mode'] === 'offline' ? $data['location'] : null,
                'meeting_url' => $data['mode'] === 'online' ? $data['meeting_url'] : null,
                'status' => $data['status'],
                'notes' => $data['notes'] ?? null,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        if ($rows->isEmpty()) {
            throw ValidationException::withMessages([
                'weekdays' => 'Tidak ada tanggal yang cocok dengan hari yang dipilih pada rentang periode tersebut.',
            ]);
        }

        DB::transaction(function () use ($rows, $request) {
            TeachingSchedule::insert($rows->all());

            AuditLogger::log('teaching_schedule.school_batch_created', $request->user(), null, [
                'total' => $rows->count(),
            ]);
        });

        return back()->with('success', $rows->count().' jadwal sekolah berhasil ditambahkan.');
    }
}
