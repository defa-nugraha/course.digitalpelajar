import { Panel, ProgressBar, Shell, StatCard } from '@/components/platform';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Head, router } from '@inertiajs/react';
import { AlertTriangle, CalendarDays, ChevronDown, Clock3, Filter, RotateCcw, Search, UserCheck, Users } from 'lucide-react';
import { FormEvent, useMemo, useState } from 'react';

interface MeetingAttendance {
    meetingId: number;
    meeting: string;
    course: string;
    dateLabel: string;
    status: 'H' | 'S' | 'I' | 'A' | null;
    statusLabel: string;
    checkedInAt?: string | null;
    lateMinutes: number;
}

interface StudentAttendance {
    id: number;
    name: string;
    email: string;
    accountStatus: string;
    totalMeetings: number;
    present: number;
    sick: number;
    permission: number;
    absent: number;
    missing: number;
    attendanceRate: number;
    lateCount: number;
    totalLateMinutes: number;
    needsAttention: boolean;
    meetings: MeetingAttendance[];
}

interface AttendanceRecapProps {
    school: string;
    filters: { from: string; to: string };
    students: StudentAttendance[];
    summary: { students: number; meetings: number; averageAttendance: number; needsAttention: number };
}

type MonitorCondition = 'all' | 'attention' | 'present_lt' | 'rate_lt' | 'absent_gte' | 'missing_gte' | 'late_gte';
type SortMode = 'attention' | 'name' | 'rate_asc' | 'absent_desc' | 'late_desc';

