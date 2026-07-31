import { Crumb, FooterMark, PublicContent, PublicNav } from '@/components/platform';
import { Button } from '@/components/ui/button';
import { Head, Link } from '@inertiajs/react';
import { ArrowRight, BookOpen, CheckCircle2, Package, ShieldCheck, Truck } from 'lucide-react';

interface ProductDetail {
    id: number;
    category: string;
    type: string;
    name: string;
    summary?: string | null;
    description?: string | null;
    priceLabel: string;
    stock: number;
    weightGram: number;
    imageUrl: string;
    checkoutUrl: string;
    bundleItems: { name: string; quantity: number; type?: string }[];
    courseAccesses: { title: string; type: string; deliveryMode: string; codeValidDays?: number | null }[];
}

export default function ProductShow({ product }: { product: ProductDetail }) {
    return (
        <>
            <Head title={`${product.name} | Toko Robotik`} />
            <div className="min-h-screen bg-[#FAF8FF]">
                <PublicNav />
                <PublicContent skeleton="detail">
                    <main className="mx-auto w-full max-w-7xl px-4 pt-24 pb-16 md:px-10">
                        <Crumb items={['Beranda', 'Toko Robotik', product.name]} />
                        <section className="mt-6 grid gap-8 lg:grid-cols-[1fr_0.85fr]">
                            <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
                                <img src={product.imageUrl} alt={`Foto produk ${product.name}`} className="h-72 w-full object-cover md:h-[520px]" />
                            </div>
                            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm md:p-8">
                                <p className="text-sm font-bold text-blue-700 uppercase">{product.category} · {typeLabel(product.type)}</p>
                                <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-950 md:text-5xl">{product.name}</h1>
                                <p className="mt-4 text-lg leading-8 text-slate-600">{product.summary || product.description}</p>
                                <div className="mt-6 rounded-2xl bg-blue-50 p-5">
                                    <p className="text-sm font-bold text-blue-700">Harga</p>
                                    <p className="text-3xl font-extrabold text-blue-800">{product.priceLabel}</p>
                                </div>
                                <div className="mt-6 grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
                                    <Info icon={Package} label={product.type === 'physical' ? `${product.stock} stok tersedia` : 'Produk digital/paket'} />
                                    <Info icon={Truck} label={product.weightGram > 0 ? `${product.weightGram} gram` : 'Tidak perlu pengiriman'} />
                                    <Info icon={ShieldCheck} label="Pembayaran aman via Midtrans" />
                                    <Info icon={BookOpen} label={product.courseAccesses.length > 0 ? 'Termasuk akses materi' : 'Produk tanpa materi'} />
                                </div>
                                <Button asChild size="lg" className="mt-8 w-full">
                                    <Link href={product.checkoutUrl}>
                                        Beli Sekarang <ArrowRight className="size-4" />
                                    </Link>
                                </Button>
                            </div>
                        </section>

                        <section className="mt-8 grid gap-6 lg:grid-cols-2">
                            <DetailPanel title="Deskripsi Produk">
                                <p className="whitespace-pre-line leading-8 text-slate-600">{product.description || product.summary || 'Belum ada deskripsi detail.'}</p>
                            </DetailPanel>
                            <DetailPanel title="Isi Paket dan Materi">
                                <div className="space-y-4">
                                    {product.bundleItems.map((item) => (
                                        <div key={`${item.name}-${item.quantity}`} className="flex gap-3">
                                            <CheckCircle2 className="mt-1 size-5 text-emerald-600" />
                                            <p className="font-semibold text-slate-800">{item.quantity}x {item.name}</p>
                                        </div>
                                    ))}
                                    {product.courseAccesses.map((access) => (
                                        <div key={`${access.type}-${access.title}`} className="flex gap-3">
                                            <CheckCircle2 className="mt-1 size-5 text-blue-600" />
                                            <div>
                                                <p className="font-semibold text-slate-800">{access.type}: {access.title}</p>
                                                <p className="text-sm text-slate-500">{access.deliveryMode === 'activation_code' ? 'Aktivasi memakai kode' : 'Aktif otomatis setelah pembayaran'}</p>
                                            </div>
                                        </div>
                                    ))}
                                    {product.bundleItems.length === 0 && product.courseAccesses.length === 0 && <p className="text-slate-500">Produk ini dijual sebagai item tunggal.</p>}
                                </div>
                            </DetailPanel>
                        </section>
                    </main>
                </PublicContent>
                <FooterMark />
            </div>
        </>
    );
}

function Info({ icon: Icon, label }: { icon: typeof Package; label: string }) {
    return <div className="flex items-center gap-2 rounded-xl bg-slate-50 p-3"><Icon className="size-4 text-blue-700" /><span>{label}</span></div>;
}

function DetailPanel({ title, children }: { title: string; children: React.ReactNode }) {
    return <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm"><h2 className="mb-4 text-2xl font-extrabold text-slate-950">{title}</h2>{children}</section>;
}

function typeLabel(value: string) {
    return value === 'bundle' ? 'Paket' : value === 'digital' ? 'Digital' : 'Fisik';
}
