<?php

namespace App\Http\Controllers\Teacher;

use App\Http\Controllers\Controller;
use App\Models\StudentProgressNote;
use App\Models\TeachingSchedule;
use App\Models\User;
use App\Services\AuditLogger;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class StudentProgressNoteController extends Controller
{
    public function update(Request $request, TeachingSchedule $teachingSchedule, User $student): RedirectResponse
    {
        $this->authorizeContext($request, $teachingSchedule, $student);

        $data = $request->validate([
            'note' => ['required', 'string', 'max:3000'],
        ]);

        $note = StudentProgressNote::query()->updateOrCreate(
            [
                'teacher_id' => $request->user()->id,
                'student_id' => $student->id,
                'teaching_schedule_id' => $teachingSchedule->id,
            ],
            [
                'school_id' => $request->user()->school_id,
                'note' => trim($data['note']),
            ],
        );

        AuditLogger::log('student_progress_note.updated', $request->user(), $note, [
            'student_id' => $student->id,
            'teaching_schedule_id' => $teachingSchedule->id,
        ]);

        return back()->with('success', 'Catatan siswa berhasil disimpan.');
    }

    private function authorizeContext(Request $request, TeachingSchedule $teachingSchedule, User $student): void
    {
        $schoolId = $request->user()->school_id;

        abort_unless(
            $schoolId
            && $teachingSchedule->school_id === $schoolId
            && $student->role === 'student'
            && $student->school_id === $schoolId
            && $teachingSchedule->session()
                ->whereIn('status', ['approved', 'rejected'])
                ->whereNotNull('reviewed_at')
                ->whereHas('reviewer', fn ($query) => $query->where('role', 'admin'))
                ->exists(),
            403,
        );
    }
}
