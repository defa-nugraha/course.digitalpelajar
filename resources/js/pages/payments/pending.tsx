import { Panel, Shell } from '@/components/platform';
import { Button } from '@/components/ui/button';
import { Head, Link } from '@inertiajs/react';
import { AlertCircle, Copy, RefreshCw } from 'lucide-react';

interface Payment {
    orderId: string;
    course: string;
    amountLabel: string;
    payload: {
        va_number?: string;
    };
}

export default function Pending({ payment }: { payment?: Payment | null }) {
    return (
        <Shell title="Waiting for Payment" eyebrow={payment?.orderId ?? 'Midtrans'}>
            <Head title="Menunggu Pembayaran" />
            <div className="mx-auto max-w-3xl">
                <Panel>
                    <div className="text-center">
                        <AlertCircle className="mx-auto size-14 text-amber-500" />
                        <h1 className="mt-4 text-3xl font-extrabold">Waiting for Payment</h1>
                        <p className="mt-2 text-slate-600">
                            {payment ? `Registrasi untuk "${payment.course}" masih menunggu pembayaran valid.` : 'Tidak ada pembayaran pending untuk akun ini.'}
                        </p>
                        <div className="mt-6 rounded-lg border border-blue-100 bg-blue-50 p-5 text-slate-950">
                            <p className="text-sm text-slate-500">Total Amount</p>
                            <p className="mt-1 text-4xl font-extrabold">{payment?.amountLabel ?? '-'}</p>
                            <p className="mt-2 text-sm text-slate-500">Enrollment aktif setelah callback Midtrans valid.</p>
                        </div>
                    </div>
                    {payment && (
                        <div className="mt-6 rounded-lg border border-slate-200 p-5">
                            <p className="font-bold">Virtual Account</p>
                            <div className="mt-3 flex items-center justify-between rounded-lg bg-slate-50 p-4 font-mono text-lg">
                                {payment.payload.va_number ?? '8801 2345 6789 0123'}
                                <Copy className="size-5 text-blue-700" />
                            </div>
                        </div>
                    )}
                    <div className="mt-6 flex gap-3">
                        <Button variant="outline" className="flex-1"><RefreshCw className="size-4" />Refresh Status</Button>
                        <Button asChild className="flex-1 bg-[#1C7DE8] hover:bg-[#1469c7]">
                            <Link href="/payments/success">Lihat Pembayaran Berhasil</Link>
                        </Button>
                    </div>
                </Panel>
            </div>
        </Shell>
    );
}
