<?php

namespace App\Http\Controllers;

use App\Models\Course;
use App\Models\CourseBill;
use App\Models\Payment;
use App\Models\User;
use App\Services\AuditLogger;
use App\Services\MidtransService;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class CourseBillController extends Controller
{
    public function adminIndex(): Response
    {
        return Inertia::render('admin/course-bills', $this->adminData());
    }

    public function adminData(): array
    {
        return [
            'students' => User::query()
                ->where('role', 'student')
                ->where('status', 'active')
                ->orderBy('name')
                ->get(['id', 'name', 'email'])
                ->map(fn (User $student) => [
                    'id' => $student->id,
                    'name' => $student->name,
                    'email' => $student->email,
                ]),
            'courses' => Course::query()
                ->where('status', 'published')
                ->orderBy('title')
                ->get(['id', 'title']),
            'bills' => CourseBill::query()
                ->with([
                    'student:id,name,email',
                    'course:id,title',
                    'payments' => fn ($query) => $query->latest('id'),
                    'batchPayments' => fn ($query) => $query->latest('payments.id')->with('courseBills:id'),
                ])
                ->latest('created_at')
                ->get()
                ->map(function (CourseBill $bill) {
                    $payment = $bill->payments->concat($bill->batchPayments)->sortByDesc('id')->first();

                    return [
                        'id' => $bill->id,
                        'studentId' => $bill->student_id,
                        'courseId' => $bill->course_id,
                        'title' => $bill->title,
                        'student' => $bill->student->name,
                        'email' => $bill->student->email,
                        'course' => $bill->course->title,
                        'amount' => $bill->amount,
                        'amountLabel' => $this->rupiah($bill->amount),
                        'dueAt' => $bill->due_at->format('Y-m-d'),
                        'status' => $bill->status === 'pending' && $bill->isOverdue() ? 'overdue' : $bill->status,
                        'checkoutUrl' => $payment?->checkout_url,
                        'orderId' => $payment?->order_id,
                        'createdAt' => $bill->created_at->format('d M Y'),
                        'canDelete' => $bill->status !== 'paid'
                            && ! $bill->payments->concat($bill->batchPayments)->contains(fn (Payment $item) => $item->isPaid()),
                        'canEdit' => $bill->status !== 'paid'
                            && $bill->payments->isEmpty()
                            && $bill->batchPayments->isEmpty(),
                    ];
                }),
        ];
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'student_id' => [
                'required',
                'integer',
                Rule::exists('users', 'id')->where('role', 'student')->where('status', 'active'),
            ],
            'course_id' => ['required', 'integer', 'exists:courses,id'],
            'title' => ['required', 'string', 'max:160'],
            'amount' => ['required', 'integer', 'min:1000', 'max:1000000000'],
            'due_at' => ['required', 'date', 'after_or_equal:today'],
        ]);

        $course = Course::query()->where('status', 'published')->findOrFail($data['course_id']);
        $bill = CourseBill::query()->create([
            'student_id' => $data['student_id'],
            'course_id' => $course->id,
            'created_by' => $request->user()->id,
            'title' => $data['title'],
            'amount' => $data['amount'],
            'due_at' => $data['due_at'],
            'status' => 'pending',
        ]);

        AuditLogger::log('course_bill.created', $request->user(), $bill, [
            'student_id' => $bill->student_id,
            'course_id' => $bill->course_id,
            'amount' => $bill->amount,
            'due_at' => $bill->due_at->toDateString(),
        ]);

        return to_route('admin.payments')->with('success', 'Tagihan berhasil dibuat. Tautan Midtrans akan dibuat saat siswa menekan tombol bayar.');
    }

    public function update(Request $request, CourseBill $courseBill): RedirectResponse
    {
        abort_if(
            $courseBill->status === 'paid' || $courseBill->payments()->exists() || $courseBill->batchPayments()->exists(),
            409,
            'Tagihan yang sudah memiliki transaksi pembayaran tidak dapat diedit.',
        );

        $data = $request->validate([
            'student_id' => [
                'required',
                'integer',
                Rule::exists('users', 'id')->where('role', 'student')->where('status', 'active'),
            ],
            'course_id' => ['required', 'integer', 'exists:courses,id'],
            'title' => ['required', 'string', 'max:160'],
            'amount' => ['required', 'integer', 'min:1000', 'max:1000000000'],
            'due_at' => ['required', 'date', 'after_or_equal:today'],
        ]);

        $course = Course::query()->where('status', 'published')->findOrFail($data['course_id']);

        DB::transaction(function () use ($request, $courseBill, $data, $course) {
            $lockedBill = CourseBill::query()->lockForUpdate()->findOrFail($courseBill->id);
            abort_if(
                $lockedBill->status === 'paid' || $lockedBill->payments()->exists() || $lockedBill->batchPayments()->exists(),
                409,
                'Tagihan yang sudah memiliki transaksi pembayaran tidak dapat diedit.',
            );

            $lockedBill->update([
                'student_id' => $data['student_id'],
                'course_id' => $course->id,
                'title' => $data['title'],
                'amount' => $data['amount'],
                'due_at' => $data['due_at'],
            ]);

            AuditLogger::log('course_bill.updated', $request->user(), $lockedBill, [
                'student_id' => $lockedBill->student_id,
                'course_id' => $lockedBill->course_id,
                'amount' => $lockedBill->amount,
                'due_at' => $lockedBill->due_at->toDateString(),
            ]);
        });

        return to_route('admin.payments')->with('success', 'Tagihan berhasil diperbarui.');
    }

    public function invoice(Request $request, CourseBill $courseBill): \Symfony\Component\HttpFoundation\Response
    {
        abort_unless($request->user()->isAdmin(), 403);
        $courseBill->load(['student.school', 'course']);

        return Pdf::loadView('payments.course-bill-invoice', [
            'bill' => $courseBill,
        ])->download('invoice-tagihan-'.$courseBill->id.'.pdf');
    }

    public function pay(Request $request, CourseBill $courseBill, MidtransService $midtrans): \Symfony\Component\HttpFoundation\Response
    {
        abort_unless($courseBill->student_id === $request->user()->id, 403);
        abort_unless($courseBill->status !== 'paid', 409, 'Tagihan ini sudah lunas.');

        $payment = $courseBill->payments()->latest('id')->first()
            ?? $courseBill->batchPayments()->latest('payments.id')->first();

        if ($payment?->status === 'pending' && filled($payment->checkout_url)) {
            return Inertia::location($payment->checkout_url);
        }

        if (! $payment || ! in_array($payment->status, ['pending'], true)) {
            $payment = Payment::query()->create([
                'user_id' => $courseBill->student_id,
                'course_id' => $courseBill->course_id,
                'course_bill_id' => $courseBill->id,
                'order_id' => $midtrans->generateOrderId(),
                'amount' => $courseBill->amount,
                'status' => 'pending',
            ]);
        }

        $transaction = $midtrans->createTransaction($payment);
        $payment->forceFill([
            'snap_token' => $transaction['snap_token'],
            'checkout_url' => $transaction['checkout_url'],
        ])->save();

        AuditLogger::log('course_bill.payment_started', $request->user(), $courseBill, [
            'payment_id' => $payment->id,
            'order_id' => $payment->order_id,
        ]);

        return Inertia::location($transaction['checkout_url']);
    }

    public function destroy(Request $request, CourseBill $courseBill): RedirectResponse
    {
        abort_if(
            $courseBill->status === 'paid'
                || $courseBill->payments()->whereIn('status', ['paid', 'settlement', 'capture', 'success'])->exists()
                || $courseBill->batchPayments()->whereIn('payments.status', ['paid', 'settlement', 'capture', 'success'])->exists(),
            409,
            'Tagihan yang sudah dibayar tidak dapat dihapus.',
        );

        DB::transaction(function () use ($request, $courseBill) {
            $courseBill->refresh();
            abort_if(
                $courseBill->status === 'paid' || $courseBill->payments()->whereIn('status', ['paid', 'settlement', 'capture', 'success'])->exists(),
                409,
                'Tagihan yang sudah dibayar tidak dapat dihapus.',
            );
            $batchPaymentIds = $courseBill->batchPayments()->pluck('payments.id')->all();
            $paymentIds = array_values(array_unique(array_merge(
                $courseBill->payments()->pluck('id')->all(),
                $batchPaymentIds,
            )));

            AuditLogger::log('course_bill.deleted', $request->user(), $courseBill, [
                'student_id' => $courseBill->student_id,
                'amount' => $courseBill->amount,
                'related_payment_ids' => $paymentIds,
            ]);

            $courseBill->payments()->delete();
            $courseBill->delete();

            foreach ($batchPaymentIds as $paymentId) {
                $batchPayment = Payment::query()->find($paymentId);

                if ($batchPayment && ! $batchPayment->courseBills()->exists()) {
                    $batchPayment->delete();
                }
            }
        });

        return back()->with('success', 'Tagihan dan data pembayaran terkait berhasil dihapus dari akun siswa.');
    }

    public function studentIndex(Request $request): Response
    {
        $bills = CourseBill::query()
            ->with([
                'course:id,title',
                'payments' => fn ($query) => $query->latest('id'),
                'batchPayments' => fn ($query) => $query->latest('payments.id')->with('courseBills:id'),
            ])
            ->where('student_id', $request->user()->id)
            ->latest('due_at')
            ->get()
            ->map(function (CourseBill $bill) {
                $payment = $bill->payments->concat($bill->batchPayments)->sortByDesc('id')->first();

                return [
                    'id' => $bill->id,
                    'title' => $bill->title,
                    'course' => $bill->course->title,
                    'amountLabel' => $this->rupiah($bill->amount),
                    'dueAt' => $bill->due_at->format('d M Y'),
                    'status' => $bill->status === 'pending' && $bill->isOverdue() ? 'overdue' : $bill->status,
                    'checkoutUrl' => $payment?->checkout_url,
                    'paymentId' => $payment?->id,
                    'orderId' => $payment?->order_id,
                ];
            });

        return Inertia::render('student/bills', [
            'bills' => $bills,
            'studentNumber' => $request->user()->student_number,
        ]);
    }

    private function rupiah(int $amount): string
    {
        return 'Rp '.number_format($amount, 0, ',', '.');
    }
}
