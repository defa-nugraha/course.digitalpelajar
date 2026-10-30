<?php

namespace App\Http\Controllers;


use App\Models\ContentBlock;
use App\Models\Course;
use App\Models\Enrollment;
use App\Models\HomePageSection;
use App\Models\InteractiveBlockProgress;
use App\Models\LearningPath;
use App\Models\Lesson;
use App\Models\Quiz;
use App\Models\SeoSetting;
use App\Services\CertificateService;
use App\Services\InteractiveBlockSchemaService;
use App\Services\InteractiveProgressService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response as HttpResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class PlatformController extends Controller
{
    public function home(): Response
    {
        return Inertia::render('welcome', [
            'seo' => $this->managedSeo(
                SeoSetting::HOME,
                'Platform Belajar Robotik Terstruktur | RoboAcademy',
                'Belajar robotik, coding, dan proyek teknologi secara terstruktur dengan kelas praktik, learning path, dan sertifikat digital.',
                route('home'),
                asset('logo.png'),
                'website',
                $this->organizationSchema(),
            ),
            'courses' => $this->courses(),
            'stats' => [
                'students' => DB::table('users')->where('role', 'student')->count(),
                'courses' => DB::table('courses')->where('status', 'published')->count(),
                'certificates' => DB::table('certificates')->where('status', 'issued')->count(),
            ],
            'partnerSchools' => $this->partnerSchools(),
            'homeSections' => $this->publicHomeSections(),
        ]);
    }

    public function catalog(): Response
    {
        return Inertia::render('courses/catalog', [
            'seo' => $this->managedSeo(
                SeoSetting::COURSES,
                'Katalog Kelas Robotik | RoboAcademy',
                'Temukan kelas robotik dan coding berdasarkan level, harga, dan jalur belajar. Semua kelas publish dapat dibuka publik dan punya halaman detail.',
                route('courses.index'),
            ),
            'courses' => $this->courses(),
        ]);
    }

    public function learningPaths(): Response
    {
        return Inertia::render('learning-paths/index', [
            'seo' => $this->managedSeo(
                SeoSetting::LEARNING_PATHS,
                'Learning Path Robotik | RoboAcademy',
                'Pilih jalur belajar robotik yang berurutan dari dasar sampai lanjutan, lengkap dengan daftar kelas publish di setiap kategori.',
                route('learning-paths.index'),
            ),
            'paths' => DB::table('learning_paths')
                ->where('learning_paths.status', 'published')
                ->whereNotNull('learning_paths.slug')
                ->where('learning_paths.slug', '!=', '')
                ->orderBy('learning_paths.title')
                ->get()
                ->map(fn ($path) => [
                    'id' => $path->id,
                    'title' => $path->title,
                    'slug' => $path->slug,
                    'url' => route('learning-paths.show', $path->slug ?: 'unknown'),
                    'description' => $path->description,
                    'level' => $path->level,
                    'courses' => DB::table('courses')
                        ->where('learning_path_id', $path->id)
                        ->where('status', 'published')
                        ->whereNotNull('slug')
                        ->where('slug', '!=', '')
                        ->orderBy('learning_path_order')
                        ->select('id', 'title', 'slug', 'level', 'price_type', 'price', 'learning_path_order')
                        ->get()
                        ->map(fn ($course) => [
                            ...((array) $course),
                            'detailUrl' => route('products.show', $course->slug ?: 'unknown'),
                        ]),
                ]),
        ]);
    }

    public function learningPathDetail(LearningPath $learningPath): Response
    {
        abort_unless($learningPath->status === 'published', 404);

        $courses = Course::query()
            ->withCount('lessons')
            ->where('learning_path_id', $learningPath->id)
            ->where('status', 'published')
            ->orderBy('learning_path_order')
            ->orderBy('title')
            ->get()
            ->map(fn (Course $course) => $this->courseCardPayload($course));

        $url = route('learning-paths.show', $learningPath->slug);
        $description = $this->descriptionText($learningPath->meta_description ?: $learningPath->description);

        return Inertia::render('learning-paths/show', [
            'seo' => $this->seo(
                $learningPath->meta_title ?: $learningPath->title.' | RoboAcademy',
                $description ?: 'Jalur belajar '.$learningPath->title.' berisi urutan kelas robotik yang dapat diikuti secara bertahap.',
                $url,
                asset('logo.png'),
                'website',
                $this->learningPathSchema($learningPath, $courses->all(), $url),
            ),
            'path' => [
                'id' => $learningPath->id,
                'title' => $learningPath->title,
                'slug' => $learningPath->slug,
                'description' => $learningPath->description,
                'level' => $learningPath->level,
                'url' => $url,
            ],
            'courses' => $courses,
        ]);
    }

    public function courseDetail(Request $request, Course $course): Response
    {
        abort_unless($course->status === 'published', 404);

        $course->load('learningPath');
        $course->loadCount('lessons');

        $url = route('products.show', $course->slug);
        $image = $this->courseImageUrl($course);
        $description = $this->descriptionText($course->meta_description ?: $course->description);

        return Inertia::render('courses/show', [
            'seo' => $this->seo(
                $course->meta_title ?: $course->title.' | RoboAcademy',
                $description ?: 'Pelajari '.$course->title.' melalui kelas robotik terstruktur dengan materi praktik dan sertifikat digital.',
                $course->canonical_url ?: $url,
                $image,
                'product',
                [
                    $this->courseProductSchema($course, $url, $image),
                    $this->breadcrumbSchema([
                        ['name' => 'Home', 'url' => route('home')],
                        ['name' => 'Katalog Kelas', 'url' => route('courses.index')],
                        ['name' => $course->title, 'url' => $url],
                    ]),
                ],
            ),
            'course' => $this->courseDetailPayload($course, $request->user()?->id),
            'relatedCourses' => Course::query()
                ->withCount('lessons')
                ->where('status', 'published')
                ->where('id', '!=', $course->id)
                ->when($course->learning_path_id, fn ($query) => $query->where('learning_path_id', $course->learning_path_id))
                ->orderBy('learning_path_order')
                ->limit(3)
                ->get()
                ->map(fn (Course $relatedCourse) => $this->courseCardPayload($relatedCourse)),
        ]);
    }

    public function redirectCourseDetail(Course $course): RedirectResponse
    {
        return to_route('products.show', ['course' => $course->slug], 301);
    }

    public function sitemap(): HttpResponse
    {
        $urls = collect([
            $this->staticSitemapUrl(SeoSetting::HOME, ['loc' => route('home'), 'priority' => '1.0']),
            $this->staticSitemapUrl(SeoSetting::COURSES, ['loc' => route('courses.index'), 'priority' => '0.9']),
            $this->staticSitemapUrl(SeoSetting::LEARNING_PATHS, ['loc' => route('learning-paths.index'), 'priority' => '0.8']),
            $this->staticSitemapUrl(SeoSetting::CERTIFICATE_VERIFY, ['loc' => route('certificates.verify'), 'priority' => '0.4']),
        ])->filter();

        $pathUrls = LearningPath::query()
            ->where('status', 'published')
            ->whereNotNull('slug')
            ->where('slug', '!=', '')
            ->get(['slug', 'updated_at'])
            ->map(fn (LearningPath $path) => [
                'loc' => route('learning-paths.show', $path->slug ?: 'unknown'),
                'lastmod' => optional($path->updated_at)->toAtomString(),
                'priority' => '0.8',
            ]);

        $courseUrls = Course::query()
            ->where('status', 'published')
            ->whereNotNull('slug')
            ->where('slug', '!=', '')
            ->get(['slug', 'updated_at'])
            ->map(fn (Course $course) => [
                'loc' => route('products.show', $course->slug ?: 'unknown'),
                'lastmod' => optional($course->updated_at)->toAtomString(),
                'priority' => '0.9',
            ]);

        $xml = '<?xml version="1.0" encoding="UTF-8"?>'."\n";
        $xml .= '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'."\n";

        $urls->concat($pathUrls)->concat($courseUrls)->each(function (array $url) use (&$xml) {
            $xml .= "  <url>\n";
            $xml .= '    <loc>'.e($url['loc'])."</loc>\n";
            if (filled($url['lastmod'] ?? null)) {
                $xml .= '    <lastmod>'.$url['lastmod']."</lastmod>\n";
            }
            $xml .= "    <changefreq>weekly</changefreq>\n";
            $xml .= '    <priority>'.$url['priority']."</priority>\n";
            $xml .= "  </url>\n";
        });

        $xml .= '</urlset>';

        return response($xml, 200)->header('Content-Type', 'application/xml; charset=UTF-8');
    }

    public function robots(): HttpResponse
    {
        $content = implode("\n", [
            'User-agent: *',
            'Allow: /',
            'Disallow: /admin/',
            'Disallow: /dashboard',
            'Disallow: /student/',
            'Disallow: /teacher/',
            'Disallow: /instructor/',
            'Disallow: /settings/',
            'Disallow: /checkout',
            'Disallow: /payments',
            'Disallow: /learning',
            'Disallow: /reviews',
            '',
            'Sitemap: '.route('sitemap'),
            '',
        ]);

        return response($content, 200)->header('Content-Type', 'text/plain; charset=UTF-8');
    }

    private function staticSitemapUrl(string $key, array $fallback): ?array
    {
        if (! Schema::hasTable('seo_settings')) {
            return $fallback;
        }

        $setting = SeoSetting::query()->where('key', $key)->first();

        if ($setting?->is_active && $setting->noindex) {
            return null;
        }

        if ($setting?->is_active && filled($setting->canonical_url)) {
            $fallback['loc'] = $setting->canonical_url;
        }

        if ($setting?->updated_at) {
            $fallback['lastmod'] = $setting->updated_at->toAtomString();
        }

        return $fallback;
    }

    public function roleDashboard(Request $request): RedirectResponse
    {
        return match ($request->user()->role) {
            'admin' => to_route('admin.dashboard'),
            'internal_instructor' => to_route('instructor.dashboard'),
            'school_teacher' => to_route('teacher.dashboard'),
            default => to_route('student.dashboard'),
        };
    }

    public function adminDashboard(): Response
    {
        $paidRevenue = (int) DB::table('payments')->where('status', 'paid')->sum('amount');
        $pendingReviews = DB::table('submissions')->whereIn('status', ['submitted', 'revised'])->count();

        return Inertia::render('admin/dashboard', [
            'stats' => [
                'users' => DB::table('users')->count(),
                'schools' => DB::table('schools')->where('status', 'active')->count(),
                'courses' => DB::table('courses')->where('status', 'published')->count(),
                'revenue' => $this->rupiah($paidRevenue),
                'pendingReviews' => $pendingReviews,
                'certificates' => DB::table('certificates')->where('status', 'issued')->count(),
            ],
            'coursePerformance' => DB::table('courses')
                ->leftJoin('enrollments', 'courses.id', '=', 'enrollments.course_id')
                ->select(
                    'courses.id',
                    'courses.title',
                    'courses.status',
                    DB::raw('COUNT(DISTINCT enrollments.id) as enrollments'),
                    DB::raw('COUNT(DISTINCT enrollments.user_id) as students'),
                    DB::raw('COALESCE(ROUND(AVG(enrollments.progress_percent)), 0) as progress'),
                )
                ->groupBy('courses.id', 'courses.title', 'courses.status')
                ->orderByDesc('students')
                ->limit(8)
                ->get()
                ->map(fn ($course) => [
                    'id' => $course->id,
                    'title' => $course->title,
                    'status' => $course->status,
                    'enrollments' => (int) $course->enrollments,
                    'students' => (int) $course->students,
                    'progress' => (int) $course->progress,
                    'pendingReviews' => DB::table('submissions')
                        ->join('enrollments', 'submissions.enrollment_id', '=', 'enrollments.id')
                        ->where('enrollments.course_id', $course->id)
                        ->whereIn('submissions.status', ['submitted', 'revised'])
                        ->count(),
                    'revenue' => $this->rupiah((int) DB::table('payments')
                        ->where('course_id', $course->id)
                        ->where('status', 'paid')
                        ->sum('amount')),
                ]),
            'recentSubmissions' => DB::table('submissions')
                ->join('enrollments', 'submissions.enrollment_id', '=', 'enrollments.id')
                ->leftJoin('users', 'enrollments.user_id', '=', 'users.id')
                ->leftJoin('courses', 'enrollments.course_id', '=', 'courses.id')
                ->select(
                    'submissions.id',
                    'submissions.status',
                    'submissions.score',
                    'submissions.created_at as submittedAt',
                    DB::raw("COALESCE(users.name, 'User tidak tersedia') as student"),
                    DB::raw("COALESCE(courses.title, 'Course tidak tersedia') as course"),
                )
                ->latest('submissions.created_at')
                ->limit(8)
                ->get()
                ->map(fn ($submission) => [
                    'id' => $submission->id,
                    'student' => $submission->student,
                    'course' => $submission->course,
                    'status' => $submission->status,
                    'score' => $submission->score === null ? null : (int) $submission->score,
                    'submittedAt' => $submission->submittedAt,
                ]),
            'recentPayments' => DB::table('payments')
                ->leftJoin('users', 'payments.user_id', '=', 'users.id')
                ->leftJoin('courses', 'payments.course_id', '=', 'courses.id')
                ->select(
                    'payments.id',
                    'payments.order_id as orderId',
                    'payments.amount',
                    'payments.status',
                    'payments.created_at as createdAt',
                    DB::raw("COALESCE(users.name, 'User tidak tersedia') as student"),
                    DB::raw("COALESCE(courses.title, 'Course tidak tersedia') as course"),
                )
                ->latest('payments.created_at')
                ->limit(6)
                ->get()
                ->map(fn ($payment) => [
                    'id' => $payment->id,
                    'orderId' => $payment->orderId,
                    'student' => $payment->student,
                    'course' => $payment->course,
                    'amountLabel' => $this->rupiah((int) $payment->amount),
                    'status' => $payment->status,
                    'createdAt' => $payment->createdAt,
                ]),
            'roleBreakdown' => DB::table('users')
                ->select('role', DB::raw('COUNT(*) as total'))
                ->groupBy('role')
                ->orderBy('role')
                ->get()
                ->map(fn ($role) => [
                    'role' => $this->roleLabel($role->role),
                    'total' => (int) $role->total,
                ]),
        ]);
    }

    public function adminHomePage(): Response
    {
        $sections = $this->allHomeSections();

        return Inertia::render('admin/home-page', [
            'sections' => $sections,
            'stats' => [
                'total' => $sections->count(),
                'visible' => $sections->where('is_visible', true)->count(),
                'custom' => $sections->where('section_type', 'custom')->count(),
                'system' => $sections->where('section_type', '!=', 'custom')->count(),
            ],
        ]);
    }

    public function dashboard(Request $request): Response
    {
        $userId = $request->user()->id;
        $enrollments = $this->enrollmentsForUser($userId);
        $current = $enrollments->sortByDesc('progress')->first();

        return Inertia::render('dashboard', [
            'stats' => [
                'classes' => $enrollments->count(),
                'averageProgress' => round($enrollments->avg('progress') ?: 0),
                'quizPending' => DB::table('quizzes')
                    ->whereIn('course_id', $enrollments->pluck('id'))
                    ->whereNotExists(fn ($query) => $query
                        ->selectRaw('1')
                        ->from('quiz_attempts')
                        ->whereColumn('quiz_attempts.quiz_id', 'quizzes.id')
                        ->where('quiz_attempts.user_id', $userId))
                    ->count(),
                'certificates' => DB::table('certificates')
                    ->join('enrollments', 'certificates.enrollment_id', '=', 'enrollments.id')
                    ->where('enrollments.user_id', $userId)
                    ->count(),
            ],
            'currentCourse' => $current,
            'courses' => $enrollments->values(),
            'tasks' => $this->studentTasks($userId),
            'offlineAttendances' => $this->studentOfflineAttendanceOptions($request),
            'teacherNotes' => DB::table('student_progress_notes')
                ->leftJoin('users as teachers', 'student_progress_notes.teacher_id', '=', 'teachers.id')
                ->leftJoin('teaching_schedules', 'student_progress_notes.teaching_schedule_id', '=', 'teaching_schedules.id')
                ->leftJoin('courses', 'teaching_schedules.course_id', '=', 'courses.id')
                ->where('student_progress_notes.student_id', $userId)
                ->orderByDesc('teaching_schedules.starts_at')
                ->orderByDesc('student_progress_notes.updated_at')
                ->select(
                    'student_progress_notes.id',
                    'student_progress_notes.note',
                    'student_progress_notes.updated_at',
                    'teachers.name as teacher_name',
                    'teaching_schedules.title as meeting_title',
                    'teaching_schedules.starts_at',
                    'courses.title as course_title',
                )
                ->limit(10)
                ->get()
                ->map(fn ($note) => [
                    'id' => $note->id,
                    'note' => $note->note,
                    'teacher' => $note->teacher_name ?: 'Guru sekolah',
                    'meeting' => $note->meeting_title ?: 'Pertemuan tidak tersedia',
                    'course' => $note->course_title,
                    'dateLabel' => $note->starts_at
                        ? date('d M Y, H:i', strtotime($note->starts_at)).' WIB'
                        : date('d M Y, H:i', strtotime($note->updated_at)).' WIB',
                ]),
        ]);
    }

    public function learningIndex(Request $request): Response
    {
        $user = $request->user();
        abort_unless(in_array($user->role, ['student', 'school_teacher'], true), 403);

        return Inertia::render('student/learning-index', [
            'role' => $user->role,
            'courses' => $this->learningCourseCards($user->id),
        ]);
    }

    public function internalCatalog(Request $request): Response
    {
        $user = $request->user();
        abort_unless(in_array($user->role, ['student', 'school_teacher'], true), 403);

        return Inertia::render('student/internal-catalog', [
            'role' => $user->role,
            'courses' => $this->internalCatalogCourses($request),
        ]);
    }

    public function studentUpcoming(Request $request): Response
    {
        abort_unless($request->user()?->role === 'student', 403);

        return Inertia::render('student/upcoming', [
            'tasks' => $this->studentTasks($request->user()->id, 20),
            'offlineAttendances' => $this->studentOfflineAttendanceOptions($request),
        ]);
    }

    public function learning(Request $request): Response|RedirectResponse
    {
        if (! $request->has('course')) {
            return to_route($request->user()->role === 'school_teacher' ? 'teacher.learning.index' : 'student.learning.index');
        }

        $courseId = (int) $request->integer('course');
        $userId = $request->user()->id;

        if ($courseId === 0 && ! DB::table('enrollments')
            ->where('user_id', $userId)
            ->whereIn('status', ['active', 'completed'])
            ->exists()) {
            return to_route('courses.index')->with('warning', 'Daftar ke kelas terlebih dahulu untuk mulai belajar.');
        }

        $course = $this->courseForLearning($courseId, $userId);
        $lessons = collect($course['chapters'])->flatMap(fn (array $chapter) => $chapter['lessons']);
        $requestedLessonId = (int) $request->integer('lesson');
        $lesson = ($requestedLessonId > 0 ? $lessons->firstWhere('id', $requestedLessonId) : null)
            ?? $lessons->firstWhere('state', 'current')
            ?? collect($course['chapters'])->flatMap(fn (array $chapter) => $chapter['lessons'])->first();

        abort_if(($lesson['state'] ?? 'locked') === 'locked', 403, 'Selesaikan lesson sebelumnya terlebih dahulu.');

        $blockRows = $lesson
            ? DB::table('content_blocks')
                ->where('lesson_id', $lesson['id'])
                ->where('status', 'published')
                ->orderBy('order_no')
                ->get()
            : collect();
        $blockStepProgress = $blockRows->isNotEmpty()
            ? DB::table('content_block_step_progresses')
                ->where('user_id', $userId)
                ->whereIn('content_block_id', $blockRows->pluck('id'))
                ->pluck('current_step_index', 'content_block_id')
            : collect();
        $interactiveProgressRows = $blockRows->where('type', 'interactive')->isNotEmpty()
            ? InteractiveBlockProgress::query()
                ->where('user_id', $userId)
                ->whereIn('content_block_id', $blockRows->where('type', 'interactive')->pluck('id'))
                ->get()
                ->keyBy('content_block_id')
            : collect();
        $interactiveSchema = app(InteractiveBlockSchemaService::class);
        $interactiveProgress = app(InteractiveProgressService::class);
        $blocks = $blockRows
            ->map(function ($block) use ($blockStepProgress, $interactiveProgressRows, $interactiveSchema, $interactiveProgress) {
                $metadata = json_decode($block->metadata ?: '{}', true);
                if (filled($metadata['media_upload_id'] ?? null)) {
                    $metadata['download_url'] = route('materials.download', $metadata['media_upload_id']);
                    if (($metadata['mime_type'] ?? null) === 'application/pdf') {
                        $metadata['preview_url'] = route('materials.view', $metadata['media_upload_id']);
                    }
                }
                if ($block->type === 'interactive') {
                    $metadata = $interactiveSchema->enrichMediaUrls($metadata);
                }
                $steps = $this->contentBlockSteps($block->type, $block->content, $metadata);
                $interactiveProgressPayload = $block->type === 'interactive'
                    ? $interactiveProgress->progressPayload($interactiveProgressRows[$block->id] ?? null, $metadata)
                    : null;

                return [
                    'kind' => 'block',
                    'id' => $block->id,
                    'type' => $block->type,
                    'content' => $this->contentBlockDisplayContent($block->type, $block->content, $metadata),
                    'metadata' => $metadata,
                    'steps' => $steps,
                    'hasCustomSteps' => $this->hasCustomContentBlockSteps($metadata),
                    'currentStepIndex' => min((int) ($blockStepProgress[$block->id] ?? 0), max(0, $steps->count() - 1)),
                    'interactiveProgress' => $interactiveProgressPayload,
                    'status' => $block->status,
                    'orderNo' => (int) $block->order_no,
                ];
            })
            ->values();

        $lessonQuizzes = $lesson
            ? DB::table('quizzes')
                ->where('lesson_id', $lesson['id'])
                ->orderBy('order_no')
                ->get()
                ->map(function ($quiz) use ($userId) {
                    return [
                        'kind' => 'quiz',
                        'id' => $quiz->id,
                        'title' => $quiz->title,
                        'passingScore' => (int) $quiz->passing_score,
                        'timeLimitMode' => $quiz->time_limit_mode ?? 'none',
                        'timeLimitSeconds' => $quiz->time_limit_seconds ? (int) $quiz->time_limit_seconds : null,
                        'bestScore' => (int) DB::table('quiz_attempts')
                            ->where('quiz_id', $quiz->id)
                            ->where('user_id', $userId)
                            ->max('score'),
                        'questions' => Quiz::normalizeQuestions(json_decode($quiz->questions ?: '[]', true))
                            ? collect(Quiz::normalizeQuestions(json_decode($quiz->questions ?: '[]', true)))
                                ->values()
                                ->map(fn (array $question, int $index) => [
                                    'index' => $index,
                                    'id' => (string) $question['id'],
                                    'question' => $question['question'],
                                    'options' => $question['options'],
                                ])
                                ->values()
                            : collect(),
                        'orderNo' => (int) $quiz->order_no,
                    ];
                })
            : collect();

        $finalQuiz = $course['progress'] >= 100
            ? DB::table('quizzes')
                ->where('course_id', $course['id'])
                ->where('is_final_exam', true)
                ->select('id', 'title', 'passing_score as passingScore', 'time_limit_mode as timeLimitMode', 'time_limit_seconds as timeLimitSeconds', 'questions')
                ->first()
            : null;

        if ($finalQuiz) {
            $finalQuiz->timeLimitMode = $finalQuiz->timeLimitMode ?? 'none';
            $finalQuiz->timeLimitSeconds = $finalQuiz->timeLimitSeconds ? (int) $finalQuiz->timeLimitSeconds : null;
            $finalQuestions = Quiz::normalizeQuestions(json_decode($finalQuiz->questions ?: '[]', true));
            $finalQuiz->questions = collect($finalQuestions)
                ->values()
                ->map(fn (array $question, int $index) => [
                    'index' => $index,
                    'id' => (string) $question['id'],
                    'question' => $question['question'],
                    'options' => $question['options'],
                ])
                ->values();
            $finalQuiz->bestScore = (int) DB::table('quiz_attempts')
                ->where('quiz_id', $finalQuiz->id)
                ->where('user_id', $userId)
                ->max('score');
        }

        return Inertia::render('student/learning', [
            'course' => $course,
            'currentLesson' => $lesson,
            'blocks' => $blocks,
            'lessonItems' => $blocks->concat($lessonQuizzes)
                ->sortBy(fn (array $item) => [$item['orderNo'], $item['kind'] === 'quiz' ? 1 : 0])
                ->values(),
            'quiz' => $lessonQuizzes->first(),
            'finalQuiz' => $finalQuiz,
            'submission' => $lesson
                ? DB::table('submissions')
                    ->join('enrollments', 'submissions.enrollment_id', '=', 'enrollments.id')
                    ->where('enrollments.user_id', $userId)
                    ->where('submissions.lesson_id', $lesson['id'])
                    ->select('submissions.id', 'submissions.status', 'submissions.score', 'submissions.feedback', 'submissions.created_at as submittedAt')
                    ->latest('submissions.created_at')
                    ->first()
                : null,
        ]);
    }

    public function certificates(Request $request): Response
    {
        return Inertia::render('student/certificates', [
            'certificates' => $this->certificatesForUser($request->user()->id),
        ]);
    }

    public function verifyCertificate(Request $request): Response
    {
        $code = trim((string) $request->query('credential', ''));

        return Inertia::render('certificates/verify', [
            'seo' => $this->managedSeo(
                SeoSetting::CERTIFICATE_VERIFY,
                'Verifikasi Sertifikat Digital | RoboAcademy',
                'Validasi nomor sertifikat digital untuk memastikan credential pembelajaran robotik diterbitkan resmi dan masih berlaku.',
                route('certificates.verify'),
            ),
            'credential' => $code,
            'certificate' => $code === '' ? null : $this->verifiedCertificate($code),
        ]);
    }

    public function checkout(Request $request): Response
    {
        $course = DB::table('courses')
            ->where('price_type', 'paid')
            ->where('status', 'published')
            ->when($request->integer('course'), fn ($query, int $id) => $query->where('id', $id))
            ->orderByDesc('price')
            ->first();

        abort_if(! $course, 404);

        return Inertia::render('payments/checkout', [
            'course' => [
                'id' => $course->id,
                'title' => $course->title,
                'description' => $course->description,
                'level' => ucfirst($course->level),
                'price' => $course->price,
                'priceLabel' => $this->rupiah($course->price),
                'imageUrl' => $this->courseImageUrl($course),
            ],
            'summary' => [
                'originalPrice' => $this->rupiah($course->price),
                'discount' => $this->rupiah(0),
                'tax' => $this->rupiah(0),
                'total' => $this->rupiah($course->price),
            ],
            'user' => [
                'name' => $request->user()->name,
                'email' => $request->user()->email,
            ],
        ]);
    }

    public function pendingPayment(Request $request): Response
    {
        return Inertia::render('payments/pending', [
            'payment' => $this->paymentForUser($request->user()->id, 'pending'),
        ]);
    }

    public function successPayment(Request $request): Response
    {
        return Inertia::render('payments/success', [
            'payment' => $this->paymentForUser($request->user()->id, 'paid'),
        ]);
    }

    public function paymentHistory(Request $request): Response
    {
        return Inertia::render('payments/index', [
            'payments' => DB::table('payments')
                ->join('courses', 'payments.course_id', '=', 'courses.id')
                ->where('payments.user_id', $request->user()->id)
                ->select(
                    'payments.id',
                    'payments.order_id as orderId',
                    'payments.amount',
                    'payments.status',
                    'payments.payment_method as method',
                    'payments.checkout_url as checkoutUrl',
                    'payments.created_at as createdAt',
                    'payments.paid_at as paidAt',
                    'courses.title as course',
                )
                ->latest('payments.created_at')
                ->get()
                ->map(fn ($payment) => [
                    ...((array) $payment),
                    'amountLabel' => $this->rupiah((int) $payment->amount),
                ]),
        ]);
    }

    public function teacherDashboard(Request $request): Response
    {
        $schoolId = $request->user()->school_id;
        abort_if(! $schoolId, 403);

        $students = DB::table('users')
            ->leftJoin('enrollments', 'users.id', '=', 'enrollments.user_id')
            ->where('users.school_id', $schoolId)
            ->where('users.role', 'student')
            ->select('users.id', 'users.name', DB::raw('COALESCE(ROUND(AVG(enrollments.progress_percent)), 0) as progress'))
            ->groupBy('users.id', 'users.name')
            ->orderBy('users.name')
            ->get()
            ->map(fn ($student) => [
                'name' => $student->name,
                'progress' => (int) $student->progress,
                'status' => (int) $student->progress >= 70 ? 'Progress aman' : 'Perlu dipantau',
            ]);

        $school = DB::table('schools')->find($schoolId);
        $attendanceQuery = DB::table('teaching_attendances')
            ->join('teaching_schedules', 'teaching_attendances.teaching_schedule_id', '=', 'teaching_schedules.id')
            ->where('teaching_schedules.school_id', $schoolId);
        $totalAttendances = $attendanceQuery->clone()->count();
        $presentAttendances = $attendanceQuery->clone()->where('teaching_attendances.status', 'H')->count();

        return Inertia::render('teacher/dashboard', [
            'school' => $school,
            'stats' => [
                'students' => $students->count(),
                'averageProgress' => round($students->avg('progress') ?: 0),
                'activeClasses' => DB::table('enrollments')
                    ->join('users', 'enrollments.user_id', '=', 'users.id')
                    ->where('users.school_id', $schoolId)
                    ->distinct('enrollments.course_id')
                    ->count('enrollments.course_id'),
                'certificates' => DB::table('certificates')
                    ->join('enrollments', 'certificates.enrollment_id', '=', 'enrollments.id')
                    ->join('users', 'enrollments.user_id', '=', 'users.id')
                    ->where('users.school_id', $schoolId)
                    ->count(),
            ],
            'students' => $students,
            'learningAccess' => DB::table('school_learning_path_accesses')
                ->join('learning_paths', 'school_learning_path_accesses.learning_path_id', '=', 'learning_paths.id')
                ->where('school_learning_path_accesses.school_id', $schoolId)
                ->where('school_learning_path_accesses.status', 'active')
                ->where(fn ($query) => $query->whereNull('school_learning_path_accesses.starts_at')->orWhere('school_learning_path_accesses.starts_at', '<=', now()->toDateString()))
                ->where(fn ($query) => $query->whereNull('school_learning_path_accesses.expires_at')->orWhere('school_learning_path_accesses.expires_at', '>=', now()->toDateString()))
                ->select(
                    'learning_paths.id',
                    'learning_paths.title',
                    'learning_paths.slug',
                    'learning_paths.level',
                    'school_learning_path_accesses.expires_at as expiresAt',
                )
                ->orderBy('learning_paths.title')
                ->get()
                ->map(fn ($path) => [
                    'id' => $path->id,
                    'title' => $path->title,
                    'level' => $path->level,
                    'url' => route('learning-paths.show', $path->slug ?: 'unknown'),
                    'expiresAt' => $path->expiresAt ? date('d M Y', strtotime($path->expiresAt)) : 'Tanpa batas waktu',
                    'courses' => DB::table('courses')
                        ->where('learning_path_id', $path->id)
                        ->where('status', 'published')
                        ->count(),
                ]),
            'attendanceSummary' => [
                'totalRecords' => $totalAttendances,
                'present' => $presentAttendances,
                'sick' => $attendanceQuery->clone()->where('teaching_attendances.status', 'S')->count(),
                'permission' => $attendanceQuery->clone()->where('teaching_attendances.status', 'I')->count(),
                'absent' => $attendanceQuery->clone()->where('teaching_attendances.status', 'A')->count(),
                'attendanceRate' => $totalAttendances > 0 ? round(($presentAttendances / $totalAttendances) * 100) : 0,
                'offlineSchedules' => DB::table('teaching_schedules')
                    ->where('school_id', $schoolId)
                    ->where('mode', 'offline')
                    ->count(),
                'upcomingSchedules' => DB::table('teaching_schedules')
                    ->where('school_id', $schoolId)
                    ->whereIn('status', ['scheduled', 'rescheduled'])
                    ->whereDate('starts_at', '>=', now()->toDateString())
                    ->whereDate('starts_at', '<=', now()->addDays(7)->toDateString())
                    ->count(),
            ],
            'upcomingSchedules' => DB::table('teaching_schedules')
                ->leftJoin('courses', 'teaching_schedules.course_id', '=', 'courses.id')
                ->join('users as instructors', 'teaching_schedules.instructor_id', '=', 'instructors.id')
                ->where('teaching_schedules.school_id', $schoolId)
                ->whereIn('teaching_schedules.status', ['scheduled', 'rescheduled'])
                ->whereDate('teaching_schedules.starts_at', '>=', now()->toDateString())
                ->orderBy('teaching_schedules.starts_at')
                ->limit(5)
                ->select(
                    'teaching_schedules.id',
                    'teaching_schedules.title',
                    'teaching_schedules.starts_at as startsAt',
                    'teaching_schedules.ends_at as endsAt',
                    'teaching_schedules.location',
                    'teaching_schedules.mode',
                    DB::raw("COALESCE(courses.title, 'Umum sekolah') as course"),
                    'instructors.name as instructor',
                )
                ->get()
                ->map(fn ($schedule) => [
                    'id' => $schedule->id,
                    'title' => $schedule->title,
                    'course' => $schedule->course,
                    'instructor' => $schedule->instructor,
                    'mode' => $schedule->mode,
                    'location' => $schedule->location ?: '-',
                    'dateLabel' => date('d M Y', strtotime($schedule->startsAt)),
                    'timeLabel' => date('H:i', strtotime($schedule->startsAt)).' - '.date('H:i', strtotime($schedule->endsAt)),
                ]),
            'recentSessions' => DB::table('teaching_schedules')
                ->leftJoin('courses', 'teaching_schedules.course_id', '=', 'courses.id')
                ->join('users as instructors', 'teaching_schedules.instructor_id', '=', 'instructors.id')
                ->leftJoin('teaching_attendances', 'teaching_schedules.id', '=', 'teaching_attendances.teaching_schedule_id')
                ->where('teaching_schedules.school_id', $schoolId)
                ->whereDate('teaching_schedules.starts_at', '<=', now()->toDateString())
                ->select(
                    'teaching_schedules.id',
                    'teaching_schedules.title',
                    'teaching_schedules.starts_at as startsAt',
                    DB::raw("COALESCE(courses.title, 'Umum sekolah') as course"),
                    'instructors.name as instructor',
                    DB::raw("SUM(CASE WHEN teaching_attendances.status = 'H' THEN 1 ELSE 0 END) as present"),
                    DB::raw("SUM(CASE WHEN teaching_attendances.status = 'S' THEN 1 ELSE 0 END) as sick"),
                    DB::raw("SUM(CASE WHEN teaching_attendances.status = 'I' THEN 1 ELSE 0 END) as permission"),
                    DB::raw("SUM(CASE WHEN teaching_attendances.status = 'A' THEN 1 ELSE 0 END) as absent"),
                    DB::raw('COUNT(teaching_attendances.id) as total'),
                )
                ->groupBy('teaching_schedules.id', 'teaching_schedules.title', 'teaching_schedules.starts_at', 'courses.title', 'instructors.name')
                ->orderByDesc('teaching_schedules.starts_at')
                ->limit(5)
                ->get()
                ->map(fn ($session) => [
                    'id' => $session->id,
                    'title' => $session->title,
                    'course' => $session->course,
                    'instructor' => $session->instructor,
                    'dateLabel' => date('d M Y', strtotime($session->startsAt)),
                    'present' => (int) $session->present,
                    'sick' => (int) $session->sick,
                    'permission' => (int) $session->permission,
                    'absent' => (int) $session->absent,
                    'total' => (int) $session->total,
                ]),
        ]);
    }

    public function teacherStudents(Request $request): Response
    {
        abort_if(! $request->user()->school_id, 403);

        $schoolId = $request->user()->school_id;
        $students = DB::table('users')
            ->leftJoin('enrollments', 'users.id', '=', 'enrollments.user_id')
            ->where('users.school_id', $schoolId)
            ->where('users.role', 'student')
            ->select(
                'users.id',
                'users.name',
                'users.email',
                'users.status',
                DB::raw('COUNT(enrollments.id) as enrollments'),
                DB::raw('COALESCE(ROUND(AVG(enrollments.progress_percent)), 0) as progress'),
            )
            ->groupBy('users.id', 'users.name', 'users.email', 'users.status')
            ->orderBy('users.name')
            ->get();

        $studentIds = $students->pluck('id');
        $schedules = DB::table('teaching_schedules')
            ->join('teaching_sessions', 'teaching_schedules.id', '=', 'teaching_sessions.teaching_schedule_id')
            ->join('users as reviewers', 'teaching_sessions.reviewed_by', '=', 'reviewers.id')
            ->leftJoin('courses', 'teaching_schedules.course_id', '=', 'courses.id')
            ->leftJoin('users as instructors', 'teaching_schedules.instructor_id', '=', 'instructors.id')
            ->where('teaching_schedules.school_id', $schoolId)
            ->whereIn('teaching_sessions.status', ['approved', 'rejected'])
            ->whereNotNull('teaching_sessions.reviewed_at')
            ->where('reviewers.role', 'admin')
            ->orderByDesc('teaching_schedules.starts_at')
            ->select(
                'teaching_schedules.id',
                'teaching_schedules.course_id',
                'teaching_schedules.title',
                'teaching_schedules.starts_at',
                'teaching_schedules.status',
                'courses.title as course_title',
                'instructors.name as instructor_name',
                'teaching_sessions.id as teaching_session_id',
                'teaching_sessions.topic',
                'teaching_sessions.report',
                'teaching_sessions.evidence_photo_path',
                'teaching_sessions.status as review_status',
                'teaching_sessions.review_notes',
            )
            ->get();
        $scheduleIds = $schedules->pluck('id');

        $attendances = DB::table('teaching_attendances')
            ->whereIn('teaching_schedule_id', $scheduleIds)
            ->whereIn('student_id', $studentIds)
            ->get()
            ->keyBy(fn ($attendance) => $attendance->teaching_schedule_id.':'.$attendance->student_id);
        $notes = DB::table('student_progress_notes')
            ->where('teacher_id', $request->user()->id)
            ->whereIn('teaching_schedule_id', $scheduleIds)
            ->whereIn('student_id', $studentIds)
            ->get()
            ->keyBy(fn ($note) => $note->teaching_schedule_id.':'.$note->student_id);
        $courseProgress = DB::table('enrollments')
            ->whereIn('user_id', $studentIds)
            ->whereIn('course_id', $schedules->pluck('course_id')->filter()->unique())
            ->get(['user_id', 'course_id', 'progress_percent'])
            ->keyBy(fn ($enrollment) => $enrollment->user_id.':'.$enrollment->course_id);

        $studentRows = $students->map(fn ($student) => [
            ...((array) $student),
            'enrollments' => (int) $student->enrollments,
            'progress' => (int) $student->progress,
        ])->values();

        $meetingRows = $schedules->map(function ($schedule) use ($students, $attendances, $notes, $courseProgress) {
            $progressRows = $students->map(function ($student) use ($schedule, $attendances, $notes, $courseProgress) {
                $key = $schedule->id.':'.$student->id;
                $attendance = $attendances->get($key);
                $note = $notes->get($key);
                $progress = $schedule->course_id
                    ? (int) ($courseProgress->get($student->id.':'.$schedule->course_id)?->progress_percent ?? 0)
                    : (int) $student->progress;

                return [
                    'id' => $student->id,
                    'name' => $student->name,
                    'email' => $student->email,
                    'progress' => $progress,
                    'attendanceStatus' => $attendance?->status,
                    'attendanceLabel' => match ($attendance?->status) {
                        'H' => 'Hadir',
                        'S' => 'Sakit',
                        'I' => 'Izin',
                        'A' => 'Tidak hadir',
                        default => 'Belum tercatat',
                    },
                    'checkedInAt' => $attendance?->checked_in_at
                        ? date('H:i', strtotime($attendance->checked_in_at)).' WIB'
                        : null,
                    'lateMinutes' => (int) ($attendance?->late_minutes ?? 0),
                    'note' => $note?->note,
                ];
            })->values();

            return [
                'id' => $schedule->id,
                'title' => $schedule->title,
                'course' => $schedule->course_title ?: 'Program sekolah',
                'instructor' => $schedule->instructor_name ?: 'Pengajar tidak tersedia',
                'status' => $schedule->status,
                'reviewStatus' => $schedule->review_status,
                'topic' => $schedule->topic,
                'report' => $schedule->report,
                'reviewNotes' => $schedule->review_notes,
                'evidencePhotoUrl' => filled($schedule->evidence_photo_path)
                    ? url('/storage/'.ltrim($schedule->evidence_photo_path, '/'))
                    : null,
                'detailUrl' => route('teacher.teaching-sessions.show', $schedule->teaching_session_id),
                'dateLabel' => date('d M Y, H:i', strtotime($schedule->starts_at)).' WIB',
                'averageProgress' => (int) round($progressRows->avg('progress') ?: 0),
                'presentCount' => $progressRows->where('attendanceStatus', 'H')->count(),
                'noteCount' => $progressRows->whereNotNull('note')->count(),
                'students' => $progressRows,
            ];
        })->values();

        return Inertia::render('teacher/students', [
            'school' => DB::table('schools')->where('id', $schoolId)->value('name'),
            'students' => $studentRows,
            'meetings' => $meetingRows,
        ]);
    }

    public function teacherAttendanceRecap(Request $request): Response
    {
        abort_if(! $request->user()->school_id, 403);

        $filters = $request->validate([
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date', 'after_or_equal:from'],
        ]);
        $schoolId = $request->user()->school_id;
        $students = DB::table('users')
            ->where('school_id', $schoolId)
            ->where('role', 'student')
            ->select('id', 'name', 'email', 'status')
            ->orderBy('name')
            ->get();
        $schedules = DB::table('teaching_schedules')
            ->join('teaching_sessions', 'teaching_schedules.id', '=', 'teaching_sessions.teaching_schedule_id')
            ->join('users as reviewers', 'teaching_sessions.reviewed_by', '=', 'reviewers.id')
            ->leftJoin('courses', 'teaching_schedules.course_id', '=', 'courses.id')
            ->where('teaching_schedules.school_id', $schoolId)
            ->whereIn('teaching_sessions.status', ['approved', 'rejected'])
            ->whereNotNull('teaching_sessions.reviewed_at')
            ->where('reviewers.role', 'admin')
            ->when(filled($filters['from'] ?? null), fn ($query) => $query->whereDate('teaching_schedules.starts_at', '>=', $filters['from']))
            ->when(filled($filters['to'] ?? null), fn ($query) => $query->whereDate('teaching_schedules.starts_at', '<=', $filters['to']))
            ->orderByDesc('teaching_schedules.starts_at')
            ->select(
                'teaching_schedules.id',
                'teaching_schedules.title',
                'teaching_schedules.starts_at',
                'teaching_sessions.topic',
                'courses.title as course_title',
            )
            ->get();
        $attendances = DB::table('teaching_attendances')
            ->whereIn('teaching_schedule_id', $schedules->pluck('id'))
            ->whereIn('student_id', $students->pluck('id'))
            ->get()
            ->keyBy(fn ($attendance) => $attendance->student_id.':'.$attendance->teaching_schedule_id);
        $meetingCount = $schedules->count();

        $rows = $students->map(function ($student) use ($schedules, $attendances, $meetingCount) {
            $details = $schedules->map(function ($schedule) use ($student, $attendances) {
                $attendance = $attendances->get($student->id.':'.$schedule->id);
                $status = $attendance?->status;
                $lateMinutes = (int) ($attendance?->late_minutes ?? 0);

                return [
                    'meetingId' => $schedule->id,
                    'meeting' => $schedule->topic ?: $schedule->title,
                    'course' => $schedule->course_title ?: 'Program sekolah',
                    'dateLabel' => date('d M Y, H:i', strtotime($schedule->starts_at)).' WIB',
                    'status' => $status,
                    'statusLabel' => match ($status) {
                        'H' => 'Hadir',
                        'S' => 'Sakit',
                        'I' => 'Izin',
                        'A' => 'Tanpa keterangan',
                        default => 'Belum dicatat',
                    },
                    'checkedInAt' => $attendance?->checked_in_at
                        ? date('H:i', strtotime($attendance->checked_in_at)).' WIB'
                        : null,
                    'lateMinutes' => $lateMinutes,
                ];
            })->values();
            $present = $details->where('status', 'H')->count();
            $sick = $details->where('status', 'S')->count();
            $permission = $details->where('status', 'I')->count();
            $absent = $details->where('status', 'A')->count();
            $missing = $details->whereNull('status')->count();
            $late = $details->where('status', 'H')->where('lateMinutes', '>', 0);
            $attendanceRate = $meetingCount > 0 ? (int) round(($present / $meetingCount) * 100) : 0;

            return [
                'id' => $student->id,
                'name' => $student->name,
                'email' => $student->email,
                'accountStatus' => $student->status,
                'totalMeetings' => $meetingCount,
                'present' => $present,
                'sick' => $sick,
                'permission' => $permission,
                'absent' => $absent,
                'missing' => $missing,
                'attendanceRate' => $attendanceRate,
                'lateCount' => $late->count(),
                'totalLateMinutes' => (int) $late->sum('lateMinutes'),
                'needsAttention' => $meetingCount > 0 && ($attendanceRate < 75 || $absent >= 3 || $missing >= 3),
                'meetings' => $details,
            ];
        })->values();

        return Inertia::render('teacher/attendance-recap', [
            'school' => DB::table('schools')->where('id', $schoolId)->value('name'),
            'filters' => [
                'from' => $filters['from'] ?? '',
                'to' => $filters['to'] ?? '',
            ],
            'students' => $rows,
            'summary' => [
                'students' => $students->count(),
                'meetings' => $meetingCount,
                'averageAttendance' => (int) round($rows->avg('attendanceRate') ?: 0),
                'needsAttention' => $rows->where('needsAttention', true)->count(),
            ],
        ]);
    }

    public function managedStudents(Request $request): Response
    {
        $user = $request->user();
        abort_unless(in_array($user->role, ['admin', 'internal_instructor'], true), 403);

        $instructorCourseIds = $user->role === 'internal_instructor'
            ? $this->instructorCourseIds($user->id, $user->school_id)
            : [];
        $instructorSchoolIds = $user->role === 'internal_instructor'
            ? $this->instructorSchoolIds($user->id, $user->school_id)
            : [];

        $students = DB::table('users as students')
            ->leftJoin('schools', 'students.school_id', '=', 'schools.id')
            ->leftJoin('enrollments', 'students.id', '=', 'enrollments.user_id')
            ->leftJoin('courses', 'enrollments.course_id', '=', 'courses.id')
            ->leftJoin('submissions', 'enrollments.id', '=', 'submissions.enrollment_id')
            ->leftJoin('certificates', function ($join) {
                $join
                    ->on('enrollments.id', '=', 'certificates.enrollment_id')
                    ->where('certificates.status', '=', 'issued');
            })
            ->where('students.role', 'student')
            ->when($user->role === 'internal_instructor', function ($query) use ($user, $instructorCourseIds, $instructorSchoolIds) {
                $query->where(function ($query) use ($user, $instructorCourseIds, $instructorSchoolIds) {
                    $query->where('courses.instructor_id', $user->id);

                    if ($instructorCourseIds !== []) {
                        $query->orWhereIn('courses.id', $instructorCourseIds);
                    }

                    if ($instructorSchoolIds !== []) {
                        $query->orWhereIn('students.school_id', $instructorSchoolIds);
                    }
                });
            })
            ->select(
                'students.id',
                'students.name',
                'students.email',
                'students.status',
                'schools.id as schoolId',
                'schools.name as school',
                DB::raw('COUNT(DISTINCT enrollments.id) as enrollments'),
                DB::raw('COUNT(DISTINCT enrollments.course_id) as courses'),
                DB::raw('COALESCE(ROUND(AVG(enrollments.progress_percent)), 0) as progress'),
                DB::raw("COUNT(DISTINCT CASE WHEN submissions.status IN ('submitted', 'revised') THEN submissions.id END) as pendingSubmissions"),
                DB::raw('COUNT(DISTINCT certificates.id) as certificates'),
                DB::raw('MAX(enrollments.updated_at) as lastActivityAt'),
            )
            ->groupBy('students.id', 'students.name', 'students.email', 'students.status', 'schools.id', 'schools.name')
            ->orderBy('students.name')
            ->get()
            ->map(fn ($student) => [
                'id' => $student->id,
                'name' => $student->name,
                'email' => $student->email,
                'status' => $student->status,
                'schoolId' => $student->schoolId ?: 0,
                'school' => $student->school ?: 'Tanpa sekolah',
                'enrollments' => (int) $student->enrollments,
                'courses' => (int) $student->courses,
                'progress' => (int) $student->progress,
                'pendingSubmissions' => (int) $student->pendingSubmissions,
                'certificates' => (int) $student->certificates,
                'lastActivityAt' => $student->lastActivityAt,
                'reviewUrl' => ((int) $student->pendingSubmissions > 0)
                    ? route('reviews.index', ['student' => $student->id])
                    : null,
            ]);

        return Inertia::render('students/index', [
            'scopeLabel' => $user->role === 'admin' ? 'Admin Pusat' : 'Pengajar / Trainer',
            'students' => $students,
            'summary' => [
                'students' => $students->count(),
                'active' => $students->where('status', 'active')->count(),
                'averageProgress' => round($students->avg('progress') ?: 0),
                'pendingSubmissions' => $students->sum('pendingSubmissions'),
            ],
            'schools' => $students
                ->map(fn ($student) => ['id' => $student['schoolId'], 'name' => $student['school']])
                ->unique('id')
                ->sortBy('name')
                ->values(),
        ]);
    }

    public function instructorDashboard(Request $request): Response
    {
        $instructorId = $request->user()->id;
        $instructorSchoolIds = $this->instructorSchoolIds($instructorId, $request->user()->school_id);
        $courseIds = collect($this->instructorCourseIds($instructorId, $request->user()->school_id));
        $studentIds = $this->instructorStudentIds($instructorId, $courseIds->all(), $instructorSchoolIds);
        $enrollmentQuery = DB::table('enrollments')->whereIn('course_id', $courseIds);
        $pendingReviews = DB::table('submissions')
            ->join('enrollments', 'submissions.enrollment_id', '=', 'enrollments.id')
            ->whereIn('enrollments.course_id', $courseIds)
            ->whereIn('submissions.status', ['submitted', 'revised'])
            ->count();

        return Inertia::render('instructor/dashboard', [
            'stats' => [
                'courses' => $courseIds->count(),
                'students' => count($studentIds),
                'pendingReviews' => $pendingReviews,
                'openDiscussions' => DB::table('forum_threads')
                    ->whereIn('course_id', $courseIds)
                    ->where('status', 'open')
                    ->count(),
                'averageProgress' => round($enrollmentQuery->clone()->avg('progress_percent') ?: 0),
                'certificates' => DB::table('certificates')
                    ->join('enrollments', 'certificates.enrollment_id', '=', 'enrollments.id')
                    ->whereIn('enrollments.course_id', $courseIds)
                    ->where('certificates.status', 'issued')
                    ->count(),
            ],
            'courses' => DB::table('courses')
                ->leftJoin('enrollments', 'courses.id', '=', 'enrollments.course_id')
                ->whereIn('courses.id', $courseIds)
                ->select(
                    'courses.id',
                    'courses.title',
                    'courses.status',
                    'courses.learning_path_id as learningPathId',
                    DB::raw('COUNT(DISTINCT enrollments.user_id) as enrolledStudents'),
                    DB::raw('COALESCE(ROUND(AVG(enrollments.progress_percent)), 0) as progress'),
                )
                ->groupBy('courses.id', 'courses.title', 'courses.status', 'courses.learning_path_id')
                ->orderBy('courses.title')
                ->get()
                ->map(function ($course) use ($instructorId, $instructorSchoolIds) {
                    $courseStudentIds = $this->instructorStudentIdsForCourse(
                        $instructorId,
                        (int) $course->id,
                        $course->learningPathId ? (int) $course->learningPathId : null,
                        $instructorSchoolIds,
                    );

                    return [
                        'id' => $course->id,
                        'title' => $course->title,
                        'status' => $course->status,
                        'students' => count($courseStudentIds),
                        'progress' => (int) $course->progress,
                        'pendingReviews' => DB::table('submissions')
                            ->join('enrollments', 'submissions.enrollment_id', '=', 'enrollments.id')
                            ->where('enrollments.course_id', $course->id)
                            ->whereIn('submissions.status', ['submitted', 'revised'])
                            ->count(),
                        'certificates' => DB::table('certificates')
                            ->join('enrollments', 'certificates.enrollment_id', '=', 'enrollments.id')
                            ->where('enrollments.course_id', $course->id)
                            ->where('certificates.status', 'issued')
                            ->count(),
                    ];
                }),
            'pendingSubmissions' => DB::table('submissions')
                ->join('enrollments', 'submissions.enrollment_id', '=', 'enrollments.id')
                ->leftJoin('users', 'enrollments.user_id', '=', 'users.id')
                ->leftJoin('courses', 'enrollments.course_id', '=', 'courses.id')
                ->leftJoin('lessons', 'submissions.lesson_id', '=', 'lessons.id')
                ->whereIn('enrollments.course_id', $courseIds)
                ->whereIn('submissions.status', ['submitted', 'revised'])
                ->select(
                    'submissions.id',
                    'submissions.status',
                    'submissions.created_at as submittedAt',
                    DB::raw("COALESCE(users.name, 'User tidak tersedia') as student"),
                    DB::raw("COALESCE(courses.title, 'Course tidak tersedia') as course"),
                    'lessons.title as lesson',
                )
                ->latest('submissions.created_at')
                ->limit(8)
                ->get()
                ->map(fn ($submission) => [
                    'id' => $submission->id,
                    'student' => $submission->student,
                    'course' => $submission->course,
                    'lesson' => $submission->lesson,
                    'status' => $submission->status,
                    'submittedAt' => $submission->submittedAt,
                ]),
            'certificates' => $this->certificateUserRows($instructorId, $courseIds->all())->take(6)->values(),
            'discussions' => DB::table('forum_threads')
                ->leftJoin('courses', 'forum_threads.course_id', '=', 'courses.id')
                ->leftJoin('users', 'forum_threads.user_id', '=', 'users.id')
                ->whereIn('forum_threads.course_id', $courseIds)
                ->select(
                    'forum_threads.id',
                    'forum_threads.title',
                    'forum_threads.status',
                    'courses.id as courseId',
                    DB::raw("COALESCE(courses.title, 'Course tidak tersedia') as course"),
                    DB::raw("COALESCE(users.name, 'User tidak tersedia') as author"),
                )
                ->latest('forum_threads.updated_at')
                ->limit(8)
                ->get(),
        ]);
    }

    public function submissionReviews(Request $request): Response
    {
        $user = $request->user();
        $instructorCourseIds = $user->role === 'internal_instructor'
            ? $this->instructorCourseIds($user->id, $user->school_id)
            : [];
        $instructorSchoolIds = $user->role === 'internal_instructor'
            ? $this->instructorSchoolIds($user->id, $user->school_id)
            : [];

        $query = DB::table('submissions')
            ->join('enrollments', 'submissions.enrollment_id', '=', 'enrollments.id')
            ->leftJoin('users as students', 'enrollments.user_id', '=', 'students.id')
            ->leftJoin('schools', 'students.school_id', '=', 'schools.id')
            ->leftJoin('courses', 'enrollments.course_id', '=', 'courses.id')
            ->leftJoin('users as trainers', 'courses.instructor_id', '=', 'trainers.id')
            ->leftJoin('lessons', 'submissions.lesson_id', '=', 'lessons.id')
            ->leftJoin('users as reviewers', 'submissions.reviewer_id', '=', 'reviewers.id')
            ->when($user->role === 'internal_instructor', function ($query) use ($user, $instructorCourseIds, $instructorSchoolIds) {
                $query->where(function ($query) use ($user, $instructorCourseIds, $instructorSchoolIds) {
                    $query->where('courses.instructor_id', $user->id);

                    if ($instructorCourseIds !== []) {
                        $query->orWhereIn('courses.id', $instructorCourseIds);
                    }

                    if ($instructorSchoolIds !== []) {
                        $query->orWhereIn('students.school_id', $instructorSchoolIds);
                    }
                });
            })
            ->when($user->role === 'school_teacher', fn ($query) => $query->where('students.school_id', $user->school_id));

        $items = $query
            ->select(
                'submissions.id',
                'submissions.code',
                'submissions.report_path',
                'submissions.image_path',
                'submissions.video_url',
                'submissions.score',
                'submissions.feedback',
                'submissions.status',
                'submissions.created_at',
                'submissions.reviewed_at',
                'students.id as studentId',
                DB::raw("COALESCE(students.name, 'User tidak tersedia') as student"),
                'schools.id as schoolId',
                'schools.name as school',
                'courses.id as courseId',
                DB::raw("COALESCE(courses.title, 'Course tidak tersedia') as course"),
                'trainers.id as trainerId',
                'trainers.name as trainer',
                'lessons.title as lesson',
                'reviewers.name as reviewer',
            )
            ->latest('submissions.created_at')
            ->get()
            ->map(fn ($item) => [
                'id' => $item->id,
                'studentId' => $item->studentId,
                'student' => $item->student ?: 'User tidak tersedia',
                'schoolId' => $item->schoolId ?: 0,
                'school' => $item->school ?: 'Tanpa sekolah',
                'courseId' => $item->courseId,
                'course' => $item->course ?: 'Course tidak tersedia',
                'trainerId' => $item->trainerId ?: 0,
                'trainer' => $item->trainer ?: 'Belum ada pengajar',
                'lesson' => $item->lesson,
                'code' => $item->code,
                'hasReport' => filled($item->report_path) && Storage::disk('local')->exists($item->report_path),
                'hasImage' => filled($item->image_path) && Storage::disk('local')->exists($item->image_path),
                'videoUrl' => $item->video_url,
                'score' => $item->score === null ? null : (int) $item->score,
                'feedback' => $item->feedback,
                'status' => $item->status,
                'reviewer' => $item->reviewer,
                'submittedAt' => $item->created_at,
                'reviewedAt' => $item->reviewed_at,
            ]);

        return Inertia::render('reviews/index', [
            'items' => $items,
            'summary' => $this->reviewSummary($items),
            'hierarchy' => $this->reviewHierarchy($items),
            'scopeLabel' => match ($user->role) {
                'internal_instructor' => 'Pengajar Internal',
                'school_teacher' => 'Guru Sekolah',
                default => 'Admin Pusat',
            },
        ]);
    }

    public function adminSchools(): Response
    {
        $schools = $this->schools();

        return Inertia::render('admin/schools', [
            'stats' => [
                'totalSchools' => $schools->count(),
                'activePartners' => $schools->where('statusValue', 'active')->count(),
                'totalStudents' => $schools->sum('students'),
                'totalTeachers' => $schools->sum('teachers'),
            ],
            'schools' => $schools->values(),
        ]);
    }

    public function adminSchoolLearningPathAccesses(): Response
    {
        $accesses = DB::table('school_learning_path_accesses')
            ->leftJoin('schools', 'school_learning_path_accesses.school_id', '=', 'schools.id')
            ->leftJoin('learning_paths', 'school_learning_path_accesses.learning_path_id', '=', 'learning_paths.id')
            ->leftJoin('courses', 'learning_paths.id', '=', 'courses.learning_path_id')
            ->select(
                'school_learning_path_accesses.id',
                'school_learning_path_accesses.school_id as schoolId',
                'school_learning_path_accesses.learning_path_id as learningPathId',
                'school_learning_path_accesses.status',
                'school_learning_path_accesses.starts_at as startsAt',
                'school_learning_path_accesses.expires_at as expiresAt',
                'school_learning_path_accesses.notes',
                'school_learning_path_accesses.created_at as createdAt',
                DB::raw("COALESCE(schools.name, 'Sekolah tidak tersedia') as school"),
                DB::raw("COALESCE(learning_paths.title, 'Learning path tidak tersedia') as learningPath"),
                DB::raw('COUNT(courses.id) as courseCount'),
            )
            ->groupBy(
                'school_learning_path_accesses.id',
                'school_learning_path_accesses.school_id',
                'school_learning_path_accesses.learning_path_id',
                'school_learning_path_accesses.status',
                'school_learning_path_accesses.starts_at',
                'school_learning_path_accesses.expires_at',
                'school_learning_path_accesses.notes',
                'school_learning_path_accesses.created_at',
                'schools.name',
                'learning_paths.title',
            )
            ->orderBy('schools.name')
            ->orderBy('learning_paths.title')
            ->get()
            ->map(function ($access) {
                $isStarted = blank($access->startsAt) || $access->startsAt <= now()->toDateString();
                $isNotExpired = blank($access->expiresAt) || $access->expiresAt >= now()->toDateString();

                return [
                    ...((array) $access),
                    'isCurrentlyActive' => $access->status === 'active' && $isStarted && $isNotExpired,
                    'studentCount' => DB::table('users')
                        ->where('school_id', $access->schoolId)
                        ->where('role', 'student')
                        ->where('status', 'active')
                        ->count(),
                    'enrollmentCount' => DB::table('enrollments')
                        ->join('users', 'enrollments.user_id', '=', 'users.id')
                        ->join('courses', 'enrollments.course_id', '=', 'courses.id')
                        ->where('users.school_id', $access->schoolId)
                        ->where('courses.learning_path_id', $access->learningPathId)
                        ->count(),
                ];
            });

        return Inertia::render('admin/school-learning-path-accesses', [
            'accesses' => $accesses,
            'schools' => DB::table('schools')
                ->where('status', 'active')
                ->select('id', 'name')
                ->orderBy('name')
                ->get(),
            'learningPaths' => DB::table('learning_paths')
                ->leftJoin('courses', 'learning_paths.id', '=', 'courses.learning_path_id')
                ->where('learning_paths.status', 'published')
                ->select(
                    'learning_paths.id',
                    'learning_paths.title',
                    'learning_paths.level',
                    DB::raw('COUNT(courses.id) as courseCount'),
                )
                ->groupBy('learning_paths.id', 'learning_paths.title', 'learning_paths.level')
                ->orderBy('learning_paths.title')
                ->get(),
            'stats' => [
                'total' => $accesses->count(),
                'active' => $accesses->where('isCurrentlyActive', true)->count(),
                'schools' => $accesses->pluck('schoolId')->unique()->count(),
                'coursesOpened' => $accesses->where('isCurrentlyActive', true)->sum('courseCount'),
            ],
        ]);
    }

    public function adminSchoolDetail(Request $request): Response
    {
        $schoolId = (int) $request->integer('school', DB::table('schools')->value('id'));
        $school = $this->schools()->firstWhere('id', $schoolId) ?? $this->schools()->first();
        abort_if(! $school, 404);

        return Inertia::render('admin/school-detail', [
            'school' => [
                ...$school,
                'certificates' => DB::table('certificates')
                    ->join('enrollments', 'certificates.enrollment_id', '=', 'enrollments.id')
                    ->join('users', 'enrollments.user_id', '=', 'users.id')
                    ->where('users.school_id', $school['id'])
                    ->where('certificates.status', 'issued')
                    ->count(),
            ],
            'programs' => DB::table('courses')
                ->join('enrollments', 'courses.id', '=', 'enrollments.course_id')
                ->join('users', 'enrollments.user_id', '=', 'users.id')
                ->where('users.school_id', $school['id'])
                ->select(
                    'courses.title',
                    DB::raw('COALESCE(ROUND(AVG(enrollments.progress_percent)), 0) as progress'),
                    DB::raw('COUNT(DISTINCT users.id) as students'),
                )
                ->groupBy('courses.id', 'courses.title')
                ->orderBy('courses.title')
                ->get(),
        ]);
    }

    public function adminUsers(): Response
    {
        return Inertia::render('admin/users', [
            'users' => DB::table('users')
                ->leftJoin('schools', 'users.school_id', '=', 'schools.id')
                ->leftJoin('schools as requested_schools', 'users.requested_school_id', '=', 'requested_schools.id')
                ->select(
                    'users.id',
                    'users.school_id as schoolId',
                    'users.requested_school_id as requestedSchoolId',
                    'users.manual_school_name as manualSchoolName',
                    'users.school_verification_status as schoolVerificationStatus',
                    'users.name',
                    'users.email',
                    'users.role',
                    'users.status',
                    'schools.name as school',
                    'requested_schools.name as requestedSchool',
                )
                ->orderBy('users.role')
                ->orderBy('users.name')
                ->get()
                ->map(fn ($user) => [
                    'id' => $user->id,
                    'schoolId' => $user->schoolId,
                    'name' => $user->name,
                    'email' => $user->email,
                    'role' => $user->role,
                    'roleLabel' => $this->roleLabel($user->role),
                    'status' => $user->status,
                    'school' => $user->school ?: '-',
                    'schoolRequest' => $user->requestedSchool ?: $user->manualSchoolName,
                    'schoolRequestStatus' => $user->schoolVerificationStatus,
                ]),
            'schools' => DB::table('schools')->select('id', 'name')->orderBy('name')->get(),
            'stats' => [
                'total' => DB::table('users')->count(),
                'students' => DB::table('users')->where('role', 'student')->count(),
                'teachers' => DB::table('users')->whereIn('role', ['school_teacher', 'internal_instructor'])->count(),
                'admins' => DB::table('users')->where('role', 'admin')->count(),
            ],
        ]);
    }

    public function adminLearningPaths(Request $request): Response
    {
        $paths = DB::table('learning_paths')
            ->leftJoin('courses', 'learning_paths.id', '=', 'courses.learning_path_id')
            ->when($request->user()?->role === 'internal_instructor', function ($query) use ($request) {
                $visiblePathIds = $this->visibleLearningPathIdsForInstructor($request->user()->id);

                $query->where(function ($query) use ($request, $visiblePathIds) {
                    $query->where('learning_paths.created_by', $request->user()->id);

                    if ($visiblePathIds !== []) {
                        $query->orWhereIn('learning_paths.id', $visiblePathIds);
                    }
                });
            });

        return Inertia::render('admin/learning-paths', [
            'routeBase' => $this->managementBasePath($request),
            'paths' => $paths
                ->select(
                    'learning_paths.id',
                    'learning_paths.title',
                    'learning_paths.slug',
                    'learning_paths.description',
                    'learning_paths.level',
                    'learning_paths.status',
                    'learning_paths.meta_title',
                    'learning_paths.meta_description',
                    DB::raw('COUNT(courses.id) as course_count'),
                )
                ->groupBy(
                    'learning_paths.id',
                    'learning_paths.title',
                    'learning_paths.slug',
                    'learning_paths.description',
                    'learning_paths.level',
                    'learning_paths.status',
                    'learning_paths.meta_title',
                    'learning_paths.meta_description',
                )
                ->orderBy('learning_paths.title')
                ->get(),
        ]);
    }

    public function createCourse(Request $request): Response
    {
        return Inertia::render('admin/course-form', [
            ...$this->courseFormPayload($request),
            'course' => null,
            'selectedPrerequisiteIds' => [],
            'backUrl' => $this->courseBuilderUrl($request),
            'routeBase' => $this->managementBasePath($request),
        ]);
    }

    public function editCourse(Request $request, Course $course): Response
    {
        $this->authorizeCourseManager($request, $course);

        return Inertia::render('admin/course-form', [
            ...$this->courseFormPayload($request, $course),
            'course' => $course,
            'selectedPrerequisiteIds' => DB::table('course_prerequisites')
                ->where('course_id', $course->id)
                ->pluck('prerequisite_course_id'),
            'backUrl' => $this->courseBuilderUrl($request, $course->id),
            'routeBase' => $this->managementBasePath($request),
        ]);
    }

    public function courseBuilder(Request $request): Response
    {
        $courseQuery = $this->managedCourseQuery($request);

        $courseId = (int) $request->integer('course', $courseQuery->clone()->value('id'));
        $course = $courseQuery->clone()->where('id', $courseId)->first();
        abort_if($courseId > 0 && ! $course, 403);

        return Inertia::render('admin/course-builder', [
            'routeBase' => $this->managementBasePath($request),
            'course' => $course,
            'courses' => $courseQuery->clone()
                ->select('id', 'title', 'status')
                ->orderBy('title')
                ->get(),
            'learningPaths' => $this->managedLearningPathOptions($request),
            'instructors' => DB::table('users')
                ->whereIn('role', ['internal_instructor', 'admin'])
                ->where('status', 'active')
                ->when($request->user()?->role === 'internal_instructor', fn ($query) => $query->where('id', $request->user()->id))
                ->select('id', 'name')
                ->orderBy('name')
                ->get(),
            'certificateTemplates' => DB::table('certificate_templates')
                ->where('status', 'published')
                ->select('id', 'name')
                ->orderBy('name')
                ->get(),
            'prerequisiteOptions' => $courseQuery->clone()
                ->when($course, fn ($query) => $query->where('id', '!=', $course->id))
                ->select('id', 'title')
                ->orderBy('title')
                ->get(),
            'selectedPrerequisiteIds' => $course
                ? DB::table('course_prerequisites')
                    ->where('course_id', $course->id)
                    ->pluck('prerequisite_course_id')
                : collect(),
            'outline' => $course ? $this->courseOutline($courseId) : collect(),
            'chapters' => $course ? DB::table('chapters')
                ->where('course_id', $courseId)
                ->orderBy('order_no')
                ->get()
                ->map(function ($chapter) {
                    $chapter->lessons = DB::table('lessons')
                        ->where('chapter_id', $chapter->id)
                        ->orderBy('order_no')
                        ->get()
                        ->map(function ($lesson) {
                            $lesson->blocks = DB::table('content_blocks')
                                ->where('lesson_id', $lesson->id)
                                ->orderBy('order_no')
                                ->get()
                                ->map(fn ($block) => [
                                    ...((array) $block),
                                    'metadata' => $block->metadata ?: '{}',
                                ]);
                            $lesson->quizzes = DB::table('quizzes')
                                ->where('lesson_id', $lesson->id)
                                ->get()
                                ->map(fn ($quiz) => [
                                    ...((array) $quiz),
                                    'questions' => $quiz->questions ?: '[]',
                                ]);

                            return $lesson;
                        });

                    return $chapter;
                }) : collect(),
            'finalQuizzes' => $course ? DB::table('quizzes')
                ->where('course_id', $courseId)
                ->whereNull('lesson_id')
                ->get()
                ->map(fn ($quiz) => [
                    ...((array) $quiz),
                    'questions' => $quiz->questions ?: '[]',
                ]) : collect(),
            'blocks' => DB::table('content_blocks')
                ->join('lessons', 'content_blocks.lesson_id', '=', 'lessons.id')
                ->join('chapters', 'lessons.chapter_id', '=', 'chapters.id')
                ->where('chapters.course_id', $courseId ?: 0)
                ->select('content_blocks.type', 'content_blocks.status', 'content_blocks.metadata')
                ->get()
                ->map(fn ($block) => [
                    'type' => $block->type,
                    'status' => $block->status,
                    'metadata' => json_decode($block->metadata ?: '{}', true),
                ]),
            'statusCounts' => DB::table('content_blocks')
                ->join('lessons', 'content_blocks.lesson_id', '=', 'lessons.id')
                ->join('chapters', 'lessons.chapter_id', '=', 'chapters.id')
                ->where('chapters.course_id', $courseId ?: 0)
                ->select('content_blocks.status', DB::raw('COUNT(*) as total'))
                ->groupBy('content_blocks.status')
                ->pluck('total', 'status'),
        ]);
    }

    public function createBlock(Request $request, Lesson $lesson): Response
    {
        $lesson->load('chapter.course');
        $this->authorizeCourseManager($request, $lesson->chapter->course);

        return Inertia::render('admin/block-form', [
            'routeBase' => $this->managementBasePath($request),
            'block' => null,
            'lesson' => $this->blockLessonPayload($lesson),
            'course' => $this->blockCoursePayload($lesson->chapter->course),
            'backUrl' => $this->courseBuilderUrl($request, $lesson->chapter->course_id),
            'submitUrl' => route($this->managementRoutePrefix($request).'.blocks.store', $lesson),
            'editorUploadUrl' => route($this->managementRoutePrefix($request).'.lessons.editor-media', $lesson),
            'interactiveUploadUrl' => route($this->managementRoutePrefix($request).'.lessons.interactive-media', $lesson),
            'interactiveEditorUrl' => null,
            'nextOrder' => ((int) $lesson->contentBlocks()->max('order_no')) + 1,
        ]);
    }

    public function editBlock(Request $request, ContentBlock $block): Response|RedirectResponse
    {
        $block->load('lesson.chapter.course');
        $this->authorizeCourseManager($request, $block->lesson->chapter->course);

        if ($block->lesson->chapter->course->learning_format === 'interactive' && $block->type === 'interactive') {
            return to_route($this->managementRoutePrefix($request).'.blocks.interactive-editor', $block);
        }

        return Inertia::render('admin/block-form', [
            'routeBase' => $this->managementBasePath($request),
            'block' => [
                'id' => $block->id,
                'type' => $block->type,
                'content' => $block->content,
                'metadata' => $block->type === 'interactive'
                    ? app(InteractiveBlockSchemaService::class)->enrichMediaUrls($block->metadata ?? [])
                    : ($block->metadata ?? []),
                'order_no' => $block->order_no,
                'status' => $block->status,
                'fileUrl' => $this->blockFileUrl($block),
                'fileName' => $this->blockFileName($block),
            ],
            'lesson' => $this->blockLessonPayload($block->lesson),
            'course' => $this->blockCoursePayload($block->lesson->chapter->course),
            'backUrl' => $this->courseBuilderUrl($request, $block->lesson->chapter->course_id),
            'submitUrl' => route($this->managementRoutePrefix($request).'.blocks.update', $block),
            'editorUploadUrl' => route($this->managementRoutePrefix($request).'.lessons.editor-media', $block->lesson),
            'interactiveUploadUrl' => route($this->managementRoutePrefix($request).'.lessons.interactive-media', $block->lesson),
            'interactiveEditorUrl' => $block->type === 'interactive'
                ? route($this->managementRoutePrefix($request).'.blocks.interactive-editor', $block)
                : null,
            'nextOrder' => $block->order_no,
        ]);
    }

    public function interactiveEditor(Request $request, ContentBlock $block): Response
    {
        $block->load('lesson.chapter.course');
        $this->authorizeCourseManager($request, $block->lesson->chapter->course);
        abort_unless($block->type === 'interactive', 404);

        $prefix = $this->managementRoutePrefix($request);
        $schema = app(InteractiveBlockSchemaService::class);

        return Inertia::render('admin/interactive-editor', [
            'routeBase' => $this->managementBasePath($request),
            'block' => [
                'id' => $block->id,
                'type' => $block->type,
                'content' => $block->content,
                'metadata' => $schema->enrichMediaUrls($block->metadata ?? []),
                'status' => $block->status,
                'order_no' => $block->order_no,
                'updatedAt' => $block->updated_at?->toJSON(),
            ],
            'lesson' => $this->blockLessonPayload($block->lesson),
            'course' => $this->blockCoursePayload($block->lesson->chapter->course),
            'backUrl' => $this->courseBuilderUrl($request, $block->lesson->chapter->course_id),
            'blockEditUrl' => route($prefix.'.blocks.edit', $block),
            'autosaveUrl' => route($prefix.'.blocks.interactive-autosave', $block),
            'interactiveUploadUrl' => route($prefix.'.lessons.interactive-media', $block->lesson),
        ]);
    }

    public function coursePreview(Request $request, Course $course): Response
    {
        $this->authorizeCourseManager($request, $course);

        $course->load([
            'chapters.lessons.contentBlocks',
            'chapters.lessons.quizzes',
            'quizzes',
            'prerequisites:id,title',
        ]);

        return Inertia::render('admin/course-preview', [
            'routeBase' => $this->managementBasePath($request),
            'course' => [
                'id' => $course->id,
                'title' => $course->title,
                'description' => $course->description,
                'level' => $course->level,
                'status' => $course->status,
                'accessMode' => $course->access_mode,
                'prerequisites' => $course->prerequisites->pluck('title'),
                'chapters' => $course->chapters->map(fn ($chapter) => [
                    'id' => $chapter->id,
                    'title' => $chapter->title,
                    'orderNo' => $chapter->order_no,
                    'lessons' => $chapter->lessons->map(fn ($lesson) => [
                        'id' => $lesson->id,
                        'title' => $lesson->title,
                        'orderNo' => $lesson->order_no,
                        'blocks' => $lesson->contentBlocks->map(function ($block) {
                            $metadata = $block->type === 'interactive'
                                ? app(InteractiveBlockSchemaService::class)->enrichMediaUrls($block->metadata ?? [])
                                : ($block->metadata ?? []);

                            return [
                                'id' => $block->id,
                                'type' => $block->type,
                                'content' => $this->contentBlockDisplayContent($block->type, $block->content, $metadata),
                                'metadata' => $metadata,
                                'status' => $block->status,
                                'orderNo' => $block->order_no,
                            ];
                        }),
                        'quizzes' => $lesson->quizzes->map(fn ($quiz) => [
                            'id' => $quiz->id,
                            'title' => $quiz->title,
                            'status' => 'quiz',
                            'orderNo' => $quiz->order_no,
                            'passingScore' => $quiz->passing_score,
                            'timeLimitMode' => $quiz->time_limit_mode ?? 'none',
                            'timeLimitSeconds' => $quiz->time_limit_seconds,
                            'questions' => $quiz->questions ?? [],
                        ]),
                    ]),
                ]),
                'finalQuizzes' => $course->quizzes
                    ->whereNull('lesson_id')
                    ->sortBy('order_no')
                    ->values()
                    ->map(fn ($quiz) => [
                        'id' => $quiz->id,
                        'title' => $quiz->title,
                        'status' => 'quiz',
                        'orderNo' => $quiz->order_no,
                        'passingScore' => $quiz->passing_score,
                        'timeLimitMode' => $quiz->time_limit_mode ?? 'none',
                        'timeLimitSeconds' => $quiz->time_limit_seconds,
                        'questions' => $quiz->questions ?? [],
                    ]),
            ],
        ]);
    }

    public function createQuiz(Request $request, Course $course): Response
    {
        $this->authorizeCourseManager($request, $course);
        $lessonId = (int) $request->integer('lesson');

        if ($lessonId > 0) {
            abort_unless($course->lessons()->where('lessons.id', $lessonId)->exists(), 404);
        }

        return Inertia::render('admin/quiz-editor', [
            'course' => $this->quizEditorCourse($course),
            'quiz' => null,
            'selectedLessonId' => $lessonId ?: null,
            'lessons' => $this->quizEditorLessons($course->id),
            'backUrl' => $this->courseBuilderUrl($request, $course->id),
            'routeBase' => $this->managementBasePath($request),
        ]);
    }

    public function editQuiz(Request $request, Quiz $quiz): Response
    {
        $quiz->load('course');
        $this->authorizeCourseManager($request, $quiz->course);

        return Inertia::render('admin/quiz-editor', [
            'course' => $this->quizEditorCourse($quiz->course),
            'quiz' => [
                'id' => $quiz->id,
                'lesson_id' => $quiz->lesson_id,
                'title' => $quiz->title,
                'order_no' => $quiz->order_no,
                'passing_score' => $quiz->passing_score,
                'time_limit_mode' => $quiz->time_limit_mode ?? 'none',
                'time_limit_seconds' => $quiz->time_limit_seconds,
                'is_final_exam' => $quiz->is_final_exam,
                'questions' => $quiz->questions ?? [],
            ],
            'selectedLessonId' => $quiz->lesson_id,
            'lessons' => $this->quizEditorLessons($quiz->course_id),
            'backUrl' => $this->courseBuilderUrl($request, $quiz->course_id),
            'routeBase' => $this->managementBasePath($request),
        ]);
    }

    public function adminCertificates(Request $request, CertificateService $certificateService): Response
    {
        $instructorId = $request->user()->role === 'internal_instructor'
            ? $request->user()->id
            : null;
        $instructorCourseIds = $instructorId
            ? $this->instructorCourseIds($instructorId, $request->user()->school_id)
            : null;
        $eligibleQuery = Enrollment::query()
            ->with(['user:id,name', 'course'])
            ->whereDoesntHave('certificates')
            ->where('progress_percent', 100)
            ->when($instructorCourseIds !== null, fn ($query) => $query->whereIn('course_id', $instructorCourseIds));
        $certificateUsers = $this->certificateUserRows($instructorId, $instructorCourseIds);

        return Inertia::render('admin/certificates', [
            'canManageTemplates' => $request->user()->isAdmin(),
            'template' => DB::table('certificate_templates')->where('status', 'published')->first(),
            'templates' => DB::table('certificate_templates')->orderByDesc('updated_at')->get()->map(fn ($template) => [
                'id' => $template->id,
                'name' => $template->name,
                'status' => $template->status,
                'layout' => json_decode($template->layout ?: '{}', true),
            ]),
            'certificates' => $this->allCertificates($instructorId, $instructorCourseIds),
            'certificateUsers' => $certificateUsers,
            'certificateFilters' => [
                'schools' => $certificateUsers
                    ->filter(fn ($item) => filled($item['school']))
                    ->unique('schoolId')
                    ->map(fn ($item) => ['id' => $item['schoolId'], 'name' => $item['school']])
                    ->values(),
                'courses' => $certificateUsers
                    ->unique('courseId')
                    ->map(fn ($item) => ['id' => $item['courseId'], 'title' => $item['course']])
                    ->values(),
                'statuses' => $certificateUsers
                    ->pluck('statusValue')
                    ->unique()
                    ->values(),
            ],
            'eligibleEnrollments' => $eligibleQuery
                ->get()
                ->filter(fn (Enrollment $enrollment) => $enrollment->user && $enrollment->course && $certificateService->isEligible($enrollment->user, $enrollment))
                ->map(fn (Enrollment $enrollment) => [
                    'id' => $enrollment->id,
                    'student' => $enrollment->user?->name ?? 'User tidak tersedia',
                    'course' => $enrollment->course?->title ?? 'Course tidak tersedia',
                ])
                ->values(),
        ]);
    }

    public function adminReports(Request $request): Response
    {
        return $this->renderReports($request);
    }

    public function adminPayments(CourseBillController $courseBills): Response
    {
        return Inertia::render('admin/payments', [
            ...$courseBills->adminData(),
            'payments' => DB::table('payments')
                ->leftJoin('users', 'payments.user_id', '=', 'users.id')
                ->leftJoin('courses', 'payments.course_id', '=', 'courses.id')
                ->select(
                    'payments.id',
                    'payments.order_id as orderId',
                    'payments.gateway_transaction_id as transactionId',
                    'payments.amount',
                    'payments.status',
                    'payments.payment_method as method',
                    'payments.checkout_url as checkoutUrl',
                    'payments.paid_at as paidAt',
                    'payments.created_at as createdAt',
                    DB::raw("COALESCE(users.name, 'User tidak tersedia') as student"),
                    DB::raw("COALESCE(users.email, '-') as email"),
                    DB::raw("COALESCE(courses.title, 'Course tidak tersedia') as course"),
                )
                ->latest('payments.created_at')
                ->get()
                ->map(fn ($payment) => [
                    ...((array) $payment),
                    'amountLabel' => $this->rupiah((int) $payment->amount),
                ]),
        ]);
    }

    public function roleReports(Request $request): Response
    {
        return $this->renderReports($request);
    }

    private function renderReports(Request $request): Response
    {
        $user = $request->user();
        $courseIds = match ($user->role) {
            'internal_instructor' => DB::table('courses')->where('instructor_id', $user->id)->pluck('id'),
            'school_teacher' => DB::table('enrollments')
                ->join('users', 'enrollments.user_id', '=', 'users.id')
                ->where('users.school_id', $user->school_id)
                ->distinct()
                ->pluck('enrollments.course_id'),
            default => DB::table('courses')->pluck('id'),
        };
        $schoolUserIds = $user->role === 'school_teacher'
            ? DB::table('users')->where('school_id', $user->school_id)->where('role', 'student')->pluck('id')
            : null;
        $paymentQuery = DB::table('payments')
            ->whereIn('course_id', $courseIds)
            ->when($schoolUserIds, fn ($query, $ids) => $query->whereIn('user_id', $ids));
        $payments = $paymentQuery->clone()
            ->select('status', DB::raw('COUNT(*) as total'))
            ->groupBy('status')
            ->pluck('total', 'status');
        $paymentTotal = max(1, $payments->sum());
        $enrollmentQuery = DB::table('enrollments')
            ->whereIn('course_id', $courseIds)
            ->when($schoolUserIds, fn ($query, $ids) => $query->whereIn('user_id', $ids));

        return Inertia::render('admin/reports', [
            'scopeLabel' => match ($user->role) {
                'internal_instructor' => 'Kelas yang Diampu',
                'school_teacher' => 'Sekolah Anda',
                default => 'Global',
            },
            'showRevenue' => $user->role !== 'school_teacher',
            'stats' => [
                'revenue' => $this->rupiah((int) $paymentQuery->clone()->where('status', 'paid')->sum('amount')),
                'enrollments' => $enrollmentQuery->clone()->count(),
                'users' => $user->role === 'admin'
                    ? DB::table('users')->count()
                    : $enrollmentQuery->clone()->distinct('user_id')->count('user_id'),
                'completion' => round($enrollmentQuery->clone()->avg('progress_percent') ?: 0),
                'certificates' => DB::table('certificates')
                    ->join('enrollments', 'certificates.enrollment_id', '=', 'enrollments.id')
                    ->whereIn('enrollments.course_id', $courseIds)
                    ->when($schoolUserIds, fn ($query, $ids) => $query->whereIn('enrollments.user_id', $ids))
                    ->count(),
            ],
            'bars' => DB::table('courses')
                ->leftJoin('enrollments', 'courses.id', '=', 'enrollments.course_id')
                ->whereIn('courses.id', $courseIds)
                ->when($schoolUserIds, fn ($query, $ids) => $query->whereIn('enrollments.user_id', $ids))
                ->select('courses.title', DB::raw('COALESCE(ROUND(AVG(enrollments.progress_percent)), 0) as value'))
                ->groupBy('courses.id', 'courses.title')
                ->get(),
            'paymentStatus' => $payments->map(fn ($count, $status) => [
                'label' => ucfirst($status),
                'value' => round(($count / $paymentTotal) * 100).'%',
                'count' => $count,
            ])->values(),
        ]);
    }

    private function managedSeo(
        string $key,
        string $fallbackTitle,
        string $fallbackDescription,
        string $canonical,
        ?string $image = null,
        string $type = 'website',
        array $jsonLd = [],
    ): array {
        $setting = Schema::hasTable('seo_settings')
            ? SeoSetting::query()->where('key', $key)->where('is_active', true)->first()
            : null;

        $seo = $this->seo(
            $setting?->title ?: $fallbackTitle,
            $setting?->description ?: $fallbackDescription,
            $setting?->canonical_url ?: $canonical,
            $setting?->og_image ?: $image,
            $setting?->type ?: $type,
            $jsonLd,
        );

        if ($setting?->noindex) {
            $seo['noindex'] = true;
        }

        if ($setting?->keywords) {
            $seo['keywords'] = collect($setting->keywords)->filter()->values()->all();
        }

        return $seo;
    }

    private function seo(
        string $title,
        string $description,
        string $canonical,
        ?string $image = null,
        string $type = 'website',
        array $jsonLd = [],
    ): array {
        return [
            'title' => $title,
            'description' => Str::limit($this->descriptionText($description), 170, ''),
            'canonical' => $canonical,
            'image' => $this->absoluteUrl($image ?: asset('logo.png')),
            'type' => $type,
            'jsonLd' => isset($jsonLd['@context']) || isset($jsonLd['@type']) ? [$jsonLd] : $jsonLd,
        ];
    }

    private function quizEditorCourse(Course $course): array
    {
        return [
            'id' => $course->id,
            'title' => $course->title,
            'learningFormat' => $course->learning_format ?? 'guided',
        ];
    }

    private function quizEditorLessons(int $courseId)
    {
        return DB::table('lessons')
            ->join('chapters', 'lessons.chapter_id', '=', 'chapters.id')
            ->where('chapters.course_id', $courseId)
            ->orderBy('chapters.order_no')
            ->orderBy('lessons.order_no')
            ->get([
                'lessons.id',
                'lessons.title',
                'lessons.order_no as orderNo',
                'chapters.title as chapter',
                'chapters.order_no as chapterOrder',
            ]);
    }

    private function courseFormPayload(Request $request, ?Course $course = null): array
    {
        $courseQuery = $this->managedCourseQuery($request);

        return [
            'learningPaths' => $this->managedLearningPathOptions($request),
            'instructors' => DB::table('users')
                ->whereIn('role', ['internal_instructor', 'admin'])
                ->where('status', 'active')
                ->when($request->user()?->role === 'internal_instructor', fn ($query) => $query->where('id', $request->user()->id))
                ->select('id', 'name')
                ->orderBy('name')
                ->get(),
            'certificateTemplates' => DB::table('certificate_templates')
                ->where('status', 'published')
                ->select('id', 'name')
                ->orderBy('name')
                ->get(),
            'prerequisiteOptions' => $courseQuery
                ->when($course, fn ($query) => $query->where('id', '!=', $course->id))
                ->select('id', 'title')
                ->orderBy('title')
                ->get(),
        ];
    }

    private function studentOfflineAttendanceOptions(Request $request)
    {
        $user = $request->user();

        if (! $user->school_id) {
            return collect();
        }

        return DB::table('teaching_schedules')
            ->leftJoin('courses', 'teaching_schedules.course_id', '=', 'courses.id')
            ->join('users as instructors', 'teaching_schedules.instructor_id', '=', 'instructors.id')
            ->leftJoin('teaching_attendances', function ($join) use ($user) {
                $join
                    ->on('teaching_schedules.id', '=', 'teaching_attendances.teaching_schedule_id')
                    ->where('teaching_attendances.student_id', '=', $user->id);
            })
            ->where('teaching_schedules.school_id', $user->school_id)
            ->where('teaching_schedules.mode', 'offline')
            ->where(function ($query) {
                $query
                    ->where(function ($query) {
                        $query
                            ->whereIn('teaching_schedules.status', ['scheduled', 'rescheduled'])
                            ->whereDate('teaching_schedules.starts_at', '>=', now()->subDay()->toDateString())
                            ->whereDate('teaching_schedules.starts_at', '<=', now()->addDays(7)->toDateString());
                    })
                    ->orWhereNotNull('teaching_attendances.id');
            })
            ->select(
                'teaching_schedules.id',
                'teaching_schedules.title',
                'teaching_schedules.starts_at as startsAt',
                'teaching_schedules.ends_at as endsAt',
                'teaching_schedules.location',
                DB::raw("COALESCE(courses.title, 'Umum sekolah') as course"),
                'instructors.name as instructor',
                'teaching_attendances.id as attendanceId',
                'teaching_attendances.status as attendanceStatus',
                'teaching_attendances.source as attendanceSource',
                'teaching_attendances.checked_in_at as checkedInAt',
                'teaching_attendances.late_minutes as lateMinutes',
            )
            ->orderByDesc('teaching_attendances.checked_in_at')
            ->orderBy('teaching_schedules.starts_at')
            ->get()
            ->map(function ($schedule) {
                $status = $this->attendanceStatus($schedule->attendanceStatus);

                return [
                    'id' => $schedule->id,
                    'title' => $schedule->title,
                    'course' => $schedule->course,
                    'instructor' => $schedule->instructor,
                    'location' => $schedule->location,
                    'startsAt' => $schedule->startsAt,
                    'startsAtLabel' => date('d M Y H:i', strtotime($schedule->startsAt)),
                    'endsAtLabel' => date('H:i', strtotime($schedule->endsAt)),
                    'attended' => filled($schedule->attendanceId),
                    'status' => $status,
                    'statusLabel' => $this->attendanceStatusLabel($status),
                    'source' => $schedule->attendanceSource,
                    'checkedInAt' => $schedule->checkedInAt ? date('d M Y H:i', strtotime($schedule->checkedInAt)) : null,
                    'lateMinutes' => (int) ($schedule->lateMinutes ?? 0),
                    'lateLabel' => $status === 'H' ? $this->attendanceLateLabel((int) ($schedule->lateMinutes ?? 0)) : null,
                ];
            });
    }

    private function attendanceStatus(?string $status): ?string
    {
        return match ($status) {
            'H', 'present' => 'H',
            'S' => 'S',
            'I' => 'I',
            'A' => 'A',
            default => null,
        };
    }

    private function attendanceStatusLabel(?string $status): string
    {
        return match ($status) {
            'H' => 'Hadir',
            'S' => 'Sakit',
            'I' => 'Izin',
            'A' => 'Alpa',
            default => 'Belum scan QR',
        };
    }

    private function attendanceLateLabel(int $minutes): string
    {
        if ($minutes <= 0) {
            return 'Tepat waktu';
        }

        $hours = intdiv($minutes, 60);
        $remainingMinutes = $minutes % 60;

        return collect([
            $hours > 0 ? "{$hours} jam" : null,
            $remainingMinutes > 0 ? "{$remainingMinutes} menit" : null,
        ])->filter()->implode(' ');
    }

    private function authorizeCourseManager(Request $request, Course $course): void
    {
        $user = $request->user();

        if (! $user?->isInstructor()) {
            abort(403);
        }

        if ($user->isAdmin()) {
            return;
        }

        abort_unless(in_array($course->id, $this->instructorCourseIds($user->id, $user->school_id), true), 403);
    }

    private function courseCardPayload(Course $course): array
    {
        return [
            'id' => $course->id,
            'title' => $course->title,
            'slug' => $course->slug,
            'description' => $course->description,
            'level' => ucfirst($course->level),
            'priceType' => $course->price_type,
            'price' => (int) $course->price,
            'priceLabel' => (int) $course->price === 0 ? 'Gratis' : $this->rupiah((int) $course->price),
            'detailUrl' => route('products.show', $course->slug ?: 'unknown'),
            'imageUrl' => $this->courseImageUrl($course),
            'status' => $course->price_type === 'free' ? 'Available' : 'Paid',
            'lessons' => (int) ($course->lessons_count ?? 0),
            'duration' => max(1, (int) ($course->lessons_count ?? 0) * 20).' menit',
            'progress' => 0,
            'enrolled' => false,
        ];
    }

    private function courseDetailPayload(Course $course, ?int $userId): array
    {
        $enrollment = $userId
            ? DB::table('enrollments')->where('user_id', $userId)->where('course_id', $course->id)->first()
            : null;
        $schoolAccess = $this->userHasSchoolLearningPathAccess($userId, $course);

        return [
            ...$this->courseCardPayload($course),
            'metaTitle' => $course->meta_title,
            'metaDescription' => $course->meta_description,
            'canonicalUrl' => $course->canonical_url ?: route('products.show', $course->slug ?: 'unknown'),
            'learningPath' => $course->learningPath ? [
                'id' => $course->learningPath->id,
                'title' => $course->learningPath->title,
                'slug' => $course->learningPath->slug,
                'url' => route('learning-paths.show', $course->learningPath->slug ?: 'unknown'),
            ] : null,
            'accessMode' => $course->access_mode,
            'enrolled' => (bool) $enrollment,
            'schoolAccess' => $schoolAccess,
            'progress' => (int) ($enrollment->progress_percent ?? 0),
            'chapters' => DB::table('chapters')
                ->where('course_id', $course->id)
                ->orderBy('order_no')
                ->get()
                ->map(fn ($chapter) => [
                    'id' => $chapter->id,
                    'title' => $chapter->title,
                    'orderNo' => (int) $chapter->order_no,
                    'lessons' => DB::table('lessons')
                        ->where('chapter_id', $chapter->id)
                        ->orderBy('order_no')
                        ->get(['id', 'title', 'order_no'])
                        ->map(fn ($lesson) => [
                            'id' => $lesson->id,
                            'title' => $lesson->title,
                            'orderNo' => (int) $lesson->order_no,
                        ]),
                ]),
        ];
    }

    private function blockLessonPayload(Lesson $lesson): array
    {
        return [
            'id' => $lesson->id,
            'title' => $lesson->title,
            'order_no' => $lesson->order_no,
            'chapter' => [
                'id' => $lesson->chapter->id,
                'title' => $lesson->chapter->title,
            ],
        ];
    }

    private function blockCoursePayload(Course $course): array
    {
        return [
            'id' => $course->id,
            'title' => $course->title,
        ];
    }

    private function blockFileUrl(ContentBlock $block): ?string
    {
        $metadata = $block->metadata ?? [];
        $mediaUploadId = $metadata['media_upload_id'] ?? null;

        if ($block->type === 'image' && filled($block->content)) {
            return $this->absoluteUrl($block->content);
        }

        if ($mediaUploadId) {
            return route('materials.download', $mediaUploadId);
        }

        return filled($block->content) ? $this->absoluteUrl($block->content) : null;
    }

    private function blockFileName(ContentBlock $block): ?string
    {
        $metadata = $block->metadata ?? [];

        if (filled($metadata['original_name'] ?? null)) {
            return $metadata['original_name'];
        }

        if (filled($metadata['label'] ?? null)) {
            return $metadata['label'];
        }

        return $block->content;
    }

    private function contentBlockDisplayContent(string $type, ?string $content, array $metadata = []): ?string
    {
        if (! filled($content)) {
            return $content;
        }

        if ($type === 'image') {
            return $this->absoluteUrl($content);
        }

        if (in_array($type, ['file', 'pdf'], true) && filled($metadata['original_name'] ?? null)) {
            return $metadata['original_name'];
        }

        return $content;
    }

    private function contentBlockSteps(string $type, ?string $content, array $metadata = [])
    {
        $steps = collect($metadata['steps'] ?? [])
            ->filter(fn ($step) => is_array($step) && $this->stepHasReadableContent($step['content'] ?? null))
            ->map(fn (array $step, int $index) => [
                'title' => filled($step['title'] ?? null) ? $step['title'] : 'Step '.($index + 1),
                'content' => (string) ($step['content'] ?? ''),
            ])
            ->values();

        if ($steps->isNotEmpty()) {
            return $steps;
        }

        return collect([
            [
                'title' => 'Step 1',
                'content' => $this->contentBlockDisplayContent($type, $content, $metadata),
            ],
        ]);
    }

    private function hasCustomContentBlockSteps(array $metadata): bool
    {
        return collect($metadata['steps'] ?? [])
            ->contains(fn ($step) => is_array($step) && $this->stepHasReadableContent($step['content'] ?? null));
    }

    private function stepHasReadableContent(mixed $content): bool
    {
        $value = (string) $content;

        return trim(str_replace('&nbsp;', ' ', strip_tags($value))) !== ''
            || preg_match('/<(img|video)\b/i', $value) === 1;
    }

    private function userHasSchoolLearningPathAccess(?int $userId, Course $course): bool
    {
        if (! $userId || ! $course->learning_path_id) {
            return false;
        }

        $schoolId = DB::table('users')
            ->where('id', $userId)
            ->whereIn('role', ['student', 'school_teacher'])
            ->value('school_id');

        if (! $schoolId) {
            return false;
        }

        return DB::table('school_learning_path_accesses')
            ->where('school_id', $schoolId)
            ->where('learning_path_id', $course->learning_path_id)
            ->where('status', 'active')
            ->where(fn ($query) => $query->whereNull('starts_at')->orWhere('starts_at', '<=', now()->toDateString()))
            ->where(fn ($query) => $query->whereNull('expires_at')->orWhere('expires_at', '>=', now()->toDateString()))
            ->exists();
    }

    private function courseImageUrl(object $course): string
    {
        $image = $course->og_image ?? null;

        if (filled($image)) {
            return $this->absoluteUrl($image);
        }

        return asset('logo.png');
    }

    private function absoluteUrl(?string $url): string
    {
        if (! filled($url)) {
            return asset('logo.png');
        }

        if (str_starts_with($url, 'http://') || str_starts_with($url, 'https://')) {
            return $url;
        }

        if (str_starts_with($url, '/')) {
            return url($url);
        }

        return url('/storage/'.ltrim($url, '/'));
    }

    private function descriptionText(?string $description): string
    {
        return trim(preg_replace('/\s+/', ' ', strip_tags((string) $description)));
    }

    private function organizationSchema(): array
    {
        return [
            '@context' => 'https://schema.org',
            '@type' => 'Organization',
            'name' => 'RoboAcademy',
            'url' => route('home'),
            'logo' => asset('logo.png'),
        ];
    }

    private function courseProductSchema(Course $course, string $url, string $image): array
    {
        $schema = [
            '@context' => 'https://schema.org',
            '@type' => 'Product',
            'name' => $course->title,
            'description' => $this->descriptionText($course->description),
            'image' => [$image],
            'sku' => 'COURSE-'.$course->id,
            'brand' => [
                '@type' => 'Brand',
                'name' => 'RoboAcademy',
            ],
            'url' => $url,
        ];

        if ($course->price_type === 'free' || (int) $course->price > 0) {
            $schema['offers'] = [
                '@type' => 'Offer',
                'priceCurrency' => 'IDR',
                'price' => (string) (int) $course->price,
                'availability' => 'https://schema.org/InStock',
                'url' => $url,
            ];
        }

        return $schema;
    }

    private function breadcrumbSchema(array $items): array
    {
        return [
            '@context' => 'https://schema.org',
            '@type' => 'BreadcrumbList',
            'itemListElement' => collect($items)
                ->values()
                ->map(fn (array $item, int $index) => [
                    '@type' => 'ListItem',
                    'position' => $index + 1,
                    'name' => $item['name'],
                    'item' => $item['url'],
                ])
                ->all(),
        ];
    }

    private function learningPathSchema(LearningPath $path, array $courses, string $url): array
    {
        return [
            $this->breadcrumbSchema([
                ['name' => 'Home', 'url' => route('home')],
                ['name' => 'Learning Path', 'url' => route('learning-paths.index')],
                ['name' => $path->title, 'url' => $url],
            ]),
            [
                '@context' => 'https://schema.org',
                '@type' => 'ItemList',
                'name' => $path->title,
                'description' => $this->descriptionText($path->description),
                'url' => $url,
                'itemListElement' => collect($courses)
                    ->values()
                    ->map(fn (array $course, int $index) => [
                        '@type' => 'ListItem',
                        'position' => $index + 1,
                        'name' => $course['title'],
                        'url' => $course['detailUrl'],
                    ])
                    ->all(),
            ],
        ];
    }

    private function publicHomeSections()
    {
        if (! Schema::hasTable('home_page_sections')) {
            return collect();
        }

        return HomePageSection::query()
            ->where('is_visible', true)
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get()
            ->map(fn (HomePageSection $section) => $this->homeSectionPayload($section));
    }

    private function allHomeSections()
    {
        if (! Schema::hasTable('home_page_sections')) {
            return collect();
        }

        return HomePageSection::query()
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get()
            ->map(fn (HomePageSection $section) => $this->homeSectionPayload($section));
    }

    private function homeSectionPayload(HomePageSection $section): array
    {
        return [
            'id' => $section->id,
            'key' => $section->key,
            'name' => $section->name,
            'sectionType' => $section->section_type,
            'eyebrow' => $section->eyebrow,
            'title' => $section->title,
            'subtitle' => $section->subtitle,
            'body' => $section->body,
            'primaryLabel' => $section->primary_label,
            'primaryUrl' => $section->primary_url,
            'secondaryLabel' => $section->secondary_label,
            'secondaryUrl' => $section->secondary_url,
            'imagePath' => $section->image_url,
            'imageUrl' => $this->homeSectionImageUrl($section->image_url),
            'items' => $section->items ?? [],
            'metadata' => $section->metadata ?? [],
            'isVisible' => $section->is_visible,
            'is_visible' => $section->is_visible,
            'sortOrder' => $section->sort_order,
            'sort_order' => $section->sort_order,
            'updatedAt' => optional($section->updated_at)->toDateTimeString(),
        ];
    }

    private function homeSectionImageUrl(?string $imagePath): ?string
    {
        if (! filled($imagePath)) {
            return null;
        }

        $rawImagePath = trim($imagePath);
        $storagePath = $rawImagePath;

        if (str_contains($storagePath, '/storage/')) {
            $storagePath = Str::after($storagePath, '/storage/');
        }

        $storagePath = ltrim($storagePath, '/');

        if (str_starts_with($storagePath, 'storage/')) {
            $storagePath = Str::after($storagePath, 'storage/');
        }

        if (! str_starts_with($storagePath, 'home-page/')) {
            return $rawImagePath;
        }

        return '/storage/'.$storagePath;
    }

    private function courses()
    {
        $userId = auth()->id();

        return DB::table('courses')
            ->leftJoin('chapters', 'courses.id', '=', 'chapters.course_id')
            ->leftJoin('lessons', 'chapters.id', '=', 'lessons.chapter_id')
            ->when($userId, fn ($query) => $query->leftJoin('enrollments', function ($join) use ($userId) {
                $join->on('courses.id', '=', 'enrollments.course_id')->where('enrollments.user_id', '=', $userId);
            }))
            ->select(
                'courses.id',
                'courses.title',
                'courses.slug',
                'courses.description',
                'courses.level',
                'courses.price_type',
                'courses.price',
                'courses.status',
                'courses.og_image',
                DB::raw('COUNT(DISTINCT lessons.id) as lessons'),
                $userId ? DB::raw('COALESCE(MAX(enrollments.progress_percent), 0) as progress') : DB::raw('0 as progress'),
                $userId ? DB::raw('MAX(enrollments.id) as enrollment_id') : DB::raw('NULL as enrollment_id'),
            )
            ->where('courses.status', 'published')
            ->whereNotNull('courses.slug')
            ->where('courses.slug', '!=', '')
            ->groupBy(
                'courses.id',
                'courses.title',
                'courses.slug',
                'courses.description',
                'courses.level',
                'courses.price_type',
                'courses.price',
                'courses.status',
                'courses.og_image',
            )
            ->orderBy('courses.price')
            ->get()
            ->map(fn ($course) => [
                'id' => $course->id,
                'title' => $course->title,
                'slug' => $course->slug,
                'description' => $course->description,
                'level' => ucfirst($course->level),
                'priceType' => $course->price_type,
                'price' => (int) $course->price,
                'priceLabel' => (int) $course->price === 0 ? 'Gratis' : $this->rupiah((int) $course->price),
                'detailUrl' => route('products.show', $course->slug ?: 'unknown'),
                'imageUrl' => $this->courseImageUrl($course),
                'status' => $course->price_type === 'free' ? 'Available' : 'Paid',
                'lessons' => (int) $course->lessons,
                'duration' => max(1, (int) $course->lessons * 20).' menit',
                'progress' => (int) $course->progress,
                'enrolled' => (bool) $course->enrollment_id,
            ]);
    }

    private function enrollmentsForUser(int $userId)
    {
        return DB::table('enrollments')
            ->join('courses', 'enrollments.course_id', '=', 'courses.id')
            ->leftJoin('chapters', 'courses.id', '=', 'chapters.course_id')
            ->leftJoin('lessons', 'chapters.id', '=', 'lessons.chapter_id')
            ->where('enrollments.user_id', $userId)
            ->select(
                'courses.id',
                'courses.title',
                'courses.description',
                'courses.level',
                'courses.price_type',
                'enrollments.status',
                'enrollments.progress_percent as progress',
                DB::raw('COUNT(DISTINCT lessons.id) as lessons'),
            )
            ->groupBy('courses.id', 'courses.title', 'courses.description', 'courses.level', 'courses.price_type', 'enrollments.status', 'enrollments.progress_percent')
            ->get()
            ->map(fn ($course) => [
                'id' => $course->id,
                'title' => $course->title,
                'description' => $course->description,
                'level' => ucfirst($course->level),
                'status' => ucfirst($course->status),
                'priceType' => $course->price_type,
                'progress' => (int) $course->progress,
                'lessons' => (int) $course->lessons,
            ]);
    }

    private function learningCourseCards(int $userId)
    {
        return DB::table('enrollments')
            ->join('courses', 'enrollments.course_id', '=', 'courses.id')
            ->leftJoin('learning_paths', 'courses.learning_path_id', '=', 'learning_paths.id')
            ->leftJoin('chapters', 'courses.id', '=', 'chapters.course_id')
            ->leftJoin('lessons', 'chapters.id', '=', 'lessons.chapter_id')
            ->where('enrollments.user_id', $userId)
            ->whereIn('enrollments.status', ['active', 'completed'])
            ->where('courses.status', 'published')
            ->select(
                'courses.id',
                'courses.title',
                'courses.description',
                'courses.level',
                'courses.access_mode',
                'learning_paths.title as learningPath',
                'enrollments.status',
                'enrollments.progress_percent as progress',
                'enrollments.updated_at as updatedAt',
                DB::raw('COUNT(DISTINCT lessons.id) as lessons'),
            )
            ->groupBy(
                'courses.id',
                'courses.title',
                'courses.description',
                'courses.level',
                'courses.access_mode',
                'learning_paths.title',
                'enrollments.status',
                'enrollments.progress_percent',
                'enrollments.updated_at',
            )
            ->orderByDesc('enrollments.updated_at')
            ->get()
            ->map(function ($course) use ($userId) {
                $nextLesson = $this->nextLessonForCourse((int) $course->id, $userId);

                return [
                    'id' => (int) $course->id,
                    'title' => $course->title,
                    'description' => $course->description,
                    'level' => ucfirst($course->level),
                    'learningPath' => $course->learningPath ?: 'Kelas mandiri',
                    'accessMode' => $course->access_mode,
                    'status' => ucfirst($course->status),
                    'progress' => (int) $course->progress,
                    'lessons' => (int) $course->lessons,
                    'updatedAt' => $course->updatedAt ? date('d M Y H:i', strtotime($course->updatedAt)) : '-',
                    'nextLesson' => $nextLesson,
                    'learningUrl' => route('learning.show', array_filter([
                        'course' => (int) $course->id,
                        'lesson' => $nextLesson['id'] ?? null,
                    ])),
                ];
            });
    }

    private function internalCatalogCourses(Request $request)
    {
        $user = $request->user();
        $userId = $user->id;

        $query = DB::table('courses')
            ->leftJoin('learning_paths', 'courses.learning_path_id', '=', 'learning_paths.id')
            ->leftJoin('chapters', 'courses.id', '=', 'chapters.course_id')
            ->leftJoin('lessons', 'chapters.id', '=', 'lessons.chapter_id')
            ->leftJoin('enrollments', function ($join) use ($userId) {
                $join->on('courses.id', '=', 'enrollments.course_id')
                    ->where('enrollments.user_id', '=', $userId);
            })
            ->where('courses.status', 'published')
            ->select(
                'courses.id',
                'courses.title',
                'courses.slug',
                'courses.description',
                'courses.level',
                'courses.price_type',
                'courses.price',
                'courses.learning_path_id',
                'courses.og_image',
                'learning_paths.title as learningPath',
                DB::raw('COUNT(DISTINCT lessons.id) as lessons'),
                DB::raw('MAX(enrollments.id) as enrollment_id'),
                DB::raw('COALESCE(MAX(enrollments.progress_percent), 0) as progress'),
            )
            ->groupBy(
                'courses.id',
                'courses.title',
                'courses.slug',
                'courses.description',
                'courses.level',
                'courses.price_type',
                'courses.price',
                'courses.learning_path_id',
                'courses.og_image',
                'learning_paths.title',
            );

        if ($user->role === 'school_teacher') {
            $schoolId = $user->school_id;
            $query->whereExists(function ($subQuery) use ($schoolId) {
                $subQuery
                    ->selectRaw('1')
                    ->from('school_learning_path_accesses')
                    ->whereColumn('school_learning_path_accesses.learning_path_id', 'courses.learning_path_id')
                    ->where('school_learning_path_accesses.school_id', $schoolId)
                    ->where('school_learning_path_accesses.status', 'active')
                    ->where(fn ($query) => $query->whereNull('school_learning_path_accesses.starts_at')->orWhere('school_learning_path_accesses.starts_at', '<=', now()->toDateString()))
                    ->where(fn ($query) => $query->whereNull('school_learning_path_accesses.expires_at')->orWhere('school_learning_path_accesses.expires_at', '>=', now()->toDateString()));
            });
        }

        return $query
            ->orderBy('learning_paths.title')
            ->orderBy('courses.title')
            ->get()
            ->map(function ($course) use ($userId) {
                $enrolled = (bool) $course->enrollment_id;
                $schoolAccess = $this->userHasSchoolLearningPathAccess($userId, Course::query()->make([
                    'learning_path_id' => $course->learning_path_id,
                ]));

                return [
                    'id' => (int) $course->id,
                    'title' => $course->title,
                    'slug' => $course->slug,
                    'description' => $course->description,
                    'level' => ucfirst($course->level),
                    'learningPath' => $course->learningPath ?: 'Kelas mandiri',
                    'priceType' => $course->price_type,
                    'priceLabel' => (int) $course->price === 0 ? 'Gratis' : $this->rupiah((int) $course->price),
                    'imageUrl' => $this->courseImageUrl($course),
                    'lessons' => (int) $course->lessons,
                    'progress' => (int) $course->progress,
                    'enrolled' => $enrolled,
                    'schoolAccess' => $schoolAccess,
                    'detailUrl' => route('products.show', $course->slug ?: 'unknown'),
                    'learningUrl' => route('learning.show', ['course' => (int) $course->id]),
                    'enrollUrl' => route('enrollments.store', $course->id),
                ];
            });
    }

    private function nextLessonForCourse(int $courseId, int $userId): ?array
    {
        $completedLessonIds = DB::table('lesson_completions')
            ->where('user_id', $userId)
            ->pluck('lesson_id')
            ->all();

        $lesson = DB::table('lessons')
            ->join('chapters', 'lessons.chapter_id', '=', 'chapters.id')
            ->where('chapters.course_id', $courseId)
            ->whereNotIn('lessons.id', $completedLessonIds)
            ->where(fn ($query) => $query->whereNull('lessons.available_at')->orWhere('lessons.available_at', '<=', now()))
            ->orderBy('chapters.order_no')
            ->orderBy('lessons.order_no')
            ->select('lessons.id', 'lessons.title', 'chapters.title as chapter')
            ->first();

        if (! $lesson) {
            $lesson = DB::table('lessons')
                ->join('chapters', 'lessons.chapter_id', '=', 'chapters.id')
                ->where('chapters.course_id', $courseId)
                ->orderBy('chapters.order_no')
                ->orderBy('lessons.order_no')
                ->select('lessons.id', 'lessons.title', 'chapters.title as chapter')
                ->first();
        }

        return $lesson ? [
            'id' => (int) $lesson->id,
            'title' => $lesson->title,
            'chapter' => $lesson->chapter,
        ] : null;
    }

    private function studentTasks(int $userId, int $limit = 4)
    {
        $courseIds = DB::table('enrollments')->where('user_id', $userId)->pluck('course_id');

        $quizTasks = DB::table('quizzes')
            ->leftJoin('lessons', 'quizzes.lesson_id', '=', 'lessons.id')
            ->join('courses', 'quizzes.course_id', '=', 'courses.id')
            ->whereIn('quizzes.course_id', $courseIds)
            ->whereNotExists(fn ($query) => $query
                ->selectRaw('1')
                ->from('quiz_attempts')
                ->whereColumn('quiz_attempts.quiz_id', 'quizzes.id')
                ->where('quiz_attempts.user_id', $userId)
                ->where('quiz_attempts.passed', true))
            ->select(
                'quizzes.id',
                'quizzes.title',
                'quizzes.course_id',
                'quizzes.lesson_id',
                'quizzes.is_final_exam',
                'courses.title as course',
                'lessons.title as lesson',
            )
            ->limit($limit)
            ->get()
            ->map(fn ($quiz) => [
                'title' => $quiz->title,
                'meta' => ($quiz->is_final_exam ? 'Ujian akhir' : 'Quiz lesson')." · {$quiz->course}".($quiz->lesson ? " · {$quiz->lesson}" : ''),
                'status' => $quiz->is_final_exam ? 'Ujian' : 'Quiz',
                'href' => route('learning.show', array_filter([
                    'course' => (int) $quiz->course_id,
                    'lesson' => $quiz->lesson_id ? (int) $quiz->lesson_id : null,
                ])),
            ]);

        $openSubmissionTasks = DB::table('content_blocks')
            ->join('lessons', 'content_blocks.lesson_id', '=', 'lessons.id')
            ->join('chapters', 'lessons.chapter_id', '=', 'chapters.id')
            ->join('courses', 'chapters.course_id', '=', 'courses.id')
            ->join('enrollments', fn ($join) => $join
                ->on('courses.id', '=', 'enrollments.course_id')
                ->where('enrollments.user_id', '=', $userId)
                ->whereIn('enrollments.status', ['active', 'completed']))
            ->where('content_blocks.type', 'submission')
            ->where('content_blocks.status', 'published')
            ->whereNotExists(fn ($query) => $query
                ->selectRaw('1')
                ->from('submissions')
                ->whereColumn('submissions.enrollment_id', 'enrollments.id')
                ->whereColumn('submissions.lesson_id', 'lessons.id'))
            ->select('content_blocks.id', 'content_blocks.content', 'courses.id as course_id', 'courses.title as course', 'lessons.id as lesson_id', 'lessons.title as lesson')
            ->limit($limit)
            ->get()
            ->map(fn ($block) => [
                'title' => 'Kirim tugas: '.$block->lesson,
                'meta' => $block->course.' · '.($block->content ?: 'Upload bukti pekerjaan sesuai instruksi.'),
                'status' => 'Submission',
                'href' => route('learning.show', ['course' => (int) $block->course_id, 'lesson' => (int) $block->lesson_id]),
            ]);

        $submissionTasks = DB::table('submissions')
            ->join('enrollments', 'submissions.enrollment_id', '=', 'enrollments.id')
            ->join('courses', 'enrollments.course_id', '=', 'courses.id')
            ->leftJoin('lessons', 'submissions.lesson_id', '=', 'lessons.id')
            ->where('enrollments.user_id', $userId)
            ->whereIn('submissions.status', ['submitted', 'revised'])
            ->select('submissions.status', 'submissions.feedback', 'enrollments.course_id', 'courses.title as course', 'lessons.id as lesson_id', 'lessons.title as lesson')
            ->latest('submissions.created_at')
            ->limit($limit)
            ->get()
            ->map(fn ($submission) => [
                'title' => 'Submission proyek: '.ucfirst($submission->status),
                'meta' => ($submission->lesson ?: $submission->course).' · '.($submission->feedback ?: 'Menunggu review pengajar'),
                'status' => 'Submission',
                'href' => route('learning.show', array_filter([
                    'course' => (int) $submission->course_id,
                    'lesson' => $submission->lesson_id ? (int) $submission->lesson_id : null,
                ])),
            ]);

        return $quizTasks
            ->concat($openSubmissionTasks)
            ->concat($submissionTasks)
            ->take($limit)
            ->values();
    }

    private function courseForLearning(int $courseId, int $userId): array
    {
        $enrollmentQuery = DB::table('enrollments')
            ->join('courses', 'enrollments.course_id', '=', 'courses.id')
            ->where('enrollments.user_id', $userId)
            ->whereIn('enrollments.status', ['active', 'completed'])
            ->select('courses.*', 'enrollments.id as enrollment_id', 'enrollments.progress_percent');

        $course = $courseId > 0
            ? $enrollmentQuery->clone()->where('courses.id', $courseId)->first()
            : $enrollmentQuery->clone()->orderByDesc('enrollments.updated_at')->first();

        abort_if(! $course, 403, 'Anda belum memiliki akses aktif ke kursus ini.');

        $progress = (int) $course->progress_percent;
        $completedLessonIds = DB::table('lesson_completions')
            ->where('user_id', $userId)
            ->pluck('lesson_id')
            ->all();
        $previousComplete = true;

        $chapters = DB::table('chapters')
            ->where('course_id', $course->id)
            ->orderBy('order_no')
            ->get()
            ->map(function ($chapter) use (&$previousComplete, $completedLessonIds, $course) {
                $lessons = DB::table('lessons')
                    ->where('chapter_id', $chapter->id)
                    ->orderBy('order_no')
                    ->get()
                    ->map(function ($lesson) use (&$previousComplete, $completedLessonIds, $course) {
                        $completed = in_array($lesson->id, $completedLessonIds, true);
                        $scheduledLocked = $lesson->available_at && now()->isBefore($lesson->available_at);
                        $sequenceLocked = $course->access_mode === 'sequential' && ! $previousComplete;
                        $state = $completed ? 'done' : (($scheduledLocked || $sequenceLocked) ? 'locked' : 'current');

                        if (! $completed) {
                            $previousComplete = false;
                        }

                        return [
                            'id' => $lesson->id,
                            'title' => $lesson->title,
                            'state' => $state,
                        ];
                    });

                return [
                    'id' => $chapter->id,
                    'title' => $chapter->title,
                    'lessons' => $lessons,
                ];
            });

        return [
            'id' => $course->id,
            'title' => $course->title,
            'description' => $course->description,
            'progress' => $progress,
            'accessMode' => $course->access_mode,
            'chapters' => $chapters,
        ];
    }

    private function certificatesForUser(int $userId)
    {
        return DB::table('certificates')
            ->join('enrollments', 'certificates.enrollment_id', '=', 'enrollments.id')
            ->leftJoin('courses', 'enrollments.course_id', '=', 'courses.id')
            ->where('enrollments.user_id', $userId)
            ->select(
                'certificates.id',
                DB::raw("COALESCE(courses.title, 'Course tidak tersedia') as title"),
                'certificates.certificate_no as no',
                'certificates.status',
                'certificates.issued_at as issueDate',
            )
            ->orderByDesc('certificates.issued_at')
            ->get()
            ->map(fn ($certificate) => [
                'id' => $certificate->id,
                'title' => $certificate->title,
                'no' => $certificate->no,
                'status' => ucfirst($certificate->status),
                'issueDate' => $certificate->issueDate ? date('d M Y', strtotime($certificate->issueDate)) : '-',
            ]);
    }

    private function verifiedCertificate(string $code): ?array
    {
        $certificate = DB::table('certificates')
            ->join('enrollments', 'certificates.enrollment_id', '=', 'enrollments.id')
            ->leftJoin('users', 'enrollments.user_id', '=', 'users.id')
            ->leftJoin('courses', 'enrollments.course_id', '=', 'courses.id')
            ->leftJoin('schools', 'users.school_id', '=', 'schools.id')
            ->where(fn ($query) => $query->where('certificates.certificate_no', $code)->orWhere('certificates.qr_token', $code))
            ->select(
                'certificates.id',
                'certificates.certificate_no',
                'certificates.qr_token',
                'certificates.status',
                'certificates.revocation_reason',
                'certificates.issued_at',
                DB::raw("COALESCE(users.name, 'User tidak tersedia') as student"),
                DB::raw("COALESCE(courses.title, 'Course tidak tersedia') as course"),
                'schools.name as school',
            )
            ->first();

        if (! $certificate) {
            return null;
        }

        return [
            'no' => $certificate->certificate_no,
            'status' => ucfirst($certificate->status),
            'student' => $certificate->student,
            'course' => $certificate->course,
            'school' => $certificate->school ?: 'Penerbit Resmi',
            'issueDate' => $certificate->issued_at ? date('d M Y', strtotime($certificate->issued_at)) : '-',
            'qrUrl' => route('certificates.qr', $certificate->id),
            'revocationReason' => $certificate->revocation_reason,
        ];
    }

    private function paymentForUser(int $userId, string $status): ?array
    {
        $payment = DB::table('payments')
            ->leftJoin('courses', 'payments.course_id', '=', 'courses.id')
            ->where('payments.user_id', $userId)
            ->where('payments.status', $status)
            ->select('payments.*', DB::raw("COALESCE(courses.title, 'Course tidak tersedia') as course"))
            ->latest('payments.created_at')
            ->first();

        if (! $payment) {
            return null;
        }

        return [
            'id' => $payment->id,
            'orderId' => $payment->order_id,
            'course' => $payment->course,
            'amount' => (int) $payment->amount,
            'amountLabel' => $this->rupiah((int) $payment->amount),
            'status' => ucfirst($payment->status),
            'method' => $payment->payment_method ? str_replace('_', ' ', ucfirst($payment->payment_method)) : '-',
            'payload' => json_decode($payment->gateway_payload ?: '{}', true),
            'checkoutUrl' => $payment->checkout_url,
        ];
    }

    private function reviewSummary($items): array
    {
        $scored = $items->whereNotNull('score');

        return [
            'submissions' => $items->count(),
            'pending' => $items->whereIn('status', ['submitted', 'revised'])->count(),
            'accepted' => $items->where('status', 'accepted')->count(),
            'averageScore' => $scored->count() > 0 ? round($scored->avg('score')) : 0,
            'students' => $items->pluck('studentId')->unique()->count(),
            'courses' => $items->pluck('courseId')->unique()->count(),
            'schools' => $items->pluck('schoolId')->unique()->count(),
        ];
    }

    private function reviewHierarchy($items)
    {
        return $items
            ->groupBy('trainerId')
            ->map(function ($trainerItems) {
                $first = $trainerItems->first();

                return [
                    ...$this->reviewSummary($trainerItems),
                    'id' => $first['trainerId'],
                    'name' => $first['trainer'],
                    'schoolsList' => $trainerItems
                        ->groupBy('schoolId')
                        ->map(function ($schoolItems) {
                            $first = $schoolItems->first();

                            return [
                                ...$this->reviewSummary($schoolItems),
                                'id' => $first['schoolId'],
                                'name' => $first['school'],
                                'coursesList' => $schoolItems
                                    ->groupBy('courseId')
                                    ->map(function ($courseItems) {
                                        $first = $courseItems->first();

                                        return [
                                            ...$this->reviewSummary($courseItems),
                                            'id' => $first['courseId'],
                                            'title' => $first['course'],
                                            'submissionsList' => $courseItems->values(),
                                        ];
                                    })
                                    ->values(),
                            ];
                        })
                        ->values(),
                ];
            })
            ->values();
    }

    private function schools()
    {
        return DB::table('schools')
            ->leftJoin('users as students', fn ($join) => $join->on('schools.id', '=', 'students.school_id')->where('students.role', '=', 'student'))
            ->leftJoin('users as teachers', fn ($join) => $join->on('schools.id', '=', 'teachers.school_id')->whereIn('teachers.role', ['school_teacher', 'internal_instructor']))
            ->select('schools.id', 'schools.name', 'schools.address', 'schools.pic', 'schools.logo_path', 'schools.status', 'schools.partnered_at', DB::raw('COUNT(DISTINCT students.id) as students'), DB::raw('COUNT(DISTINCT teachers.id) as teachers'))
            ->groupBy('schools.id', 'schools.name', 'schools.address', 'schools.pic', 'schools.logo_path', 'schools.status', 'schools.partnered_at')
            ->orderBy('schools.name')
            ->get()
            ->map(function ($school) {
                $people = DB::table('users')
                    ->where('school_id', $school->id)
                    ->whereIn('role', ['student', 'school_teacher', 'internal_instructor'])
                    ->select('id', 'name', 'email', 'role', 'status')
                    ->orderBy('role')
                    ->orderBy('name')
                    ->get()
                    ->map(fn ($user) => [
                        'id' => $user->id,
                        'name' => $user->name,
                        'email' => $user->email,
                        'role' => $user->role,
                        'roleLabel' => $this->roleLabel($user->role),
                        'status' => $user->status,
                    ]);

                return [
                    'id' => $school->id,
                    'name' => $school->name,
                    'address' => $school->address,
                    'pic' => $school->pic,
                    'logoPath' => $school->logo_path,
                    'logoUrl' => $this->schoolLogoUrl($school->logo_path),
                    'status' => ucfirst($school->status),
                    'statusValue' => $school->status,
                    'partneredAt' => $school->partnered_at,
                    'students' => (int) $school->students,
                    'teachers' => (int) $school->teachers,
                    'studentList' => $people->where('role', 'student')->values(),
                    'teacherList' => $people->whereIn('role', ['school_teacher', 'internal_instructor'])->values(),
                ];
            });
    }

    private function partnerSchools()
    {
        return DB::table('schools')
            ->where('status', 'active')
            ->orderByDesc('partnered_at')
            ->orderBy('name')
            ->limit(12)
            ->get(['id', 'name', 'logo_path', 'partnered_at'])
            ->map(fn ($school) => [
                'id' => $school->id,
                'name' => $school->name,
                'logoUrl' => $this->schoolLogoUrl($school->logo_path),
                'partneredAt' => $school->partnered_at,
            ]);
    }

    private function schoolLogoUrl(?string $logoPath): ?string
    {
        if (! filled($logoPath)) {
            return null;
        }

        $rawLogoPath = trim($logoPath);
        $storagePath = $rawLogoPath;

        if (str_contains($storagePath, '/storage/')) {
            $storagePath = Str::after($storagePath, '/storage/');
        }

        $storagePath = ltrim($storagePath, '/');

        if (str_starts_with($storagePath, 'storage/')) {
            $storagePath = Str::after($storagePath, 'storage/');
        }

        if (str_starts_with($storagePath, 'school-logos/')) {
            return '/storage/'.$storagePath;
        }

        if (str_starts_with($rawLogoPath, 'http://') || str_starts_with($rawLogoPath, 'https://') || str_starts_with($rawLogoPath, '/')) {
            return $rawLogoPath;
        }

        return '/'.$rawLogoPath;
    }

    private function courseOutline(int $courseId)
    {
        return DB::table('chapters')
            ->where('course_id', $courseId)
            ->orderBy('order_no')
            ->get()
            ->flatMap(function ($chapter) {
                $lessons = DB::table('lessons')
                    ->where('chapter_id', $chapter->id)
                    ->orderBy('order_no')
                    ->get()
                    ->map(fn ($lesson) => [
                        'id' => 'lesson-'.$lesson->id,
                        'title' => $chapter->order_no.'.'.$lesson->order_no.' '.$lesson->title,
                        'type' => 'lesson',
                    ]);

                return collect([[
                    'id' => 'chapter-'.$chapter->id,
                    'title' => $chapter->order_no.'. '.$chapter->title,
                    'type' => 'chapter',
                ]])->concat($lessons);
            })
            ->values();
    }

    private function allCertificates(?int $instructorId = null, ?array $courseIds = null)
    {
        return DB::table('certificates')
            ->join('enrollments', 'certificates.enrollment_id', '=', 'enrollments.id')
            ->leftJoin('users', 'enrollments.user_id', '=', 'users.id')
            ->leftJoin('courses', 'enrollments.course_id', '=', 'courses.id')
            ->when($courseIds !== null, fn ($query) => $query->whereIn('courses.id', $courseIds))
            ->when($courseIds === null && $instructorId, fn ($query, int $id) => $query->where('courses.instructor_id', $id))
            ->select(
                'certificates.id',
                'certificates.certificate_no as no',
                'certificates.status',
                'certificates.issued_at as issueDate',
                'certificates.revocation_reason as revocationReason',
                DB::raw("COALESCE(users.name, 'User tidak tersedia') as student"),
                DB::raw("COALESCE(courses.title, 'Course tidak tersedia') as title"),
            )
            ->orderByDesc('certificates.issued_at')
            ->get()
            ->map(fn ($certificate) => [
                'id' => $certificate->id,
                'no' => $certificate->no,
                'status' => ucfirst($certificate->status),
                'issueDate' => $certificate->issueDate ? date('d M Y', strtotime($certificate->issueDate)) : '-',
                'student' => $certificate->student,
                'title' => $certificate->title,
                'revocationReason' => $certificate->revocationReason,
            ]);
    }

    private function certificateUserRows(?int $instructorId = null, ?array $courseIds = null)
    {
        return DB::table('certificates')
            ->join('enrollments', 'certificates.enrollment_id', '=', 'enrollments.id')
            ->leftJoin('users', 'enrollments.user_id', '=', 'users.id')
            ->leftJoin('schools', 'users.school_id', '=', 'schools.id')
            ->leftJoin('courses', 'enrollments.course_id', '=', 'courses.id')
            ->when($courseIds !== null, fn ($query) => $query->whereIn('courses.id', $courseIds))
            ->when($courseIds === null && $instructorId, fn ($query, int $id) => $query->where('courses.instructor_id', $id))
            ->select(
                'certificates.id',
                'certificates.certificate_no as no',
                'certificates.status',
                'certificates.issued_at as issueDate',
                'certificates.revocation_reason as revocationReason',
                'users.id as userId',
                DB::raw("COALESCE(users.name, 'User tidak tersedia') as student"),
                DB::raw("COALESCE(users.email, '-') as email"),
                'schools.id as schoolId',
                'schools.name as school',
                'courses.id as courseId',
                DB::raw("COALESCE(courses.title, 'Course tidak tersedia') as course"),
                'enrollments.progress_percent as progress',
            )
            ->orderByDesc('certificates.issued_at')
            ->get()
            ->map(fn ($certificate) => [
                'id' => $certificate->id,
                'no' => $certificate->no,
                'status' => ucfirst($certificate->status),
                'statusValue' => $certificate->status,
                'issueDate' => $certificate->issueDate ? date('d M Y', strtotime($certificate->issueDate)) : '-',
                'userId' => $certificate->userId,
                'student' => $certificate->student,
                'email' => $certificate->email,
                'schoolId' => $certificate->schoolId ?: 0,
                'school' => $certificate->school ?: 'Tanpa sekolah',
                'courseId' => $certificate->courseId,
                'course' => $certificate->course,
                'progress' => (int) $certificate->progress,
                'revocationReason' => $certificate->revocationReason,
            ]);
    }

    private function managementRoutePrefix(Request $request): string
    {
        return $request->user()?->role === 'internal_instructor' ? 'instructor' : 'admin';
    }

    private function managementBasePath(Request $request): string
    {
        return '/'.$this->managementRoutePrefix($request);
    }

    private function courseBuilderUrl(Request $request, ?int $courseId = null): string
    {
        $parameters = $courseId ? ['course' => $courseId] : [];

        return route($this->managementRoutePrefix($request).'.course-builder', $parameters);
    }

    private function managedCourseQuery(Request $request)
    {
        $query = DB::table('courses');

        if ($request->user()?->role === 'internal_instructor') {
            $query->whereIn('id', $this->instructorCourseIds($request->user()->id, $request->user()->school_id));
        }

        return $query;
    }

    private function managedLearningPathOptions(Request $request)
    {
        return DB::table('learning_paths')
            ->when($request->user()?->role === 'internal_instructor', function ($query) use ($request) {
                $visiblePathIds = $this->visibleLearningPathIdsForInstructor($request->user()->id, $request->user()->school_id);

                $query->where(function ($query) use ($request, $visiblePathIds) {
                    $query->where('created_by', $request->user()->id);

                    if ($visiblePathIds !== []) {
                        $query->orWhereIn('id', $visiblePathIds);
                    }
                });
            })
            ->select('id', 'title')
            ->orderBy('title')
            ->get();
    }

    private function visibleLearningPathIdsForInstructor(int $instructorId, ?int $fallbackSchoolId = null): array
    {
        return DB::table('courses')
            ->whereIn('id', $this->instructorCourseIds($instructorId, $fallbackSchoolId))
            ->whereNotNull('learning_path_id')
            ->pluck('learning_path_id')
            ->filter()
            ->unique()
            ->values()
            ->all();
    }

    private function instructorCourseIds(int $instructorId, ?int $fallbackSchoolId = null): array
    {
        $schoolIds = $this->instructorSchoolIds($instructorId, $fallbackSchoolId);

        return DB::table('courses')
            ->where('instructor_id', $instructorId)
            ->pluck('id')
            ->merge(DB::table('teaching_schedules')->where('instructor_id', $instructorId)->pluck('course_id'))
            ->merge(DB::table('teaching_sessions')->where('instructor_id', $instructorId)->pluck('course_id'))
            ->merge($this->activeSchoolLearningPathCourseIds($schoolIds))
            ->filter()
            ->unique()
            ->values()
            ->all();
    }

    private function activeSchoolLearningPathCourseIds(array $schoolIds)
    {
        if ($schoolIds === []) {
            return collect();
        }

        return DB::table('courses')
            ->join('school_learning_path_accesses', 'courses.learning_path_id', '=', 'school_learning_path_accesses.learning_path_id')
            ->whereIn('school_learning_path_accesses.school_id', $schoolIds)
            ->where('school_learning_path_accesses.status', 'active')
            ->where(fn ($query) => $query->whereNull('school_learning_path_accesses.starts_at')->orWhere('school_learning_path_accesses.starts_at', '<=', now()->toDateString()))
            ->where(fn ($query) => $query->whereNull('school_learning_path_accesses.expires_at')->orWhere('school_learning_path_accesses.expires_at', '>=', now()->toDateString()))
            ->pluck('courses.id');
    }

    private function instructorStudentIds(int $instructorId, array $courseIds, array $schoolIds): array
    {
        return DB::table('enrollments')
            ->whereIn('course_id', $courseIds)
            ->pluck('user_id')
            ->merge(DB::table('users')
                ->where('role', 'student')
                ->whereIn('school_id', $schoolIds)
                ->pluck('id'))
            ->merge(DB::table('teaching_attendances')
                ->join('teaching_schedules', 'teaching_attendances.teaching_schedule_id', '=', 'teaching_schedules.id')
                ->where('teaching_schedules.instructor_id', $instructorId)
                ->pluck('teaching_attendances.student_id'))
            ->filter()
            ->unique()
            ->values()
            ->all();
    }

    private function instructorStudentIdsForCourse(int $instructorId, int $courseId, ?int $learningPathId, array $schoolIds): array
    {
        $courseSchoolIds = DB::table('teaching_schedules')
            ->where('instructor_id', $instructorId)
            ->where('course_id', $courseId)
            ->pluck('school_id')
            ->merge(DB::table('teaching_sessions')
                ->where('instructor_id', $instructorId)
                ->where('course_id', $courseId)
                ->pluck('school_id'));

        if ($learningPathId && $schoolIds !== []) {
            $courseSchoolIds = $courseSchoolIds->merge(DB::table('school_learning_path_accesses')
                ->whereIn('school_id', $schoolIds)
                ->where('learning_path_id', $learningPathId)
                ->where('status', 'active')
                ->where(fn ($query) => $query->whereNull('starts_at')->orWhere('starts_at', '<=', now()->toDateString()))
                ->where(fn ($query) => $query->whereNull('expires_at')->orWhere('expires_at', '>=', now()->toDateString()))
                ->pluck('school_id'));
        }

        $courseSchoolIds = $courseSchoolIds->filter()->unique()->values()->all();

        return DB::table('enrollments')
            ->where('course_id', $courseId)
            ->pluck('user_id')
            ->merge(DB::table('users')
                ->where('role', 'student')
                ->whereIn('school_id', $courseSchoolIds)
                ->pluck('id'))
            ->merge(DB::table('teaching_attendances')
                ->join('teaching_schedules', 'teaching_attendances.teaching_schedule_id', '=', 'teaching_schedules.id')
                ->where('teaching_schedules.instructor_id', $instructorId)
                ->where('teaching_schedules.course_id', $courseId)
                ->pluck('teaching_attendances.student_id'))
            ->filter()
            ->unique()
            ->values()
            ->all();
    }

    private function instructorSchoolIds(int $instructorId, ?int $fallbackSchoolId = null): array
    {
        $schoolIds = DB::table('teaching_schedules')
            ->where('instructor_id', $instructorId)
            ->pluck('school_id')
            ->merge(DB::table('teaching_sessions')->where('instructor_id', $instructorId)->pluck('school_id'));

        if ($fallbackSchoolId) {
            $schoolIds->push($fallbackSchoolId);
        }

        return $schoolIds
            ->filter()
            ->unique()
            ->values()
            ->all();
    }

    private function rupiah(int $amount): string
    {
        return 'Rp '.number_format($amount, 0, ',', '.');
    }

    private function roleLabel(string $role): string
    {
        return match ($role) {
            'admin' => 'Admin Pusat',
            'internal_instructor' => 'Pengajar Internal',
            'school_teacher' => 'Guru Sekolah',
            'student' => 'Siswa',
            default => ucfirst(str_replace('_', ' ', $role)),
        };
    }
}
