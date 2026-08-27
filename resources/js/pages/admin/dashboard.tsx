import { Panel, ProgressBar, Shell, StatCard } from '@/components/platform';
import { DesktopTable, MobileCardList, MobileDataCard, StatusBadge } from '@/components/responsive-data';
import { Button } from '@/components/ui/button';
import { Head, Link } from '@inertiajs/react';
import { Award, BookOpen, Building2, ClipboardCheck, GraduationCap, Users, Wallet } from 'lucide-react';

interface AdminDashboardProps {
    stats: {
        users: number;
        schools: number;
        courses: number;
        revenue: string;
        pendingReviews: number;
        certificates: number;
    };
    coursePerformance: {
        id: number;
        title: string;
        status: string;
        enrollments: number;
        students: number;
        progress: number;
        pendingReviews: number;
        revenue: string;
    }[];
    recentSubmissions: {
        id: number;
        student: string;
        course: string;
        status: string;
        score?: number | null;
        submittedAt: string;
    }[];
    recentPayments: {
        id: number;
        orderId: string;
        student: string;
        course: string;
        amountLabel: string;
        status: string;
        createdAt: string;
    }[];
    roleBreakdown: {
        role: string;
        total: number;
    }[];
}

export default function AdminDashboard({ stats, coursePerformance, recentSubmissions, recentPayments, roleBreakdown }: AdminDashboardProps) {
    return (
        <Shell
            title="Dashboard Admin"
            eyebrow="Admin Pusat"
            nav="admin"
            actions={
                <Button asChild>
                    <Link href="/admin/course-builder">Kelola Course</Link>
                </Button>
            }
        >
            <Head title="Dashboard Admin" />
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-5 xl:grid-cols-6">
                <StatCard label="User" value={String(stats.users)} icon={Users} />
                <StatCard label="Sekolah Aktif" value={String(stats.schools)} icon={Building2} tone="purple" />
                <StatCard label="Course Publish" value={String(stats.courses)} icon={BookOpen} tone="amber" />
                <StatCard label="Revenue" value={stats.revenue} icon={Wallet} tone="slate" />
                <StatCard label="Review Pending" value={String(stats.pendingReviews)} icon={ClipboardCheck} />
                <StatCard label="Sertifikat" value={String(stats.certificates)} icon={Award} tone="purple" />
            </div>

            <div className="mt-6 grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
                <Panel title="Performa Course">
                    <div className="space-y-4">
                        {coursePerformance.map((course) => (
                            <div key={course.id} className="rounded-xl border border-slate-200 p-4">
                                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                    <div className="min-w-0">
                                        <Link href={`/admin/course-builder?course=${course.id}`} className="font-bold hover:text-blue-700">
                                            {course.title}
                                        </Link>
                                        <p className="mt-1 text-sm text-slate-500">
                                            {course.students} siswa · {course.enrollments} enrollment · {course.status}
                                        </p>
                                    </div>
                                    <div className="flex flex-wrap gap-2 text-xs font-bold">
                                        <span className="rounded-full bg-amber-50 px-2 py-1 text-amber-700">
                                            {course.pendingReviews} pending review
                                        </span>
                                        <span className="rounded-full bg-emerald-50 px-2 py-1 text-emerald-700">{course.revenue}</span>
                                    </div>
                                </div>
                                <div className="mt-4">
                                    <div className="mb-2 flex justify-between text-xs font-bold text-slate-500">
                                        <span>Rata-rata progress</span>
                                        <span>{course.progress}%</span>
                                    </div>
                                    <ProgressBar value={course.progress} />
                                </div>
                            </div>
                        ))}
                        {coursePerformance.length === 0 && <p className="text-sm text-slate-500">Belum ada course.</p>}
                    </div>
                </Panel>

                <div className="space-y-6">
                    <Panel title="Komposisi Role">
                        <div className="space-y-3">
                            {roleBreakdown.map((item) => (
                                <div key={item.role} className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
                                    <span className="font-semibold">{item.role}</span>
                                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">{item.total} user</span>
                                </div>
                            ))}
                        </div>
                    </Panel>

                    <Panel
                        title="Submission Terbaru"
                        action={
                            <Button asChild size="sm" variant="outline">
                                <Link href="/reviews">Review</Link>
                            </Button>
                        }
                    >
                        <div className="space-y-3">
                            {recentSubmissions.map((item) => (
                                <Link
                                    key={item.id}
                                    href="/reviews"
                                    className="flex items-start gap-3 rounded-lg border border-slate-200 p-3 hover:border-blue-300 hover:bg-blue-50"
                                >
                                    <GraduationCap className="mt-0.5 size-4 text-blue-700" />
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate font-bold">{item.student}</p>
                                        <p className="text-xs text-slate-500">
                                            {item.course} · {statusLabel(item.status)} · {formatDate(item.submittedAt)}
                                        </p>
                                    </div>
                                </Link>
                            ))}
                            {recentSubmissions.length === 0 && <p className="text-sm text-slate-500">Belum ada submission.</p>}
                        </div>
                    </Panel>
                </div>
            </div>

            <Panel className="mt-6" title="Pembayaran Terbaru">
                <div className="space-y-4">
                    <MobileCardList
                        empty={
                            <p className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
                                Belum ada pembayaran.
                            </p>
                        }
                    >
                        {recentPayments.map((payment) => (
                            <MobileDataCard
                                key={payment.id}
                                title={payment.student}
                                subtitle={payment.course}
                                badge={<StatusBadge status={payment.status} label={payment.status} />}
                                meta={[
                                    { label: 'Order', value: <span className="font-mono text-xs">{payment.orderId}</span> },
                                    { label: 'Total', value: payment.amountLabel },
                                    { label: 'Tanggal', value: formatDate(payment.createdAt) },
                                ]}
                            />
                        ))}
                    </MobileCardList>
                    <DesktopTable>
                        <table className="w-full text-left text-sm">
                            <thead className="text-xs tracking-wide text-slate-500 uppercase">
                                <tr>
                                    <th className="py-3">Order</th>
                                    <th>Siswa</th>
                                    <th>Course</th>
                                    <th>Total</th>
                                    <th>Status</th>
                                    <th>Tanggal</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                                {recentPayments.map((payment) => (
                                    <tr key={payment.id}>
                                        <td className="py-4 font-mono text-xs">{payment.orderId}</td>
                                        <td className="font-semibold">{payment.student}</td>
                                        <td>{payment.course}</td>
                                        <td>{payment.amountLabel}</td>
                                        <td className="capitalize">{payment.status}</td>
                                        <td>{formatDate(payment.createdAt)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {recentPayments.length === 0 && <p className="py-8 text-center text-sm text-slate-500">Belum ada pembayaran.</p>}
                    </DesktopTable>
                </div>
            </Panel>
        </Shell>
    );
}

function statusLabel(status: string) {
    const labels: Record<string, string> = {
        submitted: 'Menunggu review',
        revised: 'Perlu revisi',
        accepted: 'Diterima',
        rejected: 'Ditolak',
    };

    return labels[status] ?? status;
}

function formatDate(value?: string | null) {
    if (!value) return '-';

    return new Intl.DateTimeFormat('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    }).format(new Date(value));
}
