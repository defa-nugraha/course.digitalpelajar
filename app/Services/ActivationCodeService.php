<?php

namespace App\Services;

use App\Models\ActivationCode;
use App\Models\Course;
use App\Models\Enrollment;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class ActivationCodeService
{
    public function redeem(User $user, string $rawCode): ActivationCode
    {
        $codeValue = strtoupper(trim($rawCode));

        return DB::transaction(function () use ($user, $codeValue) {
            $activationCode = ActivationCode::query()
                ->where('code', $codeValue)
                ->lockForUpdate()
                ->first();

            if (! $activationCode) {
                throw ValidationException::withMessages(['code' => 'Kode aktivasi tidak ditemukan.']);
            }

            if ($activationCode->status !== 'unused') {
                throw ValidationException::withMessages(['code' => 'Kode aktivasi sudah digunakan atau tidak aktif.']);
            }

            if ($activationCode->assigned_user_id && $activationCode->assigned_user_id !== $user->id) {
                throw ValidationException::withMessages(['code' => 'Kode aktivasi ini tidak ditujukan untuk akun Anda.']);
            }

            if ($activationCode->expires_at && $activationCode->expires_at->isPast()) {
                $activationCode->update(['status' => 'expired']);

                throw ValidationException::withMessages(['code' => 'Kode aktivasi sudah kedaluwarsa.']);
            }

            $this->grantAccess($user, $activationCode);

            $activationCode->update([
                'status' => 'redeemed',
                'redeemed_by' => $user->id,
                'redeemed_at' => now(),
            ]);

            AuditLogger::log('activation_code.redeemed', $user, $activationCode, [
                'course_id' => $activationCode->course_id,
                'learning_path_id' => $activationCode->learning_path_id,
            ]);

            return $activationCode->fresh(['course', 'learningPath']);
        });
    }

    public function generateUniqueCode(string $prefix = 'KIT'): string
    {
        do {
            $code = strtoupper($prefix.'-'.Str::random(4).'-'.Str::random(4));
        } while (ActivationCode::query()->where('code', $code)->exists());

        return $code;
    }

    private function grantAccess(User $user, ActivationCode $activationCode): void
    {
        $courseIds = collect();

        if ($activationCode->course_id) {
            $courseIds->push($activationCode->course_id);
        }

        if ($activationCode->learning_path_id) {
            $courseIds = $courseIds->merge(Course::query()
                ->where('learning_path_id', $activationCode->learning_path_id)
                ->where('status', 'published')
                ->pluck('id'));
        }

        if ($courseIds->filter()->isEmpty()) {
            throw ValidationException::withMessages(['code' => 'Kode aktivasi belum memiliki akses materi yang valid.']);
        }

        foreach ($courseIds->filter()->unique() as $courseId) {
            Enrollment::query()->updateOrCreate(
                ['user_id' => $user->id, 'course_id' => $courseId],
                ['status' => 'active'],
            );
        }
    }
}
