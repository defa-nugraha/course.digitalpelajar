import { FieldLabel } from '@/components/form-field';
import InputError from '@/components/input-error';
import { Panel, Shell, StatCard } from '@/components/platform';
import { SearchableSelect } from '@/components/searchable-select';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Head, useForm, usePage } from '@inertiajs/react';
import { Award, CheckCircle2, ClipboardCheck, ExternalLink, FileImage, FileText, GraduationCap, Search, Users } from 'lucide-react';
import { FormEvent, useMemo, useState } from 'react';

interface ReviewItem {
    id: number;
    studentId: number;
    student: string;
    schoolId: number;
    school: string;
    courseId: number;
    course: string;
    trainerId: number;
    trainer: string;
    lesson?: string | null;
    code?: string | null;
    hasReport: boolean;
    hasImage: boolean;
    videoUrl?: string | null;
    score?: number | null;
    feedback?: string | null;
    status: string;
    reviewer?: string | null;
    submittedAt: string;
    reviewedAt?: string | null;
}

interface ReviewSummary {
    submissions: number;
    pending: number;
    accepted: number;
    averageScore: number;
    students: number;
    courses: number;
    schools: number;
}

interface ReviewCourse extends ReviewSummary {
    id: number;
    title: string;
    submissionsList: ReviewItem[];
}

interface ReviewSchool extends ReviewSummary {
    id: number;
    name: string;
    coursesList: ReviewCourse[];
}

interface ReviewTrainer extends ReviewSummary {
    id: number;
    name: string;
    schoolsList: ReviewSchool[];
}

interface ReviewsProps {
    items: ReviewItem[];
    hierarchy: ReviewTrainer[];
    summary: ReviewSummary;
    scopeLabel: string;
}

interface FilterOption {
    id: number;
    label: string;
}

