import { Panel, Shell } from '@/components/platform';
import { DesktopTable, MobileCardList, MobileDataCard, StatusBadge } from '@/components/responsive-data';
import { Button } from '@/components/ui/button';
import { Head, Link } from '@inertiajs/react';
import { CreditCard, Download, ReceiptText } from 'lucide-react';

interface PaymentItem {
    id: number;
    orderId: string;
    course: string;
    amountLabel: string;
    status: string;
    method?: string | null;
    checkoutUrl?: string | null;
    createdAt: string;
    paidAt?: string | null;
}

export default function Payments({ payments }: { payments: PaymentItem[] }) {
    return (
        <Shell title="Riwayat Pembayaran" eyebrow="Invoice">
            <Head title="Riwayat Pembayaran" />
            <div className="mb-4 flex justify-end">
                <Button asChild variant="outline">
                    <Link href="/student/bills">Lihat Tagihan Kursus</Link>
                </Button>
            </div>
            <Panel title="Transaksi kelas berbayar">
                <div className="space-y-4">
                    <MobileCardList
                        empty={
                            <div className="grid place-items-center rounded-2xl border border-dashed border-slate-300 p-8 text-center">
                                <ReceiptText className="size-10 text-slate-300" />
                                <p className="mt-3 text-sm text-slate-500">Belum ada riwayat pembayaran.</p>
                                <Button asChild variant="outline" className="mt-4">
                                    <Link href="/courses">Lihat Kelas</Link>
                                </Button>
                            </div>
                        }
                    >
                        {payments.map((payment) => (
                            <MobileDataCard
                                key={payment.id}
                                title={payment.course}
                                subtitle={<span className="font-mono text-xs">{payment.orderId}</span>}
                                badge={<StatusBadge status={payment.status} label={payment.status} />}
                                meta={[
                                    { label: 'Total', value: payment.amountLabel },
                                    { label: 'Metode', value: payment.method?.replaceAll('_', ' ') ?? '-' },
                                ]}
                                actions={
                                    <>
                                        {payment.status === 'pending' && payment.checkoutUrl && (
                                            <Button asChild size="sm">
                                                <a href={`/payments/${payment.id}/continue`}>
                                                    <CreditCard className="size-4" />
                                                    Bayar sekarang
                                                </a>
                                            </Button>
                                        )}
                                        <Button asChild variant="outline" size="sm">
                                            <a href={`/payments/${payment.id}/invoice`}>
                                                <Download className="size-4" />
                                                Invoice
                                            </a>
                                        </Button>
                                    </>
                                }
                            />
                        ))}
                    </MobileCardList>
                    <DesktopTable>
                        <table className="w-full text-left text-sm">
                            <thead className="text-xs tracking-wider text-slate-500 uppercase">
                                <tr>
                                    <th className="py-3">Order</th>
                                    <th>Kursus</th>
                                    <th>Total</th>
                                    <th>Status</th>
                                    <th>Metode</th>
                                    <th className="text-right">Aksi</th>
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
                                            <div className="flex justify-end gap-1">
                                                {payment.status === 'pending' && payment.checkoutUrl && (
                                                    <Button asChild variant="outline" size="sm">
                                                        <a href={`/payments/${payment.id}/continue`}>Bayar</a>
                                                    </Button>
                                                )}
                                                <Button asChild variant="ghost" size="icon">
                                                    <a href={`/payments/${payment.id}/invoice`} aria-label="Unduh invoice">
                                                        <Download className="size-4" />
                                                    </a>
                                                </Button>
                                            </div>
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
                    </DesktopTable>
                </div>
            </Panel>
        </Shell>
    );
}
