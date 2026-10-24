import { Panel, Shell } from '@/components/platform';
import { DesktopTable, MobileCardList, MobileDataCard, StatusBadge } from '@/components/responsive-data';
import { SearchableSelect } from '@/components/searchable-select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Head } from '@inertiajs/react';
import { Copy, Download, ExternalLink, ReceiptText } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface PaymentRow {
    id: number;
    orderId: string;
    transactionId?: string | null;
    student: string;
    email: string;
    course: string;
    amountLabel: string;
    status: string;
    method?: string | null;
    checkoutUrl?: string | null;
    paidAt?: string | null;
}

export default function Payments({ payments }: { payments: PaymentRow[] }) {
    const [term, setTerm] = useState('');
    const [status, setStatus] = useState('all');
    const visible = payments.filter(
        (payment) =>
            (status === 'all' || payment.status === status) &&
            `${payment.orderId} ${payment.student} ${payment.email} ${payment.course}`.toLowerCase().includes(term.toLowerCase()),
    );

    const copy = async (value: string, label: string) => {
        try {
            await navigator.clipboard.writeText(value);
            toast.success(`${label} berhasil disalin.`);
        } catch {
            toast.error(`Tidak dapat menyalin ${label.toLowerCase()}.`);
        }
    };

    const actions = (payment: PaymentRow, compact = false) => (
        <div className={compact ? 'flex flex-wrap justify-end gap-2' : 'flex justify-end gap-1'}>
            {payment.checkoutUrl && payment.status === 'pending' && (
                <>
                    <Button
                        type="button"
                        variant="outline"
                        size={compact ? 'sm' : 'icon'}
                        onClick={() => void copy(payment.checkoutUrl ?? '', 'Link pembayaran')}
                    >
                        <Copy className="size-4" />
                        {compact && 'Salin link'}
                    </Button>
                    <Button asChild size={compact ? 'sm' : 'icon'}>
                        <a href={payment.checkoutUrl} target="_blank" rel="noreferrer" aria-label="Buka halaman pembayaran">
                            <ExternalLink className="size-4" />
                            {compact && 'Buka pembayaran'}
                        </a>
                    </Button>
                </>
            )}
            <Button type="button" variant="ghost" size={compact ? 'sm' : 'icon'} onClick={() => void copy(payment.orderId, 'ID order')}>
                <ReceiptText className="size-4" />
                {compact && 'Salin order'}
            </Button>
            <Button asChild variant="outline" size={compact ? 'sm' : 'icon'}>
                <a href={`/payments/${payment.id}/invoice`} aria-label="Unduh invoice">
                    <Download className="size-4" />
                    {compact && 'Invoice'}
                </a>
            </Button>
        </div>
    );

    return (
        <Shell title="Monitoring Pembayaran" eyebrow="Admin Pusat">
            <Head title="Monitoring Pembayaran" />
            <div className="mb-4 flex justify-end">
                <Button asChild>
                    <a href="/admin/course-bills">Kelola Tagihan Kursus</a>
                </Button>
            </div>
            <Panel
                title="Riwayat transaksi"
                action={
                    <div className="flex flex-col gap-2 sm:flex-row">
                        <Input
                            className="w-full sm:w-56"
                            placeholder="Cari order atau siswa"
                            value={term}
                            onChange={(event) => setTerm(event.target.value)}
                        />
                        <SearchableSelect
                            className="w-full sm:w-48"
                            value={status}
                            onChange={setStatus}
                            options={[
                                { value: 'all', label: 'Semua status' },
                                { value: 'pending', label: 'Pending' },
                                { value: 'paid', label: 'Paid' },
                                { value: 'failed', label: 'Failed' },
                            ]}
                        />
                    </div>
                }
            >
                <div className="space-y-4">
                    <MobileCardList
                        empty={
                            <p className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
                                Tidak ada transaksi yang cocok.
                            </p>
                        }
                    >
                        {visible.map((payment) => (
                            <MobileDataCard
                                key={payment.id}
                                title={payment.student}
                                subtitle={payment.email}
                                badge={<StatusBadge status={payment.status} label={payment.status} />}
                                meta={[
                                    { label: 'Order', value: <span className="font-mono text-xs">{payment.orderId}</span> },
                                    { label: 'Kursus', value: payment.course },
                                    { label: 'Total', value: payment.amountLabel },
                                    { label: 'Metode', value: payment.method?.replaceAll('_', ' ') ?? '-' },
                                ]}
                                actions={actions(payment, true)}
                            />
                        ))}
                    </MobileCardList>
                    <DesktopTable>
                        <table className="w-full text-left text-sm">
                            <thead className="text-xs tracking-wider text-slate-500 uppercase">
                                <tr>
                                    <th className="py-3">Order</th>
                                    <th>Siswa</th>
                                    <th>Kursus</th>
                                    <th>Total</th>
                                    <th>Status</th>
                                    <th>Metode</th>
                                    <th className="text-right">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                                {visible.map((payment) => (
                                    <tr key={payment.id}>
                                        <td className="py-4 font-mono text-xs">{payment.orderId}</td>
                                        <td>
                                            <p className="font-semibold">{payment.student}</p>
                                            <p className="text-xs text-slate-500">{payment.email}</p>
                                        </td>
                                        <td>{payment.course}</td>
                                        <td>{payment.amountLabel}</td>
                                        <td className="capitalize">{payment.status}</td>
                                        <td className="capitalize">{payment.method?.replaceAll('_', ' ') ?? '-'}</td>
                                        <td className="text-right">{actions(payment)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {visible.length === 0 && <p className="py-8 text-center text-sm text-slate-500">Tidak ada transaksi yang cocok.</p>}
                    </DesktopTable>
                </div>
            </Panel>
        </Shell>
    );
}
