<?php

use App\Http\Controllers\PlatformController;
use Illuminate\Support\Facades\Route;

Route::get('/', [PlatformController::class, 'home'])->name('home');

Route::get('courses', [PlatformController::class, 'catalog'])->name('courses.index');

Route::get('certificates/verify', [PlatformController::class, 'verifyCertificate'])->name('certificates.verify');

Route::middleware(['auth'])->group(function () {
    Route::get('dashboard', [PlatformController::class, 'roleDashboard'])->name('dashboard');

    Route::middleware('role:student')->group(function () {
        Route::get('student/dashboard', [PlatformController::class, 'dashboard'])->name('student.dashboard');

        Route::get('learning', [PlatformController::class, 'learning'])->name('learning.show');

        Route::get('certificates', [PlatformController::class, 'certificates'])->name('certificates.index');

        Route::get('checkout', [PlatformController::class, 'checkout'])->name('checkout');

        Route::get('payments/pending', [PlatformController::class, 'pendingPayment'])->name('payments.pending');

        Route::get('payments/success', [PlatformController::class, 'successPayment'])->name('payments.success');
    });

    Route::middleware('role:school_teacher')->group(function () {
        Route::get('teacher/dashboard', [PlatformController::class, 'teacherDashboard'])->name('teacher.dashboard');
    });

    Route::middleware('role:admin,internal_instructor')->group(function () {
        Route::get('admin/course-builder', [PlatformController::class, 'courseBuilder'])->name('admin.course-builder');
    });

    Route::middleware('role:admin')->group(function () {
        Route::get('admin/schools', [PlatformController::class, 'adminSchools'])->name('admin.schools');

        Route::get('admin/schools/detail', [PlatformController::class, 'adminSchoolDetail'])->name('admin.schools.detail');

        Route::get('admin/users', [PlatformController::class, 'adminUsers'])->name('admin.users');

        Route::get('admin/certificates', [PlatformController::class, 'adminCertificates'])->name('admin.certificates');

        Route::get('admin/reports', [PlatformController::class, 'adminReports'])->name('admin.reports');
    });
});

require __DIR__.'/settings.php';
require __DIR__.'/auth.php';
