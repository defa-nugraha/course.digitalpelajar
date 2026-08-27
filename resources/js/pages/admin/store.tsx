import { FormField } from '@/components/form-field';
import InputError from '@/components/input-error';
import { Panel, Shell, StatCard } from '@/components/platform';
import { DesktopTable, MobileActionMenu, MobileCardList, MobileDataCard, StatusBadge as ResponsiveStatusBadge } from '@/components/responsive-data';
import { SearchableSelect } from '@/components/searchable-select';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { confirmDelete } from '@/lib/confirm-delete';
import { cn } from '@/lib/utils';
import type { FormDataConvertible } from '@inertiajs/core';
import { Head, router, useForm } from '@inertiajs/react';
import { Boxes, KeyRound, Package, Pencil, Plus, ReceiptText, Trash2 } from 'lucide-react';
import { FormEvent, useState } from 'react';

type SimpleOption = { id: number; name?: string; title?: string };

interface CategoryRow {
    id: number;
    name: string;
    slug: string;
    description?: string | null;
    status: string;
    products: number;
    metaTitle?: string | null;
    metaDescription?: string | null;
}

interface ProductRow {
    id: number;
    categoryId?: number | null;
    category: string;
    type: string;
    sku?: string | null;
    name: string;
    slug: string;
    summary?: string | null;
    description?: string | null;
    price: number;
    priceLabel: string;
    stock: number;
    weightGram: number;
    imagePath?: string | null;
    imageUrl?: string | null;
    status: string;
    metaTitle?: string | null;
    metaDescription?: string | null;
    bundleItems: { productId: number; name: string; quantity: number }[];
    courseAccesses: {
        courseId?: number | null;
        learningPathId?: number | null;
        title: string;
        deliveryMode: string;
        codeValidDays?: number | null;
    }[];
}

interface OrderRow {
    id: number;
    orderNumber: string;
    customer: string;
    email: string;
    totalLabel: string;
    paymentStatus: string;
    fulfillmentStatus: string;
    digitalStatus: string;
    recipientName: string;
    recipientPhone?: string | null;
    shippingAddress?: string | null;
    courier?: string | null;
    trackingNumber?: string | null;
    notes?: string | null;
    createdAt?: string | null;
    items: { name: string; quantity: number; totalLabel: string }[];
    activationCodes: { code: string; status: string }[];
}

interface ActivationCodeRow {
    id: number;
    code: string;
    product: string;
    target: string;
    assignedUser: string;
    redeemedBy?: string | null;
    status: string;
    expiresAt?: string | null;
    redeemedAt?: string | null;
}

interface BundleInput {
    [key: string]: FormDataConvertible;
    product_id: string;
    quantity: string;
}

interface AccessInput {
    [key: string]: FormDataConvertible;
    course_id: string;
    learning_path_id: string;
    delivery_mode: string;
    code_valid_days: string;
}

interface ProductForm {
    [key: string]: FormDataConvertible;
    product_category_id: string;
    type: string;
    sku: string;
    name: string;
    slug: string;
    summary: string;
    description: string;
    price: string;
    stock: string;
    weight_gram: string;
    image_path: string;
    image: File | null;
    status: string;
    meta_title: string;
    meta_description: string;
    bundle_items: BundleInput[];
    course_accesses: AccessInput[];
}

interface CategoryForm {
    [key: string]: string;
    name: string;
    slug: string;
    description: string;
    status: string;
    meta_title: string;
    meta_description: string;
}

const blankCategory: CategoryForm = { name: '', slug: '', description: '', status: 'active', meta_title: '', meta_description: '' };
const blankProduct: ProductForm = {
    product_category_id: '',
    type: 'physical',
    sku: '',
    name: '',
    slug: '',
    summary: '',
    description: '',
    price: '0',
    stock: '0',
    weight_gram: '0',
    image_path: '',
    image: null,
    status: 'draft',
    meta_title: '',
    meta_description: '',
    bundle_items: [],
    course_accesses: [],
};