export default function AttendanceRecap({ school, filters, students, summary }: AttendanceRecapProps) {
    const [term, setTerm] = useState('');
    const [condition, setCondition] = useState<MonitorCondition>('all');
    const [threshold, setThreshold] = useState(3);
    const [sort, setSort] = useState<SortMode>('attention');
    const [from, setFrom] = useState(filters.from);
    const [to, setTo] = useState(filters.to);

    const visibleStudents = useMemo(() => {
        const query = term.trim().toLowerCase();
        const matchesCondition = (student: StudentAttendance) => {
            if (condition === 'attention') return student.needsAttention;
            if (condition === 'present_lt') return student.present < threshold;
            if (condition === 'rate_lt') return student.attendanceRate < threshold;
            if (condition === 'absent_gte') return student.absent >= threshold;
            if (condition === 'missing_gte') return student.missing >= threshold;
            if (condition === 'late_gte') return student.lateCount >= threshold;
            return true;
        };

        return students
            .filter((student) => (!query || `${student.name} ${student.email}`.toLowerCase().includes(query)) && matchesCondition(student))
            .sort((first, second) => {
                if (sort === 'name') return first.name.localeCompare(second.name, 'id');
                if (sort === 'rate_asc') return first.attendanceRate - second.attendanceRate;
                if (sort === 'absent_desc') return second.absent - first.absent;
                if (sort === 'late_desc') return second.lateCount - first.lateCount;

                return Number(second.needsAttention) - Number(first.needsAttention) || first.attendanceRate - second.attendanceRate;
            });
    }, [condition, sort, students, term, threshold]);

    function applyPeriod(event: FormEvent) {
        event.preventDefault();
        router.get('/teacher/students/attendance', { from: from || undefined, to: to || undefined }, { preserveState: true, replace: true });
    }

    function resetFilters() {
        setTerm('');
        setCondition('all');
        setThreshold(3);
        setSort('attention');
        setFrom('');
        setTo('');
        router.get('/teacher/students/attendance', {}, { replace: true });
    }

    const showThreshold = condition !== 'all' && condition !== 'attention';

    return (
        <Shell title="Rekap Kehadiran Siswa" eyebrow={school} nav="teacher">
            <Head title="Rekap Kehadiran Siswa" />

            <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-5">
                <StatCard label="Total Siswa" value={String(summary.students)} icon={Users} />
                <StatCard label="Pertemuan Direview" value={String(summary.meetings)} icon={CalendarDays} tone="purple" />
                <StatCard label="Rata-rata Kehadiran" value={`${summary.averageAttendance}%`} icon={UserCheck} tone="slate" />
                <StatCard label="Perlu Perhatian" value={String(summary.needsAttention)} icon={AlertTriangle} tone="amber" />
            </div>

            <Panel className="mt-6" title="Filter monitoring">
                <form onSubmit={applyPeriod} className="grid gap-4 lg:grid-cols-2 xl:grid-cols-[1.2fr_0.8fr_0.8fr_auto] xl:items-end">
                    <label className="block">
                        <span className="mb-2 block text-sm font-bold text-slate-700">Cari siswa</span>
                        <span className="relative block">
                            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
                            <Input
                                value={term}
                                onChange={(event) => setTerm(event.target.value)}
                                placeholder="Nama atau email siswa"
                                className="pl-9"
                            />
                        </span>
                    </label>
                    <label className="block">
                        <span className="mb-2 block text-sm font-bold text-slate-700">Dari tanggal</span>
                        <Input type="date" value={from} max={to || undefined} onChange={(event) => setFrom(event.target.value)} />
                    </label>
                    <label className="block">
                        <span className="mb-2 block text-sm font-bold text-slate-700">Sampai tanggal</span>
                        <Input type="date" value={to} min={from || undefined} onChange={(event) => setTo(event.target.value)} />
                    </label>
                    <Button type="submit">
                        <Filter className="size-4" /> Terapkan Periode
                    </Button>
                </form>

                <div className="mt-4 grid gap-4 border-t border-slate-200 pt-4 lg:grid-cols-[1fr_12rem_1fr_auto] lg:items-end">
                    <label className="block">
                        <span className="mb-2 block text-sm font-bold text-slate-700">Kondisi monitoring</span>
                        <select
                            value={condition}
                            onChange={(event) => setCondition(event.target.value as MonitorCondition)}
                            className={selectClassName}
                        >
                            <option value="all">Semua siswa</option>
                            <option value="attention">Perlu perhatian</option>
                            <option value="present_lt">Jumlah hadir kurang dari ambang</option>
                            <option value="rate_lt">Persentase kehadiran di bawah ambang</option>
                            <option value="absent_gte">Tanpa keterangan minimal ambang</option>
                            <option value="missing_gte">Belum dicatat minimal ambang</option>
                            <option value="late_gte">Terlambat minimal ambang</option>
                        </select>
                    </label>
                    <label className="block">
                        <span className="mb-2 block text-sm font-bold text-slate-700">Nilai ambang</span>
                        <Input
                            type="number"
                            min={condition === 'rate_lt' ? 1 : 0}
                            max={condition === 'rate_lt' ? 100 : 999}
                            value={threshold}
                            disabled={!showThreshold}
                            onChange={(event) => setThreshold(Math.max(0, Number(event.target.value) || 0))}
                        />
                    </label>
                    <label className="block">
                        <span className="mb-2 block text-sm font-bold text-slate-700">Urutkan</span>
                        <select value={sort} onChange={(event) => setSort(event.target.value as SortMode)} className={selectClassName}>
                            <option value="attention">Prioritas perhatian</option>
                            <option value="name">Nama siswa</option>
                            <option value="rate_asc">Kehadiran terendah</option>
                            <option value="absent_desc">Tanpa keterangan terbanyak</option>
                            <option value="late_desc">Keterlambatan terbanyak</option>
                        </select>
                    </label>
                    <Button type="button" variant="outline" onClick={resetFilters}>
                        <RotateCcw className="size-4" /> Reset
                    </Button>
                </div>

                <div className="mt-4 rounded-xl bg-blue-50 px-4 py-3 text-xs leading-5 text-blue-900">
                    <strong>Perlu perhatian</strong> ditandai otomatis jika kehadiran di bawah 75%, tanpa keterangan minimal 3 kali, atau presensi
                    belum dicatat minimal 3 kali. Guru tetap dapat mengubah filter dan nilai ambang di atas.
                </div>
            </Panel>

            <Panel className="mt-6" title={`${visibleStudents.length} siswa ditampilkan`}>
                {visibleStudents.length > 0 ? (
                    <div className="grid gap-4 xl:grid-cols-2">
                        {visibleStudents.map((student) => (
                            <AttendanceCard key={student.id} student={student} />
                        ))}
                    </div>
                ) : (
                    <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center">
                        <Filter className="mx-auto size-7 text-slate-400" />
                        <p className="mt-3 font-bold text-slate-800">Tidak ada siswa yang sesuai filter</p>
                        <p className="mt-1 text-sm text-slate-500">Ubah kondisi, nilai ambang, kata pencarian, atau periode monitoring.</p>
                    </div>
                )}
            </Panel>
        </Shell>
    );
}

