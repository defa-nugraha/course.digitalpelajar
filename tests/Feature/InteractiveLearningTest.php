<?php

use App\Models\Chapter;
use App\Models\ContentBlock;
use App\Models\Course;
use App\Models\Enrollment;
use App\Models\InteractiveBlockProgress;
use App\Models\Lesson;
use App\Models\LessonCompletion;
use App\Models\MediaUpload;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

uses(RefreshDatabase::class);

test('admin creates interactive block from structured scenes and uploaded media', function () {
    Storage::fake('public');
    $admin = User::factory()->admin()->create();
    $course = Course::factory()->create(['status' => 'published']);
    $chapter = Chapter::factory()->create(['course_id' => $course->id]);
    $lesson = Lesson::factory()->create(['chapter_id' => $chapter->id]);

    $imageResponse = $this->actingAs($admin)
        ->post("/admin/lessons/{$lesson->id}/interactive-media", [
            'type' => 'image',
            'media' => UploadedFile::fake()->image('arduino-board.png', 1200, 720),
        ], ['Accept' => 'application/json'])
        ->assertOk()
        ->assertJsonPath('type', 'image');

    $audioResponse = $this->actingAs($admin)
        ->post("/admin/lessons/{$lesson->id}/interactive-media", [
            'type' => 'audio',
            'media' => UploadedFile::fake()->create('narasi.mp3', 128, 'audio/mpeg'),
        ], ['Accept' => 'application/json'])
        ->assertOk()
        ->assertJsonPath('type', 'audio');

    $this->actingAs($admin)
        ->post("/admin/lessons/{$lesson->id}/blocks", [
            'type' => 'interactive',
            'content' => '',
            'metadata' => [
                'schema_version' => 1,
                'scenes' => [
                    [
                        'id' => 'scene-intro',
                        'title' => 'Mengenal Arduino Uno',
                        'text' => 'Perhatikan bagian port USB dan pin digital.',
                        'background' => [
                            'type' => 'image',
                            'media_upload_id' => $imageResponse->json('id'),
                            'url' => 'https://tidak-disimpan.test/image.png',
                            'alt' => 'Arduino Uno',
                        ],
                        'narration' => [
                            'type' => 'audio',
                            'media_upload_id' => $audioResponse->json('id'),
                            'url' => 'https://tidak-disimpan.test/audio.mp3',
                        ],
                        'hotspots' => [
                            [
                                'id' => 'hotspot-usb',
                                'label' => 'Port USB',
                                'explanation' => '<script>alert(1)</script>Port USB digunakan untuk upload program.',
                                'required' => true,
                                'position' => ['x' => 32, 'y' => 45, 'width' => 12, 'height' => 10],
                            ],
                        ],
                        'buttons' => [
                            [
                                'id' => 'button-info',
                                'label' => 'Baca tips',
                                'explanation' => 'Pastikan kabel USB data, bukan hanya kabel charger.',
                                'required' => false,
                                'action' => 'show_explanation',
                            ],
                        ],
                    ],
                ],
            ],
            'order_no' => 1,
            'status' => 'published',
        ])
        ->assertSessionHasNoErrors()
        ->assertRedirect("/admin/course-builder?course={$course->id}");

    $block = $lesson->contentBlocks()->firstOrFail();

    expect($block->type)->toBe('interactive')
        ->and($block->content)->toContain('1 scene')
        ->and($block->metadata['schema_version'])->toBe(1)
        ->and($block->metadata['completion_rules']['required_element_ids'])->toBe(['hotspot-usb'])
        ->and($block->metadata['scenes'][0]['background'])->not->toHaveKey('url')
        ->and($block->metadata['scenes'][0]['narration'])->not->toHaveKey('url')
        ->and($block->metadata['scenes'][0]['hotspots'][0]['explanation'])->not->toContain('<script>');

    MediaUpload::all()->each(fn (MediaUpload $upload) => Storage::disk('public')->assertExists($upload->path));
});

test('non admin cannot create interactive blocks from admin route', function () {
    $student = User::factory()->student()->create();
    $course = Course::factory()->create(['status' => 'published']);
    $chapter = Chapter::factory()->create(['course_id' => $course->id]);
    $lesson = Lesson::factory()->create(['chapter_id' => $chapter->id]);

    $this->actingAs($student)
        ->post("/admin/lessons/{$lesson->id}/blocks", [
            'type' => 'interactive',
            'content' => '',
            'metadata' => interactiveMetadata(),
            'order_no' => 1,
            'status' => 'published',
        ])
        ->assertForbidden();
});

