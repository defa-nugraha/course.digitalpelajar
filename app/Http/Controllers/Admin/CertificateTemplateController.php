<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\CertificateTemplate;
use App\Services\AuditLogger;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class CertificateTemplateController extends Controller
{
    public function store(Request $request): RedirectResponse
    {
        $template = CertificateTemplate::create($this->validated($request));
        $this->ensureSinglePublished($template);
        AuditLogger::log('certificate_template.created', $request->user(), $template);

        return back()->with('success', 'Template sertifikat berhasil dibuat.');
    }

    public function update(Request $request, CertificateTemplate $template): RedirectResponse
    {
        $template->update($this->validated($request));
        $this->ensureSinglePublished($template);
        AuditLogger::log('certificate_template.updated', $request->user(), $template);

        return back()->with('success', 'Template sertifikat berhasil diperbarui.');
    }

    public function destroy(Request $request, CertificateTemplate $template): RedirectResponse
    {
        if ($template->certificates()->exists()) {
            return back()->with('error', 'Template yang sudah digunakan tidak dapat dihapus.');
        }
        AuditLogger::log('certificate_template.deleted', $request->user(), $template);
        $template->delete();

        return back()->with('success', 'Template sertifikat berhasil dihapus.');
    }

    private function validated(Request $request): array
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'title' => ['required', 'string', 'max:255'],
            'primary_color' => ['required', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'accent_color' => ['required', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'status' => ['required', Rule::in(['draft', 'published'])],
        ]);

        return [
            'name' => $data['name'],
            'status' => $data['status'],
            'layout' => [
                'title' => $data['title'],
                'primary_color' => $data['primary_color'],
                'accent_color' => $data['accent_color'],
                'elements' => ['student_name', 'course_title', 'issue_date', 'qr_code', 'instructor_signature'],
            ],
        ];
    }

    private function ensureSinglePublished(CertificateTemplate $template): void
    {
        if ($template->status === 'published') {
            DB::table('certificate_templates')
                ->where('id', '!=', $template->id)
                ->where('status', 'published')
                ->update(['status' => 'draft', 'updated_at' => now()]);
        }
    }
}
