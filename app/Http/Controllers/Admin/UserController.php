<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\AuditLogger;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class UserController extends Controller
{
    public function store(Request $request): RedirectResponse
    {
        $data = $this->validated($request);
        $data['password'] = Hash::make($data['password']);
        $data['email_verified_at'] = now();
        if (filled($data['school_id'] ?? null)) {
            $data['school_verification_status'] = 'approved';
        }

        $user = User::create($data);
        AuditLogger::log('user.created', $request->user(), $user, ['role' => $user->role]);

        return back()->with('success', 'Pengguna berhasil ditambahkan.');
    }

    public function update(Request $request, User $user): RedirectResponse
    {
        $data = $this->validated($request, $user);

        if ($request->user()->is($user) && ($data['role'] !== 'admin' || $data['status'] !== 'active')) {
            throw ValidationException::withMessages([
                'role' => 'Akun admin yang sedang digunakan tidak dapat didemosi atau dinonaktifkan.',
            ]);
        }

        if (blank($data['password'] ?? null)) {
            unset($data['password']);
        }

        if (filled($data['school_id'] ?? null)) {
            $data['requested_school_id'] = null;
            $data['manual_school_name'] = null;
            $data['manual_school_address'] = null;
            $data['school_verification_status'] = 'approved';
        }

        $user->update($data);
        AuditLogger::log('user.updated', $request->user(), $user, ['role' => $user->role]);

        return back()->with('success', 'Pengguna berhasil diperbarui.');
    }

    public function destroy(Request $request, User $user): RedirectResponse
    {
        if ($request->user()->is($user)) {
            return back()->with('error', 'Akun yang sedang digunakan tidak dapat dihapus.');
        }

        AuditLogger::log('user.deleted', $request->user(), $user, ['email' => $user->email]);
        $user->delete();

        return back()->with('success', 'Pengguna berhasil dihapus.');
    }

    public function approveSchoolRequest(Request $request, User $user): RedirectResponse
    {
        abort_unless($user->role === 'student', 404);

        if (! $user->requested_school_id || ! \App\Models\School::query()->whereKey($user->requested_school_id)->exists()) {
            return back()->with('error', 'Pengajuan tidak memiliki sekolah terdaftar yang dapat disetujui. Pilih sekolah melalui fitur Edit terlebih dahulu.');
        }

        $user->update([
            'school_id' => $user->requested_school_id,
            'requested_school_id' => null,
            'manual_school_name' => null,
            'manual_school_address' => null,
            'school_verification_status' => 'approved',
        ]);

        AuditLogger::log('student.school_request.approved', $request->user(), $user, [
            'school_id' => $user->school_id,
        ]);

        return back()->with('success', 'Pengajuan sekolah siswa berhasil disetujui.');
    }

    private function validated(Request $request, ?User $user = null): array
    {
        return $request->validate([
            'school_id' => [
                Rule::requiredIf($request->input('role') === 'school_teacher'),
                'nullable',
                'exists:schools,id',
            ],
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', Rule::unique('users')->ignore($user)],
            'role' => ['required', Rule::in(['student', 'school_teacher', 'internal_instructor', 'admin'])],
            'status' => ['required', Rule::in(['active', 'inactive'])],
            'whatsapp_phone' => ['nullable', 'string', 'max:30', 'regex:/^[0-9+()\\-\\s]+$/'],
            'parent_whatsapp_phone' => ['nullable', 'string', 'max:30', 'regex:/^[0-9+()\\-\\s]+$/'],
            'password' => [$user ? 'nullable' : 'required', 'string', 'min:8', 'confirmed'],
        ]);
    }
}
