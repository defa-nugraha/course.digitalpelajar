import { Panel, Shell } from '@/components/platform';
import { Button } from '@/components/ui/button';
import { Head, useForm } from '@inertiajs/react';
import { CreditCard, Landmark, QrCode, ShieldCheck } from 'lucide-react';

interface Payment {
    id: number;
    order_id: string;
    amount: number;
    description: string;
    type: string;
    course: string;
    student: string;
    status: string;
}

export default function MockCheckout({ payment }: { payment: Payment }) {
    const form = useForm({ payment_method: 'bank_transfer' });

    return (
        <Shell title="Simulasi Pembayaran" eyebrow="Midtrans Mock">
            <Head title="Pembayaran Mock" />
            <div className="mx-auto max-w-2xl">
                <Panel title="Konfirmasi Transaksi">
                    <div className="grid gap-4 rounded-lg border border-slate-200 p-5 text-sm md:grid-cols-2">
                        <Info label="Order ID" value={payment.order_id} />
                        <Info label="Siswa" value={payment.student} />
                        <Info label={payment.type} value={payment.description || payment.course} />
                        <Info label="Total" value={`Rp ${payment.amount.toLocaleString('id-ID')}`} />
                    </div>
                    <div className="mt-5 grid gap-3 md:grid-cols-3">
                        <Method
                            icon={Landmark}
                            label="Virtual Account"
                            active={form.data.payment_method === 'bank_transfer'}
                            onClick={() => form.setData('payment_method', 'bank_transfer')}
                        />
                        <Method
                            icon={CreditCard}
                            label="Kartu Kredit"
                            active={form.data.payment_method === 'credit_card'}
                            onClick={() => form.setData('payment_method', 'credit_card')}
                        />
                        <Method
                            icon={QrCode}
                            label="QRIS"
                            active={form.data.payment_method === 'qris'}
                            onClick={() => form.setData('payment_method', 'qris')}
                        />
                    </div>
                    <div className="mt-5 flex items-center gap-2 rounded-lg bg-blue-50 p-3 text-sm font-semibold text-blue-800">
                        <ShieldCheck className="size-4" />
                        Mode QA aktif. Tidak ada dana nyata yang diproses.
                    </div>
                    <Button
                        className="mt-5 w-full bg-[#1C7DE8] hover:bg-[#1469c7]"
                        disabled={form.processing || payment.status === 'paid'}
                        onClick={() => form.post(`/payments/${payment.id}/mock-settle`)}
                    >
                        Konfirmasi Pembayaran
                    </Button>
                </Panel>
            </div>
        </Shell>
    );
}

function Info({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <p className="text-xs font-bold text-slate-500 uppercase">{label}</p>
            <p className="mt-1 font-semibold">{value}</p>
        </div>
    );
}

function Method({ icon: Icon, label, active, onClick }: { icon: typeof CreditCard; label: string; active: boolean; onClick: () => void }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`rounded-lg border p-4 text-left font-semibold ${active ? 'border-blue-500 bg-blue-50 text-blue-800' : 'border-slate-200 bg-white'}`}
        >
            <Icon className="mb-3 size-5" />
            {label}
        </button>
    );
}
