<?php

namespace App\Http\Controllers;

use App\Models\ActivationCode;
use App\Models\Product;
use App\Models\ProductCategory;
use App\Models\StoreOrder;
use App\Services\ActivationCodeService;
use App\Services\StoreOrderService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class StorefrontController extends Controller
{
    public function catalog(): Response
    {
        return Inertia::render('store/catalog', [
            'categories' => ProductCategory::query()
                ->where('status', 'active')
                ->orderBy('name')
                ->get(['id', 'name', 'slug']),
            'products' => Product::query()
                ->with('category')
                ->published()
                ->orderByDesc('updated_at')
                ->get()
                ->map(fn (Product $product) => $this->productCard($product)),
        ]);
    }

    public function show(Product $product): Response
    {
        abort_unless($product->status === 'published', 404);
        $product->load(['category', 'bundleItems.item', 'courseAccesses.course', 'courseAccesses.learningPath']);

        return Inertia::render('store/show', [
            'product' => [
                ...$this->productCard($product),
                'description' => $product->description,
                'weightGram' => $product->weight_gram,
                'bundleItems' => $product->bundleItems->map(fn ($item) => [
                    'name' => $item->item?->name ?? 'Produk tidak tersedia',
                    'quantity' => $item->quantity,
                    'type' => $item->item?->type,
                ])->values(),
                'courseAccesses' => $product->courseAccesses->map(fn ($access) => [
                    'title' => $access->course?->title ?? $access->learningPath?->title ?? 'Materi tidak tersedia',
                    'type' => $access->course_id ? 'Course' : 'Learning Path',
                    'deliveryMode' => $access->delivery_mode,
                    'codeValidDays' => $access->code_valid_days,
                ])->values(),
            ],
        ]);
    }

    public function checkout(Request $request): Response
    {
        $product = Product::query()->published()->findOrFail($request->integer('product'));

        return Inertia::render('store/checkout', [
            'product' => $this->productCard($product),
            'user' => [
                'name' => $request->user()->name,
                'phone' => $request->user()->phone,
                'address' => $request->user()->address,
            ],
        ]);
    }

    public function storeCheckout(Request $request, StoreOrderService $orders): RedirectResponse
    {
        $data = $request->validate([
            'product_id' => ['required', 'exists:products,id'],
            'quantity' => ['required', 'integer', 'min:1', 'max:99'],
            'recipient_name' => ['required', 'string', 'max:255'],
            'recipient_phone' => ['nullable', 'string', 'max:50'],
            'shipping_address' => ['nullable', 'string', 'max:1000'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);
        $product = Product::query()->published()->findOrFail($data['product_id']);

        if ($product->type !== 'digital' && blank($data['shipping_address'])) {
            throw ValidationException::withMessages(['shipping_address' => 'Alamat pengiriman wajib diisi untuk produk fisik.']);
        }

        $result = $orders->createOrder($request->user(), $product, (int) $data['quantity'], $data);

        return redirect()->to($result['checkout_url'])
            ->with('success', 'Order berhasil dibuat. Silakan lanjutkan pembayaran.');
    }

    public function orders(Request $request): Response
    {
        return Inertia::render('store/orders', [
            'orders' => StoreOrder::query()
                ->with(['items', 'activationCodes.course', 'activationCodes.learningPath', 'payment'])
                ->where('user_id', $request->user()->id)
                ->orderByDesc('created_at')
                ->get()
                ->map(fn (StoreOrder $order) => [
                    'id' => $order->id,
                    'orderNumber' => $order->order_number,
                    'totalLabel' => $this->rupiah($order->total),
                    'paymentStatus' => $order->payment_status,
                    'fulfillmentStatus' => $order->fulfillment_status,
                    'digitalStatus' => $order->digital_status,
                    'checkoutUrl' => $order->payment?->checkout_url,
                    'trackingNumber' => $order->tracking_number,
                    'courier' => $order->courier,
                    'createdAt' => $order->created_at?->toDateTimeString(),
                    'items' => $order->items->map(fn ($item) => [
                        'name' => $item->product_name,
                        'quantity' => $item->quantity,
                        'totalLabel' => $this->rupiah($item->total),
                    ])->values(),
                    'activationCodes' => $order->activationCodes->map(fn ($code) => [
                        'code' => $code->code,
                        'status' => $code->status,
                        'target' => $code->course?->title ?? $code->learningPath?->title ?? 'Materi',
                        'expiresAt' => $code->expires_at?->toDateString(),
                    ])->values(),
                ]),
            'redeemedCodes' => ActivationCode::query()
                ->with(['course:id,title', 'learningPath:id,title'])
                ->where('redeemed_by', $request->user()->id)
                ->orderByDesc('redeemed_at')
                ->get()
                ->map(fn (ActivationCode $code) => [
                    'code' => $code->code,
                    'target' => $code->course?->title ?? $code->learningPath?->title ?? 'Materi',
                    'redeemedAt' => $code->redeemed_at?->toDateTimeString(),
                ]),
        ]);
    }

    public function redeem(Request $request): Response
    {
        return Inertia::render('store/redeem');
    }

    public function storeRedeem(Request $request, ActivationCodeService $activationCodes): RedirectResponse
    {
        $data = $request->validate([
            'code' => ['required', 'string', 'max:50'],
        ]);

        $activationCodes->redeem($request->user(), $data['code']);

        return to_route('store.orders')->with('success', 'Kode aktivasi berhasil digunakan. Materi sudah aktif di akun Anda.');
    }

    private function productCard(Product $product): array
    {
        return [
            'id' => $product->id,
            'categoryId' => $product->product_category_id,
            'category' => $product->category?->name ?? 'Tanpa kategori',
            'type' => $product->type,
            'sku' => $product->sku,
            'name' => $product->name,
            'slug' => $product->slug,
            'summary' => $product->summary,
            'price' => $product->price,
            'priceLabel' => $this->rupiah($product->price),
            'stock' => $product->stock,
            'imageUrl' => $product->image_path ? '/storage/'.ltrim($product->image_path, '/') : '/logo.png',
            'detailUrl' => route('store.products.show', $product->slug),
            'checkoutUrl' => route('store.checkout', ['product' => $product->id]),
        ];
    }

    private function rupiah(int $amount): string
    {
        return 'Rp '.number_format($amount, 0, ',', '.');
    }
}
