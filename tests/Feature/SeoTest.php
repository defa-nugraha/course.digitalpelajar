<?php

use App\Models\Course;
use App\Models\LearningPath;
use App\Models\SeoSetting;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

test('published product page exposes server side seo metadata and product schema', function () {
    $course = Course::factory()->free()->create([
        'title' => 'Robotika SEO Test',
        'slug' => 'robotika-seo-test',
        'description' => 'Kelas robotika untuk validasi metadata SEO produk.',
        'meta_title' => 'Robotika SEO Test | RoboAcademy',
        'meta_description' => 'Pelajari robotika melalui kelas SEO test yang memiliki metadata unik.',
        'status' => 'published',
    ]);

    $this->get("/produk/{$course->slug}")
        ->assertOk()
        ->assertSee('<title inertia>Robotika SEO Test | RoboAcademy</title>', false)
        ->assertSee('<meta name="description" content="Pelajari robotika melalui kelas SEO test yang memiliki metadata unik.">', false)
        ->assertSee('<link rel="canonical" href="'.route('products.show', $course->slug).'">', false)
        ->assertSee('"@type":"Product"', false)
        ->assertSee('"name":"Robotika SEO Test"', false)
        ->assertSee('"sku":"COURSE-'.$course->id.'"', false);
});

test('sitemap only lists public published products and learning paths', function () {
    $publishedPath = LearningPath::factory()->create([
        'title' => 'Path Publish',
        'slug' => 'path-publish',
        'status' => 'published',
    ]);
    $draftPath = LearningPath::factory()->create([
        'title' => 'Path Draft',
        'slug' => 'path-draft',
        'status' => 'draft',
    ]);

    $publishedCourse = Course::factory()->free()->create([
        'title' => 'Produk Publish',
        'slug' => 'produk-publish',
        'status' => 'published',
        'learning_path_id' => $publishedPath->id,
    ]);
    $draftCourse = Course::factory()->free()->create([
        'title' => 'Produk Draft',
        'slug' => 'produk-draft',
        'status' => 'draft',
        'learning_path_id' => $draftPath->id,
    ]);

    $this->get('/sitemap.xml')
        ->assertOk()
        ->assertHeader('Content-Type', 'application/xml; charset=UTF-8')
        ->assertSee(route('products.show', $publishedCourse->slug), false)
        ->assertSee(route('learning-paths.show', $publishedPath->slug), false)
        ->assertDontSee(route('products.show', $draftCourse->slug), false)
        ->assertDontSee(route('learning-paths.show', $draftPath->slug), false)
        ->assertDontSee('/admin/', false);
});

test('robots file allows public pages and blocks private application areas', function () {
    $this->get('/robots.txt')
        ->assertOk()
        ->assertHeader('Content-Type', 'text/plain; charset=UTF-8')
        ->assertSee('Allow: /', false)
        ->assertSee('Disallow: /admin/', false)
        ->assertSee('Disallow: /learning', false)
        ->assertSee('Sitemap: '.route('sitemap'), false);
});

test('admin can manage static public page seo metadata', function () {
    Storage::fake('public');
    $admin = User::factory()->admin()->create();

    $this->actingAs($admin)
        ->get('/admin/seo-settings')
        ->assertOk();

    $setting = SeoSetting::query()->where('key', SeoSetting::HOME)->firstOrFail();

    $this->actingAs($admin)
        ->post("/admin/seo-settings/{$setting->id}", [
            '_method' => 'patch',
            'title' => 'Belajar Arduino untuk Sekolah | Digital Pelajar',
            'description' => 'Platform belajar Arduino dan robotik untuk sekolah dengan kelas praktik, presensi, sertifikat, dan laporan pengajar.',
            'canonical_url' => route('home'),
            'type' => 'website',
            'noindex' => false,
            'is_active' => true,
            'keywords' => ['kelas arduino', 'robotik sekolah'],
            'seo_image' => UploadedFile::fake()->image('seo-home.jpg'),
        ])
        ->assertSessionHasNoErrors()
        ->assertSessionHas('success');

    $setting->refresh();

    expect($setting->title)->toBe('Belajar Arduino untuk Sekolah | Digital Pelajar')
        ->and($setting->keywords)->toBe(['kelas arduino', 'robotik sekolah'])
        ->and($setting->og_image)->toStartWith('seo-images/');

    Storage::disk('public')->assertExists($setting->og_image);

    $this->get('/')
        ->assertOk()
        ->assertSee('<title inertia>Belajar Arduino untuk Sekolah | Digital Pelajar</title>', false)
        ->assertSee('<meta name="keywords" content="kelas arduino, robotik sekolah">', false)
        ->assertSee('<meta property="og:image" content="'.url('/storage/'.$setting->og_image).'">', false);
});

test('static seo noindex removes page from sitemap and student cannot manage seo', function () {
    $admin = User::factory()->admin()->create();
    $student = User::factory()->student()->create();

    SeoSetting::ensureDefaults();
    $coursesSetting = SeoSetting::query()->where('key', SeoSetting::COURSES)->firstOrFail();

    $this->actingAs($student)
        ->post("/admin/seo-settings/{$coursesSetting->id}", [
            '_method' => 'patch',
            'title' => 'Tidak boleh',
            'description' => 'Tidak boleh mengubah SEO dari akun siswa.',
            'type' => 'website',
            'noindex' => false,
            'is_active' => true,
        ])
        ->assertForbidden();

    $this->actingAs($admin)
        ->post("/admin/seo-settings/{$coursesSetting->id}", [
            '_method' => 'patch',
            'title' => $coursesSetting->title,
            'description' => $coursesSetting->description,
            'canonical_url' => null,
            'og_image' => null,
            'type' => 'website',
            'noindex' => true,
            'is_active' => true,
            'keywords' => [],
        ])
        ->assertSessionHasNoErrors();

    $this->get('/courses')
        ->assertOk()
        ->assertSee('<meta name="robots" content="noindex,nofollow">', false);

    $this->get('/sitemap.xml')
        ->assertOk()
        ->assertDontSee(route('courses.index'), false);
});
