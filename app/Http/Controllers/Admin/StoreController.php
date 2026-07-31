<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ActivationCode;
use App\Models\Course;
use App\Models\LearningPath;
use App\Models\Product;
use App\Models\ProductCategory;
use App\Models\StockMovement;
use App\Models\StoreOrder;
use App\Services\ActivationCodeService;
use App\Services\AuditLogger;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class StoreController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('admin/store', [
            'categories' => $this->categoryRows(),
            'products' => $this->productRows(),
            'orders' => $this->orderRows(),
            'activationCodes' => $this->activationCodeRows(),
            'courses' => Course::query()->where('status', 'published')->orderBy('title')->get(['id', 'title']),
            'learningPaths' => LearningPath::query()->where('status', 'published')->orderBy('title')->get(['id', 'title']),
        ]);
    }

    public function storeCategory(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'slug' => ['nullable', 'string', 'max:255', 'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/', 'unique:product_categories,slug'],
            'description' => ['nullable', 'string', 'max:1000'],
            'status' => ['required', Rule::in(['active', 'inactive'])],
            'meta_title' => ['nullable', 'string', 'max:255'],
            'meta_description' => ['nullable', 'string', 'max:500'],
        ]);
        $data['slug'] = $data['slug'] ?: $this->uniqueSlug(ProductCategory::class, $data['name']);

        $category = ProductCategory::create($data);
        AuditLogger::log('product_category.created', $request->user(), $category);

        return back()->with('success', 'Kategori produk berhasil ditambahkan.');
    }

    public function updateCategory(Request $request, ProductCategory $category): RedirectResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'slug' => ['nullable', 'string', 'max:255', 'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/', Rule::unique('product_categories', 'slug')->ignore($category->id)],
            'description' => ['nullable', 'string', 'max:1000'],
            'status' => ['required', Rule::in(['active', 'inactive'])],
            'meta_title' => ['nullable', 'string', 'max:255'],
            'meta_description' => ['nullable', 'string', 'max:500'],
        ]);
        $data['slug'] = $data['slug'] ?: $this->uniqueSlug(ProductCategory::class, $data['name'], $category->id);

        $category->update($data);
        AuditLogger::log('product_category.updated', $request->user(), $category);

        return back()->with('success', 'Kategori produk berhasil diperbarui.');
    }

    public function destroyCategory(Request $request, ProductCategory $category): RedirectResponse
    {
        AuditLogger::log('product_category.deleted', $request->user(), $category, ['name' => $category->name]);
        $category->delete();

        return back()->with('success', 'Kategori produk berhasil dihapus.');
    }

    public function storeProduct(Request $request): RedirectResponse
    {
        $data = $this->validatedProduct($request);

        $product = DB::transaction(function () use ($request, $data) {
            $product = Product::create($this->productPayload($request, $data));
            $this->syncProductRelations($product, $data);

            return $product;
        });
        AuditLogger::log('product.created', $request->user(), $product);

        return back()->with('success', 'Produk berhasil ditambahkan.');
    }

    public function updateProduct(Request $request, Product $product): RedirectResponse
    {
        $data = $this->validatedProduct($request, $product);

        DB::transaction(function () use ($request, $product, $data) {
            $product->update($this->productPayload($request, $data, $product));
            $this->syncProductRelations($product, $data);
        });
        AuditLogger::log('product.updated', $request->user(), $product);

        return back()->with('success', 'Produk berhasil diperbarui.');
    }

    public function destroyProduct(Request $request, Product $product): RedirectResponse
    {
        $this->deletePublicImage($product->image_path);
        AuditLogger::log('product.deleted', $request->user(), $product, ['name' => $product->name]);
        $product->delete();

        return back()->with('success', 'Produk berhasil dihapus.');
    }

    public function adjustStock(Request $request, Product $product): RedirectResponse
    {
        $data = $request->validate([
            'quantity' => ['required', 'integer', 'not_in:0'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        DB::transaction(function () use ($request, $product, $data) {
            $product = Product::query()->whereKey($product->id)->lockForUpdate()->firstOrFail();
            $before = $product->stock;
            $after = $before + (int) $data['quantity'];

            if ($after < 0) {
                throw ValidationException::withMessages(['quantity' => 'Stok tidak boleh kurang dari 0.']);
            }

            $product->update(['stock' => $after]);
            StockMovement::create([
                'product_id' => $product->id,
                'user_id' => $request->user()->id,
                'type' => 'adjustment',
                'quantity' => (int) $data['quantity'],
                'stock_before' => $before,
                'stock_after' => $after,
                'notes' => $data['notes'] ?: 'Penyesuaian stok admin.',
            ]);
        });

        return back()->with('success', 'Stok produk berhasil disesuaikan.');
    }

    public function updateOrder(Request $request, StoreOrder $order): RedirectResponse
    {
        $data = $request->validate([
            'fulfillment_status' => ['required', Rule::in(['waiting_payment', 'processing', 'packed', 'shipped', 'delivered', 'cancelled', 'not_required'])],
            'courier' => ['nullable', 'string', 'max:100'],
            'tracking_number' => ['nullable', 'string', 'max:150'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        $order->update($data);
        AuditLogger::log('store_order.updated', $request->user(), $order);

        return back()->with('success', 'Order berhasil diperbarui.');
    }

    public function generateActivationCodes(Request $request, ActivationCodeService $activationCodes): RedirectResponse
    {
        $data = $request->validate([
            'product_id' => ['nullable', 'exists:products,id'],
            'course_id' => ['nullable', 'exists:courses,id'],
            'learning_path_id' => ['nullable', 'exists:learning_paths,id'],
            'assigned_user_id' => ['nullable', 'exists:users,id'],
            'quantity' => ['required', 'integer', 'min:1', 'max:200'],
            'expires_at' => ['nullable', 'date', 'after:today'],
        ]);

        if (! $data['course_id'] && ! $data['learning_path_id']) {
            throw ValidationException::withMessages(['course_id' => 'Pilih course atau learning path untuk kode aktivasi.']);
        }

        DB::transaction(function () use ($request, $data, $activationCodes) {
            for ($i = 0; $i < $data['quantity']; $i++) {
                $code = ActivationCode::create([
                    'code' => $activationCodes->generateUniqueCode('KIT'),
                    'product_id' => $data['product_id'] ?: null,
                    'course_id' => $data['course_id'] ?: null,
                    'learning_path_id' => $data['learning_path_id'] ?: null,
                    'assigned_user_id' => $data['assigned_user_id'] ?: null,
                    'status' => 'unused',
                    'expires_at' => $data['expires_at'] ?: null,
                ]);

                AuditLogger::log('activation_code.created', $request->user(), $code);
            }
        });

        return back()->with('success', 'Kode aktivasi berhasil dibuat.');
    }

    private function validatedProduct(Request $request, ?Product $product = null): array
    {
        $data = $request->validate([
            'product_category_id' => ['nullable', 'exists:product_categories,id'],
            'type' => ['required', Rule::in(['physical', 'digital', 'bundle'])],
            'sku' => ['nullable', 'string', 'max:100', Rule::unique('products', 'sku')->ignore($product?->id)],
            'name' => ['required', 'string', 'max:255'],
            'slug' => ['nullable', 'string', 'max:255', 'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/', Rule::unique('products', 'slug')->ignore($product?->id)],
            'summary' => ['nullable', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:5000'],
            'price' => ['required', 'integer', 'min:0'],
            'stock' => ['required', 'integer', 'min:0'],
            'weight_gram' => ['nullable', 'integer', 'min:0'],
            'image_path' => ['nullable', 'string', 'max:2048'],
            'image' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:4096'],
            'status' => ['required', Rule::in(['draft', 'published', 'archived'])],
            'meta_title' => ['nullable', 'string', 'max:255'],
            'meta_description' => ['nullable', 'string', 'max:500'],
            'bundle_items' => ['sometimes', 'array'],
            'bundle_items.*.product_id' => ['required_with:bundle_items', 'integer', 'exists:products,id'],
            'bundle_items.*.quantity' => ['required_with:bundle_items', 'integer', 'min:1', 'max:999'],
            'course_accesses' => ['sometimes', 'array'],
            'course_accesses.*.course_id' => ['nullable', 'integer', 'exists:courses,id'],
            'course_accesses.*.learning_path_id' => ['nullable', 'integer', 'exists:learning_paths,id'],
            'course_accesses.*.delivery_mode' => ['required_with:course_accesses', Rule::in(['auto_enroll', 'activation_code'])],
            'course_accesses.*.code_valid_days' => ['nullable', 'integer', 'min:1', 'max:3650'],
        ]);

        foreach ($data['course_accesses'] ?? [] as $index => $access) {
            if (empty($access['course_id']) && empty($access['learning_path_id'])) {
                throw ValidationException::withMessages(["course_accesses.$index.course_id" => 'Pilih course atau learning path.']);
            }
        }

        return $data;
    }

    private function productPayload(Request $request, array $data, ?Product $product = null): array
    {
        $payload = collect($data)
            ->only([
                'product_category_id',
                'type',
                'sku',
                'name',
                'summary',
                'description',
                'price',
                'stock',
                'weight_gram',
                'image_path',
                'status',
                'meta_title',
                'meta_description',
            ])
            ->all();
        $payload['slug'] = $data['slug'] ?: $this->uniqueSlug(Product::class, $data['name'], $product?->id);
        $payload['image_path'] = $this->normalizePublicPath($payload['image_path'] ?? null);

        if ($request->hasFile('image')) {
            $this->deletePublicImage($product?->image_path);
            $payload['image_path'] = $request->file('image')->store('products', 'public');
        }

        return $payload;
    }

    private function syncProductRelations(Product $product, array $data): void
    {
        $product->bundleItems()->delete();
        if ($product->type === 'bundle') {
            foreach ($data['bundle_items'] ?? [] as $item) {
                if ((int) $item['product_id'] === $product->id) {
                    continue;
                }

                $product->bundleItems()->create([
                    'item_product_id' => $item['product_id'],
                    'quantity' => $item['quantity'],
                ]);
            }
        }

        $product->courseAccesses()->delete();
        foreach ($data['course_accesses'] ?? [] as $access) {
            $product->courseAccesses()->create([
                'course_id' => $access['course_id'] ?: null,
                'learning_path_id' => $access['learning_path_id'] ?: null,
                'delivery_mode' => $access['delivery_mode'],
                'code_valid_days' => $access['code_valid_days'] ?: null,
            ]);
        }
    }

    private function categoryRows()
    {
        return ProductCategory::query()
            ->withCount('products')
            ->orderBy('name')
            ->get()
            ->map(fn (ProductCategory $category) => [
                'id' => $category->id,
                'name' => $category->name,
                'slug' => $category->slug,
                'description' => $category->description,
                'status' => $category->status,
                'products' => $category->products_count,
                'metaTitle' => $category->meta_title,
                'metaDescription' => $category->meta_description,
            ]);
    }

    private function productRows()
    {
        return Product::query()
            ->with(['category', 'bundleItems.item:id,name,sku,stock,type', 'courseAccesses.course:id,title', 'courseAccesses.learningPath:id,title'])
            ->orderByDesc('updated_at')
            ->get()
            ->map(fn (Product $product) => [
                'id' => $product->id,
                'categoryId' => $product->product_category_id,
                'category' => $product->category?->name ?? 'Tanpa kategori',
                'type' => $product->type,
                'sku' => $product->sku,
                'name' => $product->name,
                'slug' => $product->slug,
                'summary' => $product->summary,
                'description' => $product->description,
                'price' => $product->price,
                'priceLabel' => $this->rupiah($product->price),
                'stock' => $product->stock,
                'weightGram' => $product->weight_gram,
                'imagePath' => $product->image_path,
                'imageUrl' => $this->publicStorageUrl($product->image_path),
                'status' => $product->status,
                'metaTitle' => $product->meta_title,
                'metaDescription' => $product->meta_description,
                'bundleItems' => $product->bundleItems->map(fn ($item) => [
                    'productId' => $item->item_product_id,
                    'name' => $item->item?->name ?? 'Produk tidak tersedia',
                    'quantity' => $item->quantity,
                ])->values(),
                'courseAccesses' => $product->courseAccesses->map(fn ($access) => [
                    'courseId' => $access->course_id,
                    'learningPathId' => $access->learning_path_id,
                    'title' => $access->course?->title ?? $access->learningPath?->title ?? 'Materi tidak tersedia',
                    'deliveryMode' => $access->delivery_mode,
                    'codeValidDays' => $access->code_valid_days,
                ])->values(),
            ]);
    }

    private function orderRows()
    {
        return StoreOrder::query()
            ->with(['user:id,name,email', 'items.product:id,name', 'payment:id,store_order_id,order_id,status,checkout_url', 'activationCodes:id,store_order_id,code,status,redeemed_by'])
            ->orderByDesc('created_at')
            ->limit(200)
            ->get()
            ->map(fn (StoreOrder $order) => [
                'id' => $order->id,
                'orderNumber' => $order->order_number,
                'customer' => $order->user?->name ?? 'User tidak tersedia',
                'email' => $order->user?->email ?? '-',
                'total' => $order->total,
                'totalLabel' => $this->rupiah($order->total),
                'paymentStatus' => $order->payment_status,
                'fulfillmentStatus' => $order->fulfillment_status,
                'digitalStatus' => $order->digital_status,
                'recipientName' => $order->recipient_name,
                'recipientPhone' => $order->recipient_phone,
                'shippingAddress' => $order->shipping_address,
                'courier' => $order->courier,
                'trackingNumber' => $order->tracking_number,
                'notes' => $order->notes,
                'createdAt' => $order->created_at?->toDateTimeString(),
                'items' => $order->items->map(fn ($item) => [
                    'name' => $item->product_name,
                    'quantity' => $item->quantity,
                    'totalLabel' => $this->rupiah($item->total),
                ])->values(),
                'activationCodes' => $order->activationCodes->map(fn ($code) => [
                    'code' => $code->code,
                    'status' => $code->status,
                ])->values(),
            ]);
    }

    private function activationCodeRows()
    {
        return ActivationCode::query()
            ->with(['product:id,name', 'course:id,title', 'learningPath:id,title', 'assignedUser:id,name,email', 'redeemedBy:id,name,email'])
            ->orderByDesc('created_at')
            ->limit(300)
            ->get()
            ->map(fn (ActivationCode $code) => [
                'id' => $code->id,
                'code' => $code->code,
                'product' => $code->product?->name ?? '-',
                'target' => $code->course?->title ?? $code->learningPath?->title ?? '-',
                'assignedUser' => $code->assignedUser?->name ?? 'Bebas digunakan',
                'redeemedBy' => $code->redeemedBy?->name,
                'status' => $code->status,
                'expiresAt' => $code->expires_at?->toDateString(),
                'redeemedAt' => $code->redeemed_at?->toDateTimeString(),
            ]);
    }

    private function uniqueSlug(string $model, string $name, ?int $ignoreId = null): string
    {
        $base = Str::slug($name) ?: Str::random(8);
        $slug = $base;
        $index = 2;

        while ($model::query()->where('slug', $slug)->when($ignoreId, fn ($query) => $query->whereKeyNot($ignoreId))->exists()) {
            $slug = $base.'-'.$index++;
        }

        return $slug;
    }

    private function normalizePublicPath(?string $path): ?string
    {
        if (! filled($path)) {
            return null;
        }

        $path = trim($path);

        if (str_contains($path, '/storage/')) {
            return Str::after($path, '/storage/');
        }

        if (str_starts_with($path, 'storage/')) {
            return Str::after($path, 'storage/');
        }

        if (str_starts_with($path, '/')) {
            return null;
        }

        return $path;
    }

    private function deletePublicImage(?string $path): void
    {
        if (filled($path) && str_starts_with($path, 'products/')) {
            Storage::disk('public')->delete($path);
        }
    }

    private function publicStorageUrl(?string $path): ?string
    {
        return filled($path) ? '/storage/'.ltrim($path, '/') : null;
    }

    private function rupiah(int $amount): string
    {
        return 'Rp '.number_format($amount, 0, ',', '.');
    }
}
