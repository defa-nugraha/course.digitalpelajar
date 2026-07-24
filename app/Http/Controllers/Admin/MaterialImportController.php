<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Lesson;
use App\Models\MediaUpload;
use App\Services\AuditLogger;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Smalot\PdfParser\Parser;
use Throwable;

class MaterialImportController extends Controller
{
    public function store(Request $request, Lesson $lesson, Parser $parser): RedirectResponse
    {
        $lesson->load('chapter.course');
        $course = $lesson->chapter->course;
        abort_unless($request->user()->isInstructor(), 403);

        $request->validate([
            'pdf' => ['required', 'file', 'mimes:pdf', 'max:20480'],
        ]);

        $file = $request->file('pdf');
        $path = $file->store("course-materials/{$course->id}/{$lesson->id}", 'local');

        try {
            $pages = collect($parser->parseFile($file->getRealPath())->getPages())
                ->map(fn ($page) => trim(preg_replace('/\s+/u', ' ', $page->getText()) ?? ''))
                ->filter()
                ->values();
        } catch (Throwable $exception) {
            Storage::disk('local')->delete($path);
            report($exception);

            throw ValidationException::withMessages([
                'pdf' => 'PDF tidak dapat dikonversi. Pastikan file tidak terenkripsi dan berisi teks yang dapat dibaca.',
            ]);
        }

        if ($pages->isEmpty()) {
            Storage::disk('local')->delete($path);
            throw ValidationException::withMessages([
                'pdf' => 'PDF tidak menghasilkan teks. PDF hasil scan perlu OCR sebelum diunggah.',
            ]);
        }

        try {
            $upload = DB::transaction(function () use ($request, $lesson, $file, $path, $pages) {
                $upload = MediaUpload::create([
                    'user_id' => $request->user()->id,
                    'mediable_type' => Lesson::class,
                    'mediable_id' => $lesson->id,
                    'disk' => 'local',
                    'path' => $path,
                    'original_name' => $file->getClientOriginalName(),
                    'mime_type' => $file->getMimeType(),
                    'size' => $file->getSize(),
                    'conversion_status' => 'draft',
                ]);

                $nextOrder = (int) $lesson->contentBlocks()->max('order_no') + 1;
                $lesson->contentBlocks()->create([
                    'type' => 'file',
                    'content' => $file->getClientOriginalName(),
                    'metadata' => [
                        'source' => 'pdf_conversion',
                        'media_upload_id' => $upload->id,
                    ],
                    'order_no' => $nextOrder++,
                    'status' => 'draft',
                ]);

                foreach ($pages as $index => $text) {
                    $lesson->contentBlocks()->create([
                        'type' => 'text',
                        'content' => $text,
                        'metadata' => [
                            'source' => 'pdf_conversion',
                            'media_upload_id' => $upload->id,
                            'page' => $index + 1,
                        ],
                        'order_no' => $nextOrder++,
                        'status' => 'draft',
                    ]);
                }

                return $upload;
            });
        } catch (Throwable $exception) {
            Storage::disk('local')->delete($path);
            throw $exception;
        }

        AuditLogger::log('material.pdf_converted', $request->user(), $upload, [
            'course_id' => $course->id,
            'lesson_id' => $lesson->id,
            'pages' => $pages->count(),
        ]);

        return back()->with('success', "PDF dikonversi menjadi {$pages->count()} block draft untuk direview.");
    }
}
