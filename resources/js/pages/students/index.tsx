import { Panel, ProgressBar, Shell, StatCard } from '@/components/platform';
import { DesktopTable, MobileCardList, MobileDataCard, StatusBadge } from '@/components/responsive-data';
import { SearchableSelect } from '@/components/searchable-select';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FieldLabel } from '@/components/form-field';
import InputError from '@/components/input-error';
import { confirmDelete } from '@/lib/confirm-delete';
import { Input } from '@/components/ui/input';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { AlertCircle, CheckCircle2, GraduationCap, Pencil, Search, Trash2, TrendingUp, Users } from 'lucide-react';
import { FormEvent } from 'react';
import { useMemo, useState } from 'react';

interface StudentRow {
    id: number;
    name: string;
    email: string;
    whatsappPhone?: string | null;
    parentWhatsappPhone?: string | null;
    status: string;
    schoolId: number;
    school: string;
    role: string;
    requestedSchoolId?: number | null;
    requestedSchoolName?: string | null;
    schoolVerificationStatus?: string | null;
    manualSchoolName?: string | null;
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
    const [editing, setEditing] = useState<StudentRow | null>(null);
    const editForm = useForm({ name: '', email: '', school_id: '', status: 'active', role: 'student', password: '', password_confirmation: '', whatsapp_phone: student.whatsappPhone ?? '', parent_whatsapp_phone: student.parentWhatsappPhone ?? '' });
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

    const showEdit = (student: StudentRow) => {
        setEditing(student);
        editForm.setData({ name: student.name, email: student.email, school_id: student.schoolId ? String(student.schoolId) : '', status: student.status, role: 'student', password: '', password_confirmation: '', whatsapp_phone: '', parent_whatsapp_phone: '' });
        editForm.clearErrors();
    };

    const submitEdit = (event: FormEvent) => {
        event.preventDefault();
        editForm.transform((data) => ({ ...data, school_id: data.school_id || null }));
        if (!editing) return;
        editForm.patch(`/admin/students/${editing.id}`, { preserveScroll: true, onSuccess: () => setEditing(null) });
    };

    const removeStudent = (student: StudentRow) => {
        confirmDelete(`Hapus akun siswa "${student.name}"? Tindakan ini tidak dapat dibatalkan.`, () => {
            router.delete(`/admin/students/${student.id}`, { preserveScroll: true });
        });
    };

    const approveSchool = (student: StudentRow) => {
        if (!window.confirm(`Setujui pengajuan sekolah "${student.requestedSchoolName}" untuk ${student.name}?`)) return;
        router.post(`/admin/students/${student.id}/approve-school`, {}, { preserveScroll: true });
    };

    const resetFilters = () => {
        setTerm('');
        setSchoolId('all');
        setStatus('all');
        setReviewState('all');
    };

    return (
        <Shell title="Siswa" eyebrow={scopeLabel}>
            <Head title="Siswa" />
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-5">
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

                <div className="mt-5 space-y-4">
                    <MobileCardList
                        empty={
                            <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
                                Tidak ada siswa yang cocok dengan filter.
                            </div>
                        }
                    >
                        {visibleStudents.map((student) => (
                            <MobileDataCard
                                key={student.id}
                                title={student.name}
                                subtitle={student.email}
                                badge={<StatusBadge status={student.status} label={student.status} />}
                                meta={[
                                    { label: 'Sekolah', value: student.school },
                                    { label: 'Course', value: `${student.courses} course · ${student.enrollments} enrollment` },
                                    { label: 'Submission', value: `${student.pendingSubmissions} pending` },
                                    { label: 'Sertifikat', value: student.certificates },
                                    { label: 'Aktivitas', value: formatDate(student.lastActivityAt) },
                                ]}
                                actions={
                                    <div className="flex flex-wrap gap-2">
                                        <Button type="button" variant="outline" size="sm" onClick={() => showEdit(student)}><Pencil className="size-4" /> Edit</Button>
                                        {student.requestedSchoolId && <Button type="button" size="sm" onClick={() => approveSchool(student)}><CheckCircle2 className="size-4" /> Approve Sekolah</Button>}
                                        <Button type="button" variant="destructive" size="sm" onClick={() => removeStudent(student)}><Trash2 className="size-4" /> Hapus</Button>
                                        {student.reviewUrl ? (
                                        <Button asChild size="sm">
                                            <Link href={student.reviewUrl}>Buka Review</Link>
                                        </Button>
                                    ) : (
                                        <span className="text-xs font-semibold text-slate-400">Tidak ada review</span>
                                    )}
                                    </div>
                                }
                            >
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between text-xs font-bold text-blue-700">
                                        <span>Progress belajar</span>
                                        <span>{student.progress}%</span>
                                    </div>
                                    <ProgressBar value={student.progress} />
                                </div>
                            </MobileDataCard>
                        ))}
                    </MobileCardList>
                    <DesktopTable>
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
                                            {student.requestedSchoolName && <p className="mt-1 text-xs font-semibold text-amber-700">Pengajuan sekolah: {student.requestedSchoolName}</p>}
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
                                            <div className="flex justify-end gap-2">
                                                <Button type="button" variant="outline" size="sm" onClick={() => showEdit(student)}>Edit</Button>
                                                {student.requestedSchoolId && <Button type="button" size="sm" onClick={() => approveSchool(student)}>Approve Sekolah</Button>}
                                                <Button type="button" variant="destructive" size="sm" onClick={() => removeStudent(student)}>Hapus</Button>
                                                {student.reviewUrl && <Button asChild size="sm"><Link href={student.reviewUrl}>Review</Link></Button>}
                                            </div>
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
                    </DesktopTable>
                </div>
            </Panel>
            <Dialog open={Boolean(editing)} onOpenChange={(isOpen) => !isOpen && setEditing(null)}>
                <DialogContent className="sm:max-w-xl">
                    <DialogHeader><DialogTitle>Edit Akun Siswa</DialogTitle></DialogHeader>
                    <form onSubmit={submitEdit} className="space-y-4">
                        <div><FieldLabel htmlFor="student-name">Nama siswa</FieldLabel><Input id="student-name" value={editForm.data.name} onChange={(event) => editForm.setData('name', event.target.value)} required /><InputError message={editForm.errors.name} /></div>
                        <div><FieldLabel htmlFor="student-email">Email</FieldLabel><Input id="student-email" type="email" value={editForm.data.email} onChange={(event) => editForm.setData('email', event.target.value)} required /><InputError message={editForm.errors.email} /></div>
                        <div><FieldLabel htmlFor="student-school">Sekolah</FieldLabel><select id="student-school" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={editForm.data.school_id} onChange={(event) => editForm.setData('school_id', event.target.value)}><option value="">Tanpa sekolah</option>{schools.map((school) => <option key={school.id} value={String(school.id)}>{school.name}</option>)}</select><InputError message={editForm.errors.school_id} /></div>
                        <div><FieldLabel htmlFor="student-status">Status akun</FieldLabel><select id="student-status" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={editForm.data.status} onChange={(event) => editForm.setData('status', event.target.value)}><option value="active">Aktif</option><option value="inactive">Nonaktif</option></select><InputError message={editForm.errors.status} /></div>
                        <DialogFooter><Button type="button" variant="outline" onClick={() => setEditing(null)}>Batal</Button><Button type="submit" disabled={editForm.processing}>Simpan Perubahan</Button></DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
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
