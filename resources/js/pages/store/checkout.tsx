import { FormField } from '@/components/form-field';
import { Panel, Shell } from '@/components/platform';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowLeft, CreditCard, Package } from 'lucide-react';
import { FormEvent } from 'react';

interface ProductCard {
    id: number;
    type: string;
    name: string;
    summary?: string | null;
    priceLabel: string;
    stock: number;
    imageUrl: string;
}

interface CheckoutUser {
    name: string;
    phone?: string | null;
    address?: string | null;
}

export default function StoreCheckout({ product, user }: { product: ProductCard; user: CheckoutUser }) {
    const form = useForm({
        product_id: String(product.id),
        quantity: '1',
        recipient_name: user.name ?? '',
        recipient_phone: user.phone ?? '',
        shipping_address: user.address ?? '',
        notes: '',
    });
    const needsShipping = product.type !== 'digital';

    const submit = (event: FormEvent) => {
        event.preventDefault();
        form.post('/store/checkout', { preserveScroll: true });
    };

    return (
        <Shell title="Checkout Produk" eyebrow="Toko Robotik">
            <Head title="Checkout Produk" />
            <div className="mb-6">
                <Button asChild variant="outline">
                    <Link href="/store">
                        <ArrowLeft className="size-4" />
                        Kembali ke Toko
                    </Link>
                </Button>
            </div>
            <form onSubmit={submit} className="grid gap-6 lg:grid-cols-[1fr_380px]">
                <Panel title="Data Pembelian">
                    <div className="grid gap-4 md:grid-cols-2">
                        <FormField label="Nama penerima" required error={form.errors.recipient_name}>
                            <Input value={form.data.recipient_name} onChange={(event) => form.setData('recipient_name', event.target.value)} />
                        </FormField>
                        <FormField label="Nomor HP" error={form.errors.recipient_phone}>
                            <Input value={form.data.recipient_phone} onChange={(event) => form.setData('recipient_phone', event.target.value)} />
                        </FormField>
                        <FormField label="Jumlah" required error={form.errors.quantity}>
                            <Input type="number" min="1" max="99" value={form.data.quantity} onChange={(event) => form.setData('quantity', event.target.value)} />
                        </FormField>
                    </div>
                    {needsShipping && (
                        <FormField label="Alamat pengiriman" required error={form.errors.shipping_address}>
                            <textarea className="min-h-28 w-full rounded-md border border-slate-300 p-3 text-sm" value={form.data.shipping_address} onChange={(event) => form.setData('shipping_address', event.target.value)} />
                        </FormField>
                    )}
                    <FormField label="Catatan" error={form.errors.notes}>
                        <textarea className="min-h-20 w-full rounded-md border border-slate-300 p-3 text-sm" value={form.data.notes} onChange={(event) => form.setData('notes', event.target.value)} />
                    </FormField>
                </Panel>
                <Panel title="Ringkasan Order">
                    <div className="flex gap-4">
                        <img src={product.imageUrl} alt={product.name} className="size-24 rounded-2xl object-cover" />
                        <div>
                            <p className="font-extrabold text-slate-950">{product.name}</p>
                            <p className="mt-1 text-sm text-slate-500">{product.summary || 'Produk robotik Digital Pelajar'}</p>
                            <p className="mt-2 font-bold text-blue-700">{product.priceLabel}</p>
                        </div>
                    </div>
                    <div className="mt-6 space-y-3 rounded-2xl bg-slate-50 p-4 text-sm">
                        <div className="flex justify-between"><span>Harga satuan</span><span className="font-bold">{product.priceLabel}</span></div>
                        <div className="flex justify-between"><span>Jumlah</span><span className="font-bold">{form.data.quantity || 1}</span></div>
                        <div className="flex items-center gap-2 pt-3 text-slate-500"><Package className="size-4" /> Stok produk dicek saat order dibuat.</div>
                    </div>
                    <Button type="submit" className="mt-6 w-full" disabled={form.processing}>
                        <CreditCard className="size-4" />
                        {form.processing ? 'Menyiapkan pembayaran...' : 'Bayar Sekarang'}
                    </Button>
                    <p className="mt-3 text-center text-xs text-slate-500">Pembayaran diproses melalui Midtrans/mock checkout sesuai konfigurasi project.</p>
                </Panel>
            </form>
        </Shell>
    );
}
