<?php

namespace App\Services;

use App\Models\ActivationCode;
use App\Models\Enrollment;
use App\Models\Payment;
use App\Models\Product;
use App\Models\ProductCourseAccess;
use App\Models\StockMovement;
use App\Models\StoreOrder;
use App\Models\StoreOrderItem;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class StoreOrderService
{
    public function __construct(
        private readonly MidtransService $midtrans,
        private readonly ActivationCodeService $activationCodes,
    ) {}

    /**
     * @return array{order: StoreOrder, payment: Payment, checkout_url: string}
     */
    public function createOrder(User $user, Product $product, int $quantity, array $payload = []): array
    {
        abort_unless(in_array($user->role, ['student', 'school_teacher', 'internal_instructor', 'admin'], true), 403);
        abort_unless($product->status === 'published', 404);

        if ($quantity < 1 || $quantity > 99) {
            throw ValidationException::withMessages(['quantity' => 'Jumlah pembelian tidak valid.']);
        }

        return DB::transaction(function () use ($user, $product, $quantity, $payload) {
            $product = Product::query()->whereKey($product->id)->lockForUpdate()->firstOrFail();
            $stockItems = $this->stockItemsForProduct($product, $quantity);
            $this->assertAndReserveStock($stockItems, $user);

            $subtotal = $product->price * $quantity;
            $shippingTotal = (int) ($payload['shipping_total'] ?? 0);
            $total = max(0, $subtotal + $shippingTotal);

            $order = StoreOrder::query()->create([
                'user_id' => $user->id,
                'order_number' => $this->generateOrderNumber(),
                'subtotal' => $subtotal,
                'shipping_total' => $shippingTotal,
                'discount_total' => 0,
                'total' => $total,
                'payment_status' => 'pending',
                'fulfillment_status' => $this->hasPhysicalItems($stockItems) ? 'waiting_payment' : 'not_required',
                'digital_status' => $this->accessesForProduct($product)->isEmpty() ? 'not_required' : 'not_activated',
                'recipient_name' => $payload['recipient_name'] ?? $user->name,
                'recipient_phone' => $payload['recipient_phone'] ?? $user->phone,
                'shipping_address' => $payload['shipping_address'] ?? $user->address,
                'notes' => $payload['notes'] ?? null,
            ]);

            $orderItem = $order->items()->create([
                'product_id' => $product->id,
                'item_type' => $product->type,
                'product_name' => $product->name,
                'sku' => $product->sku,
                'quantity' => $quantity,
                'unit_price' => $product->price,
                'total' => $subtotal,
            ]);

            foreach ($stockItems as $stockItem) {
                $this->recordStockOut($stockItem['product'], $stockItem['quantity'], $orderItem, $user);
            }

            $payment = Payment::query()->create([
                'user_id' => $user->id,
                'course_id' => null,
                'store_order_id' => $order->id,
                'order_id' => $this->midtrans->generateOrderId(),
                'amount' => $total,
                'status' => 'pending',
            ]);

            $tx = $this->midtrans->createTransaction($payment);
            $payment->update([
                'snap_token' => $tx['snap_token'],
                'checkout_url' => $tx['checkout_url'],
            ]);

            AuditLogger::log('store_order.created', $user, $order, [
                'product_id' => $product->id,
                'quantity' => $quantity,
                'payment_id' => $payment->id,
            ]);

            return [
                'order' => $order->fresh(['items']),
                'payment' => $payment->fresh(),
                'checkout_url' => $payment->checkout_url,
            ];
        });
    }

    public function activateFromPayment(Payment $payment): ?StoreOrder
    {
        if (! $payment->store_order_id) {
            return null;
        }

        return DB::transaction(function () use ($payment) {
            $order = StoreOrder::query()
                ->with('items.product.courseAccesses')
                ->whereKey($payment->store_order_id)
                ->lockForUpdate()
                ->firstOrFail();

            if ($order->payment_status === 'paid') {
                return $order->fresh(['items', 'activationCodes']);
            }

            $order->update([
                'payment_status' => 'paid',
                'fulfillment_status' => $order->fulfillment_status === 'waiting_payment' ? 'processing' : $order->fulfillment_status,
                'paid_at' => now(),
            ]);

            $generatedCodes = 0;
            $autoEnrollments = 0;

            foreach ($order->items as $item) {
                if (! $item->product) {
                    continue;
                }

                foreach ($this->accessesForProduct($item->product) as $access) {
                    for ($i = 0; $i < $item->quantity; $i++) {
                        if ($access->delivery_mode === 'activation_code') {
                            $this->createActivationCode($order, $item, $access);
                            $generatedCodes++;
                        } else {
                            $autoEnrollments += $this->grantAccess($order->user, $access);
                        }
                    }
                }
            }

            $order->update([
                'digital_status' => $generatedCodes > 0
                    ? 'code_issued'
                    : ($autoEnrollments > 0 ? 'activated' : $order->digital_status),
            ]);

            AuditLogger::log('store_order.paid', $order->user, $order, [
                'payment_id' => $payment->id,
                'activation_codes' => $generatedCodes,
                'auto_enrollments' => $autoEnrollments,
            ]);

            return $order->fresh(['items', 'activationCodes']);
        });
    }

    private function stockItemsForProduct(Product $product, int $quantity): Collection
    {
        if ($product->isBundle()) {
            return $product->bundleItems()
                ->with('item')
                ->get()
                ->filter(fn ($item) => $item->item?->requiresStock())
                ->map(fn ($item) => [
                    'product' => $item->item,
                    'quantity' => $item->quantity * $quantity,
                ])
                ->values();
        }

        return $product->requiresStock()
            ? collect([['product' => $product, 'quantity' => $quantity]])
            : collect();
    }

    private function assertAndReserveStock(Collection $stockItems, User $user): void
    {
        foreach ($stockItems as $stockItem) {
            /** @var Product $stockProduct */
            $stockProduct = Product::query()->whereKey($stockItem['product']->id)->lockForUpdate()->firstOrFail();

            if ($stockProduct->stock < $stockItem['quantity']) {
                throw ValidationException::withMessages([
                    'quantity' => "Stok {$stockProduct->name} tidak cukup.",
                ]);
            }
        }
    }

    private function recordStockOut(Product $product, int $quantity, StoreOrderItem $orderItem, User $user): void
    {
        $product = Product::query()->whereKey($product->id)->lockForUpdate()->firstOrFail();
        $before = $product->stock;
        $after = $before - $quantity;

        $product->update(['stock' => $after]);

        StockMovement::query()->create([
            'product_id' => $product->id,
            'store_order_item_id' => $orderItem->id,
            'user_id' => $user->id,
            'type' => 'sale',
            'quantity' => -$quantity,
            'stock_before' => $before,
            'stock_after' => $after,
            'notes' => 'Reservasi stok untuk order '.$orderItem->order->order_number,
        ]);
    }

    private function accessesForProduct(Product $product): Collection
    {
        $accesses = $product->courseAccesses()->get();

        if ($product->isBundle()) {
            $bundleAccesses = ProductCourseAccess::query()
                ->whereIn('product_id', $product->bundleItems()->pluck('item_product_id'))
                ->get();

            $accesses = $accesses->merge($bundleAccesses);
        }

        return $accesses;
    }

    private function createActivationCode(StoreOrder $order, StoreOrderItem $item, ProductCourseAccess $access): ActivationCode
    {
        return ActivationCode::query()->create([
            'code' => $this->activationCodes->generateUniqueCode('KIT'),
            'product_id' => $item->product_id,
            'store_order_id' => $order->id,
            'store_order_item_id' => $item->id,
            'course_id' => $access->course_id,
            'learning_path_id' => $access->learning_path_id,
            'assigned_user_id' => $order->user_id,
            'status' => 'unused',
            'expires_at' => $access->code_valid_days ? now()->addDays($access->code_valid_days) : null,
        ]);
    }

    private function grantAccess(?User $user, ProductCourseAccess $access): int
    {
        if (! $user) {
            return 0;
        }

        $courseIds = collect();

        if ($access->course_id) {
            $courseIds->push($access->course_id);
        }

        if ($access->learning_path_id) {
            $courseIds = $courseIds->merge(DB::table('courses')
                ->where('learning_path_id', $access->learning_path_id)
                ->where('status', 'published')
                ->pluck('id'));
        }

        foreach ($courseIds->filter()->unique() as $courseId) {
            Enrollment::query()->updateOrCreate(
                ['user_id' => $user->id, 'course_id' => $courseId],
                ['status' => 'active'],
            );
        }

        return $courseIds->filter()->unique()->count();
    }

    private function hasPhysicalItems(Collection $stockItems): bool
    {
        return $stockItems->isNotEmpty();
    }

    private function generateOrderNumber(): string
    {
        do {
            $number = 'STORE-'.now()->format('ymd').'-'.strtoupper(Str::random(6));
        } while (StoreOrder::query()->where('order_number', $number)->exists());

        return $number;
    }
}