test('interactive progress stores resume state and completion requires required hotspot', function () {
    $student = User::factory()->student()->create();
    $course = Course::factory()->free()->create(['status' => 'published']);
    $chapter = Chapter::factory()->create(['course_id' => $course->id]);
    $lesson = Lesson::factory()->create(['chapter_id' => $chapter->id]);
    $block = ContentBlock::create([
        'lesson_id' => $lesson->id,
        'type' => 'interactive',
        'content' => 'Mengenal Arduino Uno · 2 scene · 1 interaksi wajib',
        'metadata' => interactiveMetadata(),
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

    $this->actingAs($student)
        ->postJson("/learning/blocks/{$block->id}/interactive-progress", [
            'scene_id' => 'scene-praktik',
            'scene_index' => 1,
            'completed_element_ids' => [],
        ])
        ->assertJsonValidationErrors('interactive');

    $this->actingAs($student)
        ->postJson("/learning/blocks/{$block->id}/interactive-progress", [
            'scene_id' => 'scene-intro',
            'scene_index' => 0,
            'completed_element_ids' => ['hotspot-usb'],
        ])
        ->assertOk()
        ->assertJsonPath('progress.status', 'in_progress')
        ->assertJsonPath('progress.currentSceneIndex', 0);

    $this->actingAs($student)
        ->postJson("/learning/blocks/{$block->id}/interactive-progress", [
            'scene_id' => 'scene-praktik',
            'scene_index' => 1,
            'completed_element_ids' => ['hotspot-usb'],
        ])
        ->assertOk()
        ->assertJsonPath('progress.status', 'completed')
        ->assertJsonPath('progress.currentSceneIndex', 1);

    $progress = InteractiveBlockProgress::firstOrFail();

    expect($progress->completed_element_ids)->toBe(['hotspot-usb'])
        ->and($progress->status)->toBe('completed')
        ->and($progress->current_scene_id)->toBe('scene-praktik');

    $this->actingAs($student)
        ->post("/courses/{$course->id}/lessons/{$lesson->id}/complete")
        ->assertSessionHasNoErrors()
        ->assertRedirect();

    expect(LessonCompletion::query()
        ->where('user_id', $student->id)
        ->where('lesson_id', $lesson->id)
        ->exists())->toBeTrue();
});

test('interactive progress cannot be stored by user without active enrollment', function () {
    $student = User::factory()->student()->create();
    $course = Course::factory()->free()->create(['status' => 'published']);
    $chapter = Chapter::factory()->create(['course_id' => $course->id]);
    $lesson = Lesson::factory()->create(['chapter_id' => $chapter->id]);
    $block = ContentBlock::create([
        'lesson_id' => $lesson->id,
        'type' => 'interactive',
        'content' => 'Mengenal Arduino Uno · 2 scene · 1 interaksi wajib',
        'metadata' => interactiveMetadata(),
        'order_no' => 1,
        'status' => 'published',
    ]);

    $this->actingAs($student)
        ->postJson("/learning/blocks/{$block->id}/interactive-progress", [
            'scene_id' => 'scene-intro',
            'scene_index' => 0,
            'completed_element_ids' => ['hotspot-usb'],
        ])
        ->assertNotFound();
});

function interactiveMetadata(): array
{
    return [
        'schema_version' => 1,
        'settings' => [
            'navigation' => 'sequential',
            'show_progress' => true,
            'allow_scene_back' => true,
        ],
        'scenes' => [
            [
                'id' => 'scene-intro',
                'title' => 'Mengenal Arduino Uno',
                'order' => 1,
                'text' => 'Perhatikan port USB pada board.',
                'background' => null,
                'narration' => null,
                'hotspots' => [
                    [
                        'id' => 'hotspot-usb',
                        'type' => 'hotspot',
                        'label' => 'Port USB',
                        'explanation' => 'Port USB digunakan untuk upload program.',
                        'required' => true,
                        'position' => ['x' => 30, 'y' => 40, 'width' => 12, 'height' => 10],
                    ],
                ],
                'buttons' => [],
            ],
            [
                'id' => 'scene-praktik',
                'title' => 'Praktik Upload Program',
                'order' => 2,
                'text' => 'Upload sketch blink ke board Arduino.',
                'background' => null,
                'narration' => null,
                'hotspots' => [],
                'buttons' => [],
            ],
        ],
        'completion_rules' => [
            'require_last_scene' => true,
            'required_element_ids' => ['hotspot-usb'],
        ],
    ];
}
