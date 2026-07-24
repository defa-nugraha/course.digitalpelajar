<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\SchoolLearningPathAccess;
use App\Services\AuditLogger;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class SchoolLearningPathAccessController extends Controller
{
    public function store(Request $request): RedirectResponse
    {
        $data = $this->validated($request);

        if (SchoolLearningPathAccess::query()
            ->where('school_id', $data['school_id'])
            ->where('learning_path_id', $data['learning_path_id'])
            ->exists()) {
            return back()->with('error', 'Akses learning path untuk sekolah ini sudah ada. Gunakan edit untuk mengubah status atau periode.');
        }

        $access = SchoolLearningPathAccess::create($data);
        AuditLogger::log('school_learning_path_access.created', $request->user(), $access);

        return back()->with('success', 'Akses learning path berhasil diberikan ke sekolah.');
    }

    public function update(Request $request, SchoolLearningPathAccess $access): RedirectResponse
    {
        $data = $this->validated($request, $access);
        $access->update($data);
        AuditLogger::log('school_learning_path_access.updated', $request->user(), $access);

        return back()->with('success', 'Akses learning path sekolah berhasil diperbarui.');
    }

    public function destroy(Request $request, SchoolLearningPathAccess $access): RedirectResponse
    {
        AuditLogger::log('school_learning_path_access.deleted', $request->user(), $access, [
            'school_id' => $access->school_id,
            'learning_path_id' => $access->learning_path_id,
        ]);

        $access->delete();

        return back()->with('success', 'Akses learning path sekolah berhasil dihapus.');
    }

    private function validated(Request $request, ?SchoolLearningPathAccess $access = null): array
    {
        return $request->validate([
            'school_id' => [
                'required',
                'integer',
                'exists:schools,id',
                Rule::unique('school_learning_path_accesses', 'school_id')
                    ->where('learning_path_id', $request->input('learning_path_id'))
                    ->ignore($access?->id),
            ],
            'learning_path_id' => ['required', 'integer', 'exists:learning_paths,id'],
            'status' => ['required', Rule::in(['active', 'inactive'])],
            'starts_at' => ['nullable', 'date'],
            'expires_at' => ['nullable', 'date', 'after_or_equal:starts_at'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);
    }
}
