<?php

declare(strict_types=1);

declare(strict_types=1);


namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Auth\Events\Verified;
use Illuminate\Foundation\Auth\EmailVerificationRequest;
use Illuminate\Http\RedirectResponse;

class VerifyEmailController extends Controller
{
    /**
     * Mark the authenticated user's email address as verified.
     */
    public function __invoke(EmailVerificationRequest $request): RedirectResponse
    {
        if ($request->user()->hasVerifiedEmail()) {
            return to_route('home', ['verified' => 1]);
        }

        if ($request->user()->markEmailAsVerified()) {
            /** @var MustVerifyEmail $user */
            $user = $request->user();

            event(new Verified($user));
        }

        return to_route('home', ['verified' => 1]);
    }
}
