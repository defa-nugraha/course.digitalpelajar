<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\School;
use App\Services\AuditLogger;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class SchoolController extends Controller
{
    public function store(Request $request): RedirectResponse
    {
        $school = School::create($this->withUploadedLogo($request, $this->validated($request)));
        AuditLogger::log('school.created', $request->user(), $school);

        return back()->with('success', 'Sekolah berhasil ditambahkan.');
    }

    public function update(Request $request, School $school): RedirectResponse
    {
        $school->update($this->withUploadedLogo($request, $this->validated($request), $school));
        AuditLogger::log('school.updated', $request->user(), $school);

        return back()->with('success', 'Data sekolah berhasil diperbarui.');
    }

    public function destroy(Request $request, School $school): RedirectResponse
    {
        AuditLogger::log('school.deleted', $request->user(), $school, ['name' => $school->name]);
        $this->deletePreviousPublicLogo($school->logo_path);
        $school->delete();

        return to_route('admin.schools')->with('success', 'Sekolah berhasil dihapus.');
    }

    private function validated(Request $request): array
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'address' => ['nullable', 'string', 'max:1000'],
            'pic' => ['nullable', 'string', 'max:255'],
            'logo_path' => ['nullable', 'string', 'max:2048'],
            'logo' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:2048'],
            'status' => ['required', Rule::in(['active', 'pending', 'inactive'])],
            'partnered_at' => ['nullable', 'date', 'before_or_equal:today'],
        ]);

        $data['logo_path'] = $this->normalizePublicLogoPath($data['logo_path'] ?? null);

        return $data;
    }

    private function withUploadedLogo(Request $request, array $data, ?School $school = null): array
    {
        if ($request->hasFile('logo')) {
            $path = $request->file('logo')->store('school-logos', 'public');

            $this->deletePreviousPublicLogo($school?->logo_path);

            $data['logo_path'] = $path;
        }

        unset($data['logo']);

        return $data;
    }

    private function deletePreviousPublicLogo(?string $logoPath): void
    {
        if (! filled($logoPath)) {
            return;
        }

        $path = str_contains($logoPath, '/storage/')
            ? Str::after($logoPath, '/storage/')
            : ltrim($logoPath, '/');

        if (str_starts_with($path, 'storage/')) {
            $path = Str::after($path, 'storage/');
        }

        if ($path && str_starts_with($path, 'school-logos/')) {
            Storage::disk('public')->delete($path);
        }
    }

    private function normalizePublicLogoPath(?string $logoPath): ?string
    {
        if (! filled($logoPath)) {
            return null;
        }

        $path = trim($logoPath);

        if (str_contains($path, '/storage/')) {
            return Str::after($path, '/storage/');
        }

        if (str_starts_with($path, 'storage/')) {
            return Str::after($path, 'storage/');
        }

        return $path;
    }
}
