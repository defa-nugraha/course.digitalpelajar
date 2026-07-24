import { FieldLabel } from '@/components/form-field';
import InputError from '@/components/input-error';
import { Panel, Shell, StatCard } from '@/components/platform';
import { SearchableSelect } from '@/components/searchable-select';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { confirmDelete } from '@/lib/confirm-delete';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { CheckCircle2, ClipboardCheck, Eye, ImageIcon, Pencil, Plus, Search, Trash2, TriangleAlert, Users } from 'lucide-react';
import { FormEvent, ReactNode, useMemo, useState } from 'react';

interface Option {
    id: number;
    name?: string;
    title?: string;
}

interface ScheduleOption {
    id: number;
    title: string;
    school: string;
    course: string;
    startsAtLabel: string;
}

interface SessionRow {
    id: number;
    teachingScheduleId: number;
    scheduleTitle: string;
    schoolId: number;
    school: string;
    instructorId: number;
    instructor: string;
    courseId: number;
    course: string;
    actualDate: string;
    actualDateLabel: string;
    startedAt: string;
    endedAt: string;
    topic: string;
    studentAttendanceCount: number;
    report: string;
    evidencePhotoPath: string;
    evidencePhotoUrl?: string | null;
    status: string;
    reviewer?: string | null;
    reviewedAt?: string | null;
    reviewNotes?: string | null;
    payrollStatus?: string | null;
    payrollPeriod?: string | null;
    canEdit: boolean;
    canComplete: boolean;
    canDelete: boolean;
}

interface SessionsProps {
    scope: 'admin' | 'instructor' | 'teacher';
    title: string;
    sessions: SessionRow[];
    availableSchedules: ScheduleOption[];
    stats: {
        total: number;
        submitted: number;
        approved: number;
        rejected: number;
        averageAttendance: number;
    };
    options: {
        schools: Option[];
        instructors: Option[];
        courses: Option[];
    };
    permissions: {
        canCreateReport: boolean;
        canReview: boolean;
        canDelete: boolean;
    };
}

interface SessionFormData {
    [key: string]: string | number | File | null;
    teaching_schedule_id: string;
    actual_date: string;
    started_at: string;
    ended_at: string;
    topic: string;
    student_attendance_count: string;
    report: string;
    evidence_photo: File | null;
}

const emptySession: SessionFormData = {
    teaching_schedule_id: '',
    actual_date: new Date().toISOString().slice(0, 10),
    started_at: '',
    ended_at: '',
    topic: '',
    student_attendance_count: '0',
    report: '',
    evidence_photo: null,
};

