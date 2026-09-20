import { Panel, ProgressBar, Shell, StatCard } from '@/components/platform';
import { Button } from '@/components/ui/button';
import { Head, Link, useForm } from '@inertiajs/react';
import { BookOpen, CalendarDays, Check, Clock3, FileText, GraduationCap, ImageIcon, MessageSquareText, TrendingUp, Users } from 'lucide-react';
import { FormEvent, useMemo, useState } from 'react';

interface Student {
    id: number;
    name: string;
    email: string;
    status: string;
    enrollments: number;
    progress: number;
}

interface MeetingStudent {
    id: number;
    name: string;
    email: string;
    progress: number;
    attendanceStatus: 'H' | 'S' | 'I' | 'A' | null;
    attendanceLabel: string;
    checkedInAt?: string | null;
    lateMinutes: number;
    note?: string | null;
}

interface Meeting {
    id: number;
    title: string;
    course: string;
    instructor: string;
    status: string;
    reviewStatus: 'approved' | 'rejected';
    topic: string;
    report: string;
    reviewNotes?: string | null;
    evidencePhotoUrl?: string | null;
    detailUrl: string;
    dateLabel: string;
    averageProgress: number;
    presentCount: number;
    noteCount: number;
    students: MeetingStudent[];
}

export default function Students({ school, students, meetings }: { school: string; students: Student[]; meetings: Meeting[] }) {
    const [activeMeetingId, setActiveMeetingId] = useState<number | null>(meetings[0]?.id ?? null);
    const activeMeeting = useMemo(() => meetings.find((meeting) => meeting.id === activeMeetingId) ?? meetings[0], [activeMeetingId, meetings]);
    const activeStudents = students.filter((student) => student.status === 'active').length;
    const totalEnrollments = students.reduce((total, student) => total + student.enrollments, 0);
    const averageProgress = Math.round(students.reduce((total, student) => total + student.progress, 0) / Math.max(students.length, 1));

    return (
        <Shell title="Monitoring Siswa" eyebrow={school} nav="teacher">
            <Head title="Monitoring Siswa" />
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-5">
                <StatCard label="Total Siswa" value={String(students.length)} icon={Users} />
                <StatCard label="Siswa Aktif" value={String(activeStudents)} icon={GraduationCap} tone="purple" />
                <StatCard label="Total Enrollment" value={String(totalEnrollments)} icon={BookOpen} tone="amber" />
                <StatCard label="Rata-rata Progress" value={`${averageProgress}%`} icon={TrendingUp} tone="slate" />
            </div>

            <Panel className="mt-6" title="Progress per Pertemuan">
                {meetings.length > 0 && activeMeeting ? (
                    <div>
                        <div className="grid gap-4 rounded-xl bg-slate-50 p-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
                            <label className="block min-w-0">
                                <span className="mb-2 block text-sm font-bold text-slate-700">Pilih pertemuan</span>
                                <select
                                    value={activeMeeting.id}
                                    onChange={(event) => setActiveMeetingId(Number(event.target.value))}
                                    className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                >
                                    {meetings.map((meeting) => (
                                        <option key={meeting.id} value={meeting.id}>
                                            {meeting.dateLabel} — {meeting.title}
                                        </option>
                                    ))}
                                </select>
                            </label>
                            <div className="flex flex-wrap gap-2 text-xs font-bold">
                                <span className="rounded-full bg-blue-100 px-3 py-1.5 text-blue-700">Progress {activeMeeting.averageProgress}%</span>
                                <span className="rounded-full bg-emerald-100 px-3 py-1.5 text-emerald-700">
                                    Hadir {activeMeeting.presentCount}/{activeMeeting.students.length}
                                </span>
                                <span className="rounded-full bg-violet-100 px-3 py-1.5 text-violet-700">{activeMeeting.noteCount} catatan Anda</span>
                            </div>
                        </div>

                        <div className="mt-5 flex flex-col gap-1">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                <div>
                                    <span
                                        className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${
                                            activeMeeting.reviewStatus === 'approved' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                                        }`}
                                    >
                                        {activeMeeting.reviewStatus === 'approved' ? 'Disetujui admin' : 'Ditolak admin'}
                                    </span>
                                    <h3 className="mt-2 text-lg font-extrabold text-slate-950">{activeMeeting.topic || activeMeeting.title}</h3>
                                </div>
                                <Button asChild variant="outline">
                                    <Link href={activeMeeting.detailUrl}>
                                        <FileText className="size-4" /> Detail pertemuan
                                    </Link>
                                </Button>
                            </div>
                            <p className="text-sm text-slate-600">
                                {activeMeeting.course} · {activeMeeting.instructor} · {activeMeeting.dateLabel}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                                Progres yang ditampilkan adalah progres course terkini. Status presensi mengikuti pertemuan yang dipilih.
                            </p>
                        </div>

                        <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(16rem,0.75fr)]">
                            <div className="rounded-xl border border-slate-200 bg-white p-4">
                                <p className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
                                    <MessageSquareText className="size-4 text-blue-700" /> Catatan pengajar
                                </p>
                                <p className="mt-3 text-sm leading-6 whitespace-pre-wrap text-slate-600">
                                    {activeMeeting.report || 'Pengajar belum memberikan catatan kegiatan.'}
                                </p>
                                {activeMeeting.reviewNotes && (
                                    <div className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">
                                        <strong>Catatan review admin:</strong> {activeMeeting.reviewNotes}
                                    </div>
                                )}
                            </div>
                            <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                                {activeMeeting.evidencePhotoUrl ? (
                                    <a href={activeMeeting.evidencePhotoUrl} target="_blank" rel="noreferrer" className="group block">
                                        <img
                                            src={activeMeeting.evidencePhotoUrl}
                                            alt={`Foto kegiatan ${activeMeeting.topic || activeMeeting.title}`}
                                            className="h-48 w-full object-cover transition group-hover:scale-[1.02]"
                                            loading="lazy"
                                        />
                                        <span className="flex min-h-11 items-center justify-center gap-2 bg-white px-3 text-xs font-bold text-blue-700">
                                            <ImageIcon className="size-4" /> Lihat foto penuh
                                        </span>
                                    </a>
                                ) : (
                                    <div className="flex h-full min-h-48 flex-col items-center justify-center p-5 text-center text-sm text-slate-500">
                                        <ImageIcon className="mb-2 size-6 text-slate-400" /> Foto kegiatan tidak tersedia
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="mt-5 grid gap-4 xl:grid-cols-2">
                            {activeMeeting.students.map((student) => (
                                <MeetingProgressCard key={`${activeMeeting.id}-${student.id}`} meetingId={activeMeeting.id} student={student} />
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center">
                        <CalendarDays className="mx-auto size-7 text-slate-400" />
                        <p className="mt-3 font-bold text-slate-800">Belum ada laporan yang selesai direview</p>
                        <p className="mt-1 text-sm text-slate-500">Pertemuan akan tampil setelah laporan pengajar selesai direview admin.</p>
                    </div>
                )}
            </Panel>
        </Shell>
    );
}

function MeetingProgressCard({ meetingId, student }: { meetingId: number; student: MeetingStudent }) {
    const form = useForm({ note: student.note ?? '' });

    function submit(event: FormEvent) {
        event.preventDefault();
        form.put(`/teacher/teaching-schedules/${meetingId}/students/${student.id}/progress-note`, { preserveScroll: true });
    }

    return (
        <article className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                    <h4 className="font-extrabold text-slate-950">{student.name}</h4>
                    <p className="text-sm break-words text-slate-500">{student.email}</p>
                </div>
                <AttendanceBadge status={student.attendanceStatus} label={student.attendanceLabel} />
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-blue-50 p-3">
                    <p className="text-xs font-bold text-blue-700">Progress course</p>
                    <p className="mt-1 text-xl font-extrabold text-slate-950">{student.progress}%</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-3">
                    <p className="text-xs font-bold text-slate-600">Waktu presensi</p>
                    <p className="mt-1 flex items-center gap-1.5 text-sm font-extrabold text-slate-950">
                        <Clock3 className="size-4" /> {student.checkedInAt ?? 'Belum tercatat'}
                    </p>
                    {student.lateMinutes > 0 && <p className="mt-1 text-xs font-semibold text-amber-700">Terlambat {student.lateMinutes} menit</p>}
                </div>
            </div>
            <div className="mt-3">
                <ProgressBar value={student.progress} />
            </div>

            <form onSubmit={submit} className="mt-4">
                <label htmlFor={`note-${meetingId}-${student.id}`} className="flex items-center gap-2 text-sm font-bold text-slate-800">
                    <MessageSquareText className="size-4 text-violet-600" /> Catatan untuk siswa
                </label>
                <textarea
                    id={`note-${meetingId}-${student.id}`}
                    value={form.data.note}
                    onChange={(event) => form.setData('note', event.target.value)}
                    rows={3}
                    maxLength={3000}
                    placeholder="Contoh: Sudah memahami rangkaian dasar, perlu berlatih pemasangan sensor."
                    className="mt-2 w-full resize-y rounded-lg border border-slate-300 px-3 py-2 text-sm leading-6 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
                {form.errors.note && <p className="mt-1 text-xs font-semibold text-red-600">{form.errors.note}</p>}
                <div className="mt-3 flex items-center justify-between gap-3">
                    <span className="text-xs text-slate-400">{form.data.note.length}/3000</span>
                    <Button type="submit" disabled={form.processing || form.data.note.trim().length === 0}>
                        <Check className="size-4" /> {form.processing ? 'Menyimpan...' : student.note ? 'Perbarui Catatan' : 'Simpan Catatan'}
                    </Button>
                </div>
            </form>
        </article>
    );
}

function AttendanceBadge({ status, label }: { status: MeetingStudent['attendanceStatus']; label: string }) {
    const tone =
        status === 'H'
            ? 'bg-emerald-50 text-emerald-700'
            : status === 'S'
              ? 'bg-amber-50 text-amber-700'
              : status === 'I'
                ? 'bg-blue-50 text-blue-700'
                : status === 'A'
                  ? 'bg-rose-50 text-rose-700'
                  : 'bg-slate-100 text-slate-600';
    return <span className={`w-fit rounded-full px-3 py-1 text-xs font-bold ${tone}`}>{label}</span>;
}
