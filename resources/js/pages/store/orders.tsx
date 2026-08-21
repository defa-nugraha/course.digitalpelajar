import { Panel, Shell } from '@/components/platform';
import { Button } from '@/components/ui/button';
import { Head, Link } from '@inertiajs/react';
import { ExternalLink, KeyRound, PackageCheck } from 'lucide-react';

interface OrderRow {
    id: number;
    orderNumber: string;
    totalLabel: string;
    paymentStatus: string;
    fulfillmentStatus: string;
    digitalStatus: string;
    checkoutUrl?: string | null;
    trackingNumber?: string | null;
    courier?: string | null;
    createdAt?: string | null;
    items: { name: string; quantity: number; totalLabel: string }[];
    activationCodes: { code: string; status: string; target: string; expiresAt?: string | null }[];
}

interface RedeemedCode {
    code: string;
    target: string;
    redeemedAt?: string | null;
}

export default function StoreOrders({ orders, redeemedCodes }: { orders: OrderRow[]; redeemedCodes: RedeemedCode[] }) {
    return (
        <Shell title="Order Toko Robotik" eyebrow="Toko Robotik">
            <Head title="Order Toko Robotik" />
            <div className="mb-6 flex flex-wrap gap-2">
                <Button asChild>
                    <Link href="/store">Belanja Produk</Link>
                </Button>
                <Button asChild variant="outline">
                    <Link href="/activation-codes/redeem">
                        <KeyRound className="size-4" />
                        Redeem Kode
                    </Link>
                </Button>
            </div>
            <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
                <Panel title="Riwayat Order">
                    <div className="space-y-4">
                        {orders.map((order) => (
                            <article key={order.id} className="rounded-2xl border border-slate-200 p-4">
                                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                    <div>
                                        <p className="font-mono text-xs text-slate-500">{order.orderNumber}</p>
                                        <h2 className="mt-1 font-extrabold text-slate-950">{order.totalLabel}</h2>
                                        <p className="mt-1 text-sm text-slate-500">
                                            Pembayaran: {statusLabel(order.paymentStatus)} · Pengiriman: {statusLabel(order.fulfillmentStatus)}
                                        </p>
                                    </div>
                                    {order.paymentStatus !== 'paid' && order.checkoutUrl && (
                                        <Button asChild size="sm">
                                            <a href={order.checkoutUrl}>
                                                Lanjut Bayar <ExternalLink className="size-4" />
                                            </a>
                                        </Button>
                                    )}
                                </div>
                                <div className="mt-4 grid gap-3 md:grid-cols-2">
                                    {order.items.map((item) => (
                                        <div key={`${order.id}-${item.name}`} className="rounded-xl bg-slate-50 p-3 text-sm">
                                            <p className="font-bold">{item.name}</p>
                                            <p className="text-slate-500">
                                                {item.quantity}x · {item.totalLabel}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                                {order.activationCodes.length > 0 && (
                                    <div className="mt-4 rounded-xl bg-blue-50 p-4">
                                        <p className="mb-2 font-bold text-blue-900">Kode aktivasi dari order ini</p>
                                        <div className="space-y-2">
                                            {order.activationCodes.map((code) => (
                                                <div
                                                    key={code.code}
                                                    className="flex flex-col gap-1 rounded-lg bg-white p-3 text-sm md:flex-row md:items-center md:justify-between"
                                                >
                                                    <span className="font-mono font-bold">{code.code}</span>
                                                    <span>
                                                        {code.target} · {statusLabel(code.status)}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </article>
                        ))}
                        {orders.length === 0 && <p className="py-10 text-center text-sm text-slate-500">Belum ada order produk.</p>}
                    </div>
                </Panel>
                <Panel title="Kode yang Sudah Digunakan">
                    <div className="space-y-3">
                        {redeemedCodes.map((code) => (
                            <div key={code.code} className="rounded-xl border border-slate-200 p-4">
                                <p className="font-mono font-bold">{code.code}</p>
                                <p className="mt-1 text-sm text-slate-500">{code.target}</p>
                            </div>
                        ))}
                        {redeemedCodes.length === 0 && (
                            <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
                                <PackageCheck className="mx-auto mb-2 size-8" />
                                Belum ada kode yang digunakan.
                            </div>
                        )}
                    </div>
                </Panel>
            </div>
        </Shell>
    );
}

function statusLabel(value: string) {
    return value.replaceAll('_', ' ');
}
