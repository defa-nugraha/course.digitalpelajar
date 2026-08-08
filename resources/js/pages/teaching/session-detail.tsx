import { Panel, Shell, StatCard } from '@/components/platform';
import { Button } from '@/components/ui/button';
import { Head, Link } from '@inertiajs/react';
import {
    ArrowLeft,
    Banknote,
    CalendarClock,
    CheckCircle2,
    ClipboardCheck,
    FileText,
    GraduationCap,
    ImageIcon,
    MapPin,
    MessageSquareText,
    School,
    Star,
    UserRound,
    Users,
    type LucideIcon,
} from 'lucide-react';

interface AttendanceRow {
    studentId: number;
    student: string;
    email?: string | null;
    status?: string | null;
    statusLabel: string;
    checkedInAt?: string | null;
    source?: string | null;
    sourceLabel: string;
    reason?: string | null;
    proofUrl?: string | null;
}

interface FeedbackRow {
    id: number;
    student: string;
    email?: string | null;
    rating: number;
    understandingLabel: string;
    comment?: string | null;
    suggestion?: string | null;
    createdAt?: string | null;
}

interface PayrollRow {
    id: number;
    status: string;
    period?: string | null;
    rateAmount: number;
    amount: number;
    paidAt?: string | null;
    proofUrl?: string | null;
    notes?: string | null;
}

interface SessionDetail {
    id: number;
    scheduleTitle: string;
    school: string;
    instructor: string;
    course: string;
    actualDateLabel: string;
    startedAt: string;
    endedAt: string;
    topic: string;
    studentAttendanceCount: number;
    report: string;
    evidencePhotoUrl?: string | null;
    status: string;
    reviewer?: string | null;
    reviewedAt?: string | null;
    reviewNotes?: string | null;
    payrollStatus?: string | null;
    payrollPeriod?: string | null;
    schedule: {
        title: string;
        startsAt?: string | null;
        endsAt?: string | null;
        mode: string;
        location?: string | null;
        meetingUrl?: string | null;
        status?: string | null;
        notes?: string | null;
    };
    schoolDetail: {
        name: string;
        address?: string | null;
    };
    instructorDetail: {
        name: string;
        email?: string | null;
        phone?: string | null;
    };
    review: {
        reviewer?: string | null;
        reviewerEmail?: string | null;
        reviewedAt?: string | null;
        notes?: string | null;
    };
    attendanceSummary: {
        total: number;
        present: number;
        sick: number;
        permit: number;
        absent: number;
        missing: number;
    };
    attendances: AttendanceRow[];
    feedbackSummary: {
        total: number;
        averageRating: number;
        needHelp: number;
    };
    feedbacks: FeedbackRow[];
    payrolls: PayrollRow[];
}

