import { Panel, Shell } from '@/components/platform';
import { Button } from '@/components/ui/button';
import { Head, Link } from '@inertiajs/react';
import { CreditCard, Lock, ShieldCheck } from 'lucide-react';

interface CheckoutProps {
    course: {
        id: number;
        title: string;
        description: string;
        level: string;
        priceLabel: string;
    };
    summary: {
        originalPrice: string;
        discount: string;
        tax: string;
        total: string;
    };
}

export default function Checkout({ course, summary }: CheckoutProps) {
    return (
        <Shell title="Secure Checkout" eyebrow="Midtrans Payment">
            <Head title="Checkout" />
            <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
                <Panel title="Order Details">
                    <div className="rounded-lg border border-slate-200 p-5">
                        <p className="text-sm font-bold uppercase tracking-wider text-violet-700">{course.level}</p>
                        <h2 className="mt-2 text-2xl font-extrabold">{course.title}</h2>
                        <p className="mt-2 text-slate-600">{course.description}</p>
                    </div>
                    <div className="mt-5 rounded-lg border border-slate-200 p-5">
                        <h3 className="font-bold">Account Information</h3>
                        <p className="mt-2 text-sm text-slate-500">Siswa Ngawitekno - siswa@example.com</p>
                    </div>
                    <div className="mt-5 grid gap-3 md:grid-cols-3">
                        {['Credit Card', 'Virtual Account', 'QRIS'].map((method) => (
                            <button key={method} className="rounded-lg border border-slate-200 p-4 text-left font-semibold hover:border-blue-300">
                                <CreditCard className="mb-3 size-5 text-blue-700" />
                                {method}
                            </button>
                        ))}
                    </div>
                </Panel>
                <Panel title="Summary">
                    <Line label="Original Price" value={summary.originalPrice} />
                    <Line label="Early Bird Discount" value={summary.discount} />
                    <Line label="Taxes" value={summary.tax} />
                    <div className="my-4 border-t border-slate-200" />
                    <Line label="Total" value={summary.total} bold />
                    <div className="mt-5 flex items-center gap-2 rounded-lg bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">
                        <ShieldCheck className="size-4" />
                        Secure processing via Midtrans
                    </div>
                    <Button asChild className="mt-5 w-full bg-[#1C7DE8] hover:bg-[#1469c7]">
                            <Link href="/payments/pending">
                            <Lock className="size-4" />
                            Bayar Sekarang
                        </Link>
                    </Button>
                </Panel>
            </div>
        </Shell>
    );
}

function Line({ label, value, bold = false }: { label: string; value: string; bold?: boolean }) {
    return (
        <div className={bold ? 'flex justify-between text-xl font-extrabold' : 'flex justify-between text-sm text-slate-600'}>
            <span>{label}</span>
            <span>{value}</span>
        </div>
    );
}
