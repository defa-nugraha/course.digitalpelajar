import PaginatedTable from '@/components/paginated-table';
import { Panel, Shell } from '@/components/platform';
import { DesktopTable, MobileCardList, MobileDataCard, StatusBadge } from '@/components/responsive-data';
import { Button } from '@/components/ui/button';
import { Head, router } from '@inertiajs/react';
import { notifyError } from '@/lib/notifications';
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
                                                    onClick={() =>
                                                        router.post('/student/bills/' + bill.id + '/pay', {}, {
                                                            onError: (errors) => {
                                                                if (Object.keys(errors).length === 0) {
                                                                    notifyError('Pembayaran gagal dimulai. Silakan coba kembali.');
                                                                }
                                                            },
                                                        })
                                                    }
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
                <DesktopTable className="mt-4">
                    <PaginatedTable className="w-full text-left text-sm">
                        <thead className="text-xs tracking-wide text-slate-500 uppercase">
                            <tr>
                                <th className="py-3">Tagihan</th>
                                <th>Kursus</th>
                                <th>Nominal</th>
                                <th>Jatuh tempo</th>
                                <th>Status</th>
                                <th>ID order</th>
                                <th className="text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {bills.map((bill) => (
                                <tr key={bill.id}>
                                    <td className="py-4 font-semibold">{bill.title}</td>
                                    <td>{bill.course}</td>
                                    <td>{bill.amountLabel}</td>
                                    <td>{bill.dueAt}</td>
                                    <td>
                                        <StatusBadge
                                            status={bill.status}
                                            label={bill.status === 'paid' ? 'Lunas' : bill.status === 'overdue' ? 'Terlambat' : 'Belum dibayar'}
                                        />
                                    </td>
                                    <td className="font-mono text-xs">{bill.orderId ?? '-'}</td>
                                    <td className="text-right">
                                        {bill.status !== 'paid' && (
                                            <Button type="button" size="sm" onClick={() => router.post(`/student/bills/${bill.id}/pay`, {}, { onError: () => notifyError('Pembayaran gagal dimulai. Silakan coba kembali.') })}>
                                                <CreditCard className="size-4" />
                                                Bayar
                                            </Button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </PaginatedTable>
                </DesktopTable>
            </Panel>
        </Shell>
    );
}
