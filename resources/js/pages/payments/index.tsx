import { Panel, Shell } from '@/components/platform';
import { Button } from '@/components/ui/button';
import { Head, Link } from '@inertiajs/react';
import { Download, ReceiptText } from 'lucide-react';

interface PaymentItem {
    id: number;
    orderId: string;
    course: string;
    amountLabel: string;
    status: string;
    method?: string | null;
    createdAt: string;
    paidAt?: string | null;
}

export default function Payments({ payments }: { payments: PaymentItem[] }) {
    return (
        <Shell title="Riwayat Pembayaran" eyebrow="Invoice">
            <Head title="Riwayat Pembayaran" />
            <Panel title="Transaksi kelas berbayar">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="text-xs tracking-wider text-slate-500 uppercase">
                            <tr>
                                <th className="py-3">Order</th>
                                <th>Kursus</th>
                                <th>Total</th>
                                <th>Status</th>
                                <th>Metode</th>
                                <th className="text-right">Invoice</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {payments.map((payment) => (
                                <tr key={payment.id}>
                                    <td className="py-4 font-mono text-xs">{payment.orderId}</td>
                                    <td className="font-semibold">{payment.course}</td>
                                    <td>{payment.amountLabel}</td>
                                    <td className="capitalize">{payment.status}</td>
                                    <td className="capitalize">{payment.method?.replaceAll('_', ' ') ?? '-'}</td>
                                    <td className="text-right">
                                        <Button asChild variant="ghost" size="icon">
                                            <a href={`/payments/${payment.id}/invoice`} aria-label="Unduh invoice">
                                                <Download className="size-4" />
                                            </a>
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {payments.length === 0 && (
                        <div className="grid place-items-center py-10 text-center">
                            <ReceiptText className="size-10 text-slate-300" />
                            <p className="mt-3 text-sm text-slate-500">Belum ada riwayat pembayaran.</p>
                            <Button asChild variant="outline" className="mt-4">
                                <Link href="/courses">Lihat Kelas</Link>
                            </Button>
                        </div>
                    )}
                </div>
            </Panel>
        </Shell>
    );
}
