import InputError from '@/components/input-error';
import { Panel, Shell } from '@/components/platform';
import { DesktopTable, MobileCardList, MobileDataCard } from '@/components/responsive-data';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import type { FormDataConvertible } from '@inertiajs/core';
import { Head, Link, useForm } from '@inertiajs/react';
import {
    ArrowLeft,
    CheckCircle2,
    Clock,
    ExternalLink,
    LucideIcon,
    MessageSquare,
    Minus,
    QrCode,
    RotateCcw,
    Save,
    Search,
    Star,
    Stethoscope,
    Users,
    UserX,
} from 'lucide-react';
import QRCode from 'qrcode';
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';

type AttendanceStatus = 'H' | 'S' | 'I' | 'A';
type AttendanceValue = AttendanceStatus | '';

interface AttendanceSession {
    id: number;
    teachingScheduleId: number;
    topic: string;
    status: string;
    school: string;
    course: string;
    scheduleTitle: string;
    scheduleMode: string;
    location?: string | null;
    startsAtLabel?: string | null;
    endsAtLabel?: string | null;
}

interface StudentRow {
    id: number;
    name: string;
    email: string;
    status: AttendanceValue;
    present: boolean;
    checkedInAt?: string | null;
    lateMinutes?: number;
    lateLabel?: string | null;
    source?: string | null;
    reason?: string | null;
    proofUrl?: string | null;
}

interface AttendanceState extends StudentRow {
    proof: File | null;
}

interface Props {
    scope: 'admin' | 'instructor';
    session: AttendanceSession;
    students: StudentRow[];
    summary: {
        total: number;
        present: number;
        sick: number;
        permit: number;
        absent: number;
        lateStudents: number;
        totalLateMinutes: number;
        missing: number;
        complete: boolean;
    };
    feedbackSummary: {
        total: number;
        averageRating: number;
        needHelp: number;
        items: {
            id: number;
            student: string;
            rating: number;
            understandingLevel: string;
            understandingLabel: string;
            comment?: string | null;
            suggestion?: string | null;
            createdAt: string;
        }[];
    };
    qrUrl?: string | null;
    qrExpiresAt?: string | null;
    canEdit: boolean;
    backUrl: string;
}

interface AttendanceDataResponse {
    students: StudentRow[];
    summary: Props['summary'];
    feedbackSummary: Props['feedbackSummary'];
    qrUrl?: string | null;
    qrExpiresAt?: string | null;
    canEdit: boolean;
}

