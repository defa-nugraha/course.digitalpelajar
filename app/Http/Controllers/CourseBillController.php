<?php

namespace App\Http\Controllers;

use App\Models\Course;
use App\Models\CourseBill;
use App\Models\Payment;
use App\Models\User;
use App\Services\AuditLogger;
use App\Services\MidtransService;
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
        return Inertia::render('admin/course-bills', [
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
                ->with(['student:id,name,email', 'course:id,title', 'payments' => fn ($query) => $query->latest('id')])
                ->latest('created_at')
                ->get()
                ->map(function (CourseBill $bill) {
                    $payment = $bill->payments->first();

                    return [
                        'id' => $bill->id,
                        'title' => $bill->title,
                        'student' => $bill->student->name,
                        'email' => $bill->student->email,
                        'course' => $bill->course->title,
                        'amount' => $bill->amount,
                        'amountLabel' => $this->rupiah($bill->amount),
                        'dueAt' => $bill->due_at->format('Y-m-d'),
                        'status' => $bill->status,
                        'checkoutUrl' => $payment?->checkout_url,
                        'orderId' => $payment?->order_id,
                        'createdAt' => $bill->created_at->format('d M Y'),
                    ];
                }),
        ]);
    }

    public function store(Request $request, MidtransService $midtrans): RedirectResponse
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

        $bill = DB::transaction(function () use ($request, $data, $course, $midtrans) {
            $bill = CourseBill::query()->create([
                'student_id' => $data['student_id'],
                'course_id' => $course->id,
                'created_by' => $request->user()->id,
                'title' => $data['title'],
                'amount' => $data['amount'],
                'due_at' => $data['due_at'],
                'status' => 'pending',
            ]);

            $payment = Payment::query()->create([
                'user_id' => $data['student_id'],
                'course_id' => $course->id,
                'course_bill_id' => $bill->id,
                'order_id' => $midtrans->generateOrderId(),
                'amount' => $data['amount'],
                'status' => 'pending',
            ]);

            return $bill->setRelation('payments', collect([$payment]));
        });

        $payment = $bill->payments->first();
        $transaction = $midtrans->createTransaction($payment);
        $payment->forceFill([
            'snap_token' => $transaction['snap_token'],
            'checkout_url' => $transaction['checkout_url'],
        ])->save();

        AuditLogger::log('course_bill.created', $request->user(), $bill, [
            'student_id' => $bill->student_id,
            'course_id' => $bill->course_id,
            'amount' => $bill->amount,
            'due_at' => $bill->due_at->toDateString(),
        ]);

        return to_route('admin.course-bills')->with('success', 'Tagihan berhasil dibuat dan tautan pembayaran Midtrans telah disiapkan.');
    }

    public function studentIndex(Request $request): Response
    {
        $bills = CourseBill::query()
            ->with(['course:id,title', 'payments' => fn ($query) => $query->latest('id')])
            ->where('student_id', $request->user()->id)
            ->latest('due_at')
            ->get()
            ->map(function (CourseBill $bill) {
                $payment = $bill->payments->first();

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
        ]);
    }

    private function rupiah(int $amount): string
    {
        return 'Rp '.number_format($amount, 0, ',', '.');
    }
}
