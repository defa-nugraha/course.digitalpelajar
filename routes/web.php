<?php

use App\Http\Controllers\Admin\CertificateManagementController;
use App\Http\Controllers\Admin\CertificateTemplateController;
use App\Http\Controllers\Admin\CourseController;
use App\Http\Controllers\Admin\CurriculumController;
use App\Http\Controllers\Admin\FooterSettingController;
use App\Http\Controllers\Admin\HomePageSectionController;
use App\Http\Controllers\Admin\LearningPathController;
use App\Http\Controllers\Admin\SchoolController;
use App\Http\Controllers\Admin\SchoolLearningPathAccessController;
use App\Http\Controllers\Admin\SeoSettingController;
use App\Http\Controllers\Admin\StoreController;
use App\Http\Controllers\Admin\UserController;
use App\Http\Controllers\Admin\UserImportController;
use App\Http\Controllers\CertificateController;
use App\Http\Controllers\CourseBillController;
use App\Http\Controllers\EnrollmentController;
use App\Http\Controllers\ForumController;
use App\Http\Controllers\InstructorPayrollController;
use App\Http\Controllers\LearningActionController;
use App\Http\Controllers\MaterialController;
use App\Http\Controllers\PaymentController;
use App\Http\Controllers\PlatformController;
use App\Http\Controllers\StorefrontController;
use App\Http\Controllers\StudentTeachingAttendanceController;
use App\Http\Controllers\SubmissionFileController;
use App\Http\Controllers\Teacher\StudentProgressNoteController;
use App\Http\Controllers\TeachingAttendanceController;
use App\Http\Controllers\TeachingFeedbackController;
use App\Http\Controllers\TeachingScheduleController;
use App\Http\Controllers\TeachingSessionController;
use Illuminate\Support\Facades\Route;

Route::get('/', [PlatformController::class, 'home'])->name('home');

Route::permanentRedirect('course', '/courses')->name('course.index');
Route::get('courses', [PlatformController::class, 'catalog'])->name('courses.index');
Route::get('courses/{course:slug}', [PlatformController::class, 'redirectCourseDetail'])->name('courses.show');
Route::get('learning-paths', [PlatformController::class, 'learningPaths'])->name('learning-paths.index');
Route::get('learning-paths/{learningPath:slug}', [PlatformController::class, 'learningPathDetail'])->name('learning-paths.show');
Route::get('produk/{course:slug}', [PlatformController::class, 'courseDetail'])->name('products.show');
Route::get('store', [StorefrontController::class, 'catalog'])->name('store.index');
Route::get('store/products/{product:slug}', [StorefrontController::class, 'show'])->name('store.products.show');

Route::get('sitemap.xml', [PlatformController::class, 'sitemap'])->name('sitemap');
Route::get('robots.txt', [PlatformController::class, 'robots'])->name('robots');
Route::get('certificates/verify', [PlatformController::class, 'verifyCertificate'])->name('certificates.verify');
Route::get('certificates/{certificate}/qr', [CertificateController::class, 'qr'])->name('certificates.qr');
Route::post('payments/midtrans/notification', [PaymentController::class, 'notification'])->name('payments.notification');

