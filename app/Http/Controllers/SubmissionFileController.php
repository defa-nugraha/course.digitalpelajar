<?php

namespace App\Http\Controllers;

use App\Models\Submission;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class SubmissionFileController extends Controller
{
    public function show(Request $request, Submission $submission, string $field): StreamedResponse
    {
        abort_unless(in_array($field, ['report', 'image'], true), 404);
        $submission->load('enrollment.user', 'enrollment.course');
        $user = $request->user();
        $course = $submission->enrollment->course;
        $student = $submission->enrollment->user;

        $allowed = $user->isAdmin()
            || $user->id === $student->id
            || ($user->role === 'internal_instructor' && $this->instructorCanAccessSubmission($user->id, $course->id, $student->school_id));
        abort_unless($allowed, 403);

        $path = $field === 'report' ? $submission->report_path : $submission->image_path;
        abort_if(blank($path) || ! Storage::disk('local')->exists($path), 404);

        return Storage::disk('local')->download($path);
    }

    private function instructorCanAccessSubmission(int $instructorId, int $courseId, ?int $studentSchoolId): bool
    {
        if ((int) DB::table('courses')->where('id', $courseId)->value('instructor_id') === $instructorId) {
            return true;
        }

        $courseAssigned = DB::table('teaching_schedules')
            ->where('instructor_id', $instructorId)
            ->where('course_id', $courseId)
            ->exists()
            || DB::table('teaching_sessions')
                ->where('instructor_id', $instructorId)
                ->where('course_id', $courseId)
                ->exists();

        if ($courseAssigned) {
            return true;
        }

        if (! $studentSchoolId) {
            return false;
        }

        return DB::table('teaching_schedules')
            ->where('instructor_id', $instructorId)
            ->where('school_id', $studentSchoolId)
            ->exists()
            || DB::table('teaching_sessions')
                ->where('instructor_id', $instructorId)
                ->where('school_id', $studentSchoolId)
                ->exists();
    }
}