export default function AdminStore({
    categories,
    products,
    orders,
    activationCodes,
    courses,
    learningPaths,
}: {
    categories: CategoryRow[];
    products: ProductRow[];
    orders: OrderRow[];
    activationCodes: ActivationCodeRow[];
    courses: SimpleOption[];
    learningPaths: SimpleOption[];
}) {
    const [tab, setTab] = useState<'products' | 'categories' | 'orders' | 'codes'>('products');
    const publishedProducts = products.filter((product) => product.status === 'published').length;
    const paidOrders = orders.filter((order) => order.paymentStatus === 'paid').length;
    const unusedCodes = activationCodes.filter((code) => code.status === 'unused').length;

    return (
        <Shell title="Toko Robotik" eyebrow="Admin Pusat" nav="admin">
            <Head title="Toko Robotik" />
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-5">
                <StatCard label="Produk" value={String(products.length)} icon={Package} />
                <StatCard label="Produk Publish" value={String(publishedProducts)} icon={Boxes} tone="purple" />
                <StatCard label="Order Paid" value={String(paidOrders)} icon={ReceiptText} tone="amber" />
                <StatCard label="Kode Aktif" value={String(unusedCodes)} icon={KeyRound} tone="slate" />
            </div>

            <div className="scrollbar-none mt-6 flex gap-2 overflow-x-auto pb-1">
                {[
                    ['products', 'Produk'],
                    ['categories', 'Kategori'],
                    ['orders', 'Order'],
                    ['codes', 'Kode Aktivasi'],
                ].map(([value, label]) => (
                    <Button key={value} type="button" variant={tab === value ? 'default' : 'outline'} onClick={() => setTab(value as typeof tab)}>
                        {label}
                    </Button>
                ))}
            </div>

            {tab === 'products' && <ProductsPanel products={products} categories={categories} courses={courses} learningPaths={learningPaths} />}
            {tab === 'categories' && <CategoriesPanel categories={categories} />}
            {tab === 'orders' && <OrdersPanel orders={orders} />}
            {tab === 'codes' && <CodesPanel codes={activationCodes} products={products} courses={courses} learningPaths={learningPaths} />}
        </Shell>
    );
}

