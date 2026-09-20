import { Panel, ProgressBar, Shell, StatCard } from '@/components/platform';
import { Button } from '@/components/ui/button';
import { SharedData } from '@/types';
import { Head, Link, usePage } from '@inertiajs/react';
import { ArrowRight, Award, BookOpen, CalendarDays, MessageSquareText, QrCode, TrendingUp, UserRound } from 'lucide-react';

interface DashboardCourse {
    id: number;
    title: string;
    description: string;
    level: string;
    status: string;
    progress: number;
}

interface Task {
    title: string;
    meta: string;
    status: string;
    href: string;
}

interface OfflineAttendance {
    id: number;
    title: string;
    course: string;
    instructor: string;
    location?: string | null;
    startsAtLabel: string;
    endsAtLabel: string;
    attended: boolean;
    status?: 'H' | 'S' | 'I' | 'A' | null;
    statusLabel: string;
    source?: string | null;
    checkedInAt?: string | null;
    lateMinutes?: number;
    lateLabel?: string | null;
}

interface TeacherNote {
    id: number;
    note: string;
    teacher: string;
    meeting: string;
    course?: string | null;
    dateLabel: string;
}

interface DashboardProps {
    stats: {
        classes: number;
        averageProgress: number;
        quizPending: number;
        certificates: number;
    };
    currentCourse?: DashboardCourse | null;
    courses: DashboardCourse[];
    tasks: Task[];
    offlineAttendances: OfflineAttendance[];
    teacherNotes: TeacherNote[];
}

