<?php

namespace App\Http\Controllers;

use App\Models\InstructorPayRate;
use App\Models\InstructorPayroll;
use App\Models\TeachingSession;
use App\Services\AuditLogger;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\Response as SymfonyResponse;

class InstructorPayrollController extends Controller
{
    public function adminIndex(Request $request): Response
    {
        return $this->renderIndex($request, 'admin');
    }

    public function instructorIndex(Request $request): Response
    {
        return $this->renderIndex($request, 'instructor');
    }

    public function downloadSlip(Request $request, InstructorPayroll $instructorPayroll): SymfonyResponse
    {
        $user = $request->user();
        abort_unless($user->isAdmin() || $instructorPayroll->instructor_id === $user->id, 403);

        $instructorPayroll->load([
            'instructor:id,name,email,bank_name,bank_account_name,bank_account_number',
            'items.teachingSession.school:id,name',
            'items.teachingSession.course:id,title',
            'items.teachingSession.schedule:id,title',
        ]);

        AuditLogger::log('instructor_payroll.slip_downloaded', $user, $instructorPayroll);

        $filename = 'slip-gaji-'.Str::slug($instructorPayroll->instructor?->name ?? 'pengajar').'-'
            .optional($instructorPayroll->period_month)->format('Y-m').'.pdf';

        return Pdf::loadView('payrolls.slip', [
            'payroll' => $instructorPayroll,
        ])->setPaper('a4')->download($filename);
    }

    public function storeRate(Request $request): RedirectResponse
    {
        $rate = InstructorPayRate::create($this->validatedRate($request));

        AuditLogger::log('instructor_pay_rate.created', $request->user(), $rate);

        return back()->with('success', 'Tarif gaji pengajar berhasil ditambahkan.');
    }

    public function updateRate(Request $request, InstructorPayRate $instructorPayRate): RedirectResponse
    {
        $instructorPayRate->update($this->validatedRate($request));

        AuditLogger::log('instructor_pay_rate.updated', $request->user(), $instructorPayRate);

        return back()->with('success', 'Tarif gaji pengajar berhasil diperbarui.');
    }

    public function destroyRate(Request $request, InstructorPayRate $instructorPayRate): RedirectResponse
    {
        AuditLogger::log('instructor_pay_rate.deleted', $request->user(), $instructorPayRate, [
            'amount_per_session' => $instructorPayRate->amount_per_session,
        ]);
        $instructorPayRate->delete();

        return back()->with('success', 'Tarif gaji pengajar berhasil dihapus.');
    }

