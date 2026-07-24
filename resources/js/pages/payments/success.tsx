import { FooterMark, PublicContent } from '@/components/platform';
import { Button } from '@/components/ui/button';
import { Head, Link } from '@inertiajs/react';
import { ArrowRight, CheckCircle2, FileText } from 'lucide-react';

interface Payment {
    id?: number;
    orderId: string;
    course: string;
    amountLabel: string;
    method: string;
}

export default function Success({ payment }: { payment?: Payment | null }) {
    return (
        <>
            <Head title="Pembayaran Berhasil" />
            <div className="flex min-h-screen flex-col bg-[#FAF8FF] text-[#131B2E]">
                <PublicContent skeleton="centered">
                    <main className="relative flex flex-1 items-center justify-center overflow-hidden p-6">
                        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(218,226,253,0.9),_rgba(250,248,255,1)_55%)]" />
                        <section className="relative z-10 w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-[0_10px_30px_rgba(15,23,42,0.08)] sm:p-12">
                            <div className="mx-auto mb-8 flex size-24 items-center justify-center rounded-full border-4 border-white bg-[#D6E3FF] text-[#005BB1] shadow-sm">
                                <CheckCircle2 className="size-12" />
                            </div>
                            <h1 className="mb-3 text-3xl font-extrabold tracking-tight">Pembayaran Berhasil</h1>
                            <p className="mb-10 leading-7 text-[#414753]">
                                {payment
                                    ? `Pendaftaran kelas "${payment.course}" sudah aktif. Anda dapat langsung memulai pembelajaran.`
                                    : 'Belum ada pembayaran berhasil untuk akun ini.'}
                            </p>
                            <div className="mb-10 rounded-xl border border-slate-200 bg-[#F2F3FF] p-6 text-left">
                                <div className="mb-5 flex items-center justify-between border-b border-slate-200 pb-5">
                                    <span className="text-sm font-bold tracking-wider text-[#414753] uppercase">Total dibayar</span>
                                    <span className="text-2xl font-extrabold text-[#005BB1]">{payment?.amountLabel ?? '-'}</span>
                                </div>
                                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                                    <Detail label="ID Pesanan" value={payment?.orderId ?? '-'} />
                                    <Detail label="Metode Pembayaran" value={payment?.method ?? '-'} />
                                </div>
                            </div>
                            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
                                <Button
                                    asChild
                                    className="w-full rounded-lg bg-[#005BB1] py-6 shadow-[0_4px_14px_rgba(0,91,177,0.3)] hover:bg-[#1C7DE8] sm:w-auto"
                                >
                                    <Link href="/learning">
                                        Mulai Belajar
                                        <ArrowRight className="size-5" />
                                    </Link>
                                </Button>
                                <Button asChild variant="outline" className="w-full rounded-lg border-2 border-slate-300 py-6 sm:w-auto">
                                    {payment?.id ? (
                                        <a href={`/payments/${payment.id}/invoice`}>
                                            <FileText className="size-5" />
                                            Lihat Invoice
                                        </a>
                                    ) : (
                                        <Link href="/payments">
                                            <FileText className="size-5" />
                                            Lihat Pembayaran
                                        </Link>
                                    )}
                                </Button>
                            </div>
                        </section>
                    </main>
                </PublicContent>
                <FooterMark />
            </div>
        </>
    );
}

function Detail({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <span className="mb-2 block text-sm font-bold tracking-wider text-[#414753] uppercase">{label}</span>
            <span className="font-semibold text-[#131B2E]">{value}</span>
        </div>
    );
}
