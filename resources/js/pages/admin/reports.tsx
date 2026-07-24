import { Panel, Shell, StatCard } from '@/components/platform';
import { Button } from '@/components/ui/button';
import { Head } from '@inertiajs/react';
import { Award, Download, TrendingUp, Users, Wallet } from 'lucide-react';

interface ReportProps {
    stats: {
        revenue: string;
        enrollments: number;
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

export default function Reports({ stats, bars, paymentStatus, scopeLabel, showRevenue }: ReportProps & { scopeLabel: string; showRevenue: boolean }) {
    const exportCsv = () => {
        const rows = [['Kursus', 'Rata-rata Progress'], ...bars.map((bar) => [bar.title, String(bar.value)])];
        const csv = rows.map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(',')).join('\n');
        const link = document.createElement('a');
        link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
        link.download = 'laporan-enrollment.csv';
        link.click();
        URL.revokeObjectURL(link.href);
    };

    return (
        <Shell title="Reporting & Analytics" eyebrow={scopeLabel}>
            <Head title="Laporan Analitik" />
            <div className="grid gap-5 md:grid-cols-4">
                <StatCard
                    label={showRevenue ? 'Revenue' : 'Enrollments'}
                    value={showRevenue ? stats.revenue : String(stats.enrollments)}
                    icon={Wallet}
                />
                <StatCard label="Users" value={String(stats.users)} icon={Users} tone="purple" />
                <StatCard label="Completion" value={`${stats.completion}%`} icon={TrendingUp} tone="amber" />
                <StatCard label="Certificates" value={String(stats.certificates)} icon={Award} tone="slate" />
            </div>
            <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
                <Panel
                    title="Detailed Enrollment Reports"
                    action={
                        <Button size="sm" onClick={exportCsv}>
                            <Download className="size-4" />
                            Export CSV
                        </Button>
                    }
                >
                    <div className="grid h-72 place-items-end gap-3 rounded-lg bg-slate-50 p-6 md:grid-cols-6">
                        {bars.map((bar) => (
                            <div key={bar.title} className="flex h-full w-full items-end" title={bar.title}>
                                <div className="w-full rounded-t-lg bg-[#1C7DE8]" style={{ height: `${bar.value}%` }} />
                            </div>
                        ))}
                    </div>
                </Panel>
                <Panel title={showRevenue ? 'Payment Status' : 'Scope Laporan'}>
                    {showRevenue ? (
                        paymentStatus.map((item) => (
                            <div key={item.label} className="mb-4">
                                <div className="mb-2 flex justify-between text-sm font-bold">
                                    <span>{item.label}</span>
                                    <span>{item.value}</span>
                                </div>
                                <div className="h-2 rounded-full bg-slate-100">
                                    <div className="h-2 rounded-full bg-[#1C7DE8]" style={{ width: item.value }} />
                                </div>
                            </div>
                        ))
                    ) : (
                        <p className="text-sm leading-6 text-slate-600">
                            Laporan guru dibatasi pada enrollment, progress, dan sertifikat siswa di sekolahnya. Data pembayaran tidak ditampilkan.
                        </p>
                    )}
                </Panel>
            </div>
        </Shell>
    );
}
