import { Panel, Shell } from '@/components/platform';
import { Button } from '@/components/ui/button';
import { Head, Link } from '@inertiajs/react';
import { ArrowRight, CalendarDays, ClipboardCheck, QrCode } from 'lucide-react';

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
    checkedInAt?: string | null;
    lateMinutes?: number;
    lateLabel?: string | null;
}

export default function Upcoming({ tasks, offlineAttendances }: { tasks: Task[]; offlineAttendances: OfflineAttendance[] }) {
    return (
        <Shell
            title="Upcoming Tasks"
            eyebrow="Siswa"
            actions={
                <Button asChild variant="outline">
                    <Link href="/student/attendance/scan">
                        <QrCode className="size-4" />
                        Scan QR
                    </Link>
                </Button>
            }
        >
            <Head title="Upcoming Tasks" />
            <div className="grid gap-6 lg:grid-cols-[1fr_0.85fr]">
                <Panel title="Tugas belajar">
                    <div className="space-y-3">
                        {tasks.map((task) => (
                            <Link
                                key={`${task.title}-${task.href}`}
                                href={task.href}
                                className="flex flex-col gap-3 rounded-2xl border border-slate-200 p-4 transition hover:border-blue-200 hover:bg-blue-50 sm:flex-row sm:items-center sm:justify-between"
                            >
                                <div className="flex gap-3">
                                    <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                                        <ClipboardCheck className="size-5" />
                                    </span>
                                    <div>
                                        <p className="font-bold text-slate-950">{task.title}</p>
                                        <p className="mt-1 text-sm leading-6 text-slate-500">{task.meta}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-blue-700 shadow-sm">{task.status}</span>
                                    <ArrowRight className="size-4 text-blue-700" />
                                </div>
                            </Link>
                        ))}
                        {tasks.length === 0 && (
                            <p className="rounded-2xl border border-dashed border-slate-300 p-5 text-sm text-slate-500">
                                Belum ada quiz, ujian, atau submission yang perlu dikerjakan.
                            </p>
                        )}
                    </div>
                </Panel>

                <Panel title="Jadwal offline terdekat">
                    <div className="space-y-3">
                        {offlineAttendances.map((schedule) => (
                            <article key={schedule.id} className="rounded-2xl border border-slate-200 p-4">
                                <div className="flex items-start gap-3">
                                    <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-700">
                                        <CalendarDays className="size-5" />
                                    </span>
                                    <div>
                                        <p className="text-xs font-bold tracking-wider text-blue-700 uppercase">{schedule.course}</p>
                                        <h3 className="mt-1 font-bold text-slate-950">{schedule.title}</h3>
                                        <p className="mt-2 text-sm leading-6 text-slate-500">
                                            {schedule.startsAtLabel}–{schedule.endsAtLabel} · {schedule.location || 'Lokasi sekolah'}
                                        </p>
                                        <p className="mt-1 text-xs text-slate-500">Pengajar: {schedule.instructor}</p>
                                        <span className="mt-3 inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                                            {schedule.statusLabel}
                                        </span>
                                        {schedule.status === 'H' && (
                                            <p
                                                className={`mt-2 text-xs font-semibold ${
                                                    (schedule.lateMinutes ?? 0) > 0 ? 'text-amber-700' : 'text-emerald-700'
                                                }`}
                                            >
                                                {(schedule.lateMinutes ?? 0) > 0
                                                    ? `Terlambat ${schedule.lateLabel || formatLateDuration(schedule.lateMinutes ?? 0)}`
                                                    : schedule.lateLabel || 'Tepat waktu'}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </article>
                        ))}
                        {offlineAttendances.length === 0 && (
                            <p className="rounded-2xl border border-dashed border-slate-300 p-5 text-sm text-slate-500">
                                Belum ada jadwal offline aktif.
                            </p>
                        )}
                    </div>
                </Panel>
            </div>
        </Shell>
    );
}

function formatLateDuration(minutes: number) {
    if (!minutes || minutes <= 0) {
        return '0 menit';
    }

    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    return [hours > 0 ? `${hours} jam` : null, remainingMinutes > 0 ? `${remainingMinutes} menit` : null].filter(Boolean).join(' ');
}
