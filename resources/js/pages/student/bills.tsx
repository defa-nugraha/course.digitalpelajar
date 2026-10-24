import { Panel, Shell } from '@/components/platform';
import { MobileCardList, MobileDataCard, StatusBadge } from '@/components/responsive-data';
import { Button } from '@/components/ui/button';
import { Head } from '@inertiajs/react';
import { CreditCard, ReceiptText } from 'lucide-react';

interface BillItem {
    id: number;
    title: string;
    course: string;
    amountLabel: string;
    dueAt: string;
    status: string;
    checkoutUrl?: string | null;
    paymentId?: number | null;
    orderId?: string | null;
}

export default function StudentBills({ bills }: { bills: BillItem[] }) {
    return (
        <Shell title="Tagihan Kursus" eyebrow="Pembayaran">
            <Head title="Tagihan Kursus" />
            <Panel title="Tagihan saya">
                <MobileCardList
                    empty={
                        <div className="grid place-items-center rounded-xl border border-dashed border-slate-300 p-8 text-center">
                            <ReceiptText className="size-10 text-slate-300" />
                            <p className="mt-3 text-sm text-slate-500">Belum ada tagihan kursus untuk akun ini.</p>
                        </div>
                    }
                >
                    {bills.map((bill) => (
                        <MobileDataCard
                            key={bill.id}
                            title={bill.title}
                            subtitle={bill.course}
                            badge={
                                <StatusBadge
                                    status={bill.status}
                                    label={
                                        bill.status === 'pending'
                                            ? 'Belum dibayar'
                                            : bill.status === 'paid'
                                              ? 'Lunas'
                                              : bill.status === 'overdue'
                                                ? 'Terlambat'
                                                : bill.status
                                    }
                                />
                            }
                            meta={[
                                { label: 'Nominal', value: bill.amountLabel },
                                { label: 'Jatuh tempo', value: bill.dueAt },
                                { label: 'ID order', value: bill.orderId ?? '-' },
                            ]}
                            actions={
                                bill.status !== 'paid' && bill.checkoutUrl ? (
                                    <Button asChild size="sm">
                                        <a
                                            href={bill.paymentId ? `/payments/${bill.paymentId}/continue` : bill.checkoutUrl}
                                        >
                                            <CreditCard className="size-4" />
                                            Bayar melalui Midtrans
                                        </a>
                                    </Button>
                                ) : null
                            }
                        />
                    ))}
                </MobileCardList>
            </Panel>
        </Shell>
    );
}
