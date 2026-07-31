<?php

use App\Models\Chapter;
use App\Models\ContentBlock;
use App\Models\Course;
use App\Models\Enrollment;
use App\Models\Lesson;
use App\Models\LessonCompletion;
use App\Models\MediaUpload;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

uses(RefreshDatabase::class);

test('course builder stores block metadata from structured form fields', function () {
    Storage::fake('public');
    $admin = User::factory()->admin()->create();
    $course = Course::factory()->create(['status' => 'published']);
    $chapter = Chapter::factory()->create(['course_id' => $course->id]);
    $lesson = Lesson::factory()->create(['chapter_id' => $chapter->id]);

    $this->actingAs($admin)
        ->post("/admin/lessons/{$lesson->id}/blocks", [
            'type' => 'image',
            'content' => '',
            'metadata' => [
                'alt' => 'Board Arduino Uno',
                'caption' => 'Komponen utama Arduino Uno.',
            ],
            'material_file' => UploadedFile::fake()->image('arduino-board.png'),
            'order_no' => 1,
            'status' => 'published',
        ])
        ->assertSessionHasNoErrors()
        ->assertRedirect();

    $block = $lesson->contentBlocks()->firstOrFail();

    expect($block->content)->toStartWith("course-materials/{$course->id}/{$lesson->id}/images/")
        ->and($block->metadata['alt'])->toBe('Board Arduino Uno')
        ->and($block->metadata['caption'])->toBe('Komponen utama Arduino Uno.')
        ->and($block->metadata['source'])->toBe('block_upload')
        ->and(MediaUpload::count())->toBe(1);

    Storage::disk('public')->assertExists($block->content);
});

test('block create and edit pages render and text content can store rich html', function () {
    $admin = User::factory()->admin()->create();
    $course = Course::factory()->create(['status' => 'published']);
    $chapter = Chapter::factory()->create(['course_id' => $course->id]);
    $lesson = Lesson::factory()->create(['chapter_id' => $chapter->id]);

    $this->actingAs($admin)
        ->get("/admin/lessons/{$lesson->id}/blocks/create")
        ->assertOk();

    $this->actingAs($admin)
        ->post("/admin/lessons/{$lesson->id}/blocks", [
            'type' => 'text',
            'content' => '<h2>Dasar Arduino</h2><p><strong>Arduino</strong> adalah platform prototyping.</p>',
            'metadata' => [],
            'order_no' => 1,
            'status' => 'published',
        ])
        ->assertSessionHasNoErrors()
        ->assertRedirect("/admin/course-builder?course={$course->id}");

    $block = $lesson->contentBlocks()->firstOrFail();

    expect($block->content)->toContain('<strong>Arduino</strong>');

    $this->actingAs($admin)
        ->get("/admin/blocks/{$block->id}/edit")
        ->assertOk();
});

test('lesson initial block accepts checklist metadata without manual json', function () {
    $admin = User::factory()->admin()->create();
    $course = Course::factory()->create(['status' => 'published']);
    $chapter = Chapter::factory()->create(['course_id' => $course->id]);

    $this->actingAs($admin)
        ->post("/admin/chapters/{$chapter->id}/lessons", [
            'title' => 'Persiapan Praktik Arduino',
            'order_no' => 1,
            'is_required' => true,
            'available_at' => null,
            'add_initial_block' => true,
            'initial_block_type' => 'checklist',
            'initial_block_content' => '',
            'initial_block_metadata' => [
                'items' => ['Siapkan Arduino Uno', 'Siapkan kabel USB', 'Install Arduino IDE'],
            ],
            'initial_block_status' => 'published',
        ])
        ->assertSessionHasNoErrors()
        ->assertRedirect();

    $lesson = $chapter->lessons()->firstOrFail();
    $block = $lesson->contentBlocks()->firstOrFail();

    expect($block->type)->toBe('checklist')
        ->and($block->metadata['items'])->toBe(['Siapkan Arduino Uno', 'Siapkan kabel USB', 'Install Arduino IDE']);
});

