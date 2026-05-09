import { Panel, Shell } from '@/components/platform';
import { Button } from '@/components/ui/button';
import { Head, Link } from '@inertiajs/react';
import { ArrowRight, CheckCircle2 } from 'lucide-react';

interface Payment {
    orderId: string;
    course: string;
    amountLabel: string;
    method: string;
}

export default function Success({ payment }: { payment?: Payment | null }) {
    return (
        <Shell title="Payment Successful" eyebrow="Order #NGW-872914">
            <Head title="Pembayaran Berhasil" />
            <div className="mx-auto max-w-2xl">
                <Panel>
                    <div className="text-center">
                        <CheckCircle2 className="mx-auto size-16 text-emerald-600" />
                        <h1 className="mt-5 text-3xl font-extrabold">Payment Successful</h1>
                        <p className="mt-2 text-slate-600">{payment ? `Enrollment "${payment.course}" aktif. Kelas berbayar sudah bisa diakses.` : 'Belum ada pembayaran berhasil untuk akun ini.'}</p>
                    </div>
                    <div className="mt-6 grid gap-3 rounded-lg border border-slate-200 p-5 text-sm">
                        <Line label="Amount Paid" value={payment?.amountLabel ?? '-'} />
                        <Line label="Order ID" value={payment?.orderId ?? '-'} />
                        <Line label="Payment Method" value={payment?.method ?? '-'} />
                    </div>
                    <Button asChild className="mt-6 w-full bg-[#1C7DE8] hover:bg-[#1469c7]">
                        <Link href="/learning">
                            Mulai Belajar
                            <ArrowRight className="size-4" />
                        </Link>
                    </Button>
                </Panel>
            </div>
        </Shell>
    );
}

function Line({ label, value }: { label: string; value: string }) {
    return <div className="flex justify-between"><span className="text-slate-500">{label}</span><span className="font-bold">{value}</span></div>;
}
