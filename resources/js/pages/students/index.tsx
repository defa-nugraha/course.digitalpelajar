import { Panel, ProgressBar, Shell, StatCard } from '@/components/platform';
import { SearchableSelect } from '@/components/searchable-select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Head, Link } from '@inertiajs/react';
import { AlertCircle, CheckCircle2, GraduationCap, Search, TrendingUp, Users } from 'lucide-react';
import { useMemo, useState } from 'react';

interface StudentRow {
    id: number;
    name: string;
    email: string;
    status: string;
    schoolId: number;
    school: string;
    enrollments: number;
    courses: number;
    progress: number;
    pendingSubmissions: number;
    certificates: number;
    lastActivityAt?: string | null;
    reviewUrl?: string | null;
}

interface SchoolOption {
    id: number;
    name: string;
}

interface StudentsProps {
    scopeLabel: string;
    students: StudentRow[];
    summary: {
        students: number;
        active: number;
        averageProgress: number;
        pendingSubmissions: number;
    };
    schools: SchoolOption[];
}

export default function StudentsIndex({ scopeLabel, students, summary, schools }: StudentsProps) {
    const [term, setTerm] = useState('');
    const [schoolId, setSchoolId] = useState('all');
    const [status, setStatus] = useState('all');
    const [reviewState, setReviewState] = useState('all');

    const visibleStudents = useMemo(
        () =>
            students.filter((student) => {
                const searchable = `${student.name} ${student.email} ${student.school}`.toLowerCase();

                return (
                    searchable.includes(term.toLowerCase()) &&
                    (schoolId === 'all' || String(student.schoolId) === schoolId) &&
                    (status === 'all' || student.status === status) &&
                    (reviewState === 'all' || (reviewState === 'needs_review' ? student.pendingSubmissions > 0 : student.pendingSubmissions === 0))
                );
            }),
        [reviewState, schoolId, status, students, term],
    );

    const resetFilters = () => {
        setTerm('');
        setSchoolId('all');
        setStatus('all');
        setReviewState('all');
    };

    return (
        <Shell title="Siswa" eyebrow={scopeLabel}>
            <Head title="Siswa" />
            <div className="grid gap-5 md:grid-cols-4">
                <StatCard label="Total Siswa" value={String(summary.students)} icon={Users} />
                <StatCard label="Siswa Aktif" value={String(summary.active)} icon={CheckCircle2} tone="slate" />
                <StatCard label="Rata-rata Progress" value={`${summary.averageProgress}%`} icon={TrendingUp} tone="purple" />
                <StatCard label="Butuh Review" value={String(summary.pendingSubmissions)} icon={AlertCircle} tone="amber" />
            </div>

            <Panel
                className="mt-6"
                title="Monitoring siswa"
                action={
                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                        {visibleStudents.length} dari {students.length} siswa
                    </span>
                }
            >
                <div className="grid gap-3 lg:grid-cols-[1.4fr_1fr_0.8fr_1fr_auto]">
                    <label className="relative block">
                        <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
                        <Input
                            className="bg-[#FAF8FF] pl-9"
                            placeholder="Cari nama, email, atau sekolah..."
                            value={term}
                            onChange={(event) => setTerm(event.target.value)}
                        />
                    </label>
                    <SearchableSelect
                        value={schoolId}
                        onChange={setSchoolId}
                        options={[
                            { value: 'all', label: 'Semua sekolah' },
                            ...schools.map((school) => ({ value: String(school.id), label: school.name })),
                        ]}
                        placeholder="Sekolah"
                    />
                    <SearchableSelect
                        value={status}
                        onChange={setStatus}
                        options={[
                            { value: 'all', label: 'Semua status' },
                            { value: 'active', label: 'Aktif' },
                            { value: 'inactive', label: 'Nonaktif' },
                        ]}
                        placeholder="Status"
                    />
                    <SearchableSelect
                        value={reviewState}
                        onChange={setReviewState}
                        options={[
                            { value: 'all', label: 'Semua review' },
                            { value: 'needs_review', label: 'Ada submission' },
                            { value: 'clear', label: 'Tidak ada pending' },
                        ]}
                        placeholder="Review"
                    />
                    <Button type="button" variant="outline" onClick={resetFilters}>
                        Reset
                    </Button>
                </div>

                <div className="mt-5 overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="text-xs tracking-wider text-slate-500 uppercase">
                            <tr>
                                <th className="py-3">Siswa</th>
                                <th>Sekolah</th>
                                <th>Course</th>
                                <th>Progress</th>
                                <th>Submission</th>
                                <th>Sertifikat</th>
                                <th>Aktivitas</th>
                                <th className="text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {visibleStudents.map((student) => (
                                <tr key={student.id}>
                                    <td className="min-w-64 py-4">
                                        <div className="flex items-start gap-3">
                                            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-700">
                                                <GraduationCap className="size-5" />
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-950">{student.name}</p>
                                                <p className="mt-1 text-xs text-slate-500">{student.email}</p>
                                                <p className="mt-1 text-xs font-semibold text-slate-500">{student.status}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="min-w-44">{student.school}</td>
                                    <td>
                                        <p className="font-bold">{student.courses}</p>
                                        <p className="text-xs text-slate-500">{student.enrollments} enrollment</p>
                                    </td>
                                    <td className="min-w-40">
                                        <div className="flex items-center gap-3">
                                            <ProgressBar value={student.progress} />
                                            <span className="w-10 text-right text-xs font-bold text-blue-700">{student.progress}%</span>
                                        </div>
                                    </td>
                                    <td>
                                        <span
                                            className={`rounded-full px-2 py-1 text-xs font-bold ${
                                                student.pendingSubmissions > 0 ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'
                                            }`}
                                        >
                                            {student.pendingSubmissions} pending
                                        </span>
                                    </td>
                                    <td>{student.certificates}</td>
                                    <td className="min-w-36 text-xs text-slate-500">{formatDate(student.lastActivityAt)}</td>
                                    <td className="text-right">
                                        {student.reviewUrl ? (
                                            <Button asChild size="sm">
                                                <Link href={student.reviewUrl}>Review</Link>
                                            </Button>
                                        ) : (
                                            <span className="text-xs text-slate-400">Tidak ada review</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {visibleStudents.length === 0 && (
                        <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
                            Tidak ada siswa yang cocok dengan filter.
                        </div>
                    )}
                </div>
            </Panel>
        </Shell>
    );
}

function formatDate(value?: string | null) {
    if (!value) return '-';

    return new Intl.DateTimeFormat('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    }).format(new Date(value));
}