Route::middleware(['auth'])->group(function () {
    Route::get('dashboard', [PlatformController::class, 'roleDashboard'])->name('dashboard');
    Route::get('materials/{mediaUpload}/download', [MaterialController::class, 'download'])->name('materials.download');
    Route::get('materials/{mediaUpload}/view', [MaterialController::class, 'view'])->name('materials.view');
    Route::get('certificates/{certificate}', [CertificateController::class, 'show'])->name('certificates.show');
    Route::get('certificates/{certificate}/download', [CertificateController::class, 'download'])->name('certificates.download');
    Route::get('courses/{course}/forum', [ForumController::class, 'index'])->name('forum.index');
    Route::post('courses/{course}/forum', [ForumController::class, 'store'])->name('forum.store');
    Route::patch('forum/threads/{thread}', [ForumController::class, 'update'])->name('forum.threads.update');
    Route::delete('forum/threads/{thread}', [ForumController::class, 'destroy'])->name('forum.threads.destroy');
    Route::post('forum/threads/{thread}/posts', [ForumController::class, 'storePost'])->name('forum.posts.store');
    Route::patch('forum/posts/{post}', [ForumController::class, 'updatePost'])->name('forum.posts.update');
    Route::delete('forum/posts/{post}', [ForumController::class, 'destroyPost'])->name('forum.posts.destroy');
    Route::get('submissions/{submission}/files/{field}', [SubmissionFileController::class, 'show'])->name('submissions.files.show');
    Route::get('payments/{payment}/invoice', [PaymentController::class, 'invoice'])->name('payments.invoice');
    Route::get('instructor-payrolls/{instructorPayroll}/slip', [InstructorPayrollController::class, 'downloadSlip'])
        ->name('instructor-payrolls.slip');
    Route::get('payments/mock-checkout', [EnrollmentController::class, 'mockCheckout'])->name('payments.mock-checkout');
    Route::post('payments/{payment}/mock-settle', [PaymentController::class, 'mockSettle'])->name('payments.mock-settle');
    Route::get('store/checkout', [StorefrontController::class, 'checkout'])->name('store.checkout');
    Route::post('store/checkout', [StorefrontController::class, 'storeCheckout'])->name('store.checkout.store');
    Route::get('store/orders', [StorefrontController::class, 'orders'])->name('store.orders');
    Route::get('activation-codes/redeem', [StorefrontController::class, 'redeem'])->name('activation-codes.redeem');
    Route::post('activation-codes/redeem', [StorefrontController::class, 'storeRedeem'])->name('activation-codes.redeem.store');

    Route::middleware('role:admin,internal_instructor')->group(function () {
        Route::get('reviews', [PlatformController::class, 'submissionReviews'])->name('reviews.index');
        Route::patch('reviews/submissions/{submission}', [LearningActionController::class, 'reviewSubmission'])->name('reviews.update');
    });

    Route::middleware('role:student')->group(function () {
        Route::get('student/bills', [CourseBillController::class, 'studentIndex'])->name('student.bills');
        Route::post('student/bills/{courseBill}/pay', [CourseBillController::class, 'pay'])->name('student.bills.pay');
        Route::get('student/dashboard', [PlatformController::class, 'dashboard'])->name('student.dashboard');
        Route::get('student/learning', [PlatformController::class, 'learningIndex'])->name('student.learning.index');
        Route::get('student/catalog', [PlatformController::class, 'internalCatalog'])->name('student.catalog');
        Route::get('student/upcoming', [PlatformController::class, 'studentUpcoming'])->name('student.upcoming');
    });

    Route::middleware('role:student,school_teacher')->group(function () {
        Route::get('learning', [PlatformController::class, 'learning'])->name('learning.show');
        Route::post('courses/{course}/enroll', [EnrollmentController::class, 'store'])->name('enrollments.store');
        Route::post('courses/{course}/lessons/{lessonId}/complete', [EnrollmentController::class, 'completeLesson'])->name('lessons.complete');
        Route::post('learning/blocks/{contentBlock}/step', [LearningActionController::class, 'updateBlockStep'])->name('learning.blocks.step');
        Route::post('learning/blocks/{contentBlock}/interactive-progress', [LearningActionController::class, 'updateInteractiveProgress'])
            ->middleware('throttle:120,1')
            ->name('learning.blocks.interactive-progress');
        Route::get('quizzes/{quiz}/start', [LearningActionController::class, 'startQuizAttempt'])->name('quizzes.attempts.start');
        Route::post('quizzes/{quiz}/attempts', [LearningActionController::class, 'submitQuiz'])->name('quizzes.attempts.store');
        Route::post('courses/{course}/submissions', [LearningActionController::class, 'submitProject'])->name('submissions.store');
    });

    Route::middleware('role:student')->group(function () {
        Route::get('student/attendance/scan', [StudentTeachingAttendanceController::class, 'scanner'])->name('student.teaching-attendances.scanner');
        Route::get('student/teaching-schedules/{teachingSchedule}/feedback', [StudentTeachingAttendanceController::class, 'feedback'])
            ->name('student.teaching-attendances.feedback');
        Route::post('student/teaching-schedules/{teachingSchedule}/feedback', [StudentTeachingAttendanceController::class, 'storeFeedback'])
            ->name('student.teaching-attendances.feedback.store');
        Route::get('student/teaching-schedules/{teachingSchedule}/attendance/scan', [StudentTeachingAttendanceController::class, 'storeFromQr'])
            ->middleware('signed:relative')
            ->name('student.teaching-attendances.scan.store');

        Route::get('certificates', [PlatformController::class, 'certificates'])->name('certificates.index');
        Route::get('checkout', [PlatformController::class, 'checkout'])->name('payments.checkout');
        Route::post('checkout', [EnrollmentController::class, 'checkout'])->name('payments.checkout.store');
        Route::get('payments/pending', [PlatformController::class, 'pendingPayment'])->name('payments.pending');

        Route::get('payments/success', [PlatformController::class, 'successPayment'])->name('payments.success');
        Route::get('payments', [PlatformController::class, 'paymentHistory'])->name('payments.index');
        Route::get('payments/{payment}/continue', [PaymentController::class, 'continuePayment'])->name('payments.continue');
    });

    Route::middleware('role:school_teacher')->group(function () {
        Route::get('teacher/dashboard', [PlatformController::class, 'teacherDashboard'])->name('teacher.dashboard');
        Route::get('teacher/learning', [PlatformController::class, 'learningIndex'])->name('teacher.learning.index');
        Route::get('teacher/catalog', [PlatformController::class, 'internalCatalog'])->name('teacher.catalog');
        Route::get('teacher/students', [PlatformController::class, 'teacherStudents'])->name('teacher.students');
        Route::get('teacher/students/attendance', [PlatformController::class, 'teacherAttendanceRecap'])
            ->name('teacher.students.attendance');
        Route::get('teacher/teaching-sessions', [TeachingSessionController::class, 'teacherIndex'])->name('teacher.teaching-sessions');
        Route::get('teacher/teaching-sessions/{teachingSession}', [TeachingSessionController::class, 'teacherShow'])
            ->name('teacher.teaching-sessions.show');
        Route::put('teacher/teaching-schedules/{teachingSchedule}/students/{student}/progress-note', [StudentProgressNoteController::class, 'update'])
            ->name('teacher.student-progress-notes.update');
    });

    Route::middleware('role:admin')->group(function () {
        Route::get('reports', [PlatformController::class, 'roleReports'])->name('reports.index');
    });

    Route::middleware('role:internal_instructor')->group(function () {
        Route::get('instructor/dashboard', [PlatformController::class, 'instructorDashboard'])->name('instructor.dashboard');
        Route::get('instructor/students', [PlatformController::class, 'managedStudents'])->name('instructor.students');
        Route::get('instructor/schedules', [TeachingScheduleController::class, 'instructorIndex'])->name('instructor.schedules');
        Route::get('instructor/teaching-sessions', [TeachingSessionController::class, 'instructorIndex'])->name('instructor.teaching-sessions');
        Route::get('instructor/teaching-feedbacks', [TeachingFeedbackController::class, 'instructorIndex'])->name('instructor.teaching-feedbacks');
        Route::get('instructor/teaching-sessions/create', [TeachingSessionController::class, 'create'])->name('instructor.teaching-sessions.create');
        Route::post('instructor/teaching-sessions/draft', [TeachingSessionController::class, 'storeDraft'])->name('instructor.teaching-sessions.draft');
        Route::get('instructor/teaching-sessions/{teachingSession}/attendances', [TeachingAttendanceController::class, 'index'])
            ->name('instructor.teaching-sessions.attendances');
        Route::get('instructor/teaching-sessions/{teachingSession}/attendances/data', [TeachingAttendanceController::class, 'data'])
            ->name('instructor.teaching-sessions.attendances.data');
        Route::patch('instructor/teaching-sessions/{teachingSession}/attendances', [TeachingAttendanceController::class, 'update'])
            ->name('instructor.teaching-sessions.attendances.update');
        Route::post('instructor/teaching-sessions', [TeachingSessionController::class, 'store'])->name('instructor.teaching-sessions.store');
        Route::patch('instructor/teaching-sessions/{teachingSession}', [TeachingSessionController::class, 'update'])->name('instructor.teaching-sessions.update');
        Route::patch('instructor/teaching-sessions/{teachingSession}/submit', [TeachingSessionController::class, 'submitDraft'])->name('instructor.teaching-sessions.submit');
        Route::get('instructor/payrolls', [InstructorPayrollController::class, 'instructorIndex'])->name('instructor.payrolls');
        Route::patch('instructor/payrolls/bank-account', [InstructorPayrollController::class, 'updateBankAccount'])->name('instructor.payrolls.bank-account');

        Route::get('instructor/learning-paths', [PlatformController::class, 'adminLearningPaths'])->name('instructor.learning-paths');
        Route::post('instructor/learning-paths', [LearningPathController::class, 'store'])->name('instructor.learning-paths.store');
        Route::patch('instructor/learning-paths/{learningPath}', [LearningPathController::class, 'update'])->name('instructor.learning-paths.update');
        Route::delete('instructor/learning-paths/{learningPath}', [LearningPathController::class, 'destroy'])->name('instructor.learning-paths.destroy');

        Route::get('instructor/course-builder', [PlatformController::class, 'courseBuilder'])->name('instructor.course-builder');
        Route::get('instructor/courses/create', [PlatformController::class, 'createCourse'])->name('instructor.courses.create');
        Route::get('instructor/courses/{course}/edit', [PlatformController::class, 'editCourse'])->name('instructor.courses.edit');
        Route::get('instructor/courses/{course}/preview', [PlatformController::class, 'coursePreview'])->name('instructor.courses.preview');
        Route::get('instructor/courses/{course}/quizzes/create', [PlatformController::class, 'createQuiz'])->name('instructor.quizzes.create');
        Route::get('instructor/quizzes/{quiz}/edit', [PlatformController::class, 'editQuiz'])->name('instructor.quizzes.edit');
        Route::post('instructor/courses', [CourseController::class, 'store'])->name('instructor.courses.store');
        Route::patch('instructor/courses/{course}', [CourseController::class, 'update'])->name('instructor.courses.update');
        Route::delete('instructor/courses/{course}', [CourseController::class, 'destroy'])->name('instructor.courses.destroy');
        Route::post('instructor/courses/{course}/chapters', [CurriculumController::class, 'storeChapter'])->name('instructor.chapters.store');
        Route::patch('instructor/chapters/{chapter}', [CurriculumController::class, 'updateChapter'])->name('instructor.chapters.update');
        Route::delete('instructor/chapters/{chapter}', [CurriculumController::class, 'destroyChapter'])->name('instructor.chapters.destroy');
        Route::post('instructor/chapters/{chapter}/lessons', [CurriculumController::class, 'storeLesson'])->name('instructor.lessons.store');
        Route::patch('instructor/lessons/{lesson}', [CurriculumController::class, 'updateLesson'])->name('instructor.lessons.update');
        Route::delete('instructor/lessons/{lesson}', [CurriculumController::class, 'destroyLesson'])->name('instructor.lessons.destroy');
        Route::post('instructor/lessons/{lesson}/interactive-editor', [CurriculumController::class, 'openLessonInteractiveEditor'])->name('instructor.lessons.interactive-editor');
        Route::get('instructor/lessons/{lesson}/blocks/create', [PlatformController::class, 'createBlock'])->name('instructor.blocks.create');
        Route::get('instructor/blocks/{block}/edit', [PlatformController::class, 'editBlock'])->name('instructor.blocks.edit');
        Route::get('instructor/blocks/{block}/interactive-editor', [PlatformController::class, 'interactiveEditor'])->name('instructor.blocks.interactive-editor');
        Route::post('instructor/lessons/{lesson}/blocks', [CurriculumController::class, 'storeBlock'])->name('instructor.blocks.store');
        Route::post('instructor/lessons/{lesson}/editor-media', [CurriculumController::class, 'uploadEditorMedia'])->name('instructor.lessons.editor-media');
        Route::post('instructor/lessons/{lesson}/interactive-media', [CurriculumController::class, 'uploadInteractiveMedia'])->name('instructor.lessons.interactive-media');
        Route::patch('instructor/blocks/{block}', [CurriculumController::class, 'updateBlock'])->name('instructor.blocks.update');
        Route::patch('instructor/blocks/{block}/interactive-autosave', [CurriculumController::class, 'autosaveInteractiveBlock'])->name('instructor.blocks.interactive-autosave');
        Route::delete('instructor/blocks/{block}', [CurriculumController::class, 'destroyBlock'])->name('instructor.blocks.destroy');
        Route::post('instructor/courses/{course}/quizzes', [CurriculumController::class, 'storeQuiz'])->name('instructor.quizzes.store');
        Route::patch('instructor/quizzes/{quiz}', [CurriculumController::class, 'updateQuiz'])->name('instructor.quizzes.update');
        Route::delete('instructor/quizzes/{quiz}', [CurriculumController::class, 'destroyQuiz'])->name('instructor.quizzes.destroy');
    });

    Route::middleware('role:admin')->group(function () {
        Route::get('admin/learning-paths', [PlatformController::class, 'adminLearningPaths'])->name('admin.learning-paths');
        Route::post('admin/learning-paths', [LearningPathController::class, 'store'])->name('admin.learning-paths.store');
        Route::patch('admin/learning-paths/{learningPath}', [LearningPathController::class, 'update'])->name('admin.learning-paths.update');
        Route::delete('admin/learning-paths/{learningPath}', [LearningPathController::class, 'destroy'])->name('admin.learning-paths.destroy');

        Route::get('admin/course-builder', [PlatformController::class, 'courseBuilder'])->name('admin.course-builder');
        Route::get('admin/courses/create', [PlatformController::class, 'createCourse'])->name('admin.courses.create');
        Route::get('admin/courses/{course}/edit', [PlatformController::class, 'editCourse'])->name('admin.courses.edit');
        Route::get('admin/certificates', [PlatformController::class, 'adminCertificates'])->name('admin.certificates');
        Route::post('admin/certificates/issue', [CertificateManagementController::class, 'issue'])->name('admin.certificates.issue');
        Route::patch('admin/certificates/{certificate}/revoke', [CertificateManagementController::class, 'revoke'])->name('admin.certificates.revoke');
        Route::patch('admin/certificates/{certificate}/reinstate', [CertificateManagementController::class, 'reinstate'])->name('admin.certificates.reinstate');
        Route::get('admin/courses/{course}/preview', [PlatformController::class, 'coursePreview'])->name('admin.courses.preview');
        Route::get('admin/courses/{course}/quizzes/create', [PlatformController::class, 'createQuiz'])->name('admin.quizzes.create');
        Route::get('admin/quizzes/{quiz}/edit', [PlatformController::class, 'editQuiz'])->name('admin.quizzes.edit');
        Route::post('admin/courses', [CourseController::class, 'store'])->name('admin.courses.store');
        Route::patch('admin/courses/{course}', [CourseController::class, 'update'])->name('admin.courses.update');
        Route::delete('admin/courses/{course}', [CourseController::class, 'destroy'])->name('admin.courses.destroy');
        Route::post('admin/courses/{course}/chapters', [CurriculumController::class, 'storeChapter'])->name('admin.chapters.store');
        Route::patch('admin/chapters/{chapter}', [CurriculumController::class, 'updateChapter'])->name('admin.chapters.update');
        Route::delete('admin/chapters/{chapter}', [CurriculumController::class, 'destroyChapter'])->name('admin.chapters.destroy');
        Route::post('admin/chapters/{chapter}/lessons', [CurriculumController::class, 'storeLesson'])->name('admin.lessons.store');
        Route::patch('admin/lessons/{lesson}', [CurriculumController::class, 'updateLesson'])->name('admin.lessons.update');
        Route::delete('admin/lessons/{lesson}', [CurriculumController::class, 'destroyLesson'])->name('admin.lessons.destroy');
        Route::post('admin/lessons/{lesson}/interactive-editor', [CurriculumController::class, 'openLessonInteractiveEditor'])->name('admin.lessons.interactive-editor');
        Route::get('admin/lessons/{lesson}/blocks/create', [PlatformController::class, 'createBlock'])->name('admin.blocks.create');
        Route::get('admin/blocks/{block}/edit', [PlatformController::class, 'editBlock'])->name('admin.blocks.edit');
        Route::get('admin/blocks/{block}/interactive-editor', [PlatformController::class, 'interactiveEditor'])->name('admin.blocks.interactive-editor');
        Route::post('admin/lessons/{lesson}/blocks', [CurriculumController::class, 'storeBlock'])->name('admin.blocks.store');
        Route::post('admin/lessons/{lesson}/editor-media', [CurriculumController::class, 'uploadEditorMedia'])->name('admin.lessons.editor-media');
        Route::post('admin/lessons/{lesson}/interactive-media', [CurriculumController::class, 'uploadInteractiveMedia'])->name('admin.lessons.interactive-media');
        Route::patch('admin/blocks/{block}', [CurriculumController::class, 'updateBlock'])->name('admin.blocks.update');
        Route::patch('admin/blocks/{block}/interactive-autosave', [CurriculumController::class, 'autosaveInteractiveBlock'])->name('admin.blocks.interactive-autosave');
        Route::delete('admin/blocks/{block}', [CurriculumController::class, 'destroyBlock'])->name('admin.blocks.destroy');
        Route::post('admin/courses/{course}/quizzes', [CurriculumController::class, 'storeQuiz'])->name('admin.quizzes.store');
        Route::patch('admin/quizzes/{quiz}', [CurriculumController::class, 'updateQuiz'])->name('admin.quizzes.update');
        Route::delete('admin/quizzes/{quiz}', [CurriculumController::class, 'destroyQuiz'])->name('admin.quizzes.destroy');
        Route::patch('admin/submissions/{submission}/review', [LearningActionController::class, 'reviewSubmission'])->name('admin.submissions.review');
    });

    Route::middleware('role:admin')->group(function () {
        Route::get('admin/dashboard', [PlatformController::class, 'adminDashboard'])->name('admin.dashboard');
        Route::get('admin/students', [PlatformController::class, 'managedStudents'])->name('admin.students');
        Route::get('admin/home-page', [PlatformController::class, 'adminHomePage'])->name('admin.home-page');
        Route::post('admin/home-page/sections', [HomePageSectionController::class, 'store'])->name('admin.home-page.sections.store');
        Route::patch('admin/home-page/sections/{homePageSection}', [HomePageSectionController::class, 'update'])->name('admin.home-page.sections.update');
        Route::delete('admin/home-page/sections/{homePageSection}', [HomePageSectionController::class, 'destroy'])->name('admin.home-page.sections.destroy');
        Route::get('admin/footer', [FooterSettingController::class, 'edit'])->name('admin.footer.edit');
        Route::patch('admin/footer', [FooterSettingController::class, 'update'])->name('admin.footer.update');
        Route::get('admin/seo-settings', [SeoSettingController::class, 'edit'])->name('admin.seo-settings.edit');
        Route::patch('admin/seo-settings/{seoSetting}', [SeoSettingController::class, 'update'])->name('admin.seo-settings.update');

        Route::get('admin/schools', [PlatformController::class, 'adminSchools'])->name('admin.schools');
        Route::post('admin/schools', [SchoolController::class, 'store'])->name('admin.schools.store');
        Route::patch('admin/schools/{school}', [SchoolController::class, 'update'])->name('admin.schools.update');
        Route::delete('admin/schools/{school}', [SchoolController::class, 'destroy'])->name('admin.schools.destroy');
        Route::get('admin/school-learning-path-accesses', [PlatformController::class, 'adminSchoolLearningPathAccesses'])
            ->name('admin.school-learning-path-accesses');
        Route::post('admin/school-learning-path-accesses', [SchoolLearningPathAccessController::class, 'store'])
            ->name('admin.school-learning-path-accesses.store');
        Route::patch('admin/school-learning-path-accesses/{access}', [SchoolLearningPathAccessController::class, 'update'])
            ->name('admin.school-learning-path-accesses.update');
        Route::delete('admin/school-learning-path-accesses/{access}', [SchoolLearningPathAccessController::class, 'destroy'])
            ->name('admin.school-learning-path-accesses.destroy');

        Route::get('admin/schools/detail', [PlatformController::class, 'adminSchoolDetail'])->name('admin.schools.detail');

        Route::get('admin/users', [PlatformController::class, 'adminUsers'])->name('admin.users');
        Route::post('admin/users', [UserController::class, 'store'])->name('admin.users.store');
        Route::patch('admin/users/{user}', [UserController::class, 'update'])->name('admin.users.update');
        Route::delete('admin/users/{user}', [UserController::class, 'destroy'])->name('admin.users.destroy');
        Route::post('admin/users/import', [UserImportController::class, 'store'])->name('admin.users.import');
        Route::get('admin/users/import/template', [UserImportController::class, 'template'])->name('admin.users.import.template');

        Route::post('admin/certificate-templates', [CertificateTemplateController::class, 'store'])->name('admin.certificate-templates.store');
        Route::patch('admin/certificate-templates/{template}', [CertificateTemplateController::class, 'update'])->name('admin.certificate-templates.update');
        Route::delete('admin/certificate-templates/{template}', [CertificateTemplateController::class, 'destroy'])->name('admin.certificate-templates.destroy');

        Route::get('admin/teaching-schedules', [TeachingScheduleController::class, 'adminIndex'])->name('admin.teaching-schedules');
        Route::post('admin/teaching-schedules', [TeachingScheduleController::class, 'store'])->name('admin.teaching-schedules.store');
        Route::patch('admin/teaching-schedules/{teachingSchedule}', [TeachingScheduleController::class, 'update'])->name('admin.teaching-schedules.update');
        Route::delete('admin/teaching-schedules/{teachingSchedule}', [TeachingScheduleController::class, 'destroy'])->name('admin.teaching-schedules.destroy');

        Route::get('admin/teaching-sessions', [TeachingSessionController::class, 'adminIndex'])->name('admin.teaching-sessions');
        Route::get('admin/teaching-sessions/{teachingSession}', [TeachingSessionController::class, 'show'])->name('admin.teaching-sessions.show');
        Route::get('admin/teaching-sessions/{teachingSession}/attendances', [TeachingAttendanceController::class, 'index'])
            ->name('admin.teaching-sessions.attendances');
        Route::get('admin/teaching-sessions/{teachingSession}/attendances/data', [TeachingAttendanceController::class, 'data'])
            ->name('admin.teaching-sessions.attendances.data');
        Route::patch('admin/teaching-sessions/{teachingSession}/attendances', [TeachingAttendanceController::class, 'update'])
            ->name('admin.teaching-sessions.attendances.update');
        Route::get('admin/teaching-feedbacks', [TeachingFeedbackController::class, 'adminIndex'])->name('admin.teaching-feedbacks');
        Route::patch('admin/teaching-sessions/{teachingSession}/review', [TeachingSessionController::class, 'review'])->name('admin.teaching-sessions.review');
        Route::delete('admin/teaching-sessions/{teachingSession}', [TeachingSessionController::class, 'destroy'])->name('admin.teaching-sessions.destroy');

        Route::get('admin/instructor-payrolls', [InstructorPayrollController::class, 'adminIndex'])->name('admin.instructor-payrolls');
        Route::post('admin/instructor-pay-rates', [InstructorPayrollController::class, 'storeRate'])->name('admin.instructor-pay-rates.store');
        Route::patch('admin/instructor-pay-rates/{instructorPayRate}', [InstructorPayrollController::class, 'updateRate'])->name('admin.instructor-pay-rates.update');
        Route::delete('admin/instructor-pay-rates/{instructorPayRate}', [InstructorPayrollController::class, 'destroyRate'])->name('admin.instructor-pay-rates.destroy');
        Route::post('admin/instructor-payrolls', [InstructorPayrollController::class, 'storePayroll'])->name('admin.instructor-payrolls.store');
        Route::patch('admin/instructor-payrolls/{instructorPayroll}', [InstructorPayrollController::class, 'updatePayroll'])->name('admin.instructor-payrolls.update');
        Route::delete('admin/instructor-payrolls/{instructorPayroll}', [InstructorPayrollController::class, 'destroyPayroll'])->name('admin.instructor-payrolls.destroy');

        Route::get('admin/reports', [PlatformController::class, 'adminReports'])->name('admin.reports');
        Route::get('admin/payments', [PlatformController::class, 'adminPayments'])->name('admin.payments');
        Route::delete('admin/payments/{payment}', [PaymentController::class, 'destroy'])->name('admin.payments.destroy');
        Route::get('admin/course-bills', [CourseBillController::class, 'adminIndex'])->name('admin.course-bills');
        Route::post('admin/course-bills', [CourseBillController::class, 'store'])->name('admin.course-bills.store');
        Route::patch('admin/course-bills/{courseBill}', [CourseBillController::class, 'update'])->name('admin.course-bills.update');
        Route::get('admin/course-bills/{courseBill}/invoice', [CourseBillController::class, 'invoice'])->name('admin.course-bills.invoice');
        Route::delete('admin/course-bills/{courseBill}', [CourseBillController::class, 'destroy'])->name('admin.course-bills.destroy');
        Route::get('admin/store', [StoreController::class, 'index'])->name('admin.store');
        Route::post('admin/store/categories', [StoreController::class, 'storeCategory'])->name('admin.store.categories.store');
        Route::patch('admin/store/categories/{category}', [StoreController::class, 'updateCategory'])->name('admin.store.categories.update');
        Route::delete('admin/store/categories/{category}', [StoreController::class, 'destroyCategory'])->name('admin.store.categories.destroy');
        Route::post('admin/store/products', [StoreController::class, 'storeProduct'])->name('admin.store.products.store');
        Route::patch('admin/store/products/{product}', [StoreController::class, 'updateProduct'])->name('admin.store.products.update');
        Route::delete('admin/store/products/{product}', [StoreController::class, 'destroyProduct'])->name('admin.store.products.destroy');
        Route::patch('admin/store/products/{product}/stock', [StoreController::class, 'adjustStock'])->name('admin.store.products.stock');
        Route::patch('admin/store/orders/{order}', [StoreController::class, 'updateOrder'])->name('admin.store.orders.update');
        Route::post('admin/store/activation-codes', [StoreController::class, 'generateActivationCodes'])->name('admin.store.activation-codes.store');
    });
});

require __DIR__.'/settings.php';
require __DIR__.'/auth.php';