function ProductsPanel({
    products,
    categories,
    courses,
    learningPaths,
}: {
    products: ProductRow[];
    categories: CategoryRow[];
    courses: SimpleOption[];
    learningPaths: SimpleOption[];
}) {
    const [open, setOpen] = useState(false);
    const [stockOpen, setStockOpen] = useState(false);
    const [editing, setEditing] = useState<ProductRow | null>(null);
    const [stockProduct, setStockProduct] = useState<ProductRow | null>(null);
    const [term, setTerm] = useState('');
    const form = useForm<ProductForm>(blankProduct);
    const stockForm = useForm({ quantity: '1', notes: '' });
    const productOptions = products
        .filter((product) => product.type !== 'bundle')
        .map((product) => ({ value: String(product.id), label: product.name }));
    const visible = products.filter((product) =>
        `${product.name} ${product.sku ?? ''} ${product.category}`.toLowerCase().includes(term.toLowerCase()),
    );

    const showCreate = () => {
        setEditing(null);
        form.setData({ ...blankProduct });
        form.clearErrors();
        setOpen(true);
    };

    const showEdit = (product: ProductRow) => {
        setEditing(product);
        form.setData({
            product_category_id: product.categoryId ? String(product.categoryId) : '',
            type: product.type,
            sku: product.sku ?? '',
            name: product.name,
            slug: product.slug,
            summary: product.summary ?? '',
            description: product.description ?? '',
            price: String(product.price),
            stock: String(product.stock),
            weight_gram: String(product.weightGram ?? 0),
            image_path: product.imagePath ?? '',
            image: null,
            status: product.status,
            meta_title: product.metaTitle ?? '',
            meta_description: product.metaDescription ?? '',
            bundle_items: product.bundleItems.map((item) => ({ product_id: String(item.productId), quantity: String(item.quantity) })),
            course_accesses: product.courseAccesses.map((access) => ({
                course_id: access.courseId ? String(access.courseId) : '',
                learning_path_id: access.learningPathId ? String(access.learningPathId) : '',
                delivery_mode: access.deliveryMode,
                code_valid_days: access.codeValidDays ? String(access.codeValidDays) : '',
            })),
        });
        form.clearErrors();
        setOpen(true);
    };

    const submit = (event: FormEvent) => {
        event.preventDefault();
        const options = { preserveScroll: true, forceFormData: true, onSuccess: () => setOpen(false) };

        if (editing) {
            form.transform((data) => ({ ...data, _method: 'patch' }));
            form.post(`/admin/store/products/${editing.id}`, options);
        } else {
            form.transform((data) => data);
            form.post('/admin/store/products', options);
        }
    };

    const remove = (product: ProductRow) => {
        confirmDelete(`Hapus produk "${product.name}"?`, () => router.delete(`/admin/store/products/${product.id}`, { preserveScroll: true }));
    };

    const adjustStock = (event: FormEvent) => {
        event.preventDefault();
        if (!stockProduct) return;

        stockForm.patch(`/admin/store/products/${stockProduct.id}/stock`, {
            preserveScroll: true,
            onSuccess: () => setStockOpen(false),
        });
    };

    return (
        <Panel
            className="mt-6"
            title="Produk dan Paket"
            action={
                <div className="flex flex-col gap-2 sm:flex-row">
                    <Input placeholder="Cari produk..." value={term} onChange={(event) => setTerm(event.target.value)} />
                    <Button onClick={showCreate}>
                        <Plus className="size-4" />
                        Tambah Produk
                    </Button>
                </div>
            }
        >
            <div className="space-y-4">
                <MobileCardList
                    empty={
                        <p className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">Belum ada produk.</p>
                    }
                >
                    {visible.map((product) => (
                        <MobileDataCard
                            key={product.id}
                            title={product.name}
                            subtitle={`${product.category} · ${product.sku || 'Tanpa SKU'}`}
                            badge={<ResponsiveStatusBadge status={product.status} label={product.status} />}
                            meta={[
                                { label: 'Tipe', value: typeLabel(product.type) },
                                { label: 'Harga', value: product.priceLabel },
                                { label: 'Stok', value: product.type === 'physical' ? product.stock : '-' },
                                { label: 'Akses', value: `${product.courseAccesses.length} materi` },
                            ]}
                            actions={
                                <>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                            setStockProduct(product);
                                            stockForm.setData({ quantity: '1', notes: '' });
                                            setStockOpen(true);
                                        }}
                                    >
                                        Stok
                                    </Button>
                                    <Button type="button" variant="outline" size="sm" onClick={() => showEdit(product)}>
                                        <Pencil className="size-4" />
                                        Edit
                                    </Button>
                                    <MobileActionMenu
                                        items={[
                                            {
                                                label: 'Hapus produk',
                                                destructive: true,
                                                icon: <Trash2 className="size-4" />,
                                                onClick: () => remove(product),
                                            },
                                        ]}
                                    />
                                </>
                            }
                        >
                            <div className="flex items-center gap-3">
                                <img src={product.imageUrl || '/logo.png'} alt={product.name} className="size-14 rounded-xl object-cover" />
                                <p className="line-clamp-2 text-sm leading-6 text-slate-600">
                                    {product.summary || product.description || 'Belum ada ringkasan produk.'}
                                </p>
                            </div>
                        </MobileDataCard>
                    ))}
                </MobileCardList>
                <DesktopTable>
                    <table className="w-full text-left text-sm">
                        <thead className="text-xs tracking-wider text-slate-500 uppercase">
                            <tr>
                                <th className="py-3">Produk</th>
                                <th>Tipe</th>
                                <th>Harga</th>
                                <th>Stok</th>
                                <th>Akses Materi</th>
                                <th>Status</th>
                                <th className="text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {visible.map((product) => (
                                <tr key={product.id}>
                                    <td className="py-4">
                                        <div className="flex items-center gap-3">
                                            <img
                                                src={product.imageUrl || '/logo.png'}
                                                alt={product.name}
                                                className="size-12 rounded-lg object-cover"
                                            />
                                            <div>
                                                <p className="font-bold">{product.name}</p>
                                                <p className="text-xs text-slate-500">
                                                    {product.category} · {product.sku || 'Tanpa SKU'}
                                                </p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="capitalize">{typeLabel(product.type)}</td>
                                    <td>{product.priceLabel}</td>
                                    <td>{product.type === 'physical' ? product.stock : '-'}</td>
                                    <td>{product.courseAccesses.length}</td>
                                    <td className="capitalize">{product.status}</td>
                                    <td>
                                        <div className="flex justify-end gap-1">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => {
                                                    setStockProduct(product);
                                                    stockForm.setData({ quantity: '1', notes: '' });
                                                    setStockOpen(true);
                                                }}
                                            >
                                                Stok
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => showEdit(product)}>
                                                <Pencil className="size-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => remove(product)}>
                                                <Trash2 className="size-4 text-red-600" />
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {visible.length === 0 && <p className="py-8 text-center text-sm text-slate-500">Belum ada produk.</p>}
                </DesktopTable>
            </div>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{editing ? 'Edit Produk' : 'Tambah Produk'}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={submit} className="space-y-5">
                        <div className="grid gap-4 md:grid-cols-2">
                            <FormField label="Nama produk" required error={form.errors.name}>
                                <Input value={form.data.name} onChange={(event) => form.setData('name', event.target.value)} />
                            </FormField>
                            <FormField label="Slug" error={form.errors.slug}>
                                <Input
                                    value={form.data.slug}
                                    onChange={(event) => form.setData('slug', event.target.value)}
                                    placeholder="otomatis jika kosong"
                                />
                            </FormField>
                            <FormField label="Kategori" error={form.errors.product_category_id}>
                                <SearchableSelect
                                    value={form.data.product_category_id}
                                    onChange={(value) => form.setData('product_category_id', value)}
                                    options={[
                                        { value: '', label: 'Tanpa kategori' },
                                        ...categories.map((category) => ({ value: String(category.id), label: category.name })),
                                    ]}
                                />
                            </FormField>
                            <FormField label="Tipe produk" required error={form.errors.type}>
                                <SearchableSelect
                                    value={form.data.type}
                                    onChange={(value) => form.setData('type', value)}
                                    options={[
                                        { value: 'physical', label: 'Produk fisik' },
                                        { value: 'digital', label: 'Digital/course' },
                                        { value: 'bundle', label: 'Paket/bundle' },
                                    ]}
                                />
                            </FormField>
                            <FormField label="SKU" error={form.errors.sku}>
                                <Input value={form.data.sku} onChange={(event) => form.setData('sku', event.target.value)} />
                            </FormField>
                            <FormField label="Status" required error={form.errors.status}>
                                <SearchableSelect
                                    value={form.data.status}
                                    onChange={(value) => form.setData('status', value)}
                                    options={[
                                        { value: 'draft', label: 'Draft' },
                                        { value: 'published', label: 'Published' },
                                        { value: 'archived', label: 'Archived' },
                                    ]}
                                />
                            </FormField>
                            <FormField label="Harga" required error={form.errors.price}>
                                <Input
                                    type="number"
                                    min="0"
                                    value={form.data.price}
                                    onChange={(event) => form.setData('price', event.target.value)}
                                />
                            </FormField>
                            <FormField label="Stok" required error={form.errors.stock}>
                                <Input
                                    type="number"
                                    min="0"
                                    value={form.data.stock}
                                    onChange={(event) => form.setData('stock', event.target.value)}
                                />
                            </FormField>
                            <FormField label="Berat gram" error={form.errors.weight_gram}>
                                <Input
                                    type="number"
                                    min="0"
                                    value={form.data.weight_gram}
                                    onChange={(event) => form.setData('weight_gram', event.target.value)}
                                />
                            </FormField>
                            <FormField label="Upload gambar" error={form.errors.image}>
                                <Input type="file" accept="image/*" onChange={(event) => form.setData('image', event.target.files?.[0] ?? null)} />
                            </FormField>
                            <FormField label="Ringkasan" error={form.errors.summary}>
                                <Input value={form.data.summary} onChange={(event) => form.setData('summary', event.target.value)} />
                            </FormField>
                            <FormField label="Meta title" error={form.errors.meta_title}>
                                <Input value={form.data.meta_title} onChange={(event) => form.setData('meta_title', event.target.value)} />
                            </FormField>
                        </div>
                        <FormField label="Deskripsi" error={form.errors.description}>
                            <textarea
                                className="min-h-28 w-full rounded-md border border-slate-300 p-3 text-sm"
                                value={form.data.description}
                                onChange={(event) => form.setData('description', event.target.value)}
                            />
                        </FormField>
                        <FormField label="Meta description" error={form.errors.meta_description}>
                            <textarea
                                className="min-h-20 w-full rounded-md border border-slate-300 p-3 text-sm"
                                value={form.data.meta_description}
                                onChange={(event) => form.setData('meta_description', event.target.value)}
                            />
                        </FormField>

                        {form.data.type === 'bundle' && <DynamicBundleItems form={form} productOptions={productOptions} />}
                        <DynamicCourseAccesses form={form} courses={courses} learningPaths={learningPaths} />

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                                Batal
                            </Button>
                            <Button type="submit" disabled={form.processing}>
                                {form.processing ? 'Menyimpan...' : 'Simpan Produk'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog open={stockOpen} onOpenChange={setStockOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Penyesuaian Stok</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={adjustStock} className="space-y-4">
                        <p className="text-sm text-slate-600">
                            Produk: <span className="font-bold">{stockProduct?.name}</span>
                        </p>
                        <FormField label="Jumlah perubahan" required error={stockForm.errors.quantity}>
                            <Input
                                type="number"
                                value={stockForm.data.quantity}
                                onChange={(event) => stockForm.setData('quantity', event.target.value)}
                            />
                        </FormField>
                        <FormField label="Catatan" error={stockForm.errors.notes}>
                            <Input value={stockForm.data.notes} onChange={(event) => stockForm.setData('notes', event.target.value)} />
                        </FormField>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setStockOpen(false)}>
                                Batal
                            </Button>
                            <Button type="submit" disabled={stockForm.processing}>
                                Simpan
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </Panel>
    );
}

