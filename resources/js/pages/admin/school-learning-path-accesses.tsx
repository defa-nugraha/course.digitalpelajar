import { FieldLabel } from '@/components/form-field';
import InputError from '@/components/input-error';
import { Panel, Shell, StatCard } from '@/components/platform';
import { SearchableSelect } from '@/components/searchable-select';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { confirmDelete } from '@/lib/confirm-delete';
import { Head, router, useForm } from '@inertiajs/react';
import { BookOpen, Building2, CheckCircle2, Pencil, Plus, Route, Search, Trash2, Users } from 'lucide-react';
import { FormEvent, useMemo, useState } from 'react';

interface AccessRow {
    id: number;
    schoolId: number;
    learningPathId: number;
    school: string;
    learningPath: string;
    status: string;
    startsAt?: string | null;
    expiresAt?: string | null;
    notes?: string | null;
    courseCount: number;
    studentCount: number;
    enrollmentCount: number;
    isCurrentlyActive: boolean;
}

interface Option {
    id: number;
    name?: string;
    title?: string;
    level?: string;
    courseCount?: number;
}

interface Props {
    accesses: AccessRow[];
    schools: Option[];
    learningPaths: Option[];
    stats: {
        total: number;
        active: number;
        schools: number;
        coursesOpened: number;
    };
}

interface AccessFormData {
    [key: string]: string;
    school_id: string;
    learning_path_id: string;
    status: string;
    starts_at: string;
    expires_at: string;
    notes: string;
}

const emptyForm: AccessFormData = {
    school_id: '',
    learning_path_id: '',
    status: 'active',
    starts_at: '',
    expires_at: '',
    notes: '',
};

