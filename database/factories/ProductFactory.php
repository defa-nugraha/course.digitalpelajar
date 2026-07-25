<?php

namespace Database\Factories;

use App\Models\Product;
use App\Models\ProductCategory;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Product>
 */
class ProductFactory extends Factory
{
    protected $model = Product::class;

    public function definition(): array
    {
        $name = Str::title(fake()->words(4, true));

        return [
            'product_category_id' => ProductCategory::factory(),
            'type' => 'physical',
            'sku' => 'SKU-'.strtoupper(Str::random(8)),
            'name' => $name,
            'slug' => Str::slug($name).'-'.fake()->unique()->numberBetween(1000, 9999),
            'summary' => fake()->sentence(10),
            'description' => fake()->paragraph(),
            'price' => 350000,
            'stock' => 10,
            'weight_gram' => 500,
            'status' => 'published',
            'meta_title' => $name.' | Digital Pelajar Store',
            'meta_description' => fake()->sentence(18),
        ];
    }

    public function bundle(): static
    {
        return $this->state(fn () => [
            'type' => 'bundle',
            'sku' => 'BND-'.strtoupper(Str::random(8)),
            'stock' => 0,
            'weight_gram' => 0,
        ]);
    }

    public function digital(): static
    {
        return $this->state(fn () => [
            'type' => 'digital',
            'sku' => 'DIG-'.strtoupper(Str::random(8)),
            'stock' => 0,
            'weight_gram' => 0,
        ]);
    }
}