function DynamicBundleItems({
    form,
    productOptions,
}: {
    form: ReturnType<typeof useForm<ProductForm>>;
    productOptions: { value: string; label: string }[];
}) {
    const items = form.data.bundle_items;

    return (
        <section className="rounded-xl border border-slate-200 p-4">
            <div className="flex items-center justify-between">
                <h3 className="font-bold">Isi Paket Fisik</h3>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => form.setData('bundle_items', [...items, { product_id: '', quantity: '1' }])}
                >
                    Tambah item
                </Button>
            </div>
            <div className="mt-3 space-y-3">
                {items.map((item, index) => (
                    <div key={index} className="grid gap-3 md:grid-cols-[1fr_120px_auto]">
                        <SearchableSelect
                            value={item.product_id}
                            onChange={(value) => updateBundleItem(form, index, 'product_id', value)}
                            options={[{ value: '', label: 'Pilih produk' }, ...productOptions]}
                        />
                        <Input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(event) => updateBundleItem(form, index, 'quantity', event.target.value)}
                        />
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() =>
                                form.setData(
                                    'bundle_items',
                                    items.filter((_, itemIndex) => itemIndex !== index),
                                )
                            }
                        >
                            Hapus
                        </Button>
                    </div>
                ))}
                {items.length === 0 && <p className="text-sm text-slate-500">Tambahkan produk fisik yang termasuk dalam paket.</p>}
            </div>
        </section>
    );
}

