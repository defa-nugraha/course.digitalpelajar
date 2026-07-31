<?php

use App\Models\Course;
use App\Models\Enrollment;
use App\Models\Product;
use App\Models\ProductBundleItem;
use App\Models\ProductCourseAccess;
use App\Models\StockMovement;
use App\Models\User;
use App\Services\ActivationCodeService;
use App\Services\StoreOrderService;

test('student can buy robot kit bundle and redeem activation code for course access', function () {
    $student = User::factory()->student()->create([
        'phone' => '08123456789',
        'address' => 'Jl. Robotika No. 1',
    ]);
    $course = Course::factory()->paid()->create(['status' => 'published']);
    $kit = Product::factory()->create([
        'type' => 'physical',
        'name' => 'Kit Robotik Arduino',
        'stock' => 5,
        'price' => 350000,
    ]);
    $bundle = Product::factory()->bundle()->create([
        'name' => 'Paket A Kit Robotik dan Materi',
        'price' => 500000,
        'status' => 'published',
    ]);

    ProductBundleItem::create([
        'bundle_product_id' => $bundle->id,
        'item_product_id' => $kit->id,
        'quantity' => 1,
    ]);
    ProductCourseAccess::create([
        'product_id' => $bundle->id,
        'course_id' => $course->id,
        'delivery_mode' => 'activation_code',
        'code_valid_days' => 30,
    ]);

    $result = app(StoreOrderService::class)->createOrder($student, $bundle, 2, [
        'recipient_name' => 'Siswa Robotik',
        'recipient_phone' => '08123456789',
        'shipping_address' => 'Jl. Robotika No. 1',
    ]);

    expect($result['order']->total)->toBe(1000000)
        ->and($result['payment']->amount)->toBe(1000000)
        ->and($kit->fresh()->stock)->toBe(3);

    expect(StockMovement::query()->where('product_id', $kit->id)->where('quantity', -2)->exists())->toBeTrue();

    $this->actingAs($student)
        ->post("/payments/{$result['payment']->id}/mock-settle", [
            'payment_method' => 'qris',
        ])
        ->assertRedirect(route('store.orders'))
        ->assertSessionHas('success');

    $order = $result['order']->fresh(['activationCodes']);
    expect($order->payment_status)->toBe('paid')
        ->and($order->fulfillment_status)->toBe('processing')
        ->and($order->digital_status)->toBe('code_issued')
        ->and($order->activationCodes)->toHaveCount(2);

    expect(Enrollment::query()->whereBelongsTo($student)->whereBelongsTo($course)->exists())->toBeFalse();

    app(ActivationCodeService::class)->redeem($student, $order->activationCodes->first()->code);

    $this->assertDatabaseHas('activation_codes', [
        'id' => $order->activationCodes->first()->id,
        'status' => 'redeemed',
        'redeemed_by' => $student->id,
    ]);
    $this->assertDatabaseHas('enrollments', [
        'user_id' => $student->id,
        'course_id' => $course->id,
        'status' => 'active',
    ]);
});