export default function TeachingSessions({ scope, title, sessions, availableSchedules, stats, permissions }: SessionsProps) {
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<SessionRow | null>(null);
    const [reviewing, setReviewing] = useState<SessionRow | null>(null);
    const [completing, setCompleting] = useState<SessionRow | null>(null);
    const [term, setTerm] = useState('');
    const [status, setStatus] = useState('all');
    const form = useForm<SessionFormData>(emptySession);
    const reviewForm = useForm({ status: 'approved', review_notes: '' });
    const completeForm = useForm<{ [key: string]: string | File | null; report: string; evidence_photo: File | null }>({
        report: '',
        evidence_photo: null,
    });
    const nav = scope === 'admin' ? 'admin' : scope === 'teacher' ? 'teacher' : 'instructor';
    const showPayrollColumn = scope === 'admin';
    const visibleSessions = useMemo(
        () =>
            sessions.filter((session) => {
                const text = `${session.topic} ${session.scheduleTitle} ${session.school} ${session.instructor} ${session.course}`.toLowerCase();

                return text.includes(term.toLowerCase()) && (status === 'all' || session.status === status);
            }),
        [sessions, status, term],
    );
    const statusOptions = [
        { value: 'all', label: 'Semua status' },
        { value: 'draft', label: 'Draft laporan' },
        { value: 'submitted', label: 'Menunggu review' },
        { value: 'approved', label: 'Disetujui' },
        { value: 'rejected', label: 'Ditolak' },
    ];
    const reviewStatusOptions = statusOptions.filter((option) => option.value === 'approved' || option.value === 'rejected');

    const showEdit = (session: SessionRow) => {
        setEditing(session);
        form.setData({
            teaching_schedule_id: String(session.teachingScheduleId),
            actual_date: session.actualDate,
            started_at: session.startedAt,
            ended_at: session.endedAt,
            topic: session.topic,
            student_attendance_count: String(session.studentAttendanceCount),
            report: session.report,
            evidence_photo: null,
        });
        form.clearErrors();
        setOpen(true);
    };

    const showComplete = (session: SessionRow) => {
        setCompleting(session);
        completeForm.setData({ report: session.report ?? '', evidence_photo: null });
        completeForm.clearErrors();
    };

    const submitReport = (event: FormEvent) => {
        event.preventDefault();
        const payload = {
            ...form.data,
            student_attendance_count: Number(form.data.student_attendance_count),
        };

        form.transform(() => payload);
        const requestOptions = {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                setOpen(false);
                form.reset('evidence_photo');
            },
        };

        if (editing) {
            form.transform(() => ({ ...payload, _method: 'patch' }));
            form.post(`/instructor/teaching-sessions/${editing.id}`, requestOptions);
        } else {
            form.post('/instructor/teaching-sessions', requestOptions);
        }
    };

    const showReview = (session: SessionRow, nextStatus = 'approved') => {
        setReviewing(session);
        reviewForm.setData({ status: nextStatus, review_notes: session.reviewNotes ?? '' });
        reviewForm.clearErrors();
    };

    const submitReview = (event: FormEvent) => {
        event.preventDefault();
        if (!reviewing) return;

        const url = scope === 'teacher' ? `/teacher/teaching-sessions/${reviewing.id}/review` : `/admin/teaching-sessions/${reviewing.id}/review`;

        reviewForm.patch(url, {
            preserveScroll: true,
            onSuccess: () => setReviewing(null),
        });
    };

    const submitCompletion = (event: FormEvent) => {
        event.preventDefault();
        if (!completing) return;

        completeForm.transform((data) => ({ ...data, _method: 'patch' }));
        completeForm.post(`/instructor/teaching-sessions/${completing.id}/submit`, {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                setCompleting(null);
                completeForm.reset();
            },
        });
    };

    const remove = (session: SessionRow) => {
        confirmDelete(`Hapus laporan pertemuan "${session.topic}"?`, () => {
            router.delete(`/admin/teaching-sessions/${session.id}`, { preserveScroll: true });
        });
    };

    return (
        <Shell
            title={title}
            eyebrow={scopeLabel(scope)}
            nav={nav}
            actions={
                permissions.canCreateReport &&
                (availableSchedules.length > 0 ? (
                    <Button asChild>
                        <Link href="/instructor/teaching-sessions/create">
                            <Plus className="size-4" />
                            Isi Laporan
                        </Link>
                    </Button>
                ) : (
                    <span className="hidden text-xs font-semibold text-slate-500 md:inline">Tidak ada jadwal tanpa laporan</span>
                ))
            }
        >
            <Head title={title} />
            <div className="grid gap-5 md:grid-cols-5">
                <StatCard label="Total Laporan" value={String(stats.total)} icon={ClipboardCheck} />
                <StatCard label="Menunggu Review" value={String(stats.submitted)} icon={TriangleAlert} tone="amber" />
                <StatCard label="Disetujui" value={String(stats.approved)} icon={CheckCircle2} tone="purple" />
                <StatCard label="Ditolak" value={String(stats.rejected)} icon={Trash2} tone="slate" />
                <StatCard label="Rata-rata Hadir" value={String(stats.averageAttendance)} icon={Users} tone="slate" />
            </div>

            <Panel
                className="mt-6"
                title="Laporan pertemuan tersimpan"
                action={
                    <div className="flex flex-col gap-2 md:flex-row">
                        <label className="relative block w-full md:w-72">
                            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
                            <Input
                                className="bg-[#FAF8FF] pl-9"
                                placeholder="Cari laporan, sekolah, course..."
                                value={term}
                                onChange={(event) => setTerm(event.target.value)}
                            />
                        </label>
                        <SearchableSelect value={status} onChange={setStatus} options={statusOptions} placeholder="Status" className="md:w-52" />
                    </div>
                }
            >
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="text-xs tracking-wider text-slate-500 uppercase">
                            <tr>
                                <th className="py-3">Pertemuan</th>
                                <th>Sekolah</th>
                                <th>Pengajar</th>
                                <th>Course</th>
                                <th>Bukti</th>
                                <th>Status</th>
                                {showPayrollColumn && <th>Payroll</th>}
                                <th className="text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {visibleSessions.map((session) => (
                                <tr key={session.id}>
                                    <td className="min-w-80 py-4 align-top">
                                        <p className="font-bold text-slate-950">{session.topic}</p>
                                        <p className="mt-1 text-xs text-slate-500">
                                            {session.actualDateLabel} · {session.startedAt}–{session.endedAt} · {session.studentAttendanceCount} hadir
                                        </p>
                                        <p className="mt-2 line-clamp-3 text-xs leading-5 text-slate-500">{session.report}</p>
                                        {session.reviewNotes && (
                                            <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
                                                Catatan: {session.reviewNotes}
                                            </p>
                                        )}
                                        {scope === 'instructor' && (
                                            <Button asChild type="button" size="sm" variant="outline" className="mt-3 mr-2">
                                                <Link href={`/instructor/teaching-sessions/${session.id}/attendances`}>
                                                    <Users className="size-4" />
                                                    Presensi siswa
                                                </Link>
                                            </Button>
                                        )}
                                        {session.canComplete && (
                                            <Button type="button" size="sm" className="mt-3" onClick={() => showComplete(session)}>
                                                Lengkapi laporan
                                            </Button>
                                        )}
                                    </td>
                                    <td className="align-top">{session.school}</td>
                                    <td className="align-top">{session.instructor}</td>
                                    <td className="align-top">{session.course}</td>
                                    <td className="align-top">
                                        {session.evidencePhotoUrl ? (
                                            <a
                                                href={session.evidencePhotoUrl}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="inline-flex items-center gap-2 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 hover:border-blue-300"
                                            >
                                                <ImageIcon className="size-4" />
                                                Lihat foto
                                            </a>
                                        ) : (
                                            <span className="text-xs text-red-600">Tidak ada bukti</span>
                                        )}
                                    </td>
                                    <td className="align-top">
                                        <StatusPill status={session.status} />
                                        {session.reviewer && (
                                            <p className="mt-1 text-xs text-slate-500">
                                                {session.reviewer} · {session.reviewedAt}
                                            </p>
                                        )}
                                    </td>
                                    {showPayrollColumn && (
                                        <td className="align-top">
                                            {session.payrollStatus ? (
                                                <span className="rounded-full bg-violet-50 px-2 py-1 text-xs font-bold text-violet-700">
                                                    {session.payrollStatus} · {session.payrollPeriod}
                                                </span>
                                            ) : (
                                                <span className="text-xs text-slate-500">Belum masuk payroll</span>
                                            )}
                                        </td>
                                    )}
                                    <td className="align-top">
                                        <div className="flex justify-end gap-1">
                                            {session.canEdit && (
                                                <Button variant="ghost" size="icon" aria-label="Edit laporan" onClick={() => showEdit(session)}>
                                                    <Pencil className="size-4" />
                                                </Button>
                                            )}
                                            {permissions.canReview && session.status === 'submitted' && (
                                                <>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        aria-label="Setujui laporan"
                                                        onClick={() => showReview(session, 'approved')}
                                                    >
                                                        <CheckCircle2 className="size-4 text-emerald-600" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        aria-label="Tolak laporan"
                                                        onClick={() => showReview(session, 'rejected')}
                                                    >
                                                        <TriangleAlert className="size-4 text-amber-600" />
                                                    </Button>
                                                </>
                                            )}
                                            {session.canDelete && (
                                                <Button variant="ghost" size="icon" aria-label="Hapus laporan" onClick={() => remove(session)}>
                                                    <Trash2 className="size-4 text-red-600" />
                                                </Button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {visibleSessions.length === 0 && (
                        <p className="py-8 text-center text-sm text-slate-500">Belum ada laporan pertemuan yang cocok dengan filter.</p>
                    )}
                </div>
            </Panel>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>{editing ? 'Edit Laporan Pertemuan' : 'Isi Laporan Pertemuan'}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={submitReport} className="space-y-4">
                        <Field label="Jadwal" error={form.errors.teaching_schedule_id} required>
                            {editing ? (
                                <Input value={editing.scheduleTitle} disabled />
                            ) : (
                                <SearchableSelect
                                    value={form.data.teaching_schedule_id}
                                    onChange={(value) => form.setData('teaching_schedule_id', value)}
                                    options={availableSchedules.map((schedule) => ({
                                        value: String(schedule.id),
                                        label: `${schedule.title} · ${schedule.school} · ${schedule.course} · ${schedule.startsAtLabel}`,
                                    }))}
                                    placeholder="Pilih jadwal"
                                />
                            )}
                        </Field>
                        <div className="grid gap-4 md:grid-cols-3">
                            <Field label="Tanggal aktual" error={form.errors.actual_date} required>
                                <Input
                                    type="date"
                                    value={form.data.actual_date}
                                    onChange={(event) => form.setData('actual_date', event.target.value)}
                                />
                            </Field>
                            <Field label="Jam mulai" error={form.errors.started_at} required>
                                <Input
                                    type="time"
                                    value={form.data.started_at}
                                    onChange={(event) => form.setData('started_at', event.target.value)}
                                />
                            </Field>
                            <Field label="Jam selesai" error={form.errors.ended_at} required>
                                <Input type="time" value={form.data.ended_at} onChange={(event) => form.setData('ended_at', event.target.value)} />
                            </Field>
                        </div>
                        <div className="grid gap-4 md:grid-cols-[1fr_180px]">
                            <Field label="Topik pertemuan" error={form.errors.topic} required>
                                <Input value={form.data.topic} onChange={(event) => form.setData('topic', event.target.value)} />
                            </Field>
                            <Field label="Jumlah siswa hadir" error={form.errors.student_attendance_count} required>
                                <Input
                                    type="number"
                                    min="0"
                                    value={form.data.student_attendance_count}
                                    onChange={(event) => form.setData('student_attendance_count', event.target.value)}
                                />
                            </Field>
                        </div>
                        <Field label="Laporan kegiatan" error={form.errors.report} required>
                            <textarea
                                className="min-h-36 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                                value={form.data.report}
                                onChange={(event) => form.setData('report', event.target.value)}
                                placeholder="Tuliskan materi yang diajarkan, kondisi kelas, kendala, tindak lanjut, dan catatan penting."
                            />
                        </Field>
                        <Field
                            label={editing ? 'Upload bukti foto baru (opsional jika sudah ada)' : 'Upload bukti foto laporan'}
                            error={form.errors.evidence_photo}
                            required={!editing}
                        >
                            <Input
                                type="file"
                                accept="image/png,image/jpeg,image/webp"
                                onChange={(event) => form.setData('evidence_photo', event.target.files?.[0] ?? null)}
                            />
                            <p className="text-xs leading-5 text-slate-500">
                                Bukti foto wajib saat membuat laporan. Database hanya menyimpan path file, URL ditentukan dinamis dari server.
                            </p>
                            {editing?.evidencePhotoUrl && (
                                <a
                                    href={editing.evidencePhotoUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-2 text-xs font-bold text-blue-700"
                                >
                                    <Eye className="size-4" />
                                    Lihat bukti foto tersimpan
                                </a>
                            )}
                        </Field>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                                Batal
                            </Button>
                            <Button type="submit" disabled={form.processing}>
                                Kirim Laporan
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog open={Boolean(completing)} onOpenChange={(next) => !next && setCompleting(null)}>
                <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Lengkapi Laporan Kegiatan</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={submitCompletion} className="space-y-4">
                        {completing && (
                            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
                                <p className="font-bold text-slate-950">{completing.topic}</p>
                                <p className="mt-1 text-slate-500">
                                    {completing.school} · {completing.course} · {completing.actualDateLabel} · {completing.studentAttendanceCount} siswa absen
                                </p>
                            </div>
                        )}
                        <Field label="Laporan kegiatan" error={completeForm.errors.report} required>
                            <textarea
                                className="min-h-36 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                                value={completeForm.data.report}
                                onChange={(event) => completeForm.setData('report', event.target.value)}
                                placeholder="Tuliskan aktivitas pembelajaran, capaian materi, kendala, dan tindak lanjut."
                            />
                        </Field>
                        <Field label="Upload bukti foto laporan" error={completeForm.errors.evidence_photo} required>
                            <Input
                                type="file"
                                accept="image/png,image/jpeg,image/webp"
                                onChange={(event) => completeForm.setData('evidence_photo', event.target.files?.[0] ?? null)}
                            />
                            <p className="text-xs leading-5 text-slate-500">
                                Foto wajib diunggah. Jumlah hadir dihitung dari absensi siswa pada jadwal offline terkait.
                            </p>
                        </Field>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setCompleting(null)}>
                                Batal
                            </Button>
                            <Button type="submit" disabled={completeForm.processing}>
                                Submit Laporan
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog open={Boolean(reviewing)} onOpenChange={(next) => !next && setReviewing(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Review Laporan Pertemuan</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={submitReview} className="space-y-4">
                        {reviewing && (
                            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
                                <p className="font-bold text-slate-950">{reviewing.topic}</p>
                                <p className="mt-1 text-slate-500">
                                    {reviewing.school} · {reviewing.course} · {reviewing.actualDateLabel}
                                </p>
                            </div>
                        )}
                        <Field label="Status review" error={reviewForm.errors.status} required>
                            <SearchableSelect
                                value={reviewForm.data.status}
                                onChange={(value) => reviewForm.setData('status', value)}
                                options={reviewStatusOptions.map((option) => ({
                                    value: option.value,
                                    label: option.value === 'approved' ? 'Setujui' : 'Tolak',
                                }))}
                            />
                        </Field>
                        <Field label="Catatan review" error={reviewForm.errors.review_notes}>
                            <textarea
                                className="min-h-28 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                                value={reviewForm.data.review_notes}
                                onChange={(event) => reviewForm.setData('review_notes', event.target.value)}
                                placeholder={reviewForm.data.status === 'rejected' ? 'Wajib isi alasan penolakan.' : 'Opsional.'}
                            />
                        </Field>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setReviewing(null)}>
                                Batal
                            </Button>
                            <Button type="submit" disabled={reviewForm.processing}>
                                Simpan Review
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </Shell>
    );
}

function Field({ label, error, required = false, children }: { label: string; error?: string; required?: boolean; children: ReactNode }) {
    return (
        <div className="space-y-2">
            <FieldLabel required={required}>{label}</FieldLabel>
            {children}
            <InputError message={error} />
        </div>
    );
}

function scopeLabel(scope: string) {
    if (scope === 'admin') return 'Admin Operasional';
    if (scope === 'teacher') return 'Guru Sekolah';

    return 'Pengajar / Trainer';
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

function StatusPill({ status }: { status: string }) {
    const className =
        status === 'approved'
            ? 'bg-emerald-50 text-emerald-700'
            : status === 'rejected'
              ? 'bg-red-50 text-red-700'
              : status === 'draft'
                ? 'bg-slate-100 text-slate-700'
                : 'bg-amber-50 text-amber-700';

    return <span className={`rounded-full px-2 py-1 text-xs font-bold ${className}`}>{statusLabel(status)}</span>;
}
