<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\AuditLogger;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Laravel\Socialite\Facades\Socialite;
use Throwable;

class GoogleAuthController extends Controller
{
    public function redirect(): RedirectResponse
    {
        return Socialite::driver('google')->redirect();
    }

    public function callback(): RedirectResponse
    {
        try {
            $googleUser = Socialite::driver('google')->user();
        } catch (Throwable $exception) {
            Log::error('Google OAuth callback failed while retrieving the Google user.', [
                'exception' => $exception::class,
                'message' => $exception->getMessage(),
                'host' => request()->getHost(),
                'configured_redirect_uri' => config('services.google.redirect'),
            ]);

            return to_route('login')->with('status', 'Login Google gagal. Silakan coba lagi atau gunakan email dan password.');
        }

        $user = User::query()
            ->where('google_id', $googleUser->getId())
            ->orWhere('email', $googleUser->getEmail())
            ->first();

        if ($user) {
            if ($user->status !== 'active') {
                return to_route('login')->with('status', 'Akun Google ini sedang nonaktif. Hubungi administrator.');
            }

            $user->forceFill([
                'google_id' => $user->google_id ?: $googleUser->getId(),
                'avatar' => $googleUser->getAvatar(),
                'email_verified_at' => $user->email_verified_at ?: now(),
            ])->save();
        } else {
            $user = User::create([
                'name' => $googleUser->getName() ?: $googleUser->getNickname() ?: 'Siswa',
                'email' => $googleUser->getEmail(),
                'email_verified_at' => now(),
                'role' => 'student',
                'status' => 'active',
                'google_id' => $googleUser->getId(),
                'avatar' => $googleUser->getAvatar(),
                'password' => Str::password(32),
            ]);
        }

        Auth::login($user, remember: true);
        AuditLogger::log('auth.google_login', $user);

        return to_route('dashboard');
    }
}