export default function Dashboard({ stats, currentCourse, courses, tasks, offlineAttendances, teacherNotes }: DashboardProps) {
    const { auth } = usePage<SharedData>().props;
    const profileComplete = Boolean(auth.user.profile_completed_at);

    return (
        <Shell title="Dashboard Siswa" eyebrow="Halo, Siswa">
            <Head title="Dashboard Siswa" />
            {!profileComplete && (
                <Panel className="mb-6" title="Lengkapi Profil Belajar">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div className="flex gap-3">
                            <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                                <UserRound className="size-5" />
                            </span>
                            <div>
                                <p className="font-bold text-slate-950">Lengkapi data diri sebelum lanjut belajar lebih jauh.</p>
                                <p className="mt-1 text-sm leading-6 text-slate-600">
                                    Isi nomor HP, alamat, dan asal sekolah. Jika sekolah belum tersedia, pilih opsi “Lainnya”.
                                </p>
                            </div>
                        </div>
                        <Button asChild>
                            <Link href="/settings/profile">Lengkapi Profil</Link>
                        </Button>
                    </div>
                </Panel>
            )}
            <div className="grid gap-5 md:grid-cols-4">
                <StatCard label="Classes Enrolled" value={String(stats.classes)} icon={BookOpen} />
                <StatCard label="Avg. Progress" value={`${stats.averageProgress}%`} icon={TrendingUp} tone="purple" />
                <StatCard label="Quiz Pending" value={String(stats.quizPending)} icon={CalendarDays} tone="amber" />
                <StatCard label="Certificates" value={String(stats.certificates)} icon={Award} tone="slate" />
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-[1.35fr_0.85fr]">
                <Panel>
                    <div className="rounded-lg border border-blue-100 bg-blue-50 p-6 text-slate-950">
                        <p className="text-sm font-bold tracking-wider text-blue-700 uppercase">{currentCourse?.level ?? 'Learning Path'}</p>
                        <h2 className="mt-2 text-3xl font-extrabold">{currentCourse?.title ?? 'Belum ada kelas aktif'}</h2>
                        <p className="mt-2 text-slate-600">{currentCourse?.description ?? 'Pilih kelas dari katalog untuk mulai belajar.'}</p>
                        <div className="mt-8">
                            <div className="mb-2 flex justify-between text-sm font-semibold">
                                <span>Current Progress</span>
                                <span>{currentCourse?.progress ?? 0}%</span>
                            </div>
                            <div className="h-3 overflow-hidden rounded-full bg-white">
                                <div className="h-full rounded-full bg-blue-600" style={{ width: `${currentCourse?.progress ?? 0}%` }} />
                            </div>
                        </div>
                        <Button asChild className="mt-6 bg-white text-slate-950 hover:bg-slate-100">
                            <Link href={currentCourse ? '/student/learning' : '/student/catalog'}>
                                Lanjut Belajar
                                <ArrowRight className="size-4" />
                            </Link>
                        </Button>
                    </div>
                </Panel>

                <Panel
                    title="Upcoming Tasks"
                    action={
                        <Link href="/student/upcoming" className="text-xs font-bold text-blue-700 hover:underline">
                            Lihat semua
                        </Link>
                    }
                >
                    <div className="space-y-4">
                        {tasks.map((task) => (
                            <Link
                                key={`${task.title}-${task.href}`}
                                href={task.href}
                                className="block rounded-lg border border-slate-200 p-4 transition hover:border-blue-200 hover:bg-blue-50"
                            >
                                <div className="flex items-center justify-between">
                                    <p className="font-bold">{task.title}</p>
                                    <span className="rounded-full bg-blue-50 px-2 py-1 text-xs font-bold text-blue-700">{task.status}</span>
                                </div>
                                <p className="mt-1 text-sm text-slate-500">{task.meta}</p>
                            </Link>
                        ))}
                        {tasks.length === 0 && (
                            <Link
                                href="/student/upcoming"
                                className="block rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-500 transition hover:border-blue-200 hover:bg-blue-50"
                            >
                                Belum ada tugas mendatang. Klik untuk membuka halaman upcoming.
                            </Link>
                        )}
                    </div>
                </Panel>
            </div>

            <Panel
                className="mt-6"
                title="Presensi Kelas Offline"
                action={
                    <Button asChild>
                        <Link href="/student/attendance/scan">
                            <QrCode className="size-4" />
                            Scan QR Presensi
                        </Link>
                    </Button>
                }
            >
                <p className="mb-4 text-sm leading-6 text-slate-600">
                    Presensi hanya dilakukan dengan scan QR code yang ditampilkan pengajar saat pertemuan berlangsung.
                </p>
                {offlineAttendances.length > 0 ? (
                    <div className="grid gap-4 md:grid-cols-2">
                        {offlineAttendances.map((schedule) => (
                            <div key={schedule.id} className="rounded-lg border border-slate-200 p-4">
                                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                    <div>
                                        <p className="text-xs font-bold tracking-wider text-blue-700 uppercase">{schedule.course}</p>
                                        <h3 className="mt-1 font-bold text-slate-950">{schedule.title}</h3>
                                        <p className="mt-2 text-sm leading-6 text-slate-500">
                                            {schedule.startsAtLabel}–{schedule.endsAtLabel} · {schedule.location || 'Lokasi sekolah'}
                                        </p>
                                        <p className="mt-1 text-xs text-slate-500">Pengajar: {schedule.instructor}</p>
                                    </div>
                                    <div className="flex flex-col items-start gap-2 md:items-end">
                                        <AttendanceStatusPill status={schedule.status} label={schedule.statusLabel} />
                                        {schedule.checkedInAt && <span className="text-xs text-slate-500">{schedule.checkedInAt}</span>}
                                        {schedule.status === 'H' && (
                                            <span
                                                className={`text-xs font-semibold ${
                                                    (schedule.lateMinutes ?? 0) > 0 ? 'text-amber-700' : 'text-emerald-700'
                                                }`}
                                            >
                                                {(schedule.lateMinutes ?? 0) > 0
                                                    ? `Terlambat ${schedule.lateLabel || formatLateDuration(schedule.lateMinutes ?? 0)}`
                                                    : schedule.lateLabel || 'Tepat waktu'}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="rounded-xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">
                        Belum ada jadwal offline aktif di dashboard. Tetap gunakan tombol scan saat pengajar menampilkan QR presensi.
                    </p>
                )}
            </Panel>

            <Panel className="mt-6" title="Catatan Guru">
                <p className="mb-4 text-sm leading-6 text-slate-600">
                    Catatan perkembangan yang diberikan guru pada setiap pertemuan akan tampil di sini.
                </p>
                {teacherNotes.length > 0 ? (
                    <div className="grid gap-4 md:grid-cols-2">
                        {teacherNotes.map((note) => (
                            <article key={note.id} className="rounded-xl border border-violet-100 bg-violet-50/50 p-4">
                                <div className="flex items-start gap-3">
                                    <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-white text-violet-700 shadow-sm">
                                        <MessageSquareText className="size-5" />
                                    </span>
                                    <div className="min-w-0">
                                        <p className="font-extrabold text-slate-950">{note.meeting}</p>
                                        <p className="mt-1 text-xs font-semibold text-violet-700">
                                            {note.course || 'Program sekolah'} · {note.dateLabel}
                                        </p>
                                    </div>
                                </div>
                                <p className="mt-4 text-sm leading-6 break-words whitespace-pre-wrap text-slate-700">{note.note}</p>
                                <p className="mt-3 text-xs font-bold text-slate-500">Oleh {note.teacher}</p>
                            </article>
                        ))}
                    </div>
                ) : (
                    <div className="rounded-xl border border-dashed border-slate-300 p-5 text-center">
                        <MessageSquareText className="mx-auto size-6 text-slate-400" />
                        <p className="mt-2 text-sm text-slate-500">Belum ada catatan perkembangan dari guru.</p>
                    </div>
                )}
            </Panel>

            <Panel className="mt-6" title="Kelas Diikuti">
                <div className="grid gap-4 md:grid-cols-3">
                    {courses.map((course) => (
                        <Link
                            key={course.title}
                            href={`/learning?course=${course.id}`}
                            className="rounded-lg border border-slate-200 p-4 transition hover:border-blue-200 hover:bg-blue-50"
                        >
                            <p className="text-xs font-bold tracking-wider text-violet-700 uppercase">{course.level}</p>
                            <h3 className="mt-2 font-bold">{course.title}</h3>
                            <p className="mt-2 text-sm text-slate-500">{course.description}</p>
                            <div className="mt-4">
                                <ProgressBar value={course.progress} />
                                <p className="mt-2 text-sm font-semibold text-slate-600">{course.progress}% selesai</p>
                            </div>
                        </Link>
                    ))}
                </div>
            </Panel>
        </Shell>
    );
}

function AttendanceStatusPill({ status, label }: { status?: 'H' | 'S' | 'I' | 'A' | null; label: string }) {
    const tone =
        status === 'H'
            ? 'bg-emerald-50 text-emerald-700'
            : status === 'S'
              ? 'bg-amber-50 text-amber-700'
              : status === 'I'
                ? 'bg-blue-50 text-blue-700'
                : status === 'A'
                  ? 'bg-red-50 text-red-700'
                  : 'bg-slate-100 text-slate-600';

    return <span className={`rounded-full px-3 py-1 text-xs font-bold ${tone}`}>{label}</span>;
}

function formatLateDuration(minutes: number) {
    if (!minutes || minutes <= 0) {
        return '0 menit';
    }

    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    return [hours > 0 ? `${hours} jam` : null, remainingMinutes > 0 ? `${remainingMinutes} menit` : null].filter(Boolean).join(' ');
}