test('student content block step progress is persisted per user', function () {
    $student = User::factory()->student()->create();
    $course = Course::factory()->free()->create(['status' => 'published']);
    $chapter = Chapter::factory()->create(['course_id' => $course->id]);
    $lesson = Lesson::factory()->create(['chapter_id' => $chapter->id]);
    $block = ContentBlock::create([
        'lesson_id' => $lesson->id,
        'type' => 'text',
        'content' => '<p>Step pertama</p>',
        'metadata' => [
            'steps' => [
                ['title' => 'Pengenalan', 'content' => '<p>Step pertama</p>'],
                ['title' => 'Rangkaian', 'content' => '<p>Step kedua</p>'],
                ['title' => 'Upload', 'content' => '<p>Step ketiga</p>'],
            ],
        ],
        'order_no' => 1,
        'status' => 'published',
    ]);
    Enrollment::factory()->create([
        'user_id' => $student->id,
        'course_id' => $course->id,
        'status' => 'active',
    ]);

    $this->actingAs($student)
        ->from("/learning?course={$course->id}&lesson={$lesson->id}")
        ->post("/learning/blocks/{$block->id}/step", [
            'step_index' => 2,
        ])
        ->assertRedirect("/learning?course={$course->id}&lesson={$lesson->id}");

    expect(DB::table('content_block_step_progresses')
        ->where('user_id', $student->id)
        ->where('content_block_id', $block->id)
        ->value('current_step_index'))->toBe(2);
});

test('course editor uploads image and video media for rich text steps', function () {
    Storage::fake('public');
    $admin = User::factory()->admin()->create();
    $course = Course::factory()->create(['status' => 'published']);
    $chapter = Chapter::factory()->create(['course_id' => $course->id]);
    $lesson = Lesson::factory()->create(['chapter_id' => $chapter->id]);

    $imageResponse = $this->actingAs($admin)
        ->post("/admin/lessons/{$lesson->id}/editor-media", [
            'type' => 'image',
            'media' => UploadedFile::fake()->image('diagram-arduino.png'),
        ], ['Accept' => 'application/json'])
        ->assertOk()
        ->assertJsonPath('type', 'image');

    expect($imageResponse->json('url'))->toStartWith('/storage/course-materials/');

    $videoResponse = $this->actingAs($admin)
        ->post("/admin/lessons/{$lesson->id}/editor-media", [
            'type' => 'video',
            'media' => UploadedFile::fake()->create('demo-rangkaian.mp4', 512, 'video/mp4'),
        ], ['Accept' => 'application/json'])
        ->assertOk()
        ->assertJsonPath('type', 'video');

    expect(MediaUpload::count())->toBe(2)
        ->and($videoResponse->json('url'))->toStartWith('/storage/course-materials/');

    MediaUpload::all()->each(fn (MediaUpload $upload) => Storage::disk('public')->assertExists($upload->path));
});

test('lesson cannot be marked complete until the last content block step is opened', function () {
    $student = User::factory()->student()->create();
    $course = Course::factory()->free()->create(['status' => 'published']);
    $chapter = Chapter::factory()->create(['course_id' => $course->id]);
    $lesson = Lesson::factory()->create(['chapter_id' => $chapter->id]);
    $block = ContentBlock::create([
        'lesson_id' => $lesson->id,
        'type' => 'text',
        'content' => '<p>Step pertama</p>',
        'metadata' => [
            'steps' => [
                ['title' => 'Pengenalan', 'content' => '<p>Step pertama</p>'],
                ['title' => 'Praktik', 'content' => '<p>Step terakhir</p>'],
            ],
        ],
        'order_no' => 1,
        'status' => 'published',
    ]);
    Enrollment::factory()->create([
        'user_id' => $student->id,
        'course_id' => $course->id,
        'status' => 'active',
    ]);

    $this->actingAs($student)
        ->post("/courses/{$course->id}/lessons/{$lesson->id}/complete")
        ->assertSessionHasErrors('lesson');

    expect(LessonCompletion::query()->where('user_id', $student->id)->where('lesson_id', $lesson->id)->exists())->toBeFalse();

    $this->actingAs($student)
        ->post("/learning/blocks/{$block->id}/step", ['step_index' => 1])
        ->assertRedirect();

    $this->actingAs($student)
        ->post("/courses/{$course->id}/lessons/{$lesson->id}/complete")
        ->assertSessionHasNoErrors()
        ->assertRedirect();

    expect(LessonCompletion::query()->where('user_id', $student->id)->where('lesson_id', $lesson->id)->exists())->toBeTrue();
});

