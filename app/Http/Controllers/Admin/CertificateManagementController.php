<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Certificate;
use App\Models\Enrollment;
use App\Services\AuditLogger;
use App\Services\CertificateService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class CertificateManagementController extends Controller
{
    public function issue(Request $request, CertificateService $certificates): RedirectResponse
    {
        $data = $request->validate([
            'enrollment_id' => ['required', 'integer', 'exists:enrollments,id'],
        ]);
        $enrollment = Enrollment::with(['user', 'course'])->findOrFail($data['enrollment_id']);
        $this->authorizeCourse($request, $enrollment);

        if (! $certificates->isEligible($enrollment->user, $enrollment)) {
            throw ValidationException::withMessages([
                'enrollment_id' => 'Siswa belum memenuhi seluruh syarat kelulusan.',
            ]);
        }

        $certificate = $certificates->issue($enrollment->user, $enrollment);
        AuditLogger::log('certificate.manually_issued', $request->user(), $certificate);

        return back()->with('success', 'Sertifikat berhasil diterbitkan.');
    }

    public function revoke(Request $request, Certificate $certificate): RedirectResponse
    {
        $certificate->load('enrollment.course');
        $this->authorizeCourse($request, $certificate->enrollment);
        $data = $request->validate([
            'reason' => ['required', 'string', 'max:1000'],
        ]);

        $certificate->update([
            'status' => 'revoked',
            'revoked_at' => now(),
            'revocation_reason' => $data['reason'],
        ]);
        AuditLogger::log('certificate.revoked', $request->user(), $certificate, [
            'reason' => $data['reason'],
        ]);

        return back()->with('success', 'Sertifikat berhasil dicabut.');
    }

    public function reinstate(Request $request, Certificate $certificate): RedirectResponse
    {
        $certificate->load('enrollment.course');
        $this->authorizeCourse($request, $certificate->enrollment);

        $certificate->update([
            'status' => 'issued',
            'revoked_at' => null,
            'revocation_reason' => null,
        ]);
        AuditLogger::log('certificate.reinstated', $request->user(), $certificate);

        return back()->with('success', 'Sertifikat berhasil diaktifkan kembali.');
    }

    private function authorizeCourse(Request $request, Enrollment $enrollment): void
    {
        abort_unless(
            $request->user()->isAdmin()
            || (
                $request->user()->role === 'internal_instructor'
                && $enrollment->course->instructor_id === $request->user()->id
            ),
            403,
        );
    }
}