function DynamicCourseAccesses({
    form,
    courses,
    learningPaths,
}: {
    form: ReturnType<typeof useForm<ProductForm>>;
    courses: SimpleOption[];
    learningPaths: SimpleOption[];
}) {
    const accesses = form.data.course_accesses;

    return (
        <section className="rounded-xl border border-slate-200 p-4">
            <div className="flex items-center justify-between">
                <h3 className="font-bold">Akses Materi</h3>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                        form.setData('course_accesses', [
                            ...accesses,
                            { course_id: '', learning_path_id: '', delivery_mode: 'activation_code', code_valid_days: '' },
                        ])
                    }
                >
                    Tambah akses
                </Button>
            </div>
            <div className="mt-3 space-y-3">
                {accesses.map((access, index) => (
                    <div key={index} className="grid gap-3 md:grid-cols-5">
                        <SearchableSelect
                            value={access.course_id}
                            onChange={(value) => updateAccess(form, index, 'course_id', value)}
                            options={[
                                { value: '', label: 'Course opsional' },
                                ...courses.map((course) => ({ value: String(course.id), label: course.title ?? '-' })),
                            ]}
                        />
                        <SearchableSelect
                            value={access.learning_path_id}
                            onChange={(value) => updateAccess(form, index, 'learning_path_id', value)}
                            options={[
                                { value: '', label: 'Learning path opsional' },
                                ...learningPaths.map((path) => ({ value: String(path.id), label: path.title ?? '-' })),
                            ]}
                        />
                        <SearchableSelect
                            value={access.delivery_mode}
                            onChange={(value) => updateAccess(form, index, 'delivery_mode', value)}
                            options={[
                                { value: 'activation_code', label: 'Kode aktivasi' },
                                { value: 'auto_enroll', label: 'Auto aktif setelah bayar' },
                            ]}
                        />
                        <Input
                            placeholder="Valid hari"
                            type="number"
                            min="1"
                            value={access.code_valid_days}
                            onChange={(event) => updateAccess(form, index, 'code_valid_days', event.target.value)}
                        />
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() =>
                                form.setData(
                                    'course_accesses',
                                    accesses.filter((_, itemIndex) => itemIndex !== index),
                                )
                            }
                        >
                            Hapus
                        </Button>
                    </div>
                ))}
                {accesses.length === 0 && <p className="text-sm text-slate-500">Kosongkan jika produk tidak membuka materi.</p>}
            </div>
        </section>
    );
}