function AttendanceCard({ student }: { student: StudentAttendance }) {
    return (
        <article className={`rounded-2xl border bg-white p-4 shadow-sm ${student.needsAttention ? 'border-amber-300' : 'border-slate-200'}`}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                    <h2 className="font-extrabold text-slate-950">{student.name}</h2>
                    <p className="text-sm break-words text-slate-500">{student.email}</p>
                </div>
                <span
                    className={`w-fit rounded-full px-3 py-1 text-xs font-bold ${
                        student.needsAttention ? 'bg-amber-100 text-amber-800' : 'bg-emerald-50 text-emerald-700'
                    }`}
                >
                    {student.needsAttention ? 'Perlu perhatian' : 'Kehadiran baik'}
                </span>
            </div>

            <div className="mt-4 flex items-end justify-between gap-4">
                <div>
                    <p className="text-xs font-bold tracking-wide text-slate-500 uppercase">Persentase kehadiran</p>
                    <p className="mt-1 text-3xl font-black text-slate-950">{student.attendanceRate}%</p>
                </div>
                <p className="text-right text-xs leading-5 text-slate-500">
                    Hadir {student.present} dari {student.totalMeetings} pertemuan direview
                </p>
            </div>
            <div className="mt-3">
                <ProgressBar value={student.attendanceRate} />
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                <Metric label="Hadir" value={student.present} tone="emerald" />
                <Metric label="Sakit" value={student.sick} tone="amber" />
                <Metric label="Izin" value={student.permission} tone="blue" />
                <Metric label="Tanpa keterangan" value={student.absent} tone="rose" />
                <Metric label="Belum dicatat" value={student.missing} tone="slate" />
                <Metric label="Terlambat" value={student.lateCount} suffix="kali" tone="violet" />
            </div>

            {student.lateCount > 0 && (
                <p className="mt-3 flex items-center gap-2 rounded-lg bg-violet-50 px-3 py-2 text-xs font-semibold text-violet-800">
                    <Clock3 className="size-4" /> Total keterlambatan {formatDuration(student.totalLateMinutes)}
                </p>
            )}

            <details className="group mt-4 rounded-xl border border-slate-200">
                <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-bold text-slate-800">
                    Rincian setiap pertemuan
                    <ChevronDown className="size-4 transition group-open:rotate-180" />
                </summary>
                <div className="grid gap-2 border-t border-slate-200 p-3">
                    {student.meetings.map((meeting) => (
                        <div key={meeting.meetingId} className="rounded-lg bg-slate-50 p-3">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                <div>
                                    <p className="text-sm font-bold text-slate-900">{meeting.meeting}</p>
                                    <p className="mt-1 text-xs text-slate-500">
                                        {meeting.course} · {meeting.dateLabel}
                                    </p>
                                </div>
                                <AttendanceStatus status={meeting.status} label={meeting.statusLabel} />
                            </div>
                            <p className="mt-2 text-xs text-slate-600">
                                Waktu presensi: {meeting.checkedInAt || '-'}
                                {meeting.lateMinutes > 0 ? ` · Terlambat ${formatDuration(meeting.lateMinutes)}` : ''}
                            </p>
                        </div>
                    ))}
                    {student.meetings.length === 0 && <p className="p-3 text-center text-sm text-slate-500">Belum ada pertemuan pada periode ini.</p>}
                </div>
            </details>
        </article>
    );
}

function Metric({ label, value, suffix, tone }: { label: string; value: number; suffix?: string; tone: string }) {
    const tones: Record<string, string> = {
        emerald: 'bg-emerald-50 text-emerald-800',
        amber: 'bg-amber-50 text-amber-800',
        blue: 'bg-blue-50 text-blue-800',
        rose: 'bg-rose-50 text-rose-800',
        slate: 'bg-slate-100 text-slate-700',
        violet: 'bg-violet-50 text-violet-800',
    };
    return (
        <div className={`rounded-lg p-3 ${tones[tone]}`}>
            <p className="text-xs font-bold">{label}</p>
            <p className="mt-1 text-lg font-black">
                {value} {suffix}
            </p>
        </div>
    );
}

function AttendanceStatus({ status, label }: { status: MeetingAttendance['status']; label: string }) {
    const tone =
        status === 'H'
            ? 'bg-emerald-100 text-emerald-800'
            : status === 'S'
              ? 'bg-amber-100 text-amber-800'
              : status === 'I'
                ? 'bg-blue-100 text-blue-800'
                : status === 'A'
                  ? 'bg-rose-100 text-rose-800'
                  : 'bg-slate-200 text-slate-700';
    return <span className={`w-fit rounded-full px-3 py-1 text-xs font-bold ${tone}`}>{label}</span>;
}

function formatDuration(minutes: number) {
    const hours = Math.floor(minutes / 60);
    const remaining = minutes % 60;
    return [hours ? `${hours} jam` : null, remaining ? `${remaining} menit` : null].filter(Boolean).join(' ') || '0 menit';
}

const selectClassName =
    'h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100';
