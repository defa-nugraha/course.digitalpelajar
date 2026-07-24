<?php

namespace App\Http\Controllers\Teacher;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\AuditLogger;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class StudentController extends Controller
{
    public function store(Request $request): RedirectResponse
    {
        abort_if(! $request->user()->school_id, 403);
        $data = $this->validated($request);
        $data['school_id'] = $request->user()->school_id;
        $data['role'] = 'student';
        $data['password'] = Hash::make($data['password']);
        $data['email_verified_at'] = now();

        $student = User::create($data);
        AuditLogger::log('school_student.created', $request->user(), $student);

        return back()->with('success', 'Siswa sekolah berhasil ditambahkan.');
    }

    public function update(Request $request, User $student): RedirectResponse
    {
        $this->authorizeStudent($request, $student);
        $data = $this->validated($request, $student);
        if (blank($data['password'] ?? null)) {
            unset($data['password']);
        }

        $student->update($data);
        AuditLogger::log('school_student.updated', $request->user(), $student);

        return back()->with('success', 'Data siswa berhasil diperbarui.');
    }

    public function destroy(Request $request, User $student): RedirectResponse
    {
        $this->authorizeStudent($request, $student);
        if ($student->enrollments()->exists() || $student->payments()->exists()) {
            return back()->with('error', 'Siswa yang memiliki riwayat pembelajaran tidak dapat dihapus. Nonaktifkan akun sebagai gantinya.');
        }

        AuditLogger::log('school_student.deleted', $request->user(), $student);
        $student->delete();

        return back()->with('success', 'Siswa berhasil dihapus.');
    }

    private function validated(Request $request, ?User $student = null): array
    {
        return $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', Rule::unique('users')->ignore($student)],
            'status' => ['required', Rule::in(['active', 'inactive'])],
            'password' => [$student ? 'nullable' : 'required', 'string', 'min:8', 'confirmed'],
        ]);
    }

    private function authorizeStudent(Request $request, User $student): void
    {
        abort_unless(
            $student->role === 'student'
            && $student->school_id === $request->user()->school_id,
            403,
        );
    }
}
