<?php

namespace App\Http\Controllers;

use App\Models\Lesson;
use App\Models\MediaUpload;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class MaterialController extends Controller
{
    public function download(Request $request, MediaUpload $mediaUpload): StreamedResponse
    {
        $this->authorizeMaterialAccess($request, $mediaUpload);
        abort_unless(Storage::disk($mediaUpload->disk)->exists($mediaUpload->path), 404);

        return Storage::disk($mediaUpload->disk)->download(
            $mediaUpload->path,
            $mediaUpload->original_name,
            ['Content-Type' => $mediaUpload->mime_type ?: 'application/octet-stream'],
        );
    }

    public function view(Request $request, MediaUpload $mediaUpload): StreamedResponse
    {
        $this->authorizeMaterialAccess($request, $mediaUpload);
        abort_unless(Storage::disk($mediaUpload->disk)->exists($mediaUpload->path), 404);
        abort_unless($mediaUpload->mime_type === 'application/pdf', 404);

        return Storage::disk($mediaUpload->disk)->response(
            $mediaUpload->path,
            $mediaUpload->original_name,
            ['Content-Type' => 'application/pdf'],
            'inline',
        );
    }

    private function authorizeMaterialAccess(Request $request, MediaUpload $mediaUpload): void
    {
        abort_unless($mediaUpload->mediable_type === Lesson::class, 404);
        $lesson = Lesson::with('chapter.course')->findOrFail($mediaUpload->mediable_id);
        $course = $lesson->chapter->course;
        $user = $request->user();

        $allowed = $user->isAdmin()
            || ($user->role === 'internal_instructor' && $course->instructor_id === $user->id)
            || (in_array($user->role, ['student', 'school_teacher'], true) && $course->enrollments()
                ->where('user_id', $user->id)
                ->whereIn('status', ['active', 'completed'])
                ->exists());

        abort_unless($allowed, 403);
    }
}