function updateBundleItem(form: ReturnType<typeof useForm<ProductForm>>, index: number, key: keyof BundleInput, value: string) {
    form.setData(
        'bundle_items',
        form.data.bundle_items.map((item, itemIndex) => (itemIndex === index ? { ...item, [key]: value } : item)),
    );
}

function updateAccess(form: ReturnType<typeof useForm<ProductForm>>, index: number, key: keyof AccessInput, value: string) {
    form.setData(
        'course_accesses',
        form.data.course_accesses.map((item, itemIndex) => (itemIndex === index ? { ...item, [key]: value } : item)),
    );
}

function CategoriesPanel({ categories }: { categories: CategoryRow[] }) {
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<CategoryRow | null>(null);
    const form = useForm<CategoryForm>(blankCategory);

    const showCreate = () => {
        setEditing(null);
        form.setData({ ...blankCategory });
        setOpen(true);
    };

    const showEdit = (category: CategoryRow) => {
        setEditing(category);
        form.setData({
            name: category.name,
            slug: category.slug,
            description: category.description ?? '',
            status: category.status,
            meta_title: category.metaTitle ?? '',
            meta_description: category.metaDescription ?? '',
        });
        setOpen(true);
    };

    const submit = (event: FormEvent) => {
        event.preventDefault();
        if (editing) {
            form.patch(`/admin/store/categories/${editing.id}`, { preserveScroll: true, onSuccess: () => setOpen(false) });
        } else {
            form.post('/admin/store/categories', { preserveScroll: true, onSuccess: () => setOpen(false) });
        }
    };

    return (
        <Panel
            className="mt-6"
            title="Kategori Produk"
            action={
                <Button onClick={showCreate}>
                    <Plus className="size-4" />
                    Tambah Kategori
                </Button>
            }
        >
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {categories.map((category) => (
                    <div key={category.id} className="rounded-xl border border-slate-200 p-4">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <p className="font-bold">{category.name}</p>
                                <p className="text-xs text-slate-500">
                                    {category.products} produk · {category.status}
                                </p>
                            </div>
                            <div className="flex gap-1">
                                <Button variant="ghost" size="icon" onClick={() => showEdit(category)}>
                                    <Pencil className="size-4" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() =>
                                        confirmDelete(`Hapus kategori "${category.name}"?`, () =>
                                            router.delete(`/admin/store/categories/${category.id}`, { preserveScroll: true }),
                                        )
                                    }
                                >
                                    <Trash2 className="size-4 text-red-600" />
                                </Button>
                            </div>
                        </div>
                        <p className="mt-3 text-sm text-slate-600">{category.description || 'Belum ada deskripsi.'}</p>
                    </div>
                ))}
            </div>
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editing ? 'Edit Kategori' : 'Tambah Kategori'}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={submit} className="space-y-4">
                        <FormField label="Nama kategori" required error={form.errors.name}>
                            <Input value={form.data.name} onChange={(event) => form.setData('name', event.target.value)} />
                        </FormField>
                        <FormField label="Slug" error={form.errors.slug}>
                            <Input value={form.data.slug} onChange={(event) => form.setData('slug', event.target.value)} />
                        </FormField>
                        <FormField label="Status" required error={form.errors.status}>
                            <SearchableSelect
                                value={form.data.status}
                                onChange={(value) => form.setData('status', value)}
                                options={[
                                    { value: 'active', label: 'Aktif' },
                                    { value: 'inactive', label: 'Tidak aktif' },
                                ]}
                            />
                        </FormField>
                        <FormField label="Deskripsi" error={form.errors.description}>
                            <textarea
                                className="min-h-24 w-full rounded-md border border-slate-300 p-3 text-sm"
                                value={form.data.description}
                                onChange={(event) => form.setData('description', event.target.value)}
                            />
                        </FormField>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                                Batal
                            </Button>
                            <Button type="submit">Simpan</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </Panel>
    );
}

