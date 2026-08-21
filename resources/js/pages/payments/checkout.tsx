import BrandLogo from '@/components/brand-logo';
import { FooterMark, PublicContent } from '@/components/platform';
import { Button } from '@/components/ui/button';
import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowLeft, CreditCard, Lock, ShieldCheck } from 'lucide-react';

interface CheckoutProps {
    course: {
        id: number;
        title: string;
        description: string;
        level: string;
        priceLabel: string;
        imageUrl: string;
    };
    summary: {
        originalPrice: string;
        discount: string;
        tax: string;
        total: string;
    };
    user: {
        name: string;
        email: string;
    };
}

export default function Checkout({ course, summary, user }: CheckoutProps) {
    const form = useForm({ course_id: course.id });
    const initials = user.name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join('');

    return (
        <>
            <Head title="Checkout Pembayaran" />
            <div className="flex min-h-screen flex-col bg-[#FAF8FF] text-[#131B2E]">
                <header className="w-full border-b border-slate-200 bg-white px-4 py-4 shadow-sm md:px-10">
                    <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <Link href="/courses" className="flex items-center">
                            <BrandLogo className="h-10" />
                        </Link>
                        <Link href="/courses" className="flex items-center gap-1 text-sm font-bold text-[#414753] transition hover:text-[#005BB1]">
                            <ArrowLeft className="size-4" />
                            Kembali ke Katalog
                        </Link>
                    </div>
                </header>

                <PublicContent skeleton="detail">
                    <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 md:px-10 md:py-12">
                        <div className="mb-8">
                            <h1 className="text-2xl font-extrabold tracking-tight text-[#131B2E] md:text-3xl">Checkout Pembayaran</h1>
                            <p className="mt-2 max-w-3xl leading-7 text-[#414753]">
                                Selesaikan pembayaran untuk membuka akses penuh ke materi, latihan, dan fitur belajar pada kelas ini.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
                            <section className="flex flex-col gap-6 lg:col-span-7">
                                <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-[0_4px_20px_rgba(15,23,42,0.05)]">
                                    <h2 className="mb-6 border-b border-slate-200 pb-4 text-xl font-extrabold md:text-2xl">Detail Pesanan</h2>
                                    <div className="flex flex-col items-start gap-6 sm:flex-row">
                                        <div className="relative h-44 w-full shrink-0 overflow-hidden rounded-lg bg-[#DAE2FD] sm:h-32 sm:w-48">
                                            <img src={course.imageUrl} alt={course.title} className="h-full w-full object-cover" />
                                            <div className="absolute top-2 left-2 rounded border border-violet-200 bg-violet-100/80 px-2 py-1 text-xs font-bold tracking-wider text-violet-700 uppercase backdrop-blur-sm">
                                                {course.level}
                                            </div>
                                        </div>
                                        <div className="flex min-w-0 flex-col gap-2">
                                            <h3 className="text-lg font-bold">{course.title}</h3>
                                            <div className="flex flex-wrap items-center gap-4 text-sm text-[#414753]">
                                                <span className="flex items-center gap-1">
                                                    <CreditCard className="size-4" />
                                                    Akses penuh setelah pembayaran
                                                </span>
                                            </div>
                                            <p className="mt-2 line-clamp-3 leading-7 text-[#414753]">{course.description}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-[0_4px_20px_rgba(15,23,42,0.05)]">
                                    <h2 className="mb-6 border-b border-slate-200 pb-4 text-xl font-extrabold md:text-2xl">Informasi Akun</h2>
                                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                                        <div className="flex size-12 items-center justify-center rounded-full bg-[#D6E3FF] text-lg font-bold text-[#005BB1]">
                                            {initials || 'NG'}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="font-bold">{user.name}</div>
                                            <div className="break-all text-[#414753]">{user.email}</div>
                                        </div>
                                        <Button asChild variant="outline" className="w-full sm:w-auto">
                                            <Link href="/settings/profile">Ubah Profil</Link>
                                        </Button>
                                    </div>
                                </div>
                            </section>

                            <aside className="lg:col-span-5">
                                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.1)] sm:p-6 lg:sticky lg:top-6">
                                    <h2 className="mb-6 text-xl font-extrabold md:text-2xl">Ringkasan Pembayaran</h2>
                                    <div className="mb-6 flex flex-col gap-4">
                                        <Line label="Harga kelas" value={summary.originalPrice} />
                                        <Line label="Diskon" value={summary.discount} accent />
                                        <Line label="Pajak" value={summary.tax} muted />
                                    </div>
                                    <div className="mb-8 border-t border-slate-200 pt-4">
                                        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                                            <span className="text-xl font-extrabold md:text-2xl">Total</span>
                                            <span className="text-2xl font-extrabold text-[#005BB1] md:text-3xl">{summary.total}</span>
                                        </div>
                                        <p className="mt-1 text-sm text-[#414753] sm:text-right">Pembayaran diproses melalui Midtrans.</p>
                                    </div>
                                    <Button
                                        className="w-full rounded-lg bg-[#1C7DE8] py-6 shadow-md hover:bg-[#005DB5]"
                                        disabled={form.processing}
                                        onClick={() => form.post('/checkout')}
                                    >
                                        <Lock className="size-4" />
                                        {form.processing ? 'Menyiapkan pembayaran...' : 'Bayar Sekarang'}
                                    </Button>
                                    <div className="mt-6 flex flex-col items-center gap-3 text-xs text-[#414753]">
                                        <div className="flex flex-wrap items-center justify-center gap-4 opacity-70 grayscale">
                                            <span className="flex items-center gap-1 font-semibold">
                                                <CreditCard className="size-4" /> VISA
                                            </span>
                                            <span className="flex items-center gap-1 font-semibold">
                                                <CreditCard className="size-4" /> MC
                                            </span>
                                            <span className="font-semibold">Bank Transfer</span>
                                        </div>
                                        <div className="flex items-center justify-center gap-1">
                                            <ShieldCheck className="size-4 text-[#1C7DE8]" />
                                            Transaksi terenkripsi dan aman
                                        </div>
                                    </div>
                                    <div className="mt-6 flex items-start gap-3 rounded-lg border border-slate-200 bg-[#F2F3FF] p-4">
                                        <ShieldCheck className="mt-0.5 size-5 text-[#005BB1]" />
                                        <div>
                                            <div className="text-sm font-bold">Akses langsung setelah pembayaran</div>
                                            <div className="mt-1 text-xs leading-5 text-[#414753]">
                                                Pendaftaran kelas akan aktif otomatis setelah pembayaran tervalidasi.
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </aside>
                        </div>
                    </main>
                </PublicContent>
                <FooterMark />
            </div>
        </>
    );
}

function Line({ label, value, accent = false, muted = false }: { label: string; value: string; accent?: boolean; muted?: boolean }) {
    return (
        <div className={`flex items-center justify-between gap-4 ${muted ? 'text-[#414753]' : accent ? 'text-[#6D3BCB]' : 'text-[#131B2E]'}`}>
            <span>{label}</span>
            <span className="text-right font-semibold">{value}</span>
        </div>
    );
}
