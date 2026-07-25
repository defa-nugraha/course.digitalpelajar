<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Product extends Model
{
    use HasFactory;

    protected $fillable = [
        'product_category_id',
        'type',
        'sku',
        'name',
        'slug',
        'summary',
        'description',
        'price',
        'stock',
        'weight_gram',
        'image_path',
        'status',
        'meta_title',
        'meta_description',
    ];

    protected $casts = [
        'price' => 'integer',
        'stock' => 'integer',
        'weight_gram' => 'integer',
    ];

    public function category(): BelongsTo
    {
        return $this->belongsTo(ProductCategory::class, 'product_category_id');
    }

    public function images(): HasMany
    {
        return $this->hasMany(ProductImage::class)->orderBy('sort_order');
    }

    public function bundleItems(): HasMany
    {
        return $this->hasMany(ProductBundleItem::class, 'bundle_product_id');
    }

    public function courseAccesses(): HasMany
    {
        return $this->hasMany(ProductCourseAccess::class);
    }

    public function orderItems(): HasMany
    {
        return $this->hasMany(StoreOrderItem::class);
    }

    public function stockMovements(): HasMany
    {
        return $this->hasMany(StockMovement::class);
    }

    public function scopePublished(Builder $query): Builder
    {
        return $query->where('status', 'published');
    }

    public function isBundle(): bool
    {
        return $this->type === 'bundle';
    }

    public function requiresStock(): bool
    {
        return in_array($this->type, ['physical'], true);
    }
}
