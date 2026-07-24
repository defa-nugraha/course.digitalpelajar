<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\ProfileUpdateRequest;
use App\Services\AuditLogger;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class ProfileController extends Controller
{
    /**
     * Show the user's profile settings page.
     */
    public function edit(Request $request): Response
    {
        return Inertia::render('settings/profile', [
            'mustVerifyEmail' => $request->user() instanceof MustVerifyEmail,
            'status' => $request->session()->get('status'),
            'schools' => DB::table('schools')
                ->where('status', 'active')
                ->select('id', 'name', 'address')
                ->orderBy('name')
                ->get(),
        ]);
    }

    /**
     * Update the user's profile settings.
     */
    public function update(ProfileUpdateRequest $request): RedirectResponse
    {
        $data = $request->validated();
        $usesManualSchool = ($data['school_id'] ?? null) === 'other';
        $isStudent = $request->user()->role === 'student';

        if ($isStudent) {
            $selectedSchoolId = $data['school_id'] ?? null;
            unset($data['school_id']);

            $data['requested_school_id'] = $usesManualSchool || blank($selectedSchoolId) ? null : (int) $selectedSchoolId;
            $data['school_verification_status'] = filled($data['requested_school_id'] ?? null) || $usesManualSchool ? 'pending' : null;

            if (! $usesManualSchool) {
                $data['manual_school_name'] = null;
                $data['manual_school_address'] = null;
            }
        } elseif ($usesManualSchool) {
            $data['school_id'] = null;
            $data['requested_school_id'] = null;
            $data['school_verification_status'] = null;
        } else {
            $data['requested_school_id'] = null;
            $data['school_verification_status'] = null;
            $data['manual_school_name'] = null;
            $data['manual_school_address'] = null;
        }

        $isComplete = filled($data['name'] ?? null)
            && filled($data['email'] ?? null)
            && filled($data['phone'] ?? null)
            && filled($data['address'] ?? null)
            && (
                filled($data['school_id'] ?? $request->user()->school_id)
                || filled($data['requested_school_id'] ?? null)
                || (filled($data['manual_school_name'] ?? null) && filled($data['manual_school_address'] ?? null))
            );

        $data['profile_completed_at'] = $isComplete
            ? ($request->user()->profile_completed_at ?: now())
            : null;

        $request->user()->fill($data);

        if ($request->user()->isDirty('email')) {
            $request->user()->email_verified_at = null;
        }

        $request->user()->save();
        AuditLogger::log('profile.updated', $request->user());

        return to_route('profile.edit')->with('success', 'Profil berhasil diperbarui.');
    }

    /**
     * Delete the user's account.
     */
    public function destroy(Request $request): RedirectResponse
    {
        $request->validate([
            'password' => ['required', 'current_password'],
        ]);

        $user = $request->user();

        if ($user->enrollments()->exists() || $user->payments()->exists() || $user->taughtCourses()->exists()) {
            throw ValidationException::withMessages([
                'password' => 'Akun yang memiliki riwayat pembelajaran atau transaksi tidak dapat dihapus. Hubungi admin untuk menonaktifkan akun.',
            ]);
        }

        AuditLogger::log('account.deleted', $user, metadata: ['email' => $user->email]);
        Auth::logout();

        $user->delete();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect('/');
    }
}
