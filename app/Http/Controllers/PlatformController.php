<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class PlatformController extends Controller
{
    public function home(): Response
    {
        return Inertia::render('welcome', [
            'courses' => $this->courses(),
            'stats' => [
                'students' => DB::table('users')->where('role', 'student')->count(),
                'courses' => DB::table('courses')->where('status', 'published')->count(),
                'certificates' => DB::table('certificates')->where('status', 'issued')->count(),
            ],
        ]);
    }

    public function catalog(): Response
    {
        return Inertia::render('courses/catalog', [
            'courses' => $this->courses(),
        ]);
    }

    public function roleDashboard(Request $request): RedirectResponse
    {
        return match ($request->user()->role) {
            'admin' => to_route('admin.reports'),
            'internal_instructor' => to_route('admin.course-builder'),
            'school_teacher' => to_route('teacher.dashboard'),
            default => to_route('student.dashboard'),
        };
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
                'quizPending' => DB::table('quizzes')->whereIn('course_id', $enrollments->pluck('id'))->count(),
                'certificates' => DB::table('certificates')
                    ->join('enrollments', 'certificates.enrollment_id', '=', 'enrollments.id')
                    ->where('enrollments.user_id', $userId)
                    ->count(),
            ],
            'currentCourse' => $current,
            'courses' => $enrollments->values(),
            'tasks' => $this->studentTasks($userId),
        ]);
    }

    public function learning(Request $request): Response
    {
        $courseId = (int) $request->integer('course');
        $userId = $request->user()->id;

        $course = $this->courseForLearning($courseId, $userId);
        $lesson = collect($course['chapters'])
            ->flatMap(fn (array $chapter) => $chapter['lessons'])
            ->firstWhere('state', 'current')
            ?? collect($course['chapters'])->flatMap(fn (array $chapter) => $chapter['lessons'])->first();

        $blocks = $lesson
            ? DB::table('content_blocks')
                ->where('lesson_id', $lesson['id'])
                ->orderBy('order_no')
                ->get()
                ->map(fn ($block) => [
                    'id' => $block->id,
                    'type' => $block->type,
                    'content' => $block->content,
                    'metadata' => json_decode($block->metadata ?: '{}', true),
                    'status' => $block->status,
                ])
                ->values()
            : collect();

        $quiz = $lesson
            ? DB::table('quizzes')
                ->where('lesson_id', $lesson['id'])
                ->select('id', 'title', 'passing_score as passingScore')
                ->first()
            : null;

        return Inertia::render('student/learning', [
            'course' => $course,
            'currentLesson' => $lesson,
            'blocks' => $blocks,
            'quiz' => $quiz,
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
            'credential' => $code,
            'certificate' => $code === '' ? null : $this->verifiedCertificate($code),
        ]);
    }

    public function checkout(Request $request): Response
    {
        $course = DB::table('courses')
            ->where('price_type', 'paid')
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
            ],
            'summary' => [
                'originalPrice' => $this->rupiah($course->price + 250000),
                'discount' => '-'.$this->rupiah(250000),
                'tax' => $this->rupiah(0),
                'total' => $this->rupiah($course->price),
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

    public function teacherDashboard(Request $request): Response
    {
        $schoolId = $request->user()->school_id;
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
                'status' => (int) $student->progress >= 70 ? 'On Track' : 'Needs Review',
            ]);

        $school = DB::table('schools')->find($schoolId);

        return Inertia::render('teacher/dashboard', [
            'school' => $school,
            'stats' => [
                'students' => $students->count(),
                'averageProgress' => round($students->avg('progress') ?: 0),
                'activeClasses' => DB::table('courses')->where('status', 'published')->count(),
                'certificates' => DB::table('certificates')
                    ->join('enrollments', 'certificates.enrollment_id', '=', 'enrollments.id')
                    ->join('users', 'enrollments.user_id', '=', 'users.id')
                    ->where('users.school_id', $schoolId)
                    ->count(),
            ],
            'students' => $students,
            'reviewItems' => DB::table('submissions')
                ->join('enrollments', 'submissions.enrollment_id', '=', 'enrollments.id')
                ->join('users', 'enrollments.user_id', '=', 'users.id')
                ->join('courses', 'enrollments.course_id', '=', 'courses.id')
                ->where('users.school_id', $schoolId)
                ->select('submissions.status', 'users.name as student', 'courses.title as course')
                ->latest('submissions.created_at')
                ->limit(5)
                ->get(),
        ]);
    }

    public function adminSchools(): Response
    {
        $schools = $this->schools();

        return Inertia::render('admin/schools', [
            'stats' => [
                'totalSchools' => $schools->count(),
                'activePartners' => $schools->where('status', 'active')->count(),
                'totalStudents' => $schools->sum('students'),
                'totalTeachers' => $schools->sum('teachers'),
            ],
            'schools' => $schools->values(),
        ]);
    }

    public function adminSchoolDetail(Request $request): Response
    {
        $schoolId = (int) $request->integer('school', DB::table('schools')->value('id'));
        $school = $this->schools()->firstWhere('id', $schoolId) ?? $this->schools()->first();

        return Inertia::render('admin/school-detail', [
            'school' => $school,
            'programs' => DB::table('courses')
                ->leftJoin('enrollments', 'courses.id', '=', 'enrollments.course_id')
                ->select('courses.title', DB::raw('COALESCE(ROUND(AVG(enrollments.progress_percent)), 0) as progress'))
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
                ->select('users.name', 'users.email', 'users.role', 'users.status', 'schools.name as school')
                ->orderBy('users.role')
                ->orderBy('users.name')
                ->get()
                ->map(fn ($user) => [
                    'name' => $user->name,
                    'email' => $user->email,
                    'role' => $this->roleLabel($user->role),
                    'status' => ucfirst($user->status),
                    'school' => $user->school ?: '-',
                ]),
            'stats' => [
                'total' => DB::table('users')->count(),
                'students' => DB::table('users')->where('role', 'student')->count(),
                'teachers' => DB::table('users')->whereIn('role', ['school_teacher', 'internal_instructor'])->count(),
                'admins' => DB::table('users')->where('role', 'admin')->count(),
            ],
        ]);
    }

    public function courseBuilder(Request $request): Response
    {
        $courseId = (int) $request->integer('course', DB::table('courses')->where('price_type', 'paid')->value('id'));
        $course = DB::table('courses')->find($courseId);

        return Inertia::render('admin/course-builder', [
            'course' => $course,
            'outline' => $this->courseOutline($courseId),
            'blocks' => DB::table('content_blocks')
                ->join('lessons', 'content_blocks.lesson_id', '=', 'lessons.id')
                ->join('chapters', 'lessons.chapter_id', '=', 'chapters.id')
                ->where('chapters.course_id', $courseId)
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
                ->where('chapters.course_id', $courseId)
                ->select('content_blocks.status', DB::raw('COUNT(*) as total'))
                ->groupBy('content_blocks.status')
                ->pluck('total', 'status'),
        ]);
    }

    public function adminCertificates(): Response
    {
        return Inertia::render('admin/certificates', [
            'template' => DB::table('certificate_templates')->where('status', 'published')->first(),
            'certificates' => $this->allCertificates(),
        ]);
    }

    public function adminReports(): Response
    {
        $payments = DB::table('payments')->select('status', DB::raw('COUNT(*) as total'))->groupBy('status')->pluck('total', 'status');
        $paymentTotal = max(1, $payments->sum());

        return Inertia::render('admin/reports', [
            'stats' => [
                'revenue' => $this->rupiah((int) DB::table('payments')->where('status', 'paid')->sum('amount')),
                'users' => DB::table('users')->count(),
                'completion' => round(DB::table('enrollments')->avg('progress_percent') ?: 0),
                'certificates' => DB::table('certificates')->count(),
            ],
            'bars' => DB::table('courses')
                ->leftJoin('enrollments', 'courses.id', '=', 'enrollments.course_id')
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
                'courses.description',
                'courses.level',
                'courses.price_type',
                'courses.price',
                'courses.status',
                DB::raw('COUNT(DISTINCT lessons.id) as lessons'),
                $userId ? DB::raw('COALESCE(MAX(enrollments.progress_percent), 0) as progress') : DB::raw('0 as progress'),
            )
            ->where('courses.status', 'published')
            ->groupBy('courses.id', 'courses.title', 'courses.description', 'courses.level', 'courses.price_type', 'courses.price', 'courses.status')
            ->orderBy('courses.price')
            ->get()
            ->map(fn ($course) => [
                'id' => $course->id,
                'title' => $course->title,
                'description' => $course->description,
                'level' => ucfirst($course->level),
                'priceType' => $course->price_type,
                'price' => (int) $course->price,
                'priceLabel' => (int) $course->price === 0 ? 'Gratis' : $this->rupiah((int) $course->price),
                'status' => $course->price_type === 'free' ? 'Available' : 'Paid',
                'lessons' => (int) $course->lessons,
                'duration' => max(1, (int) $course->lessons * 20).' menit',
                'progress' => (int) $course->progress,
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

    private function studentTasks(int $userId)
    {
        $courseIds = DB::table('enrollments')->where('user_id', $userId)->pluck('course_id');

        $quizTasks = DB::table('quizzes')
            ->whereIn('course_id', $courseIds)
            ->limit(2)
            ->get()
            ->map(fn ($quiz) => [
                'title' => $quiz->title,
                'meta' => $quiz->is_final_exam ? 'Ujian akhir untuk sertifikat' : 'Quiz dalam lesson',
                'status' => $quiz->is_final_exam ? 'Ujian' : 'Quiz',
            ]);

        $submissionTasks = DB::table('submissions')
            ->join('enrollments', 'submissions.enrollment_id', '=', 'enrollments.id')
            ->where('enrollments.user_id', $userId)
            ->limit(2)
            ->get()
            ->map(fn ($submission) => [
                'title' => 'Submission proyek: '.ucfirst($submission->status),
                'meta' => $submission->feedback ?: 'Menunggu review pengajar',
                'status' => 'Submission',
            ]);

        return $quizTasks->concat($submissionTasks)->values();
    }

    private function courseForLearning(int $courseId, int $userId): array
    {
        $course = DB::table('courses')
            ->when($courseId > 0, fn ($query) => $query->where('id', $courseId))
            ->whereExists(fn ($query) => $query->select(DB::raw(1))
                ->from('enrollments')
                ->whereColumn('enrollments.course_id', 'courses.id')
                ->where('enrollments.user_id', $userId))
            ->orderBy('price')
            ->first();

        if (! $course) {
            $course = DB::table('courses')->where('status', 'published')->orderBy('price')->first();
        }

        abort_if(! $course, 404);

        $progress = (int) DB::table('enrollments')
            ->where('course_id', $course->id)
            ->where('user_id', $userId)
            ->value('progress_percent');

        $lessonCounter = 0;
        $currentThreshold = max(1, (int) floor(($progress / 100) * max(1, DB::table('lessons')
            ->join('chapters', 'lessons.chapter_id', '=', 'chapters.id')
            ->where('chapters.course_id', $course->id)
            ->count())));

        $chapters = DB::table('chapters')
            ->where('course_id', $course->id)
            ->orderBy('order_no')
            ->get()
            ->map(function ($chapter) use (&$lessonCounter, $currentThreshold) {
                $lessons = DB::table('lessons')
                    ->where('chapter_id', $chapter->id)
                    ->orderBy('order_no')
                    ->get()
                    ->map(function ($lesson) use (&$lessonCounter, $currentThreshold) {
                        $lessonCounter++;

                        return [
                            'id' => $lesson->id,
                            'title' => $lesson->title,
                            'state' => $lessonCounter < $currentThreshold ? 'done' : ($lessonCounter === $currentThreshold ? 'current' : 'locked'),
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
            ->join('courses', 'enrollments.course_id', '=', 'courses.id')
            ->where('enrollments.user_id', $userId)
            ->select('courses.title', 'certificates.certificate_no as no', 'certificates.status', 'certificates.issued_at as issueDate')
            ->orderByDesc('certificates.issued_at')
            ->get()
            ->map(fn ($certificate) => [
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
            ->join('users', 'enrollments.user_id', '=', 'users.id')
            ->join('courses', 'enrollments.course_id', '=', 'courses.id')
            ->leftJoin('schools', 'users.school_id', '=', 'schools.id')
            ->where(fn ($query) => $query->where('certificates.certificate_no', $code)->orWhere('certificates.qr_token', $code))
            ->select(
                'certificates.certificate_no',
                'certificates.status',
                'certificates.issued_at',
                'users.name as student',
                'courses.title as course',
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
            'school' => $certificate->school ?: 'Ngawitekno',
            'issueDate' => $certificate->issued_at ? date('d M Y', strtotime($certificate->issued_at)) : '-',
        ];
    }

    private function paymentForUser(int $userId, string $status): ?array
    {
        $payment = DB::table('payments')
            ->join('courses', 'payments.course_id', '=', 'courses.id')
            ->where('payments.user_id', $userId)
            ->where('payments.status', $status)
            ->select('payments.*', 'courses.title as course')
            ->latest('payments.created_at')
            ->first();

        if (! $payment) {
            return null;
        }

        return [
            'orderId' => $payment->order_id,
            'course' => $payment->course,
            'amount' => (int) $payment->amount,
            'amountLabel' => $this->rupiah((int) $payment->amount),
            'status' => ucfirst($payment->status),
            'method' => $payment->payment_method ? str_replace('_', ' ', ucfirst($payment->payment_method)) : '-',
            'payload' => json_decode($payment->gateway_payload ?: '{}', true),
        ];
    }

    private function schools()
    {
        return DB::table('schools')
            ->leftJoin('users as students', fn ($join) => $join->on('schools.id', '=', 'students.school_id')->where('students.role', '=', 'student'))
            ->leftJoin('users as teachers', fn ($join) => $join->on('schools.id', '=', 'teachers.school_id')->whereIn('teachers.role', ['school_teacher', 'internal_instructor']))
            ->select('schools.id', 'schools.name', 'schools.address', 'schools.pic', 'schools.status', DB::raw('COUNT(DISTINCT students.id) as students'), DB::raw('COUNT(DISTINCT teachers.id) as teachers'))
            ->groupBy('schools.id', 'schools.name', 'schools.address', 'schools.pic', 'schools.status')
            ->orderBy('schools.name')
            ->get()
            ->map(fn ($school) => [
                'id' => $school->id,
                'name' => $school->name,
                'address' => $school->address,
                'pic' => $school->pic,
                'status' => ucfirst($school->status),
                'students' => (int) $school->students,
                'teachers' => (int) $school->teachers,
            ]);
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

    private function allCertificates()
    {
        return DB::table('certificates')
            ->join('enrollments', 'certificates.enrollment_id', '=', 'enrollments.id')
            ->join('users', 'enrollments.user_id', '=', 'users.id')
            ->join('courses', 'enrollments.course_id', '=', 'courses.id')
            ->select('certificates.certificate_no as no', 'certificates.status', 'certificates.issued_at as issueDate', 'users.name as student', 'courses.title')
            ->orderByDesc('certificates.issued_at')
            ->get()
            ->map(fn ($certificate) => [
                'no' => $certificate->no,
                'status' => ucfirst($certificate->status),
                'issueDate' => $certificate->issueDate ? date('d M Y', strtotime($certificate->issueDate)) : '-',
                'student' => $certificate->student,
                'title' => $certificate->title,
            ]);
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
