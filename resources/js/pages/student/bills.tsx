import { Panel, Shell } from '@/components/platform';
import { MobileCardList, MobileDataCard, StatusBadge } from '@/components/responsive-data';
import { Button } from '@/components/ui/button';
import { Head, router } from '@inertiajs/react';
import { CreditCard, Info, ReceiptText } from 'lucide-react';
import { useState } from 'react';

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
    const [expandedBillId, setExpandedBillId] = useState<number | null>(null);

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
                                <div className="grid gap-2">
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        onClick={() => setExpandedBillId(expandedBillId === bill.id ? null : bill.id)}
                                    >
                                        <Info className="size-4" />
                                        {expandedBillId === bill.id ? 'Tutup informasi' : 'Informasi tagihan'}
                                    </Button>
                                    {expandedBillId === bill.id && (
                                        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
                                            <p className="font-semibold">{bill.title}</p>
                                            <p className="mt-1 text-slate-600">Kursus: {bill.course}</p>
                                            <p className="text-slate-600">Nominal: {bill.amountLabel}</p>
                                            <p className="text-slate-600">Jatuh tempo: {bill.dueAt}</p>
                                            {bill.status !== 'paid' && (
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    className="mt-3"
                                                    onClick={() => router.post('/student/bills/' + bill.id + '/pay')}
                                                >
                                                    <CreditCard className="size-4" />
                                                    Bayar melalui Midtrans
                                                </Button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            }
                        />
                    ))}
                </MobileCardList>
            </Panel>
        </Shell>
    );
}