const statusOptions: Array<{ value: AttendanceStatus; label: string; tone: string }> = [
    { value: 'H', label: 'H', tone: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
    { value: 'S', label: 'S', tone: 'border-amber-200 bg-amber-50 text-amber-700' },
    { value: 'I', label: 'I', tone: 'border-blue-200 bg-blue-50 text-blue-700' },
    { value: 'A', label: 'A', tone: 'border-red-200 bg-red-50 text-red-700' },
];

interface AttendanceFormData {
    [key: string]: FormDataConvertible;
    attendances: Array<{
        [key: string]: FormDataConvertible;
        student_id: string;
        status: string;
        late_minutes: number;
        reason: string;
        proof: File | null;
    }>;
}

export default function TeachingAttendances({ scope, session, students, summary, feedbackSummary, qrUrl, canEdit, backUrl }: Props) {
    const [term, setTerm] = useState('');
    const [qrOpen, setQrOpen] = useState(false);
    const [qrImage, setQrImage] = useState<string | null>(null);
    const [hasManualChanges, setHasManualChanges] = useState(false);
    const [summaryState, setSummaryState] = useState(summary);
    const [feedbackState, setFeedbackState] = useState(feedbackSummary);
    const [qrUrlState, setQrUrlState] = useState(qrUrl);
    const [attendanceRows, setAttendanceRows] = useState<AttendanceState[]>(() => toAttendanceState(students));
    const form = useForm<AttendanceFormData>({ attendances: [] });

    const fetchAttendanceData = useCallback(
        async ({ updateQr = false, forceRows = false }: { updateQr?: boolean; forceRows?: boolean } = {}) => {
            const response = await fetch(`/${scope}/teaching-sessions/${session.id}/attendances/data`, {
                headers: {
                    Accept: 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
            });

            if (!response.ok) return;

            const payload = (await response.json()) as AttendanceDataResponse;
            setSummaryState(payload.summary);
            setFeedbackState(payload.feedbackSummary);

            if (forceRows || !hasManualChanges) {
                setAttendanceRows(toAttendanceState(payload.students));
            }

            if (updateQr) {
                setQrUrlState(payload.qrUrl ?? null);
            }
        },
        [hasManualChanges, scope, session.id],
    );

    useEffect(() => {
        if (!hasManualChanges) {
            setAttendanceRows(toAttendanceState(students));
        }
    }, [hasManualChanges, students]);

    useEffect(() => {
        if (!qrUrlState) {
            setQrImage(null);
            return;
        }

        QRCode.toDataURL(qrUrlState, { width: 360, margin: 2 })
            .then(setQrImage)
            .catch(() => setQrImage(null));
    }, [qrUrlState]);

    useEffect(() => {
        if (!canEdit) return;

        const interval = window.setInterval(() => {
            if (!hasManualChanges) {
                void fetchAttendanceData();
            }
        }, 5000);

        return () => window.clearInterval(interval);
    }, [canEdit, fetchAttendanceData, hasManualChanges]);

    useEffect(() => {
        if (!canEdit || !qrOpen) return;

        const interval = window.setInterval(() => {
            void fetchAttendanceData({ updateQr: true });
        }, 120000);

        return () => window.clearInterval(interval);
    }, [canEdit, fetchAttendanceData, qrOpen]);

    const visibleRows = useMemo(() => {
        const keyword = term.toLowerCase();

        return attendanceRows.filter((student) => `${student.name} ${student.email}`.toLowerCase().includes(keyword));
    }, [attendanceRows, term]);

    const setStatus = (studentId: number, status: AttendanceStatus) => {
        if (!canEdit) return;

        setHasManualChanges(true);
        setAttendanceRows((rows) =>
            rows.map((row) =>
                row.id === studentId
                    ? {
                          ...row,
                          status,
                          reason: status === 'S' || status === 'I' ? row.reason : '',
                          proof: status === 'S' || status === 'I' ? row.proof : null,
                          proofUrl: status === 'S' || status === 'I' ? row.proofUrl : null,
                      }
                    : row,
            ),
        );
    };

    const setReason = (studentId: number, reason: string) => {
        setHasManualChanges(true);
        setAttendanceRows((rows) => rows.map((row) => (row.id === studentId ? { ...row, reason } : row)));
    };

    const setProof = (studentId: number, proof: File | null) => {
        setHasManualChanges(true);
        setAttendanceRows((rows) => rows.map((row) => (row.id === studentId ? { ...row, proof } : row)));
    };

    const setLateMinutes = (studentId: number, value: string) => {
        const lateMinutes = Math.min(1440, Math.max(0, Number.parseInt(value || '0', 10) || 0));

        setHasManualChanges(true);
        setAttendanceRows((rows) =>
            rows.map((row) =>
                row.id === studentId ? { ...row, lateMinutes, lateLabel: lateMinutes > 0 ? formatLateDuration(lateMinutes) : 'Tepat waktu' } : row,
            ),
        );
    };

    const reduceLateMinutes = (studentId: number, minutes: number) => {
        const student = attendanceRows.find((row) => row.id === studentId);

        if (!student || scope !== 'admin' || !canEdit) return;

        setLateMinutes(studentId, String(Math.max(0, (student.lateMinutes ?? 0) - minutes)));
    };

    const resetLateMinutes = (studentId: number) => {
        if (scope !== 'admin' || !canEdit) return;

        setLateMinutes(studentId, '0');
    };

    const submit = (event: FormEvent) => {
        event.preventDefault();
        form.transform(() => ({
            _method: 'patch',
            attendances: attendanceRows.map((row) => ({
                student_id: String(row.id),
                status: row.status,
                late_minutes: row.status === 'H' ? (row.lateMinutes ?? 0) : 0,
                reason: row.reason ?? '',
                proof: row.proof,
            })),
        }));
        form.post(`/${scope}/teaching-sessions/${session.id}/attendances`, {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                setHasManualChanges(false);
                void fetchAttendanceData({ forceRows: true });
            },
        });
    };

    const errorFor = (studentId: number, field: string) => {
        const index = attendanceRows.findIndex((row) => row.id === studentId);

        return index >= 0 ? (form.errors[`attendances.${index}.${field}`] as string | undefined) : undefined;
    };

    return (
        <Shell
            title="Presensi Siswa"
            eyebrow={scope === 'admin' ? 'Admin Operasional' : 'Pengajar / Trainer'}
            nav={scope}
            actions={
                <div className="flex flex-col gap-2 sm:flex-row">
                    <Button asChild variant="outline">
                        <Link href={backUrl}>
                            <ArrowLeft className="size-4" />
                            Kembali
                        </Link>
                    </Button>
                    {canEdit && qrUrlState && (
                        <Button
                            type="button"
                            onClick={() => {
                                setQrOpen(true);
                                void fetchAttendanceData({ updateQr: true });
                            }}
                        >
                            <QrCode className="size-4" />
                            Tampilkan QR
                        </Button>
                    )}
                </div>
            }
        >
            <Head title="Presensi Siswa" />

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-8">
                <AttendanceSummaryCard label="Total siswa" value={String(summaryState.total)} icon={Users} tone="blue" />
                <AttendanceSummaryCard label="Hadir" value={String(summaryState.present)} icon={CheckCircle2} tone="green" />
                <AttendanceSummaryCard label="Sakit" value={String(summaryState.sick)} icon={Stethoscope} tone="amber" />
                <AttendanceSummaryCard label="Izin" value={String(summaryState.permit)} icon={Clock} tone="sky" />
                <AttendanceSummaryCard label="Alpa" value={String(summaryState.absent)} icon={UserX} tone="red" />
                <AttendanceSummaryCard label="Terlambat" value={String(summaryState.lateStudents ?? 0)} icon={Clock} tone="amber" />
                <AttendanceSummaryCard
                    label="Total telat"
                    value={formatLateDuration(summaryState.totalLateMinutes ?? 0)}
                    icon={Clock}
                    tone="slate"
                    compactValue
                />
                <AttendanceSummaryCard
                    label="Status presensi"
                    value={summaryState.complete ? 'Lengkap' : 'Belum lengkap'}
                    icon={Clock}
                    tone="slate"
                    compactValue
                />
            </div>

            <Panel className="mt-6" title={session.topic || session.scheduleTitle}>
                <div className="grid gap-4 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900 md:grid-cols-2">
                    <div>
                        <p className="text-xs font-bold tracking-wide uppercase">Course</p>
                        <p className="mt-1 font-bold">{session.course}</p>
                        <p className="mt-1 text-blue-700">{session.school}</p>
                    </div>
                    <div>
                        <p className="text-xs font-bold tracking-wide uppercase">Jadwal</p>
                        <p className="mt-1 font-bold">
                            {session.startsAtLabel || '-'}–{session.endsAtLabel || '-'}
                        </p>
                        <p className="mt-1 text-blue-700">{session.location || 'Lokasi sekolah'}</p>
                    </div>
                </div>
                {!canEdit && (
                    <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700">
                        Presensi terkunci karena laporan sudah masuk proses payroll.
                    </p>
                )}
                {scope === 'admin' && canEdit && (
                    <p className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-800">
                        <strong>Koreksi keterlambatan:</strong> admin dapat mengubah nilai akhir, mengurangi 1 atau 5 menit, maupun meresetnya menjadi
                        tepat waktu. Perubahan diterapkan setelah menekan <strong>Simpan Presensi</strong>.
                    </p>
                )}
            </Panel>

            <Panel
                className="mt-6"
                title="Daftar siswa"
                action={
                    <label className="relative block w-full md:w-80">
                        <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
                        <Input
                            className="bg-[#FAF8FF] pl-9"
                            placeholder="Cari nama atau email siswa..."
                            value={term}
                            onChange={(event) => setTerm(event.target.value)}
                        />
                    </label>
                }
            >
                <form onSubmit={submit} className="space-y-5">
                    <div className="space-y-4">
                        <MobileCardList
                            empty={
                                <p className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
                                    Tidak ada siswa yang cocok dengan pencarian.
                                </p>
                            }
                        >
                            {visibleRows.map((student) => (
                                <MobileDataCard
                                    key={student.id}
                                    title={student.name}
                                    subtitle={student.email}
                                    badge={<LateBadge status={student.status} minutes={student.lateMinutes ?? 0} label={student.lateLabel} />}
                                    meta={[
                                        { label: 'Waktu', value: student.checkedInAt || '-' },
                                        {
                                            label: 'Sumber',
                                            value:
                                                student.source === 'student_qr'
                                                    ? 'Scan QR siswa'
                                                    : student.source === 'instructor_manual'
                                                      ? 'Manual pengajar'
                                                      : '-',
                                        },
                                    ]}
                                >
                                    <div className="space-y-4">
                                        <div>
                                            <p className="mb-2 text-xs font-bold tracking-wide text-slate-500 uppercase">Presensi</p>
                                            <div className="grid grid-cols-4 gap-2">
                                                {statusOptions.map((option) => (
                                                    <label
                                                        key={option.value}
                                                        className={`inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-bold ${
                                                            student.status === option.value ? option.tone : 'border-slate-200 bg-white text-slate-500'
                                                        } ${!canEdit ? 'cursor-not-allowed opacity-70' : ''}`}
                                                    >
                                                        <input
                                                            type="radio"
                                                            name={`attendance-mobile-${student.id}`}
                                                            value={option.value}
                                                            checked={student.status === option.value}
                                                            disabled={!canEdit}
                                                            onChange={() => setStatus(student.id, option.value)}
                                                            className="sr-only"
                                                        />
                                                        {option.label}
                                                    </label>
                                                ))}
                                            </div>
                                            <InputError message={errorFor(student.id, 'status')} className="mt-2" />
                                        </div>

                                        {student.status === 'H' && (
                                            <LateMinutesEditor
                                                student={student}
                                                canEdit={canEdit}
                                                isAdmin={scope === 'admin'}
                                                onChange={(value) => setLateMinutes(student.id, value)}
                                                onReduce={(minutes) => reduceLateMinutes(student.id, minutes)}
                                                onReset={() => resetLateMinutes(student.id)}
                                                error={errorFor(student.id, 'late_minutes')}
                                            />
                                        )}

                                        {(student.status === 'S' || student.status === 'I') && (
                                            <div className="space-y-2">
                                                <textarea
                                                    className="min-h-24 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                                                    value={student.reason ?? ''}
                                                    disabled={!canEdit}
                                                    onChange={(event) => setReason(student.id, event.target.value)}
                                                    placeholder={student.status === 'S' ? 'Contoh: Sakit demam.' : 'Contoh: Izin acara keluarga.'}
                                                />
                                                <InputError message={errorFor(student.id, 'reason')} />
                                                {canEdit && (
                                                    <Input
                                                        type="file"
                                                        accept="image/png,image/jpeg,image/webp,application/pdf"
                                                        onChange={(event) => setProof(student.id, event.target.files?.[0] ?? null)}
                                                    />
                                                )}
                                                <InputError message={errorFor(student.id, 'proof')} />
                                                {student.proofUrl && (
                                                    <a
                                                        href={student.proofUrl}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="inline-flex min-h-11 items-center gap-2 text-xs font-bold text-blue-700"
                                                    >
                                                        <ExternalLink className="size-4" />
                                                        Lihat bukti
                                                    </a>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </MobileDataCard>
                            ))}
                        </MobileCardList>
                        <DesktopTable>
                            <table className="w-full text-left text-sm">
                                <thead className="text-xs tracking-wider text-slate-500 uppercase">
                                    <tr>
                                        <th>Siswa</th>
                                        <th className="py-3">Presensi</th>
                                        <th>Waktu Presensi</th>
                                        <th>Keterlambatan</th>
                                        <th>Alasan / Bukti</th>
                                        <th>Sumber</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200">
                                    {visibleRows.map((student) => (
                                        <tr key={student.id}>
                                            <td className="min-w-56 py-4 align-top">
                                                <p className="font-bold text-slate-950">{student.name}</p>
                                                <p className="mt-1 text-xs text-slate-500">{student.email}</p>
                                            </td>
                                            <td className="min-w-60 py-4 align-top">
                                                <div className="flex flex-wrap gap-2">
                                                    {statusOptions.map((option) => (
                                                        <label
                                                            key={option.value}
                                                            className={`inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold ${
                                                                student.status === option.value
                                                                    ? option.tone
                                                                    : 'border-slate-200 bg-white text-slate-500'
                                                            } ${!canEdit ? 'cursor-not-allowed opacity-70' : ''}`}
                                                        >
                                                            <input
                                                                type="radio"
                                                                name={`attendance-${student.id}`}
                                                                value={option.value}
                                                                checked={student.status === option.value}
                                                                disabled={!canEdit}
                                                                onChange={() => setStatus(student.id, option.value)}
                                                            />
                                                            {option.label}
                                                        </label>
                                                    ))}
                                                </div>
                                                <InputError message={errorFor(student.id, 'status')} className="mt-2" />
                                            </td>
                                            <td className="min-w-44 py-4 align-top text-slate-600">{student.checkedInAt || '-'}</td>
                                            <td className="min-w-40 py-4 align-top">
                                                <LateBadge status={student.status} minutes={student.lateMinutes ?? 0} label={student.lateLabel} />
                                                {student.status === 'H' && (
                                                    <LateMinutesEditor
                                                        compact
                                                        student={student}
                                                        canEdit={canEdit}
                                                        isAdmin={scope === 'admin'}
                                                        onChange={(value) => setLateMinutes(student.id, value)}
                                                        onReduce={(minutes) => reduceLateMinutes(student.id, minutes)}
                                                        onReset={() => resetLateMinutes(student.id)}
                                                        error={errorFor(student.id, 'late_minutes')}
                                                    />
                                                )}
                                            </td>
                                            <td className="min-w-72 align-top">
                                                {student.status === 'S' || student.status === 'I' ? (
                                                    <div className="space-y-2">
                                                        <textarea
                                                            className="min-h-20 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                                                            value={student.reason ?? ''}
                                                            disabled={!canEdit}
                                                            onChange={(event) => setReason(student.id, event.target.value)}
                                                            placeholder={
                                                                student.status === 'S' ? 'Contoh: Sakit demam.' : 'Contoh: Izin acara keluarga.'
                                                            }
                                                        />
                                                        <InputError message={errorFor(student.id, 'reason')} />
                                                        {canEdit && (
                                                            <Input
                                                                type="file"
                                                                accept="image/png,image/jpeg,image/webp,application/pdf"
                                                                onChange={(event) => setProof(student.id, event.target.files?.[0] ?? null)}
                                                            />
                                                        )}
                                                        <InputError message={errorFor(student.id, 'proof')} />
                                                        {student.proofUrl && (
                                                            <a
                                                                href={student.proofUrl}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className="inline-flex items-center gap-2 text-xs font-bold text-blue-700"
                                                            >
                                                                <ExternalLink className="size-4" />
                                                                Lihat bukti
                                                            </a>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-slate-500">-</span>
                                                )}
                                            </td>
                                            <td className="py-4 align-top">
                                                {student.source === 'student_qr'
                                                    ? 'Scan QR siswa'
                                                    : student.source === 'instructor_manual'
                                                      ? 'Manual pengajar'
                                                      : '-'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {visibleRows.length === 0 && (
                                <p className="py-8 text-center text-sm text-slate-500">Tidak ada siswa yang cocok dengan pencarian.</p>
                            )}
                        </DesktopTable>
                    </div>
                    {canEdit && (
                        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                            <Button type="button" variant="outline" onClick={() => void fetchAttendanceData({ updateQr: qrOpen })}>
                                Refresh
                            </Button>
                            <Button type="submit" disabled={form.processing}>
                                <Save className="size-4" />
                                Simpan Presensi
                            </Button>
                        </div>
                    )}
                </form>
            </Panel>

            <Panel className="mt-6" title="Feedback siswa">
                <div className="grid gap-3 md:grid-cols-3">
                    <FeedbackMetric label="Total feedback" value={String(feedbackState.total)} icon={MessageSquare} />
                    <FeedbackMetric
                        label="Rata-rata rating"
                        value={feedbackState.averageRating ? `${feedbackState.averageRating}/5` : '-'}
                        icon={Star}
                    />
                    <FeedbackMetric label="Butuh bantuan" value={String(feedbackState.needHelp)} icon={Users} />
                </div>
                <div className="mt-5 space-y-3">
                    {feedbackState.items.map((feedback) => (
                        <div key={feedback.id} className="rounded-xl border border-slate-200 p-4">
                            <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                                <div>
                                    <p className="font-bold text-slate-950">{feedback.student}</p>
                                    <p className="mt-1 text-xs text-slate-500">{feedback.createdAt}</p>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
                                        Rating {feedback.rating}/5
                                    </span>
                                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                                        {feedback.understandingLabel}
                                    </span>
                                </div>
                            </div>
                            {feedback.comment && <p className="mt-3 text-sm leading-6 text-slate-600">{feedback.comment}</p>}
                            {feedback.suggestion && (
                                <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-sm leading-6 text-slate-600">Saran: {feedback.suggestion}</p>
                            )}
                        </div>
                    ))}
                    {feedbackState.items.length === 0 && (
                        <p className="rounded-xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">
                            Belum ada feedback dari siswa untuk pertemuan ini.
                        </p>
                    )}
                </div>
            </Panel>

            <Dialog open={qrOpen} onOpenChange={setQrOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>QR Code Presensi</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 text-center">
                        <p className="text-sm leading-6 text-slate-600">
                            Minta siswa membuka menu <strong>Scan Presensi</strong> dari akun masing-masing, lalu arahkan kamera ke QR ini untuk
                            mencatat kehadiran.
                        </p>
                        <div className="mx-auto flex size-72 items-center justify-center rounded-2xl border border-slate-200 bg-white p-4">
                            {qrImage ? (
                                <img src={qrImage} alt={`QR presensi ${session.topic}`} className="size-full object-contain" />
                            ) : (
                                <p className="text-sm text-slate-500">QR belum bisa dibuat.</p>
                            )}
                        </div>
                        <p className="text-xs leading-5 text-slate-500">
                            Pastikan siswa sudah login dengan akun sendiri. Jika ada siswa yang belum berhasil scan, tampilkan ulang QR atau gunakan
                            presensi manual sesuai kondisi kelas.
                        </p>
                    </div>
                    <DialogFooter>
                        <Button type="button" onClick={() => setQrOpen(false)}>
                            Selesai
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Shell>
    );
}

function toAttendanceState(students: StudentRow[]): AttendanceState[] {
    return students.map((student) => ({
        ...student,
        status: student.status ?? '',
        reason: student.reason ?? '',
        proof: null,
    }));
}

function FeedbackMetric({ label, value, icon: Icon }: { label: string; value: string; icon: LucideIcon }) {
    return (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-bold tracking-wide text-slate-500 uppercase">{label}</p>
                <Icon className="size-5 text-blue-700" />
            </div>
            <p className="mt-2 text-2xl font-extrabold text-slate-950">{value}</p>
        </div>
    );
}

function LateBadge({ status, minutes, label }: { status: AttendanceValue; minutes: number; label?: string | null }) {
    if (status !== 'H') {
        return <span className="text-xs text-slate-500">-</span>;
    }

    if (minutes <= 0) {
        return <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">{label || 'Tepat waktu'}</span>;
    }

    return (
        <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">Terlambat {label || formatLateDuration(minutes)}</span>
    );
}

function LateMinutesEditor({
    student,
    canEdit,
    isAdmin,
    compact = false,
    onChange,
    onReduce,
    onReset,
    error,
}: {
    student: AttendanceState;
    canEdit: boolean;
    isAdmin: boolean;
    compact?: boolean;
    onChange: (value: string) => void;
    onReduce: (minutes: number) => void;
    onReset: () => void;
    error?: string;
}) {
    const lateMinutes = student.lateMinutes ?? 0;

    return (
        <div className={compact ? 'mt-2 w-48' : ''}>
            {!compact && <label className="mb-2 block text-xs font-bold tracking-wide text-slate-500 uppercase">Keterlambatan (menit)</label>}
            <Input
                aria-label={`Keterlambatan ${student.name} dalam menit`}
                type="number"
                min={0}
                max={1440}
                inputMode="numeric"
                value={lateMinutes}
                disabled={!canEdit}
                onChange={(event) => onChange(event.target.value)}
            />
            {isAdmin && canEdit && (
                <div className="mt-2 grid grid-cols-3 gap-1.5" aria-label={`Koreksi keterlambatan ${student.name}`}>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={lateMinutes <= 0}
                        onClick={() => onReduce(1)}
                        aria-label={`Kurangi keterlambatan ${student.name} satu menit`}
                    >
                        <Minus className="size-3.5" />1
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={lateMinutes <= 0}
                        onClick={() => onReduce(5)}
                        aria-label={`Kurangi keterlambatan ${student.name} lima menit`}
                    >
                        <Minus className="size-3.5" />5
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={lateMinutes <= 0}
                        onClick={onReset}
                        aria-label={`Reset keterlambatan ${student.name}`}
                    >
                        <RotateCcw className="size-3.5" /> Reset
                    </Button>
                </div>
            )}
            <InputError message={error} className="mt-1" />
        </div>
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

function AttendanceSummaryCard({
    label,
    value,
    icon: Icon,
    tone,
    compactValue = false,
}: {
    label: string;
    value: string;
    icon: LucideIcon;
    tone: 'blue' | 'green' | 'amber' | 'sky' | 'red' | 'slate';
    compactValue?: boolean;
}) {
    const tones = {
        blue: {
            card: 'border-blue-600 bg-blue-600 text-white',
            icon: 'border-white/20 bg-white/15 text-white',
            label: 'text-white/80',
            value: 'text-white',
        },
        green: {
            card: 'border-emerald-500 bg-emerald-500 text-white',
            icon: 'border-white/20 bg-white/15 text-white',
            label: 'text-white/80',
            value: 'text-white',
        },
        amber: {
            card: 'border-[#FED635] bg-[#FED635] text-slate-950',
            icon: 'border-slate-900/10 bg-white/30 text-slate-950',
            label: 'text-slate-800/80',
            value: 'text-slate-950',
        },
        sky: {
            card: 'border-sky-500 bg-sky-500 text-white',
            icon: 'border-white/20 bg-white/15 text-white',
            label: 'text-white/80',
            value: 'text-white',
        },
        red: {
            card: 'border-red-500 bg-red-500 text-white',
            icon: 'border-white/20 bg-white/15 text-white',
            label: 'text-white/80',
            value: 'text-white',
        },
        slate: {
            card: 'border-slate-200 bg-white text-slate-950',
            icon: 'border-slate-200 bg-slate-50 text-slate-700',
            label: 'text-slate-500',
            value: 'text-slate-950',
        },
    };
    const selectedTone = tones[tone];

    return (
        <div className={`rounded-2xl border p-4 shadow-sm ${selectedTone.card}`}>
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className={`text-xs font-bold tracking-wide uppercase ${selectedTone.label}`}>{label}</p>
                    <p
                        className={`${compactValue ? 'mt-2 text-xl leading-tight font-extrabold' : 'mt-2 text-3xl font-extrabold'} ${selectedTone.value}`}
                    >
                        {value}
                    </p>
                </div>
                <span className={`inline-flex size-10 shrink-0 items-center justify-center rounded-xl border ${selectedTone.icon}`}>
                    <Icon className="size-5" />
                </span>
            </div>
        </div>
    );
}
