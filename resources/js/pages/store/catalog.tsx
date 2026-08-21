import { Crumb, FooterMark, PublicContent, PublicNav } from '@/components/platform';
import { SearchableSelect } from '@/components/searchable-select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Head, Link } from '@inertiajs/react';
import { ArrowRight, Package, Search, Tag } from 'lucide-react';
import { useMemo, useState } from 'react';

interface ProductCard {
    id: number;
    categoryId?: number | null;
    category: string;
    type: string;
    sku?: string | null;
    name: string;
    slug: string;
    summary?: string | null;
    priceLabel: string;
    stock: number;
    imageUrl: string;
    detailUrl: string;
}

interface Category {
    id: number;
    name: string;
    slug: string;
}

export default function StoreCatalog({ products, categories }: { products: ProductCard[]; categories: Category[] }) {
    const [term, setTerm] = useState('');
    const [category, setCategory] = useState('all');
    const [type, setType] = useState('all');
    const visibleProducts = useMemo(
        () =>
            products.filter((product) => {
                const matchesTerm = `${product.name} ${product.summary ?? ''} ${product.category}`.toLowerCase().includes(term.toLowerCase());
                const matchesCategory = category === 'all' || String(product.categoryId ?? '') === category;
                const matchesType = type === 'all' || product.type === type;

                return matchesTerm && matchesCategory && matchesType;
            }),
        [category, products, term, type],
    );

    return (
        <>
            <Head title="Toko Robotik" />
            <div className="min-h-screen bg-[#FAF8FF]">
                <PublicNav />
                <PublicContent skeleton="catalog">
                    <main className="mx-auto w-full max-w-7xl px-4 pt-24 pb-16 md:px-10">
                        <div className="rounded-[2rem] bg-gradient-to-br from-blue-700 to-cyan-500 p-6 text-white md:p-10">
                            <Crumb items={['Beranda', 'Toko Robotik']} />
                            <h1 className="mt-4 max-w-3xl text-3xl font-extrabold tracking-tight md:text-5xl">
                                Kit robotik dan paket belajar untuk praktik langsung
                            </h1>
                            <p className="mt-4 max-w-2xl text-base leading-7 text-blue-50 md:text-lg">
                                Pilih alat robotik, starter kit, atau paket lengkap dengan akses materi pelatihan di platform.
                            </p>
                        </div>

                        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                            <div className="grid gap-3 md:grid-cols-[1fr_220px_220px]">
                                <label className="relative">
                                    <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
                                    <Input
                                        className="pl-9"
                                        placeholder="Cari produk robotik..."
                                        value={term}
                                        onChange={(event) => setTerm(event.target.value)}
                                    />
                                </label>
                                <SearchableSelect
                                    value={category}
                                    onChange={setCategory}
                                    options={[
                                        { value: 'all', label: 'Semua kategori' },
                                        ...categories.map((item) => ({ value: String(item.id), label: item.name })),
                                    ]}
                                />
                                <SearchableSelect
                                    value={type}
                                    onChange={setType}
                                    options={[
                                        { value: 'all', label: 'Semua tipe' },
                                        { value: 'physical', label: 'Produk fisik' },
                                        { value: 'digital', label: 'Digital' },
                                        { value: 'bundle', label: 'Paket' },
                                    ]}
                                />
                            </div>
                        </section>

                        <section className="mt-8 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                            {visibleProducts.map((product) => (
                                <article
                                    key={product.id}
                                    className="flex overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
                                >
                                    <div className="flex w-full flex-col">
                                        <div className="relative h-56 bg-slate-100">
                                            <img
                                                src={product.imageUrl}
                                                alt={`Foto produk ${product.name}`}
                                                className="h-full w-full object-cover"
                                                loading="lazy"
                                            />
                                            <span className="absolute top-4 left-4 rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-blue-700">
                                                {typeLabel(product.type)}
                                            </span>
                                        </div>
                                        <div className="flex flex-1 flex-col p-6">
                                            <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                                                <Tag className="size-4" />
                                                {product.category}
                                            </div>
                                            <h2 className="mt-3 text-2xl font-extrabold text-slate-950">{product.name}</h2>
                                            <p className="mt-2 line-clamp-2 flex-1 text-sm leading-6 text-slate-600">
                                                {product.summary || 'Produk robotik untuk mendukung pembelajaran praktik.'}
                                            </p>
                                            <div className="mt-5 flex items-center justify-between gap-3">
                                                <div>
                                                    <p className="text-xs text-slate-500">Harga</p>
                                                    <p className="font-extrabold text-blue-700">{product.priceLabel}</p>
                                                </div>
                                                <Button asChild>
                                                    <Link href={product.detailUrl}>
                                                        Detail <ArrowRight className="size-4" />
                                                    </Link>
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </article>
                            ))}
                        </section>

                        {visibleProducts.length === 0 && (
                            <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-600">
                                <Package className="mx-auto mb-3 size-10 text-slate-400" />
                                Belum ada produk yang cocok.
                            </div>
                        )}
                    </main>
                </PublicContent>
                <FooterMark />
            </div>
        </>
    );
}

function typeLabel(value: string) {
    return value === 'bundle' ? 'Paket' : value === 'digital' ? 'Digital' : 'Fisik';
}
