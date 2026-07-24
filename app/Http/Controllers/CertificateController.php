<?php

namespace App\Http\Controllers;

use App\Models\Certificate;
use App\Services\CertificateService;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Contracts\View\View;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

class CertificateController extends Controller
{
    public function show(
        Request $request,
        Certificate $certificate,
        CertificateService $certificates,
    ): View {
        $this->authorizeCertificate($request, $certificate);

        return view('certificates.show', [
            'certificate' => $certificates->buildRenderPayload($certificate),
        ]);
    }

    public function download(
        Request $request,
        Certificate $certificate,
        CertificateService $certificates,
    ): Response {
        $this->authorizeCertificate($request, $certificate);
        $payload = $certificates->buildRenderPayload($certificate);

        return Pdf::loadView('certificates.pdf', ['certificate' => $payload])
            ->setPaper('a4', 'landscape')
            ->download(Str::slug($payload['no']).'.pdf');
    }

    public function qr(Certificate $certificate, CertificateService $certificates): Response
    {
        $dataUri = $certificates->qrDataUri(
            url('/certificates/verify?credential='.$certificate->qr_token),
        );
        [, $encoded] = explode(',', $dataUri, 2);

        return response(base64_decode($encoded), 200, [
            'Content-Type' => 'image/png',
            'Cache-Control' => 'public, max-age=86400',
        ]);
    }

    private function authorizeCertificate(Request $request, Certificate $certificate): void
    {
        $certificate->load('enrollment.user', 'enrollment.course');
        $user = $request->user();
        $enrollment = $certificate->enrollment;

        abort_unless(
            $user->isAdmin()
            || $enrollment->user_id === $user->id
            || ($user->role === 'internal_instructor' && $enrollment->course->instructor_id === $user->id),
            403,
        );
    }
}