test('course builder supports uploaded pdf block with inline preview for enrolled student', function () {
    Storage::fake('public');
    $admin = User::factory()->admin()->create();
    $student = User::factory()->student()->create();
    $course = Course::factory()->free()->create(['status' => 'published']);
    $chapter = Chapter::factory()->create(['course_id' => $course->id]);
    $lesson = Lesson::factory()->create(['chapter_id' => $chapter->id]);
    Enrollment::factory()->create([
        'user_id' => $student->id,
        'course_id' => $course->id,
        'status' => 'active',
    ]);

    $this->actingAs($admin)
        ->post("/admin/lessons/{$lesson->id}/blocks", [
            'type' => 'pdf',
            'content' => '',
            'metadata' => ['label' => 'Modul Dasar Arduino PDF'],
            'material_file' => UploadedFile::fake()->create('modul-arduino.pdf', 128, 'application/pdf'),
            'order_no' => 1,
            'status' => 'published',
        ])
        ->assertSessionHasNoErrors()
        ->assertRedirect();

    $block = $lesson->contentBlocks()->firstOrFail();
    $upload = MediaUpload::firstOrFail();

    expect($block->type)->toBe('pdf')
        ->and($block->content)->toBe('modul-arduino.pdf')
        ->and($block->metadata['source'])->toBe('block_upload')
        ->and($block->metadata['mime_type'])->toBe('application/pdf')
        ->and($block->metadata['media_upload_id'])->toBe($upload->id);

    Storage::disk('public')->assertExists($upload->path);

    $this->actingAs($student)
        ->get("/materials/{$upload->id}/view")
        ->assertOk()
        ->assertHeader('content-type', 'application/pdf');
});

test('instructor course creation always uses the authenticated instructor account', function () {
    $instructor = User::factory()->instructor()->create();
    $otherInstructor = User::factory()->instructor()->create();

    $this->actingAs($instructor)
        ->post('/instructor/courses', [
            'learning_path_id' => null,
            'learning_path_order' => 0,
            'instructor_id' => $otherInstructor->id,
            'certificate_template_id' => null,
            'prerequisite_ids' => [],
            'title' => 'Kelas Milik Pengajar Login',
            'slug' => 'kelas-milik-pengajar-login',
            'description' => 'Materi dasar robotik untuk siswa.',
            'level' => 'beginner',
            'price_type' => 'free',
            'price' => 0,
            'access_mode' => 'sequential',
            'status' => 'draft',
        ])
        ->assertSessionHasNoErrors()
        ->assertRedirect();

    $course = Course::where('title', 'Kelas Milik Pengajar Login')->firstOrFail();

    expect($course->instructor_id)->toBe($instructor->id);
});

test('course creation stores uploaded course image path for catalog card', function () {
    Storage::fake('public');
    $admin = User::factory()->admin()->create();
    $instructor = User::factory()->instructor()->create();

    $this->actingAs($admin)
        ->post('/admin/courses', [
            'learning_path_id' => null,
            'learning_path_order' => 0,
            'instructor_id' => $instructor->id,
            'certificate_template_id' => null,
            'prerequisite_ids' => [],
            'title' => 'Kelas Visual Arduino',
            'slug' => 'kelas-visual-arduino',
            'description' => 'Materi robotik dengan cover khusus untuk katalog.',
            'level' => 'beginner',
            'price_type' => 'free',
            'price' => 0,
            'access_mode' => 'sequential',
            'status' => 'draft',
            'course_image' => UploadedFile::fake()->image('cover-arduino.jpg', 1200, 720),
        ])
        ->assertSessionHasNoErrors()
        ->assertRedirect();

    $course = Course::where('title', 'Kelas Visual Arduino')->firstOrFail();

    expect($course->og_image)->toStartWith('course-images/');
    Storage::disk('public')->assertExists($course->og_image);
});
