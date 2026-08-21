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
use Inertia\Testing\AssertableInertia as Assert;

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
                                'position' => ['x' => 60, 'y' => 74, 'width' => 24, 'height' => 10],
                            ],
                        ],
                        'assets' => [
                            [
                                'id' => 'asset-label',
                                'type' => 'text',
                                'label' => 'Label USB',
                                'content' => 'Upload program lewat USB',
                                'position' => ['x' => 10, 'y' => 12, 'width' => 30, 'height' => 12],
                                'style' => [
                                    'shape' => 'pill',
                                    'icon' => 'book',
                                    'color' => '#0f172a',
                                    'backgroundColor' => '#ffffff',
                                    'fontSize' => 16,
                                ],
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
        ->and($block->metadata['scenes'][0]['buttons'][0]['position']['x'])->toBe(60)
        ->and($block->metadata['scenes'][0]['assets'][0]['content'])->toBe('Upload program lewat USB')
        ->and($block->metadata['scenes'][0]['hotspots'][0]['explanation'])->not->toContain('<script>');

    MediaUpload::all()->each(fn (MediaUpload $upload) => Storage::disk('public')->assertExists($upload->path));
});

test('admin can store text to speech narration in interactive block', function () {
    $admin = User::factory()->admin()->create();
    $course = Course::factory()->create(['status' => 'published']);
    $chapter = Chapter::factory()->create(['course_id' => $course->id]);
    $lesson = Lesson::factory()->create(['chapter_id' => $chapter->id]);

    $this->actingAs($admin)
        ->post("/admin/lessons/{$lesson->id}/blocks", [
            'type' => 'interactive',
            'content' => '',
            'metadata' => [
                'schema_version' => 1,
                'scenes' => [
                    [
                        'id' => 'scene-tts',
                        'title' => 'Narasi LED',
                        'text' => 'LED memiliki kaki positif dan negatif.',
                        'background' => null,
                        'narration' => [
                            'type' => 'tts',
                            'text' => 'Perhatikan arah kaki LED sebelum dipasang ke breadboard.',
                            'lang' => 'id-ID',
                            'voice_name' => '',
                            'rate' => 1,
                            'pitch' => 1,
                        ],
                        'hotspots' => [],
                        'buttons' => [],
                        'assets' => [
                            [
                                'id' => 'asset-led',
                                'type' => 'icon',
                                'label' => 'Icon LED',
                                'content' => '',
                                'position' => ['x' => 20, 'y' => 20, 'width' => 16, 'height' => 16],
                                'style' => [
                                    'shape' => 'circle',
                                    'icon' => 'zap',
                                    'color' => '#facc15',
                                    'backgroundColor' => '#1e293b',
                                    'fontSize' => 20,
                                ],
                            ],
                        ],
                    ],
                ],
            ],
            'order_no' => 1,
            'status' => 'published',
        ])
        ->assertSessionHasNoErrors();

    $block = $lesson->contentBlocks()->firstOrFail();

    expect($block->metadata['scenes'][0]['narration']['type'])->toBe('tts')
        ->and($block->metadata['scenes'][0]['narration']['text'])->toBe('Perhatikan arah kaki LED sebelum dipasang ke breadboard.')
        ->and($block->metadata['scenes'][0]['assets'][0]['style']['icon'])->toBe('zap');
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

test('admin opens visual interactive editor for interactive block', function () {
    $admin = User::factory()->admin()->create();
    $course = Course::factory()->create(['status' => 'published']);
    $chapter = Chapter::factory()->create(['course_id' => $course->id]);
    $lesson = Lesson::factory()->create(['chapter_id' => $chapter->id]);
    $block = ContentBlock::create([
        'lesson_id' => $lesson->id,
        'type' => 'interactive',
        'content' => 'Mengenal Arduino Uno · 2 scene · 1 interaksi wajib',
        'metadata' => interactiveMetadata(),
        'order_no' => 1,
        'status' => 'draft',
    ]);

    $this->actingAs($admin)
        ->get("/admin/blocks/{$block->id}/interactive-editor")
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('admin/interactive-editor', false)
            ->where('block.id', $block->id)
            ->where('block.status', 'draft')
            ->where('lesson.id', $lesson->id)
            ->where('course.id', $course->id)
            ->has('autosaveUrl')
            ->has('interactiveUploadUrl'));
});

test('visual interactive editor rejects non interactive block and unauthorized user', function () {
    $admin = User::factory()->admin()->create();
    $student = User::factory()->student()->create();
    $course = Course::factory()->create(['status' => 'published']);
    $chapter = Chapter::factory()->create(['course_id' => $course->id]);
    $lesson = Lesson::factory()->create(['chapter_id' => $chapter->id]);
    $block = ContentBlock::create([
        'lesson_id' => $lesson->id,
        'type' => 'text',
        'content' => 'Materi biasa',
        'metadata' => [],
        'order_no' => 1,
        'status' => 'draft',
    ]);

    $this->actingAs($admin)
        ->get("/admin/blocks/{$block->id}/interactive-editor")
        ->assertNotFound();

    $this->actingAs($student)
        ->get("/admin/blocks/{$block->id}/interactive-editor")
        ->assertForbidden();
});

test('admin autosaves visual editor metadata and detects conflicts', function () {
    $admin = User::factory()->admin()->create();
    $course = Course::factory()->create(['status' => 'published']);
    $chapter = Chapter::factory()->create(['course_id' => $course->id]);
    $lesson = Lesson::factory()->create(['chapter_id' => $chapter->id]);
    $block = ContentBlock::create([
        'lesson_id' => $lesson->id,
        'type' => 'interactive',
        'content' => 'Mengenal Arduino Uno · 2 scene · 1 interaksi wajib',
        'metadata' => interactiveMetadata(),
        'order_no' => 1,
        'status' => 'draft',
    ]);
    $updatedAt = $block->updated_at->toJSON();
    $metadata = interactiveMetadata();
    $metadata['canvas'] = [
        'width' => 1280,
        'height' => 720,
        'aspect_ratio' => '16:9',
        'background_color' => '#f8fafc',
    ];
    $metadata['scenes'][0]['assets'] = [
        [
            'id' => 'asset-title',
            'type' => 'text',
            'label' => 'Judul canvas',
            'content' => 'Arduino Uno',
            'position' => ['x' => 10, 'y' => 12, 'width' => 36, 'height' => 12],
            'rotation' => 8,
            'opacity' => 0.9,
            'layer_order' => 30,
            'locked' => false,
            'hidden' => false,
            'style' => [
                'shape' => 'pill',
                'icon' => 'book',
                'color' => '#0f172a',
                'backgroundColor' => '#ffffff',
                'fontSize' => 24,
            ],
        ],
    ];

    $this->actingAs($admin)
        ->patchJson("/admin/blocks/{$block->id}/interactive-autosave", [
            'metadata' => $metadata,
            'status' => 'draft',
            'updated_at' => $updatedAt,
        ])
        ->assertOk()
        ->assertJsonPath('status', 'draft')
        ->assertJsonPath('metadata.scenes.0.assets.0.rotation', 8);

    $block->refresh();
    expect($block->metadata['canvas']['width'])->toBe(1280)
        ->and($block->metadata['scenes'][0]['assets'][0]['label'])->toBe('Judul canvas');

    $block->timestamps = false;
    $block->forceFill(['updated_at' => now()->addMinute()])->save();

    $this->actingAs($admin)
        ->patchJson("/admin/blocks/{$block->id}/interactive-autosave", [
            'metadata' => $metadata,
            'status' => 'draft',
            'updated_at' => $updatedAt,
        ])
        ->assertStatus(409)
        ->assertJsonPath('message', 'Konten sudah berubah di server. Muat ulang data terbaru sebelum menyimpan lagi.');
});

test('visual editor cannot publish interactive media asset without uploaded media', function () {
    $admin = User::factory()->admin()->create();
    $course = Course::factory()->create(['status' => 'published']);
    $chapter = Chapter::factory()->create(['course_id' => $course->id]);
    $lesson = Lesson::factory()->create(['chapter_id' => $chapter->id]);
    $block = ContentBlock::create([
        'lesson_id' => $lesson->id,
        'type' => 'interactive',
        'content' => 'Draft interactive',
        'metadata' => interactiveMetadata(),
        'order_no' => 1,
        'status' => 'draft',
    ]);
    $metadata = interactiveMetadata();
    $metadata['scenes'][0]['assets'] = [
        [
            'id' => 'asset-image',
            'type' => 'image',
            'label' => 'Gambar komponen',
            'content' => '',
            'media' => null,
            'position' => ['x' => 15, 'y' => 12, 'width' => 40, 'height' => 28],
        ],
    ];

    $this->actingAs($admin)
        ->patchJson("/admin/blocks/{$block->id}/interactive-autosave", [
            'metadata' => $metadata,
            'status' => 'published',
            'updated_at' => $block->updated_at->toJSON(),
        ])
        ->assertJsonValidationErrors('metadata');
});

test('studio interactive course creates lesson block automatically and redirects to visual editor', function () {
    $admin = User::factory()->admin()->create();
    $course = Course::factory()->create([
        'status' => 'published',
        'learning_format' => 'interactive',
    ]);
    $chapter = Chapter::factory()->create(['course_id' => $course->id]);

    $response = $this->actingAs($admin)
        ->post("/admin/chapters/{$chapter->id}/lessons", [
            'title' => 'Mengenal Sensor Ultrasonik',
            'order_no' => 1,
            'is_required' => true,
            'available_at' => null,
            'add_initial_block' => true,
            'initial_block_type' => 'text',
            'initial_block_content' => '',
            'initial_block_metadata' => [],
            'initial_block_status' => 'draft',
        ])
        ->assertSessionHasNoErrors()
        ->assertRedirect();

    $lesson = Lesson::where('chapter_id', $chapter->id)->firstOrFail();
    $block = $lesson->contentBlocks()->firstOrFail();

    expect($block->type)->toBe('interactive')
        ->and($block->status)->toBe('draft')
        ->and($block->metadata['scenes'][0]['title'])->toBe('Mengenal Sensor Ultrasonik');

    expect($response->headers->get('Location'))->toContain("/admin/blocks/{$block->id}/interactive-editor");
});

test('studio interactive lesson route creates missing block before opening visual editor', function () {
    $admin = User::factory()->admin()->create();
    $course = Course::factory()->create([
        'status' => 'published',
        'learning_format' => 'interactive',
    ]);
    $chapter = Chapter::factory()->create(['course_id' => $course->id]);
    $lesson = Lesson::factory()->create(['chapter_id' => $chapter->id]);

    $response = $this->actingAs($admin)
        ->post("/admin/lessons/{$lesson->id}/interactive-editor")
        ->assertRedirect();

    $block = $lesson->contentBlocks()->firstOrFail();

    expect($block->type)->toBe('interactive');
    expect($response->headers->get('Location'))->toContain("/admin/blocks/{$block->id}/interactive-editor");
});

test('studio interactive block edit route redirects to visual editor', function () {
    $admin = User::factory()->admin()->create();
    $course = Course::factory()->create([
        'status' => 'published',
        'learning_format' => 'interactive',
    ]);
    $chapter = Chapter::factory()->create(['course_id' => $course->id]);
    $lesson = Lesson::factory()->create(['chapter_id' => $chapter->id]);
    $block = ContentBlock::create([
        'lesson_id' => $lesson->id,
        'type' => 'interactive',
        'content' => 'Studio draft',
        'metadata' => interactiveMetadata(),
        'order_no' => 1,
        'status' => 'draft',
    ]);

    $this->actingAs($admin)
        ->get("/admin/blocks/{$block->id}/edit")
        ->assertRedirect("/admin/blocks/{$block->id}/interactive-editor");
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
