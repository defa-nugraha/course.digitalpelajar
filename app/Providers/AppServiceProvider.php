<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        RateLimiter::for('public-payment-lookup', function (Request $request): array {
            $studentNumber = preg_replace('/\D/', '', (string) $request->input('student_number'));

            return [
                Limit::perMinute(12)->by('public-payment-lookup:ip:'.($request->ip() ?? 'unknown')),
                Limit::perMinute(3)->by('public-payment-lookup:student:'.hash('sha256', $studentNumber ?: 'missing')),
            ];
        });

        RateLimiter::for('public-payment-checkout', function (Request $request): array {
            $studentNumber = preg_replace('/\D/', '', (string) $request->input('student_number'));

            return [
                Limit::perMinute(8)->by('public-payment-checkout:ip:'.($request->ip() ?? 'unknown')),
                Limit::perMinute(4)->by('public-payment-checkout:student:'.hash('sha256', $studentNumber ?: 'missing')),
            ];
        });
    }
}