    public function updateBankAccount(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'bank_name' => ['required', 'string', 'max:100'],
            'bank_account_name' => ['required', 'string', 'max:150'],
            'bank_account_number' => ['required', 'string', 'regex:/^[0-9]{6,30}$/'],
        ]);

        $request->user()->update($data);

        AuditLogger::log('instructor_bank_account.updated', $request->user(), $request->user());

        return back()->with('success', 'Nomor rekening berhasil diperbarui.');
    }

    public function storePayroll(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'instructor_id' => [
                'required',
                Rule::exists('users', 'id')->where(fn ($query) => $query->where('role', 'internal_instructor')->where('status', 'active')),
            ],
            'period_month' => ['required', 'date_format:Y-m'],
            'notes' => ['nullable', 'string', 'max:2000'],
        ]);

        $period = CarbonImmutable::createFromFormat('Y-m', $data['period_month'])->startOfMonth();

        if (InstructorPayroll::query()->where('instructor_id', $data['instructor_id'])->whereDate('period_month', $period)->exists()) {
            throw ValidationException::withMessages([
                'period_month' => 'Payroll untuk pengajar dan periode ini sudah ada.',
            ]);
        }

        $sessions = TeachingSession::query()
            ->where('instructor_id', $data['instructor_id'])
            ->where('status', 'approved')
            ->whereBetween('actual_date', [$period->toDateString(), $period->endOfMonth()->toDateString()])
            ->whereDoesntHave('payrollItems')
            ->orderBy('actual_date')
            ->get();

        if ($sessions->isEmpty()) {
            throw ValidationException::withMessages([
                'period_month' => 'Tidak ada laporan approved yang belum masuk payroll pada periode ini.',
            ]);
        }

        $items = $sessions->map(function (TeachingSession $session) use ($data) {
            $rate = $this->rateForSession((int) $data['instructor_id'], $session);

            if (! $rate) {
                throw ValidationException::withMessages([
                    'instructor_id' => "Tarif gaji belum tersedia untuk tanggal {$session->actual_date->format('d M Y')}.",
                ]);
            }

            return [
                'teaching_session_id' => $session->id,
                'rate_amount' => $rate->amount_per_session,
                'amount' => $rate->amount_per_session,
            ];
        });

        $payroll = DB::transaction(function () use ($data, $period, $items) {
            $payroll = InstructorPayroll::create([
                'instructor_id' => $data['instructor_id'],
                'period_month' => $period,
                'total_sessions' => $items->count(),
                'total_amount' => $items->sum('amount'),
                'status' => 'draft',
                'notes' => $data['notes'] ?? null,
            ]);

            $payroll->items()->createMany($items->all());

            return $payroll->fresh();
        });

        AuditLogger::log('instructor_payroll.generated', $request->user(), $payroll, [
            'period_month' => $period->format('Y-m'),
            'total_sessions' => $payroll->total_sessions,
            'total_amount' => $payroll->total_amount,
        ]);

        return back()->with('success', 'Payroll pengajar berhasil digenerate dari laporan approved.');
    }

    public function updatePayroll(Request $request, InstructorPayroll $instructorPayroll): RedirectResponse
    {
        $data = $request->validate([
            'status' => ['required', Rule::in(['draft', 'reviewed', 'paid'])],
            'notes' => ['nullable', 'string', 'max:2000'],
            'payment_proof' => ['nullable', 'file', 'mimes:jpg,jpeg,png,webp,pdf', 'max:5120'],
        ]);

        $payload = [
            'status' => $data['status'],
            'notes' => $data['notes'] ?? null,
            'paid_at' => $data['status'] === 'paid' ? ($instructorPayroll->paid_at ?: now()) : null,
        ];

        if ($request->hasFile('payment_proof')) {
            $this->deletePaymentProof($instructorPayroll->payment_proof_path);
            $payload['payment_proof_path'] = $request->file('payment_proof')->store('payroll-proofs', 'public');
        }

        $instructorPayroll->update($payload);

        AuditLogger::log('instructor_payroll.updated', $request->user(), $instructorPayroll, [
            'status' => $data['status'],
        ]);

        return back()->with('success', 'Payroll pengajar berhasil diperbarui.');
    }

    public function destroyPayroll(Request $request, InstructorPayroll $instructorPayroll): RedirectResponse
    {
        if ($instructorPayroll->status === 'paid') {
            return back()->with('error', 'Payroll yang sudah dibayar tidak dapat dihapus.');
        }

        AuditLogger::log('instructor_payroll.deleted', $request->user(), $instructorPayroll, [
            'period_month' => optional($instructorPayroll->period_month)->format('Y-m'),
        ]);
        $this->deletePaymentProof($instructorPayroll->payment_proof_path);
        $instructorPayroll->delete();

        return back()->with('success', 'Payroll pengajar berhasil dihapus.');
    }

    private function renderIndex(Request $request, string $scope): Response
    {
        $payrollQuery = InstructorPayroll::query()
            ->with([
                'instructor:id,name,email,bank_name,bank_account_name,bank_account_number',
                'items.teachingSession.school:id,name',
                'items.teachingSession.course:id,title',
                'items.teachingSession.schedule:id,title',
            ])
            ->when($scope === 'instructor', fn (Builder $query) => $query->where('instructor_id', $request->user()->id))
            ->when($request->filled('status'), fn (Builder $query) => $query->where('status', $request->string('status')))
            ->when($request->integer('instructor'), fn (Builder $query, int $instructorId) => $query->where('instructor_id', $instructorId))
            ->latest('period_month');

        $payrolls = $payrollQuery->get();

        $rateQuery = InstructorPayRate::query()
            ->with('instructor:id,name,email')
            ->when($scope === 'instructor', fn (Builder $query) => $query->where('instructor_id', $request->user()->id))
            ->latest('effective_from');

        $rates = $rateQuery->get();

        return Inertia::render('teaching/payrolls', [
            'scope' => $scope,
            'title' => $scope === 'admin' ? 'Gaji Pengajar' : 'Gaji Saya',
            'payrolls' => $payrolls->map(fn (InstructorPayroll $payroll) => $this->payrollPayload($payroll)),
            'rates' => $rates->map(fn (InstructorPayRate $rate) => $this->ratePayload($rate)),
            'stats' => [
                'payrolls' => $payrolls->count(),
                'sessions' => $payrolls->sum('total_sessions'),
                'totalAmount' => $this->rupiah((int) $payrolls->sum('total_amount')),
                'paidAmount' => $this->rupiah((int) $payrolls->where('status', 'paid')->sum('total_amount')),
            ],
            'options' => [
                'instructors' => DB::table('users')
                    ->where('role', 'internal_instructor')
                    ->where('status', 'active')
                    ->select('id', 'name', 'bank_name', 'bank_account_name', 'bank_account_number')
                    ->orderBy('name')
                    ->get(),
            ],
            'bankAccount' => $scope === 'instructor' ? [
                'bankName' => $request->user()->bank_name,
                'bankAccountName' => $request->user()->bank_account_name,
                'bankAccountNumber' => $request->user()->bank_account_number,
            ] : null,
            'permissions' => [
                'canManage' => $scope === 'admin',
            ],
        ]);
    }

    private function payrollPayload(InstructorPayroll $payroll): array
    {
        return [
            'id' => $payroll->id,
            'instructorId' => $payroll->instructor_id,
            'instructor' => $payroll->instructor?->name ?? 'Pengajar tidak tersedia',
            'periodMonth' => optional($payroll->period_month)->format('Y-m'),
            'periodLabel' => optional($payroll->period_month)->format('M Y'),
            'totalSessions' => $payroll->total_sessions,
            'totalAmount' => $payroll->total_amount,
            'totalAmountLabel' => $this->rupiah($payroll->total_amount),
            'status' => $payroll->status,
            'paidAt' => optional($payroll->paid_at)->format('d M Y H:i'),
            'paymentProofPath' => $payroll->payment_proof_path,
            'paymentProofUrl' => $this->paymentProofUrl($payroll->payment_proof_path),
            'notes' => $payroll->notes,
            'bankAccount' => [
                'bankName' => $payroll->instructor?->bank_name,
                'bankAccountName' => $payroll->instructor?->bank_account_name,
                'bankAccountNumber' => $payroll->instructor?->bank_account_number,
            ],
            'items' => $payroll->items->map(fn ($item) => [
                'id' => $item->id,
                'sessionId' => $item->teaching_session_id,
                'schedule' => $item->teachingSession?->schedule?->title ?? 'Jadwal tidak tersedia',
                'school' => $item->teachingSession?->school?->name ?? 'Sekolah tidak tersedia',
                'course' => $item->teachingSession?->course?->title ?? 'Course tidak tersedia',
                'actualDate' => optional($item->teachingSession?->actual_date)->format('d M Y'),
                'rateAmount' => $item->rate_amount,
                'rateAmountLabel' => $this->rupiah($item->rate_amount),
                'amount' => $item->amount,
                'amountLabel' => $this->rupiah($item->amount),
            ]),
        ];
    }

    private function ratePayload(InstructorPayRate $rate): array
    {
        return [
            'id' => $rate->id,
            'instructorId' => $rate->instructor_id,
            'instructor' => $rate->instructor?->name ?? 'Pengajar tidak tersedia',
            'amountPerSession' => $rate->amount_per_session,
            'amountPerSessionLabel' => $this->rupiah($rate->amount_per_session),
            'effectiveFrom' => optional($rate->effective_from)->format('Y-m-d'),
            'effectiveUntil' => optional($rate->effective_until)->format('Y-m-d'),
            'notes' => $rate->notes,
            'isActive' => $rate->is_active,
        ];
    }

    private function validatedRate(Request $request): array
    {
        return $request->validate([
            'instructor_id' => [
                'required',
                Rule::exists('users', 'id')->where(fn ($query) => $query->where('role', 'internal_instructor')->where('status', 'active')),
            ],
            'amount_per_session' => ['required', 'integer', 'min:1', 'max:100000000'],
            'effective_from' => ['required', 'date'],
            'effective_until' => ['nullable', 'date', 'after_or_equal:effective_from'],
            'notes' => ['nullable', 'string', 'max:2000'],
            'is_active' => ['sometimes', 'boolean'],
        ]);
    }

    private function rateForSession(int $instructorId, TeachingSession $session): ?InstructorPayRate
    {
        return InstructorPayRate::query()
            ->where('instructor_id', $instructorId)
            ->where('is_active', true)
            ->whereDate('effective_from', '<=', $session->actual_date)
            ->where(fn (Builder $query) => $query
                ->whereNull('effective_until')
                ->orWhereDate('effective_until', '>=', $session->actual_date))
            ->orderByDesc('effective_from')
            ->first();
    }

    private function rupiah(int $amount): string
    {
        return 'Rp '.number_format($amount, 0, ',', '.');
    }

    private function deletePaymentProof(?string $path): void
    {
        if (filled($path) && str_starts_with($path, 'payroll-proofs/')) {
            Storage::disk('public')->delete($path);
        }
    }

    private function paymentProofUrl(?string $path): ?string
    {
        if (! filled($path)) {
            return null;
        }

        return url('/storage/'.ltrim($path, '/'));
    }
}