export default function TeachingSessionDetail({ title, session, backUrl }: { title: string; session: SessionDetail; backUrl: string }) {
    return (
        <Shell
            title={title}
            eyebrow="Admin Operasional"
            nav="admin"
            actions={
                <Button asChild variant="outline">
                    <Link href={backUrl}>
                        <ArrowLeft className="size-4" />
                        Kembali
                    </Link>
                </Button>
            }
        >
            <Head title={`${title} - ${session.topic}`} />

            <Panel>
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                            <StatusPill status={session.status} />
                            {session.payrollStatus && (
                                <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-bold text-violet-700">
                                    Payroll {session.payrollStatus} · {session.payrollPeriod}
                                </span>
                            )}
                        </div>
                        <h1 className="mt-4 text-2xl font-black text-slate-950">{session.topic}</h1>
                        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                            {session.actualDateLabel} · {session.startedAt}–{session.endedAt} · {session.scheduleTitle}
                        </p>
                    </div>
                    {session.evidencePhotoUrl ? (
                        <Button asChild>
                            <a href={session.evidencePhotoUrl} target="_blank" rel="noreferrer">
                                <ImageIcon className="size-4" />
                                Lihat Bukti Foto
                            </a>
                        </Button>
                    ) : (
                        <span className="rounded-xl bg-red-50 px-4 py-2 text-sm font-bold text-red-700">Bukti foto belum tersedia</span>
                    )}
                </div>
            </Panel>

            <div className="mt-6 grid gap-5 md:grid-cols-3 xl:grid-cols-6">
                <StatCard label="Total Siswa" value={String(session.attendanceSummary.total)} icon={Users} />
                <StatCard label="Hadir" value={String(session.attendanceSummary.present)} icon={CheckCircle2} tone="purple" />
                <StatCard label="Sakit" value={String(session.attendanceSummary.sick)} icon={ClipboardCheck} tone="amber" />
                <StatCard label="Izin" value={String(session.attendanceSummary.permit)} icon={CalendarClock} tone="slate" />
                <StatCard label="Alpa" value={String(session.attendanceSummary.absent)} icon={Users} tone="amber" />
                <StatCard label="Feedback" value={`${session.feedbackSummary.total}`} icon={MessageSquareText} tone="slate" />
            </div>

            <div className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
                <div className="space-y-6">
                    <Panel title="Laporan kegiatan">
                        <div className="rounded-2xl bg-slate-50 p-5 text-sm leading-7 whitespace-pre-line text-slate-700">
                            {session.report || 'Laporan kegiatan belum diisi.'}
                        </div>
                    </Panel>

                    <Panel title="Presensi siswa">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="text-xs tracking-wider text-slate-500 uppercase">
                                    <tr>
                                        <th className="py-3">Siswa</th>
                                        <th>Status</th>
                                        <th>Waktu</th>
                                        <th>Sumber</th>
                                        <th>Alasan / bukti</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200">
                                    {session.attendances.map((attendance) => (
                                        <tr key={attendance.studentId}>
                                            <td className="py-4">
                                                <p className="font-bold text-slate-950">{attendance.student}</p>
                                                <p className="text-xs text-slate-500">{attendance.email || '-'}</p>
                                            </td>
                                            <td>
                                                <AttendancePill status={attendance.status} label={attendance.statusLabel} />
                                            </td>
                                            <td className="text-slate-600">{attendance.checkedInAt || '-'}</td>
                                            <td className="text-slate-600">{attendance.sourceLabel}</td>
                                            <td className="max-w-xs text-slate-600">
                                                {attendance.reason ? <p>{attendance.reason}</p> : <span>-</span>}
                                                {attendance.proofUrl && (
                                                    <a
                                                        href={attendance.proofUrl}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-blue-700"
                                                    >
                                                        <ImageIcon className="size-3.5" />
                                                        Lihat bukti
                                                    </a>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {session.attendances.length === 0 && (
                                <p className="py-8 text-center text-sm text-slate-500">Belum ada data siswa/presensi untuk laporan ini.</p>
                            )}
                        </div>
                    </Panel>

                    <Panel title="Feedback siswa">
                        <div className="grid gap-3">
                            {session.feedbacks.map((feedback) => (
                                <article key={feedback.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                    <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                                        <div>
                                            <p className="font-bold text-slate-950">{feedback.student}</p>
                                            <p className="text-xs text-slate-500">
                                                {feedback.email || '-'} · {feedback.createdAt || '-'}
                                            </p>
                                        </div>
                                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
                                            <Star className="size-3.5 fill-current" />
                                            {feedback.rating}/5 · {feedback.understandingLabel}
                                        </span>
                                    </div>
                                    {feedback.comment && <p className="mt-3 text-sm leading-6 text-slate-700">{feedback.comment}</p>}
                                    {feedback.suggestion && (
                                        <p className="mt-2 rounded-xl bg-white px-3 py-2 text-sm leading-6 text-slate-600">
                                            Saran: {feedback.suggestion}
                                        </p>
                                    )}
                                </article>
                            ))}
                            {session.feedbacks.length === 0 && <p className="py-6 text-center text-sm text-slate-500">Belum ada feedback siswa.</p>}
                        </div>
                    </Panel>
                </div>

                <div className="space-y-6">
                    <Panel title="Informasi pertemuan">
                        <InfoList
                            items={[
                                { icon: School, label: 'Sekolah', value: session.schoolDetail.name },
                                { icon: MapPin, label: 'Alamat sekolah', value: session.schoolDetail.address || '-' },
                                { icon: UserRound, label: 'Pengajar', value: session.instructorDetail.name },
                                { icon: GraduationCap, label: 'Course', value: session.course },
                                { icon: CalendarClock, label: 'Mode', value: modeLabel(session.schedule.mode) },
                                { icon: MapPin, label: 'Lokasi / meeting', value: session.schedule.location || session.schedule.meetingUrl || '-' },
                            ]}
                        />
                    </Panel>

                    <Panel title="Jadwal awal">
                        <InfoList
                            items={[
                                { icon: FileText, label: 'Judul jadwal', value: session.schedule.title },
                                { icon: CalendarClock, label: 'Mulai', value: session.schedule.startsAt || '-' },
                                { icon: CalendarClock, label: 'Selesai', value: session.schedule.endsAt || '-' },
                                { icon: ClipboardCheck, label: 'Status jadwal', value: session.schedule.status || '-' },
                                { icon: FileText, label: 'Catatan jadwal', value: session.schedule.notes || '-' },
                            ]}
                        />
                    </Panel>

                    <Panel title="Review admin/guru">
                        <InfoList
                            items={[
                                { icon: UserRound, label: 'Reviewer', value: session.review.reviewer || '-' },
                                { icon: CalendarClock, label: 'Waktu review', value: session.review.reviewedAt || '-' },
                                { icon: FileText, label: 'Catatan review', value: session.review.notes || '-' },
                            ]}
                        />
                    </Panel>

                    <Panel title="Payroll terkait">
                        <div className="grid gap-3">
                            {session.payrolls.map((payroll) => (
                                <div key={payroll.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm">
                                    <div className="flex items-center justify-between gap-3">
                                        <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-bold text-violet-700">
                                            {payroll.status}
                                        </span>
                                        <span className="font-black text-slate-950">{formatCurrency(payroll.amount)}</span>
                                    </div>
                                    <p className="mt-3 text-slate-600">Periode: {payroll.period || '-'}</p>
                                    <p className="text-slate-600">Tarif: {formatCurrency(payroll.rateAmount)}</p>
                                    <p className="text-slate-600">Dibayar: {payroll.paidAt || '-'}</p>
                                    {payroll.proofUrl && (
                                        <a
                                            href={payroll.proofUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-blue-700"
                                        >
                                            <Banknote className="size-3.5" />
                                            Lihat bukti bayar
                                        </a>
                                    )}
                                    {payroll.notes && <p className="mt-2 rounded-xl bg-white px-3 py-2 text-slate-600">{payroll.notes}</p>}
                                </div>
                            ))}
                            {session.payrolls.length === 0 && (
                                <p className="py-4 text-center text-sm text-slate-500">Laporan ini belum masuk payroll.</p>
                            )}
                        </div>
                    </Panel>
                </div>
            </div>
        </Shell>
    );
}

function InfoList({ items }: { items: { icon: LucideIcon; label: string; value: string }[] }) {
    return (
        <div className="grid gap-3">
            {items.map((item) => {
                const Icon = item.icon;

                return (
                    <div key={item.label} className="flex gap-3 rounded-2xl bg-slate-50 p-3">
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white text-blue-700 shadow-sm">
                            <Icon className="size-4" />
                        </span>
                        <div className="min-w-0">
                            <p className="text-xs font-bold tracking-wide text-slate-500 uppercase">{item.label}</p>
                            <p className="mt-1 text-sm font-semibold break-words text-slate-900">{item.value}</p>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

function StatusPill({ status }: { status: string }) {
    const className =
        status === 'approved'
            ? 'bg-emerald-50 text-emerald-700'
            : status === 'rejected'
              ? 'bg-red-50 text-red-700'
              : status === 'draft'
                ? 'bg-slate-100 text-slate-700'
                : 'bg-amber-50 text-amber-700';

    return <span className={`rounded-full px-3 py-1 text-xs font-bold ${className}`}>{statusLabel(status)}</span>;
}

function AttendancePill({ status, label }: { status?: string | null; label: string }) {
    const className =
        status === 'H'
            ? 'bg-emerald-50 text-emerald-700'
            : status === 'S'
              ? 'bg-amber-50 text-amber-700'
              : status === 'I'
                ? 'bg-blue-50 text-blue-700'
                : status === 'A'
                  ? 'bg-red-50 text-red-700'
                  : 'bg-slate-100 text-slate-600';

    return <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${className}`}>{label}</span>;
}

function statusLabel(status: string) {
    const labels: Record<string, string> = {
        draft: 'Draft laporan',
        submitted: 'Menunggu review',
        approved: 'Disetujui',
        rejected: 'Ditolak',
    };

    return labels[status] ?? status;
}

function modeLabel(mode: string) {
    if (mode === 'offline') return 'Offline';
    if (mode === 'online') return 'Online';

    return mode || '-';
}

function formatCurrency(value: number) {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0,
    }).format(value || 0);
}
