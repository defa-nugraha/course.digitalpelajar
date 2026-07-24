import { Panel, Shell } from '@/components/platform';
import { SearchableSelect } from '@/components/searchable-select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Head } from '@inertiajs/react';
import { Download } from 'lucide-react';
import { useState } from 'react';

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

    return (
        <Shell title="Monitoring Pembayaran" eyebrow="Admin Pusat">
            <Head title="Monitoring Pembayaran" />
            <Panel
                title="Riwayat transaksi"
                action={
                    <div className="flex gap-2">
                        <Input className="w-56" placeholder="Cari order atau siswa" value={term} onChange={(event) => setTerm(event.target.value)} />
                        <SearchableSelect
                            className="w-48"
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
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="text-xs tracking-wider text-slate-500 uppercase">
                            <tr>
                                <th className="py-3">Order</th>
                                <th>Siswa</th>
                                <th>Kursus</th>
                                <th>Total</th>
                                <th>Status</th>
                                <th>Metode</th>
                                <th className="text-right">Invoice</th>
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
                    {visible.length === 0 && <p className="py-8 text-center text-sm text-slate-500">Tidak ada transaksi yang cocok.</p>}
                </div>
            </Panel>
        </Shell>
    );
}