function OrdersPanel({ orders }: { orders: OrderRow[] }) {
    const [editing, setEditing] = useState<OrderRow | null>(null);
    const form = useForm({ fulfillment_status: 'processing', courier: '', tracking_number: '', notes: '' });

    const openEdit = (order: OrderRow) => {
        setEditing(order);
        form.setData({
            fulfillment_status: order.fulfillmentStatus,
            courier: order.courier ?? '',
            tracking_number: order.trackingNumber ?? '',
            notes: order.notes ?? '',
        });
    };

    const submit = (event: FormEvent) => {
        event.preventDefault();
        if (!editing) return;
        form.patch(`/admin/store/orders/${editing.id}`, { preserveScroll: true, onSuccess: () => setEditing(null) });
    };

    return (
        <Panel className="mt-6" title="Order Produk">
            <div className="space-y-4">
                <MobileCardList
                    empty={
                        <p className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">Belum ada order.</p>
                    }
                >
                    {orders.map((order) => (
                        <MobileDataCard
                            key={order.id}
                            title={order.customer}
                            subtitle={order.email}
                            badge={<ResponsiveStatusBadge status={order.paymentStatus} label={statusLabel(order.paymentStatus)} />}
                            meta={[
                                { label: 'Order', value: <span className="font-mono text-xs">{order.orderNumber}</span> },
                                { label: 'Item', value: order.items.map((item) => `${item.name} x${item.quantity}`).join(', ') },
                                { label: 'Total', value: order.totalLabel },
                                { label: 'Fulfillment', value: statusLabel(order.fulfillmentStatus) },
                            ]}
                            actions={
                                <Button type="button" size="sm" variant="outline" onClick={() => openEdit(order)}>
                                    Update
                                </Button>
                            }
                        />
                    ))}
                </MobileCardList>
                <DesktopTable>
                    <table className="w-full text-left text-sm">
                        <thead className="text-xs text-slate-500 uppercase">
                            <tr>
                                <th className="py-3">Order</th>
                                <th>Pelanggan</th>
                                <th>Item</th>
                                <th>Total</th>
                                <th>Status</th>
                                <th className="text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {orders.map((order) => (
                                <tr key={order.id}>
                                    <td className="py-4 font-mono text-xs">{order.orderNumber}</td>
                                    <td>
                                        <p className="font-semibold">{order.customer}</p>
                                        <p className="text-xs text-slate-500">{order.email}</p>
                                    </td>
                                    <td>{order.items.map((item) => `${item.name} x${item.quantity}`).join(', ')}</td>
                                    <td>{order.totalLabel}</td>
                                    <td>
                                        <StatusBadge value={order.paymentStatus} /> <StatusBadge value={order.fulfillmentStatus} />
                                    </td>
                                    <td className="text-right">
                                        <Button size="sm" variant="outline" onClick={() => openEdit(order)}>
                                            Update
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </DesktopTable>
            </div>
            <Dialog open={!!editing} onOpenChange={(value) => !value && setEditing(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Update Order</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={submit} className="space-y-4">
                        <FormField label="Status fulfillment" required error={form.errors.fulfillment_status}>
                            <SearchableSelect
                                value={form.data.fulfillment_status}
                                onChange={(value) => form.setData('fulfillment_status', value)}
                                options={['waiting_payment', 'processing', 'packed', 'shipped', 'delivered', 'cancelled', 'not_required'].map(
                                    (value) => ({ value, label: statusLabel(value) }),
                                )}
                            />
                        </FormField>
                        <FormField label="Kurir" error={form.errors.courier}>
                            <Input value={form.data.courier} onChange={(event) => form.setData('courier', event.target.value)} />
                        </FormField>
                        <FormField label="Nomor resi" error={form.errors.tracking_number}>
                            <Input value={form.data.tracking_number} onChange={(event) => form.setData('tracking_number', event.target.value)} />
                        </FormField>
                        <FormField label="Catatan" error={form.errors.notes}>
                            <Input value={form.data.notes} onChange={(event) => form.setData('notes', event.target.value)} />
                        </FormField>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setEditing(null)}>
                                Batal
                            </Button>
                            <Button type="submit">Simpan</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </Panel>
    );
}

function CodesPanel({
    codes,
    products,
    courses,
    learningPaths,
}: {
    codes: ActivationCodeRow[];
    products: ProductRow[];
    courses: SimpleOption[];
    learningPaths: SimpleOption[];
}) {
    const [open, setOpen] = useState(false);
    const form = useForm({ product_id: '', course_id: '', learning_path_id: '', assigned_user_id: '', quantity: '1', expires_at: '' });

    const submit = (event: FormEvent) => {
        event.preventDefault();
        form.post('/admin/store/activation-codes', { preserveScroll: true, onSuccess: () => setOpen(false) });
    };

    return (
        <Panel
            className="mt-6"
            title="Kode Aktivasi"
            action={
                <Button onClick={() => setOpen(true)}>
                    <Plus className="size-4" />
                    Generate Kode
                </Button>
            }
        >
            <div className="space-y-4">
                <MobileCardList
                    empty={
                        <p className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
                            Belum ada kode aktivasi.
                        </p>
                    }
                >
                    {codes.map((code) => (
                        <MobileDataCard
                            key={code.id}
                            title={<span className="font-mono">{code.code}</span>}
                            subtitle={code.product}
                            badge={<ResponsiveStatusBadge status={code.status} label={statusLabel(code.status)} />}
                            meta={[
                                { label: 'Target', value: code.target },
                                { label: 'User', value: code.redeemedBy ? `Dipakai ${code.redeemedBy}` : code.assignedUser },
                                { label: 'Kedaluwarsa', value: code.expiresAt || '-' },
                            ]}
                        />
                    ))}
                </MobileCardList>
                <DesktopTable>
                    <table className="w-full text-left text-sm">
                        <thead className="text-xs text-slate-500 uppercase">
                            <tr>
                                <th className="py-3">Kode</th>
                                <th>Produk</th>
                                <th>Target</th>
                                <th>User</th>
                                <th>Status</th>
                                <th>Kedaluwarsa</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {codes.map((code) => (
                                <tr key={code.id}>
                                    <td className="py-4 font-mono font-bold">{code.code}</td>
                                    <td>{code.product}</td>
                                    <td>{code.target}</td>
                                    <td>{code.redeemedBy ? `Dipakai ${code.redeemedBy}` : code.assignedUser}</td>
                                    <td>
                                        <StatusBadge value={code.status} />
                                    </td>
                                    <td>{code.expiresAt || '-'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </DesktopTable>
            </div>
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Generate Kode Aktivasi</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={submit} className="space-y-4">
                        <FormField label="Produk terkait" error={form.errors.product_id}>
                            <SearchableSelect
                                value={form.data.product_id}
                                onChange={(value) => form.setData('product_id', value)}
                                options={[
                                    { value: '', label: 'Opsional' },
                                    ...products.map((product) => ({ value: String(product.id), label: product.name })),
                                ]}
                            />
                        </FormField>
                        <FormField label="Course" error={form.errors.course_id}>
                            <SearchableSelect
                                value={form.data.course_id}
                                onChange={(value) => form.setData('course_id', value)}
                                options={[
                                    { value: '', label: 'Opsional' },
                                    ...courses.map((course) => ({ value: String(course.id), label: course.title ?? '-' })),
                                ]}
                            />
                        </FormField>
                        <FormField label="Learning Path" error={form.errors.learning_path_id}>
                            <SearchableSelect
                                value={form.data.learning_path_id}
                                onChange={(value) => form.setData('learning_path_id', value)}
                                options={[
                                    { value: '', label: 'Opsional' },
                                    ...learningPaths.map((path) => ({ value: String(path.id), label: path.title ?? '-' })),
                                ]}
                            />
                        </FormField>
                        <FormField label="Jumlah kode" required error={form.errors.quantity}>
                            <Input
                                type="number"
                                min="1"
                                max="200"
                                value={form.data.quantity}
                                onChange={(event) => form.setData('quantity', event.target.value)}
                            />
                        </FormField>
                        <FormField label="Kedaluwarsa" error={form.errors.expires_at}>
                            <Input type="date" value={form.data.expires_at} onChange={(event) => form.setData('expires_at', event.target.value)} />
                        </FormField>
                        <InputError message={form.errors.course_id} />
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                                Batal
                            </Button>
                            <Button type="submit">Generate</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </Panel>
    );
}

function StatusBadge({ value }: { value: string }) {
    return (
        <span
            className={cn(
                'mr-1 rounded-full bg-slate-100 px-2 py-1 text-xs font-bold text-slate-700 capitalize',
                value === 'paid' || value === 'published' || value === 'unused'
                    ? 'bg-emerald-50 text-emerald-700'
                    : value === 'pending' || value === 'processing'
                      ? 'bg-amber-50 text-amber-700'
                      : '',
            )}
        >
            {statusLabel(value)}
        </span>
    );
}

function statusLabel(value: string) {
    return value.replaceAll('_', ' ');
}

function typeLabel(value: string) {
    return value === 'physical' ? 'Fisik' : value === 'digital' ? 'Digital' : 'Paket';
}