export default function SchoolLearningPathAccesses({ accesses, schools, learningPaths, stats }: Props) {
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<AccessRow | null>(null);
    const [term, setTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const form = useForm<AccessFormData>(emptyForm);

    const schoolOptions = schools.map((school) => ({ value: String(school.id), label: school.name ?? `Sekolah #${school.id}` }));
    const learningPathOptions = learningPaths.map((path) => ({
        value: String(path.id),
        label: `${path.title ?? `Learning Path #${path.id}`} (${path.courseCount ?? 0} course)`,
    }));
    const statusOptions = [
        { value: 'active', label: 'Aktif' },
        { value: 'inactive', label: 'Nonaktif' },
    ];
    const filterStatusOptions = [{ value: 'all', label: 'Semua status' }, ...statusOptions];

    const visibleAccesses = useMemo(() => {
        const normalizedTerm = term.toLowerCase();

        return accesses.filter((access) => {
            const matchesTerm = `${access.school} ${access.learningPath} ${access.notes ?? ''}`.toLowerCase().includes(normalizedTerm);
            const matchesStatus =
                statusFilter === 'all' ||
                (statusFilter === 'active' ? access.isCurrentlyActive : !access.isCurrentlyActive || access.status === 'inactive');

            return matchesTerm && matchesStatus;
        });
    }, [accesses, statusFilter, term]);

    const showCreate = () => {
        setEditing(null);
        form.setData({ ...emptyForm });
        form.clearErrors();
        setOpen(true);
    };

    const showEdit = (access: AccessRow) => {
        setEditing(access);
        form.setData({
            school_id: String(access.schoolId),
            learning_path_id: String(access.learningPathId),
            status: access.status,
            starts_at: access.startsAt?.slice(0, 10) ?? '',
            expires_at: access.expiresAt?.slice(0, 10) ?? '',
            notes: access.notes ?? '',
        });
        form.clearErrors();
        setOpen(true);
    };

    const submit = (event: FormEvent) => {
        event.preventDefault();
        const payload = {
            ...form.data,
            starts_at: form.data.starts_at || '',
            expires_at: form.data.expires_at || '',
        };
        const options = { preserveScroll: true, onSuccess: () => setOpen(false) };

        form.transform(() => payload);

        if (editing) {
            form.patch(`/admin/school-learning-path-accesses/${editing.id}`, options);
        } else {
            form.post('/admin/school-learning-path-accesses', options);
        }
    };

    const remove = (access: AccessRow) => {
        confirmDelete(`Hapus akses "${access.learningPath}" untuk ${access.school}?`, () => {
            router.delete(`/admin/school-learning-path-accesses/${access.id}`, { preserveScroll: true });
        });
    };

    return (
        <Shell
            title="Akses Learning Path Sekolah"
            eyebrow="Admin Pusat"
            nav="admin"
            actions={
                <Button onClick={showCreate}>
                    <Plus className="size-4" />
                    Beri Akses
                </Button>
            }
        >
            <Head title="Akses Learning Path Sekolah" />
            <div className="grid gap-5 md:grid-cols-4">
                <StatCard label="Total Akses" value={String(stats.total)} icon={Route} />
                <StatCard label="Aktif Saat Ini" value={String(stats.active)} icon={CheckCircle2} tone="purple" />
                <StatCard label="Sekolah Terakses" value={String(stats.schools)} icon={Building2} tone="amber" />
                <StatCard label="Course Terbuka" value={String(stats.coursesOpened)} icon={BookOpen} tone="slate" />
            </div>

            <Panel
                className="mt-6"
                title="Daftar akses sekolah"
                action={
                    <div className="flex flex-col gap-2 sm:flex-row">
                        <SearchableSelect value={statusFilter} onChange={setStatusFilter} options={filterStatusOptions} placeholder="Filter status" />
                        <label className="relative block w-full sm:w-72">
                            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
                            <Input
                                className="bg-[#FAF8FF] pl-9"
                                placeholder="Cari sekolah / learning path..."
                                value={term}
                                onChange={(event) => setTerm(event.target.value)}
                            />
                        </label>
                    </div>
                }
            >
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="text-xs tracking-wider text-slate-500 uppercase">
                            <tr>
                                <th className="py-3">Sekolah</th>
                                <th>Learning Path</th>
                                <th>Periode</th>
                                <th>Impact</th>
                                <th>Status</th>
                                <th className="text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {visibleAccesses.map((access) => (
                                <tr key={access.id}>
                                    <td className="py-4">
                                        <p className="font-bold text-slate-950">{access.school}</p>
                                        <p className="mt-1 text-xs text-slate-500">{access.studentCount} siswa aktif</p>
                                    </td>
                                    <td>
                                        <p className="font-semibold text-slate-900">{access.learningPath}</p>
                                        <p className="mt-1 text-xs text-slate-500">{access.courseCount} course otomatis bisa diakses</p>
                                    </td>
                                    <td>
                                        <p>{access.startsAt ? dateLabel(access.startsAt) : 'Mulai sekarang'}</p>
                                        <p className="mt-1 text-xs text-slate-500">
                                            s/d {access.expiresAt ? dateLabel(access.expiresAt) : 'tanpa batas'}
                                        </p>
                                    </td>
                                    <td>
                                        <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                                            <Users className="size-4 text-blue-700" />
                                            {access.enrollmentCount} enrollment
                                        </div>
                                    </td>
                                    <td>
                                        <span
                                            className={`rounded-full px-2 py-1 text-xs font-bold ${
                                                access.isCurrentlyActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
                                            }`}
                                        >
                                            {access.isCurrentlyActive ? 'Aktif' : access.status === 'active' ? 'Terjadwal/Kedaluwarsa' : 'Nonaktif'}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="flex justify-end gap-1">
                                            <Button variant="ghost" size="icon" aria-label="Edit akses" onClick={() => showEdit(access)}>
                                                <Pencil className="size-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" aria-label="Hapus akses" onClick={() => remove(access)}>
                                                <Trash2 className="size-4 text-red-600" />
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {visibleAccesses.length === 0 && <p className="py-8 text-center text-sm text-slate-500">Belum ada akses yang cocok.</p>}
                </div>
            </Panel>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{editing ? 'Edit Akses Learning Path' : 'Beri Akses Learning Path'}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={submit} className="space-y-4">
                        <Field label="Sekolah" error={form.errors.school_id} required>
                            <SearchableSelect
                                value={form.data.school_id}
                                onChange={(value) => form.setData('school_id', value)}
                                options={schoolOptions}
                                placeholder="Pilih sekolah"
                            />
                        </Field>
                        <Field label="Learning path" error={form.errors.learning_path_id} required>
                            <SearchableSelect
                                value={form.data.learning_path_id}
                                onChange={(value) => form.setData('learning_path_id', value)}
                                options={learningPathOptions}
                                placeholder="Pilih learning path"
                            />
                        </Field>
                        <div className="grid gap-4 md:grid-cols-3">
                            <Field label="Status" error={form.errors.status} required>
                                <SearchableSelect
                                    value={form.data.status}
                                    onChange={(value) => form.setData('status', value)}
                                    options={statusOptions}
                                    placeholder="Status"
                                />
                            </Field>
                            <Field label="Mulai berlaku" error={form.errors.starts_at}>
                                <Input type="date" value={form.data.starts_at} onChange={(event) => form.setData('starts_at', event.target.value)} />
                            </Field>
                            <Field label="Berakhir" error={form.errors.expires_at}>
                                <Input
                                    type="date"
                                    value={form.data.expires_at}
                                    onChange={(event) => form.setData('expires_at', event.target.value)}
                                />
                            </Field>
                        </div>
                        <Field label="Catatan internal" error={form.errors.notes}>
                            <textarea
                                className="min-h-24 w-full rounded-md border border-slate-200 bg-white p-3 text-sm"
                                value={form.data.notes}
                                onChange={(event) => form.setData('notes', event.target.value)}
                                placeholder="Contoh: paket kerja sama semester ganjil / akses trial sekolah."
                            />
                        </Field>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                                Batal
                            </Button>
                            <Button type="submit" disabled={form.processing}>
                                Simpan
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </Shell>
    );
}

function Field({ label, error, children, required = false }: { label: string; error?: string; children: React.ReactNode; required?: boolean }) {
    return (
        <div className="space-y-2">
            <FieldLabel required={required}>{label}</FieldLabel>
            {children}
            <InputError message={error} />
        </div>
    );
}

function dateLabel(value: string) {
    return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(new Date(value));
}
