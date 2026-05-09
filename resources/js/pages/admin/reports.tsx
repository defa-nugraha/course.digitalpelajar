import { Panel, Shell, StatCard } from '@/components/platform';
import { Button } from '@/components/ui/button';
import { Head } from '@inertiajs/react';
import { Award, Download, Filter, TrendingUp, Users, Wallet } from 'lucide-react';

interface ReportProps {
    stats: {
        revenue: string;
        users: number;
        completion: number;
        certificates: number;
    };
    bars: {
        title: string;
        value: number;
    }[];
    paymentStatus: {
        label: string;
        value: string;
        count: number;
    }[];
}

export default function Reports({ stats, bars, paymentStatus }: ReportProps) {
    return (
        <Shell title="Global Reporting & Analytics" eyebrow="Admin Pusat" nav="admin" actions={<Button variant="outline"><Filter className="size-4" />Filter</Button>}>
            <Head title="Laporan Analitik" />
            <div className="grid gap-5 md:grid-cols-4">
                <StatCard label="Revenue" value={stats.revenue} icon={Wallet} />
                <StatCard label="Users" value={String(stats.users)} icon={Users} tone="purple" />
                <StatCard label="Completion" value={`${stats.completion}%`} icon={TrendingUp} tone="amber" />
                <StatCard label="Certificates" value={String(stats.certificates)} icon={Award} tone="slate" />
            </div>
            <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
                <Panel title="Detailed Enrollment Reports" action={<Button size="sm"><Download className="size-4" />Export CSV</Button>}>
                    <div className="grid h-72 place-items-end gap-3 rounded-lg bg-slate-50 p-6 md:grid-cols-6">
                        {bars.map((bar) => (
                            <div key={bar.title} className="flex h-full w-full items-end" title={bar.title}>
                                <div className="w-full rounded-t-lg bg-[#1C7DE8]" style={{ height: `${bar.value}%` }} />
                            </div>
                        ))}
                    </div>
                </Panel>
                <Panel title="Payment Status">
                    {paymentStatus.map((item) => (
                        <div key={item.label} className="mb-4">
                            <div className="mb-2 flex justify-between text-sm font-bold"><span>{item.label}</span><span>{item.value}</span></div>
                            <div className="h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-[#1C7DE8]" style={{ width: item.value }} /></div>
                        </div>
                    ))}
                </Panel>
            </div>
        </Shell>
    );
}
