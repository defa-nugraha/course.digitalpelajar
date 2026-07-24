import BrandLogo from '@/components/brand-logo';
import { FooterMark, PublicContent } from '@/components/platform';
import { Button } from '@/components/ui/button';
import { Head, Link, router } from '@inertiajs/react';
import { AlertCircle, Copy, RefreshCw } from 'lucide-react';
import { useState } from 'react';

interface Payment {
    orderId: string;
    course: string;
    amountLabel: string;
    payload: {
        va_number?: string;
    };
    checkoutUrl?: string | null;
}

export default function Pending({ payment }: { payment?: Payment | null }) {
    const [copied, setCopied] = useState(false);

    return (
        <>
            <Head title="Menunggu Pembayaran" />
            <div className="flex min-h-screen flex-col bg-[#FAF8FF] text-[#131B2E]">
                <header className="fixed top-0 left-0 z-50 flex h-16 w-full items-center justify-center border-b border-slate-200 bg-white/80 px-10 shadow-sm backdrop-blur-md">
                    <BrandLogo className="h-10" />
                </header>
                <PublicContent skeleton="centered">
                    <main className="flex flex-1 flex-col items-center justify-center gap-8 px-4 py-[100px] md:px-10">
                        <div className="flex w-full max-w-2xl flex-col gap-6">
                            <section className="flex items-start gap-4 rounded-xl border border-[#CBA800]/30 bg-[#FFE178] p-4 text-[#231B00] shadow-sm">
                                <AlertCircle className="mt-1 size-6 shrink-0 text-[#715D00]" />
                                <div>
                                    <h1 className="mb-1 text-2xl font-extrabold">Waiting for Payment</h1>
                                    <p className="leading-7">
                                        {payment
                                            ? `Registrasi untuk "${payment.course}" masih menunggu pembayaran. Selesaikan pembayaran agar akses kelas aktif.`
                                            : 'Tidak ada pembayaran pending untuk akun ini.'}
                                    </p>
                                </div>
                            </section>

                            <section className="flex flex-col gap-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_4px_20px_rgba(15,23,42,0.05)] md:p-8">
                                <div className="flex flex-col items-center gap-4 border-b border-slate-200 pb-8 text-center">
                                    <span className="leading-7 text-[#414753]">Payment status</span>
                                    <div className="text-4xl font-extrabold tracking-tight text-[#0073DD] md:text-5xl">Menunggu Konfirmasi</div>
                                    <div className="mt-4 flex flex-col items-center gap-2">
                                        <span className="leading-7 text-[#414753]">Total Amount</span>
                                        <div className="text-3xl font-extrabold">{payment?.amountLabel ?? '-'}</div>
                                        <span className="mt-2 rounded-full bg-[#EAEDFF] px-3 py-1 text-sm font-bold text-slate-500">
                                            Order ID: {payment?.orderId ?? '-'}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-6">
                                    <h2 className="text-2xl font-extrabold">How to Pay</h2>
                                    <div className="flex w-full border-b border-slate-200">
                                        <div className="flex-1 border-b-2 border-[#0073DD] bg-[#D6E3FF]/40 py-3 text-center text-sm font-bold text-[#0073DD]">
                                            Virtual Account
                                        </div>
                                        <div className="flex-1 border-b-2 border-transparent py-3 text-center text-sm font-bold text-[#414753]">
                                            QRIS
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-6">
                                        <div className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-[#F2F3FF] p-4 sm:flex-row sm:items-center sm:justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className="flex size-12 items-center justify-center rounded-md border border-slate-200 bg-white font-bold text-[#0073DD] shadow-sm">
                                                    VA
                                                </div>
                                                <div>
                                                    <span className="block text-sm text-[#414753]">Virtual Account</span>
                                                    <span className="text-xl font-extrabold tracking-wider">
                                                        {payment?.payload.va_number ?? 'Tersedia di halaman Midtrans'}
                                                    </span>
                                                </div>
                                            </div>
                                            {payment?.payload.va_number && (
                                                <button
                                                    type="button"
                                                    onClick={async () => {
                                                        await navigator.clipboard.writeText(payment.payload.va_number ?? '');
                                                        setCopied(true);
                                                        window.setTimeout(() => setCopied(false), 1500);
                                                    }}
                                                    className="flex items-center justify-center gap-2 rounded-full p-2 font-bold text-[#0073DD] transition hover:bg-[#D6E3FF]"
                                                    title="Copy to clipboard"
                                                >
                                                    <Copy className="size-5" />
                                                    {copied ? 'Tersalin' : 'Salin'}
                                                </button>
                                            )}
                                        </div>

                                        <div className="flex flex-col gap-4">
                                            <p className="font-bold">Instructions</p>
                                            <ol className="ml-2 flex list-inside list-decimal flex-col gap-3 leading-7 text-[#414753]">
                                                <li>Buka halaman pembayaran Midtrans atau aplikasi bank/e-wallet yang dipilih.</li>
                                                <li>Masukkan nomor pembayaran yang tersedia pada halaman Midtrans.</li>
                                                <li>Pastikan nominal dan detail transaksi sudah sesuai.</li>
                                                <li>Selesaikan pembayaran, lalu kembali ke halaman ini untuk mengecek status.</li>
                                            </ol>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-4 border-t border-slate-200 pt-6">
                                    <Button className="w-full rounded-lg bg-[#1C7DE8] py-6 hover:bg-[#005DB5]" onClick={() => router.reload()}>
                                        <RefreshCw className="size-4" />
                                        Check Status
                                    </Button>
                                    {payment?.checkoutUrl ? (
                                        <Button asChild variant="outline" className="w-full rounded-lg border-[#1C7DE8] py-6 text-[#1C7DE8]">
                                            <a href={payment.checkoutUrl}>Change Payment Method</a>
                                        </Button>
                                    ) : (
                                        <Button asChild variant="outline" className="w-full rounded-lg border-[#1C7DE8] py-6 text-[#1C7DE8]">
                                            <Link href="/payments">Riwayat Pembayaran</Link>
                                        </Button>
                                    )}
                                </div>
                            </section>
                        </div>
                    </main>
                </PublicContent>
                <FooterMark />
            </div>
        </>
    );
}
