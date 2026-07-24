<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\School;
use App\Models\User;
use App\Services\AuditLogger;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use PhpOffice\PhpSpreadsheet\IOFactory;
use Symfony\Component\HttpFoundation\StreamedResponse;

class UserImportController extends Controller
{
    public function store(Request $request): RedirectResponse
    {
        $request->validate([
            'file' => ['required', 'file', 'mimes:csv,txt,xls,xlsx', 'max:5120'],
        ]);

        $sheet = IOFactory::load($request->file('file')->getRealPath())->getActiveSheet();
        $rows = $sheet->toArray(null, true, true, false);

        if (count($rows) < 2) {
            throw ValidationException::withMessages([
                'file' => 'File import tidak memiliki baris data.',
            ]);
        }

        if (count($rows) > 1001) {
            throw ValidationException::withMessages([
                'file' => 'Maksimal 1.000 pengguna per import.',
            ]);
        }

        $headers = collect(array_shift($rows))
            ->map(fn ($header) => Str::of((string) $header)->trim()->lower()->replace([' ', '-'], '_')->toString())
            ->all();
        $requiredHeaders = ['name', 'email', 'role', 'status', 'password'];

        if (array_diff($requiredHeaders, $headers) !== []) {
            throw ValidationException::withMessages([
                'file' => 'Header wajib: name, email, role, school, status, password.',
            ]);
        }

        $schoolsByName = School::query()
            ->get()
            ->keyBy(fn (School $school) => Str::lower($school->name));
        $created = [];

        DB::transaction(function () use ($rows, $headers, $schoolsByName, &$created) {
            foreach ($rows as $index => $row) {
                $rowNumber = $index + 2;
                $values = array_pad($row, count($headers), null);
                $record = array_combine($headers, array_slice($values, 0, count($headers)));

                if (collect($record)->filter(fn ($value) => filled($value))->isEmpty()) {
                    continue;
                }

                $role = $this->normalizeRole((string) ($record['role'] ?? ''));
                $schoolValue = trim((string) ($record['school'] ?? ''));
                $school = $schoolValue === ''
                    ? null
                    : ($schoolsByName[Str::lower($schoolValue)] ?? School::find(is_numeric($schoolValue) ? (int) $schoolValue : 0));

                $data = [
                    'name' => trim((string) ($record['name'] ?? '')),
                    'email' => Str::lower(trim((string) ($record['email'] ?? ''))),
                    'role' => $role,
                    'school_id' => $school?->id,
                    'status' => Str::lower(trim((string) ($record['status'] ?? 'active'))),
                    'password' => (string) ($record['password'] ?? ''),
                ];

                $validator = Validator::make($data, [
                    'name' => ['required', 'string', 'max:255'],
                    'email' => ['required', 'email', 'max:255', 'unique:users,email'],
                    'role' => ['required', Rule::in(['student', 'school_teacher', 'internal_instructor', 'admin'])],
                    'school_id' => [Rule::requiredIf($role === 'school_teacher'), 'nullable', 'exists:schools,id'],
                    'status' => ['required', Rule::in(['active', 'inactive'])],
                    'password' => ['required', 'string', 'min:8'],
                ]);

                if ($schoolValue !== '' && ! $school) {
                    $validator->after(fn ($validator) => $validator->errors()->add('school', 'Sekolah tidak ditemukan.'));
                }

                if ($validator->fails()) {
                    throw ValidationException::withMessages([
                        'file' => "Baris {$rowNumber}: ".$validator->errors()->first(),
                    ]);
                }

                $data['password'] = Hash::make($data['password']);
                $data['email_verified_at'] = now();
                $created[] = User::create($data)->id;
            }
        });

        if ($created === []) {
            throw ValidationException::withMessages([
                'file' => 'Tidak ada baris pengguna yang dapat diimpor.',
            ]);
        }

        AuditLogger::log('users.imported', $request->user(), metadata: [
            'count' => count($created),
            'user_ids' => $created,
        ]);

        return back()->with('success', count($created).' pengguna berhasil diimpor.');
    }

    public function template(): StreamedResponse
    {
        return response()->streamDownload(function () {
            $stream = fopen('php://output', 'w');
            fputcsv($stream, ['name', 'email', 'role', 'school', 'status', 'password']);
            fputcsv($stream, ['Siswa Contoh', 'siswa.contoh@example.test', 'student', 'SMAN 1 Jakarta', 'active', 'password123']);
            fclose($stream);
        }, 'template-import-pengguna.csv', [
            'Content-Type' => 'text/csv; charset=UTF-8',
        ]);
    }

    private function normalizeRole(string $role): string
    {
        return match (Str::lower(trim($role))) {
            'siswa' => 'student',
            'guru', 'guru_sekolah' => 'school_teacher',
            'pengajar', 'pengajar_internal' => 'internal_instructor',
            'administrator', 'admin_pusat' => 'admin',
            default => Str::lower(trim($role)),
        };
    }
}
