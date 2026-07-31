<?php

namespace App\Http\Controllers;

use App\Models\Course;
use App\Models\Payment;
use App\Services\CertificateService;
use App\Services\EnrollmentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class EnrollmentController extends Controller
{
    public function __construct(private readonly EnrollmentService $enrollments) {}

    /**
     * Enroll a student (FR-017, FR-018, BR-001, BR-002).
     *
     * Free course -> immediate enrollment + redirect to learning.
     * Paid course -> create payment + redirect to Midtrans checkout.
     */
    public function store(Request $request, Course $course): RedirectResponse
    {
        $course->load('lessons');

        $result = $this->enrollments->enroll($request->user(), $course);

        if ($result['checkout_url']) {
            return redirect()->to($result['checkout_url'])
                ->with('status', 'Silakan selesaikan pembayaran untuk membuka kelas.');
        }

        return redirect()->route('learning.show', ['course' => $course->id])
            ->with('status', "Berhasil terdaftar di \"{$course->title}\".");
    }

    public function checkout(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'course_id' => ['required', 'integer', 'exists:courses,id'],
        ]);

        $course = Course::query()->findOrFail($data['course_id']);
        $result = $this->enrollments->enroll($request->user(), $course);

        if ($result['checkout_url']) {
            return redirect()->to($result['checkout_url'])
                ->with('status', 'Silakan selesaikan pembayaran untuk membuka kelas.');
        }

        return redirect()->route('learning.show', ['course' => $course->id])
            ->with('status', "Berhasil terdaftar di \"{$course->title}\".");
    }

    /**
     * Mark a lesson complete and update progress (FR-016).
     */
    public function completeLesson(
        Request $request,
        Course $course,
        int $lessonId,
        CertificateService $certificates,
    ): RedirectResponse|JsonResponse {
        $request->validate(['lesson_id' => 'sometimes|integer']);

        $enrollment = $this->enrollments->completeLesson($request->user(), $course, $lessonId);
        $certificates->issueIfEligible($request->user(), $enrollment->load('course'));

        if ($request->wantsJson()) {
            return response()->json(['progress' => $enrollment->progress_percent]);
        }

        return back()->with('status', 'Pelajaran ditandai selesai.');
    }

    /**
     * Show Midtrans mock checkout (sandbox/QA mode).
     */
    public function mockCheckout(Request $request): Response
    {
        $payment = $this->resolvePayment($request);

        abort_if(! $payment, 404);

        return Inertia::render('payments/mock-checkout', [
            'payment' => $payment,
        ]);
    }

    private function resolvePayment(Request $request): ?array
    {
        $order = $request->string('order');

        $payment = Payment::where('order_id', $order)
            ->with('course', 'storeOrder.items', 'user')
            ->first();

        if (! $payment || $payment->user_id !== $request->user()->id) {
            return null;
        }

        $description = $payment->storeOrder
            ? $payment->storeOrder->items->map(fn ($item) => $item->product_name.' x'.$item->quantity)->join(', ')
            : ($payment->course?->title ?? 'Course tidak tersedia');

        return [
            'order_id' => $payment->order_id,
            'amount' => $payment->amount,
            'description' => $description,
            'type' => $payment->store_order_id ? 'Order Toko' : 'Kursus',
            'course' => $payment->course?->title ?? $description,
            'student' => $payment->user?->name ?? 'User tidak tersedia',
            'status' => $payment->status,
            'snap_token' => $payment->snap_token,
            'checkout_url' => $payment->checkout_url,
            'id' => $payment->id,
        ];
    }
}
