import { Panel, ProgressBar, Shell, StatCard } from '@/components/platform';
import { Head, Link } from '@inertiajs/react';
import { Award, BookOpen, CalendarDays, ClipboardCheck, Route, TrendingUp, Users } from 'lucide-react';

interface Student {
    name: string;
    progress: number;
    status: string;
}

interface TeacherProps {
    school?: { name: string };
    stats: { students: number; averageProgress: number; activeClasses: number; certificates: number };
    students: Student[];
    learningAccess: {
        id: number;
        title: string;
        level: string;
        url: string;
        expiresAt: string;
        courses: number;
    }[];
    attendanceSummary: {
        totalRecords: number;
        present: number;
        sick: number;
        permission: number;
        absent: number;
        attendanceRate: number;
        offlineSchedules: number;
        upcomingSchedules: number;
    };
    upcomingSchedules: {
        id: number;
        title: string;
        course: string;
        instructor: string;
        mode: string;
        location: string;
        dateLabel: string;
        timeLabel: string;
    }[];
    recentSessions: {
        id: number;
        title: string;
        course: string;
        instructor: string;
        dateLabel: string;
        present: number;
        sick: number;
        permission: number;
        absent: number;
        total: number;
    }[];
}

export default function TeacherDashboard({
    school,
    stats,
    students,
    learningAccess,
    attendanceSummary,
    upcomingSchedules,
    recentSessions,
}: TeacherProps) {
    const needAttention = students.filter((student) => student.progress < 70);

    return (
        <Shell title={`${school?.name ?? 'Sekolah'} Dashboard`} eyebrow="Guru Sekolah">
            <Head title="Dashboard Guru Sekolah" />
            <div className="grid gap-5 md:grid-cols-4">
                <StatCard label="Total Siswa" value={String(stats.students)} icon={Users} />
                <StatCard label="Rata-rata Progress" value={`${stats.averageProgress}%`} icon={TrendingUp} tone="purple" />
                <StatCard label="Kelas Diikuti" value={String(stats.activeClasses)} icon={BookOpen} tone="amber" />
                <StatCard label="Sertifikat Siswa" value={String(stats.certificates)} icon={Award} tone="slate" />
            </div>
            <div className="mt-5 grid gap-5 md:grid-cols-4">
                <StatCard label="Jadwal Offline" value={String(attendanceSummary.offlineSchedules)} icon={CalendarDays} />
                <StatCard label="Hadir" value={String(attendanceSummary.present)} icon={ClipboardCheck} tone="purple" />
                <StatCard label="Tidak Hadir" value={String(attendanceSummary.absent)} icon={Users} tone="amber" />
                <StatCard label="Tingkat Hadir" value={`${attendanceSummary.attendanceRate}%`} icon={TrendingUp} tone="slate" />
            </div>
            <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_0.85fr]">
                <Panel
                    title="Akses belajar sekolah"
                    action={
                        <Link href="/teacher/catalog" className="text-xs font-bold text-blue-700 hover:underline">
                            Buka katalog
                        </Link>
                    }
                >
                    <div className="grid gap-3 md:grid-cols-2">
                        {learningAccess.map((path) => (
                            <Link
                                key={path.id}
                                href={path.url}
                                className="rounded-xl border border-blue-100 bg-blue-50 p-4 transition hover:border-blue-200"
                            >
                                <div className="flex items-start gap-3">
                                    <span className="rounded-lg bg-white p-2 text-blue-700">
                                        <Route className="size-5" />
                                    </span>
                                    <div>
                                        <p className="font-extrabold text-slate-950">{path.title}</p>
                                        <p className="mt-1 text-sm text-slate-600">
                                            {path.courses} course · {path.level} · berlaku {path.expiresAt}
                                        </p>
                                    </div>
                                </div>
                            </Link>
                        ))}
                        {learningAccess.length === 0 && (
                            <p className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">
                                Belum ada learning path aktif untuk sekolah ini. Hubungi admin jika sekolah sudah memiliki kerja sama.
                            </p>
                        )}
                    </div>
                </Panel>
                <Panel title="Ringkasan presensi">
                    <div className="grid grid-cols-2 gap-3">
                        <AttendanceBox label="Total catatan" value={attendanceSummary.totalRecords} />
                        <AttendanceBox label="Hadir" value={attendanceSummary.present} />
                        <AttendanceBox label="Sakit" value={attendanceSummary.sick} />
                        <AttendanceBox label="Izin" value={attendanceSummary.permission} />
                        <AttendanceBox label="Alpa" value={attendanceSummary.absent} />
                        <AttendanceBox label="Jadwal 7 hari" value={attendanceSummary.upcomingSchedules} />
                    </div>
                </Panel>
            </div>
            <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_0.85fr]">
                <Panel title="Siswa Sekolah">
                    <div className="space-y-4">
                        {students.map((student) => (
                            <div key={student.name} className="rounded-lg border border-slate-200 p-4">
                                <div className="flex items-center justify-between">
                                    <p className="font-bold">{student.name}</p>
                                    <span className="text-sm font-semibold text-slate-500">{student.progress}%</span>
                                </div>
                                <div className="mt-3">
                                    <ProgressBar value={student.progress} />
                                </div>
                                <p className="mt-2 text-sm text-slate-500">{student.status}</p>
                            </div>
                        ))}
                    </div>
                </Panel>
                <Panel
                    title="Siswa Perlu Perhatian"
                    action={
                        <Link href="/teacher/students" className="text-xs font-bold text-blue-700 hover:underline">
                            Lihat semua
                        </Link>
                    }
                >
                    {needAttention.map((student) => (
                        <div key={student.name} className="mb-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
                            <div className="flex items-center justify-between gap-3">
                                <p className="font-bold text-slate-950">{student.name}</p>
                                <span className="text-sm font-bold text-amber-700">{student.progress}%</span>
                            </div>
                            <p className="mt-2 text-sm text-amber-800">Progress di bawah 70%. Perlu dipantau pada sesi belajar berikutnya.</p>
                        </div>
                    ))}
                    {needAttention.length === 0 && <p className="text-sm text-slate-500">Semua siswa berada pada progress yang aman.</p>}
                </Panel>
            </div>
            <div className="mt-6 grid gap-6 lg:grid-cols-2">
                <Panel title="Jadwal terdekat">
                    <div className="space-y-3">
                        {upcomingSchedules.map((schedule) => (
                            <div key={schedule.id} className="rounded-xl border border-slate-200 p-4">
                                <p className="font-bold text-slate-950">{schedule.title}</p>
                                <p className="mt-1 text-sm text-slate-500">
                                    {schedule.course} · {schedule.instructor}
                                </p>
                                <p className="mt-2 text-sm font-semibold text-blue-700">
                                    {schedule.dateLabel}, {schedule.timeLabel} · {schedule.location}
                                </p>
                            </div>
                        ))}
                        {upcomingSchedules.length === 0 && <p className="text-sm text-slate-500">Belum ada jadwal terdekat.</p>}
                    </div>
                </Panel>
                <Panel title="Presensi pertemuan terakhir">
                    <div className="space-y-3">
                        {recentSessions.map((session) => (
                            <div key={session.id} className="rounded-xl border border-slate-200 p-4">
                                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                                    <div>
                                        <p className="font-bold text-slate-950">{session.title}</p>
                                        <p className="mt-1 text-sm text-slate-500">
                                            {session.course} · {session.dateLabel}
                                        </p>
                                    </div>
                                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                                        {session.total} catatan
                                    </span>
                                </div>
                                <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold">
                                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">H {session.present}</span>
                                    <span className="rounded-full bg-amber-50 px-3 py-1 text-amber-700">S {session.sick}</span>
                                    <span className="rounded-full bg-blue-50 px-3 py-1 text-blue-700">I {session.permission}</span>
                                    <span className="rounded-full bg-rose-50 px-3 py-1 text-rose-700">A {session.absent}</span>
                                </div>
                            </div>
                        ))}
                        {recentSessions.length === 0 && <p className="text-sm text-slate-500">Belum ada presensi pertemuan.</p>}
                    </div>
                </Panel>
            </div>
        </Shell>
    );
}

function AttendanceBox({ label, value }: { label: string; value: number }) {
    return (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-bold text-slate-500 uppercase">{label}</p>
            <p className="mt-2 text-2xl font-extrabold text-slate-950">{value}</p>
        </div>
    );
}