export default function Reviews({ items, summary, scopeLabel }: ReviewsProps) {
    const { url } = usePage();
    const initialStudentId = new URLSearchParams(url.split('?')[1] ?? '').get('student');
    const initialStudent = initialStudentId ? items.find((item) => String(item.studentId) === initialStudentId) : null;
    const [selected, setSelected] = useState<ReviewItem | null>(null);
    const [term, setTerm] = useState(initialStudent?.student ?? '');
    const [status, setStatus] = useState('all');
    const [schoolId, setSchoolId] = useState('all');
    const [courseId, setCourseId] = useState('all');
    const form = useForm({ score: '', feedback: '', status: 'accepted' });

    const schoolOptions = useMemo(
        () =>
            uniqueOptions(
                items.map((item) => ({
                    id: item.schoolId,
                    label: item.school,
                })),
            ),
        [items],
    );
    const courseOptions = useMemo(
        () =>
            uniqueOptions(
                items
                    .filter((item) => schoolId === 'all' || String(item.schoolId) === schoolId)
                    .map((item) => ({
                        id: item.courseId,
                        label: item.course,
                    })),
            ),
        [items, schoolId],
    );
    const visibleItems = useMemo(
        () =>
            items.filter((item) => {
                const searchable = `${item.student} ${item.school} ${item.course} ${item.trainer} ${item.lesson ?? ''}`.toLowerCase();

                return (
                    searchable.includes(term.toLowerCase()) &&
                    (status === 'all' || item.status === status) &&
                    (schoolId === 'all' || String(item.schoolId) === schoolId) &&
                    (courseId === 'all' || String(item.courseId) === courseId)
                );
            }),
        [courseId, items, schoolId, status, term],
    );
    const statusOptions = [
        { value: 'all', label: 'Semua status' },
        { value: 'submitted', label: 'Menunggu review' },
        { value: 'revised', label: 'Perlu revisi' },
        { value: 'accepted', label: 'Diterima' },
        { value: 'rejected', label: 'Ditolak' },
    ];
    const reviewStatusOptions = statusOptions.filter((option) => option.value !== 'all' && option.value !== 'submitted');

    const openReview = (item: ReviewItem) => {
        setSelected(item);
        form.setData({
            score: item.score === null || item.score === undefined ? '' : String(item.score),
            feedback: item.feedback ?? '',
            status: item.status === 'submitted' ? 'accepted' : item.status,
        });
        form.clearErrors();
    };

    const resetFilter = () => {
        setTerm('');
        setStatus('all');
        setSchoolId('all');
        setCourseId('all');
    };

    const submit = (event: FormEvent) => {
        event.preventDefault();
        if (!selected) return;
        form.transform((data) => ({ ...data, score: data.score === '' ? null : Number(data.score) }));
        form.patch(`/reviews/submissions/${selected.id}`, {
            preserveScroll: true,
            onSuccess: () => setSelected(null),
        });
    };

    return (
        <Shell title="Review Submission" eyebrow={scopeLabel}>
            <Head title="Review Submission" />
            <div className="grid gap-5 md:grid-cols-4">
                <StatCard label="Total Submission" value={String(summary.submissions)} icon={ClipboardCheck} />
                <StatCard label="Menunggu Review" value={String(summary.pending)} icon={GraduationCap} tone="amber" />
                <StatCard label="Rata-rata Nilai" value={`${summary.averageScore || 0}`} icon={Award} tone="purple" />
                <StatCard label="Siswa Terlibat" value={String(summary.students)} icon={Users} tone="slate" />
            </div>

            <Panel
                className="mt-6"
                title="Daftar submission"
                action={
                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                        {visibleItems.length} dari {items.length} submission
                    </span>
                }
            >
                <div className="grid gap-3 md:grid-cols-[1.4fr_0.75fr_1fr_1fr_auto]">
                    <label className="relative block">
                        <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
                        <Input
                            className="bg-[#FAF8FF] pl-9"
                            placeholder="Cari siswa, course, sekolah, trainer..."
                            value={term}
                            onChange={(event) => setTerm(event.target.value)}
                        />
                    </label>
                    <SearchableSelect value={status} onChange={setStatus} options={statusOptions} placeholder="Status" />
                    <SearchableSelect
                        value={schoolId}
                        onChange={(value) => {
                            setSchoolId(value);
                            setCourseId('all');
                        }}
                        options={[
                            { value: 'all', label: 'Semua sekolah' },
                            ...schoolOptions.map((school) => ({ value: String(school.id), label: school.label })),
                        ]}
                        placeholder="Sekolah"
                    />
                    <SearchableSelect
                        value={courseId}
                        onChange={setCourseId}
                        options={[
                            { value: 'all', label: 'Semua course' },
                            ...courseOptions.map((course) => ({ value: String(course.id), label: course.label })),
                        ]}
                        placeholder="Course"
                    />
                    <Button type="button" variant="outline" onClick={resetFilter}>
                        Reset
                    </Button>
                </div>

                <div className="mt-5 overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="text-xs tracking-wider text-slate-500 uppercase">
                            <tr>
                                <th className="py-3">Siswa</th>
                                <th>Course</th>
                                <th>Sekolah</th>
                                <th>Trainer</th>
                                <th>Status</th>
                                <th>Nilai</th>
                                <th className="text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {visibleItems.map((item) => (
                                <tr key={item.id}>
                                    <td className="min-w-56 py-4">
                                        <p className="font-bold text-slate-950">{item.student}</p>
                                        <p className="mt-1 text-xs text-slate-500">
                                            {item.lesson || 'Final project'} · {formatDate(item.submittedAt)}
                                        </p>
                                    </td>
                                    <td className="min-w-56">{item.course}</td>
                                    <td>{item.school}</td>
                                    <td>{item.trainer}</td>
                                    <td>
                                        <StatusPill status={item.status} />
                                        {item.reviewer && <p className="mt-1 text-xs text-slate-500">Reviewer: {item.reviewer}</p>}
                                    </td>
                                    <td className="font-bold">{item.score ?? '-'}</td>
                                    <td className="text-right">
                                        <Button type="button" size="sm" onClick={() => openReview(item)}>
                                            Review
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {visibleItems.length === 0 && <EmptyState message="Tidak ada submission yang cocok dengan filter." />}
                </div>
            </Panel>

            <Dialog open={Boolean(selected)} onOpenChange={(value) => !value && setSelected(null)}>
                <DialogContent className="max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Review {selected?.student}</DialogTitle>
                    </DialogHeader>
                    {selected && (
                        <form onSubmit={submit} className="space-y-4">
                            <div className="rounded-lg bg-slate-50 p-4 text-sm">
                                <p className="font-bold">{selected.course}</p>
                                <p className="mt-1 text-slate-500">
                                    {selected.school} · {selected.lesson || 'Final project'}
                                </p>
                            </div>
                            {selected.code && (
                                <div className="space-y-2">
                                    <Label>Kode program</Label>
                                    <pre className="max-h-64 overflow-auto rounded-lg bg-slate-950 p-4 text-xs whitespace-pre-wrap text-slate-100">
                                        {selected.code}
                                    </pre>
                                </div>
                            )}
                            <div className="flex flex-wrap gap-2">
                                {selected.hasReport && (
                                    <Button asChild type="button" variant="outline">
                                        <a href={`/submissions/${selected.id}/files/report`} target="_blank" rel="noreferrer">
                                            <FileText className="size-4" />
                                            Laporan
                                        </a>
                                    </Button>
                                )}
                                {selected.hasImage && (
                                    <Button asChild type="button" variant="outline">
                                        <a href={`/submissions/${selected.id}/files/image`} target="_blank" rel="noreferrer">
                                            <FileImage className="size-4" />
                                            Foto
                                        </a>
                                    </Button>
                                )}
                                {selected.videoUrl && (
                                    <Button asChild type="button" variant="outline">
                                        <a href={selected.videoUrl} target="_blank" rel="noreferrer">
                                            <ExternalLink className="size-4" />
                                            Video
                                        </a>
                                    </Button>
                                )}
                            </div>
                            {!selected.code && !selected.hasReport && !selected.hasImage && !selected.videoUrl && (
                                <p className="text-sm text-red-700">Bukti submission tidak tersedia.</p>
                            )}
                            <div className="space-y-2">
                                <FieldLabel required>Nilai</FieldLabel>
                                <Input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={form.data.score}
                                    onChange={(event) => form.setData('score', event.target.value)}
                                />
                                <InputError message={form.errors.score} />
                            </div>
                            <div className="space-y-2">
                                <FieldLabel required>Feedback</FieldLabel>
                                <textarea
                                    className="min-h-28 w-full rounded-md border border-slate-200 bg-white p-3 text-sm"
                                    value={form.data.feedback}
                                    onChange={(event) => form.setData('feedback', event.target.value)}
                                />
                                <InputError message={form.errors.feedback} />
                            </div>
                            <div className="space-y-2">
                                <FieldLabel required>Status</FieldLabel>
                                <SearchableSelect
                                    value={form.data.status}
                                    onChange={(value) => form.setData('status', value)}
                                    options={reviewStatusOptions}
                                />
                                <InputError message={form.errors.status} />
                            </div>
                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setSelected(null)}>
                                    Batal
                                </Button>
                                <Button type="submit" disabled={form.processing}>
                                    Simpan Review
                                </Button>
                            </DialogFooter>
                        </form>
                    )}
                </DialogContent>
            </Dialog>
        </Shell>
    );
}

function uniqueOptions(options: FilterOption[]): FilterOption[] {
    return Array.from(new Map(options.map((option) => [option.id, option])).values()).sort((first, second) =>
        first.label.localeCompare(second.label),
    );
}

function EmptyState({ message }: { message: string }) {
    return <p className="rounded-lg border border-dashed border-slate-200 p-4 text-center text-sm text-slate-500">{message}</p>;
}

function StatusPill({ status }: { status: string }) {
    const tone =
        status === 'accepted'
            ? 'bg-emerald-50 text-emerald-700'
            : status === 'rejected'
              ? 'bg-red-50 text-red-700'
              : status === 'revised'
                ? 'bg-amber-50 text-amber-700'
                : 'bg-blue-50 text-blue-700';

    return (
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-bold ${tone}`}>
            {status === 'accepted' && <CheckCircle2 className="size-3" />}
            {statusLabel(status)}
        </span>
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
        hour: '2-digit',
        minute: '2-digit',
    }).format(new Date(value));
}
