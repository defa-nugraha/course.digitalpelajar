import { FieldLabel } from '@/components/form-field';
import InputError from '@/components/input-error';
import { Panel, Shell, StatCard } from '@/components/platform';
import { SearchableSelect } from '@/components/searchable-select';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { confirmDelete } from '@/lib/confirm-delete';
import { Head, router, useForm } from '@inertiajs/react';
import { Building2, Handshake, Pencil, Plus, School, Search, Trash2, Users } from 'lucide-react';
import { FormEvent, useState } from 'react';

interface SchoolRow {
    id: number;
    name: string;
    address?: string;
    pic?: string;
    logoPath?: string | null;
    logoUrl?: string | null;
    students: number;
    teachers: number;
    status: string;
    statusValue: string;
    partneredAt?: string | null;
    studentList: SchoolPerson[];
    teacherList: SchoolPerson[];
}

interface SchoolPerson {
    id: number;
    name: string;
    email: string;
    role: string;
    roleLabel: string;
    status: string;
}

interface SchoolsProps {
    stats: {
        totalSchools: number;
        activePartners: number;
        totalStudents: number;
        totalTeachers: number;
    };
    schools: SchoolRow[];
}

interface SchoolFormData {
    [key: string]: string | File | null;
    name: string;
    address: string;
    pic: string;
    logo_path: string;
    logo: File | null;
    status: string;
    partnered_at: string;
}

const emptySchool: SchoolFormData = { name: '', address: '', pic: '', logo_path: '', logo: null, status: 'active', partnered_at: '' };

export default function Schools({ stats, schools }: SchoolsProps) {
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<SchoolRow | null>(null);
    const [detail, setDetail] = useState<SchoolRow | null>(null);
    const [term, setTerm] = useState('');
    const form = useForm<SchoolFormData>(emptySchool);
    const visibleSchools = schools.filter((school) =>
        `${school.name} ${school.address ?? ''} ${school.pic ?? ''}`.toLowerCase().includes(term.toLowerCase()),
    );
    const statusOptions = [
        { value: 'active', label: 'Aktif' },
        { value: 'pending', label: 'Pending' },
        { value: 'inactive', label: 'Tidak Aktif' },
    ];

    const showCreate = () => {
        setEditing(null);
        form.setData({ ...emptySchool });
        form.clearErrors();
        setOpen(true);
    };

    const showEdit = (school: SchoolRow) => {
        setEditing(school);
        form.setData({
            name: school.name,
            address: school.address ?? '',
            pic: school.pic ?? '',
            logo_path: school.logoPath ?? '',
            logo: null,
            status: school.statusValue,
            partnered_at: school.partneredAt?.slice(0, 10) ?? '',
        });
        form.clearErrors();
        setOpen(true);
    };

    const submit = (event: FormEvent) => {
        event.preventDefault();
        const payload = { ...form.data };
        const options = { preserveScroll: true, onSuccess: () => setOpen(false) };
        form.transform(() => payload);

        if (editing) {
            form.transform(() => ({ ...payload, _method: 'patch' }));
            form.post(`/admin/schools/${editing.id}`, { ...options, forceFormData: true });
        } else {
            form.post('/admin/schools', { ...options, forceFormData: true });
        }
    };

    const remove = (school: SchoolRow) => {
        confirmDelete(`Hapus sekolah "${school.name}"?`, () => {
            router.delete(`/admin/schools/${school.id}`, { preserveScroll: true });
        });
    };

    return (
        <Shell
            title="Manajemen Sekolah"
            eyebrow="Admin Pusat"
            nav="admin"
            actions={
                <Button onClick={showCreate}>
                    <Plus className="size-4" />
                    Tambah
                </Button>
            }
        >
            <Head title="Manajemen Sekolah" />
            <div className="grid gap-5 md:grid-cols-4">
                <StatCard label="Total Schools" value={String(stats.totalSchools)} icon={Building2} />
                <StatCard label="Active Partners" value={String(stats.activePartners)} icon={Handshake} tone="purple" />
                <StatCard label="Total Students" value={String(stats.totalStudents)} icon={School} tone="amber" />
                <StatCard label="Total Teachers" value={String(stats.totalTeachers)} icon={Users} tone="slate" />
            </div>
            <Panel
                className="mt-6"
                title="Registered Institutions"
                action={
                    <label className="relative block w-full max-w-xs">
                        <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
                        <Input
                            className="bg-[#FAF8FF] pl-9"
                            placeholder="Search school name..."
                            value={term}
                            onChange={(event) => setTerm(event.target.value)}
                        />
                    </label>
                }
            >
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="text-xs tracking-wider text-slate-500 uppercase">
                            <tr>
                                <th className="py-3">Sekolah</th>
                                <th>Logo</th>
                                <th>PIC</th>
                                <th>Siswa</th>
                                <th>Guru</th>
                                <th>Status</th>
                                <th className="text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {visibleSchools.map((school) => (
                                <tr key={school.id}>
                                    <td className="py-4">
                                        <button
                                            type="button"
                                            onClick={() => setDetail(school)}
                                            className="text-left font-bold text-slate-950 hover:text-blue-700"
                                        >
                                            {school.name}
                                        </button>
                                        <p className="mt-1 text-xs text-slate-500">{school.address || 'Alamat belum diisi'}</p>
                                    </td>
                                    <td>
                                        {school.logoUrl ? (
                                            <img src={school.logoUrl} alt={`Logo ${school.name}`} className="h-8 w-24 object-contain" />
                                        ) : (
                                            <span className="inline-flex size-9 items-center justify-center rounded-lg bg-blue-50 text-xs font-bold text-blue-700">
                                                {initials(school.name)}
                                            </span>
                                        )}
                                    </td>
                                    <td>{school.pic || '-'}</td>
                                    <td>{school.students}</td>
                                    <td>{school.teachers}</td>
                                    <td>
                                        <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700">
                                            {school.status}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="flex justify-end gap-1">
                                            <Button variant="ghost" size="icon" aria-label="Edit sekolah" onClick={() => showEdit(school)}>
                                                <Pencil className="size-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" aria-label="Hapus sekolah" onClick={() => remove(school)}>
                                                <Trash2 className="size-4 text-red-600" />
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {visibleSchools.length === 0 && <p className="py-8 text-center text-sm text-slate-500">Tidak ada sekolah yang cocok.</p>}
                </div>
                <InputError message={(form.errors as Record<string, string>).school} className="mt-4" />
            </Panel>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editing ? 'Edit Sekolah' : 'Tambah Sekolah'}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={submit} className="space-y-4">
                        <Field label="Nama" error={form.errors.name} required>
                            <Input value={form.data.name} onChange={(event) => form.setData('name', event.target.value)} />
                        </Field>
                        <Field label="Alamat" error={form.errors.address}>
                            <Input value={form.data.address} onChange={(event) => form.setData('address', event.target.value)} />
                        </Field>
                        <Field label="Penanggung Jawab" error={form.errors.pic}>
                            <Input value={form.data.pic} onChange={(event) => form.setData('pic', event.target.value)} />
                        </Field>
                        <Field label="Upload logo sekolah" error={form.errors.logo}>
                            <Input
                                type="file"
                                accept="image/png,image/jpeg,image/webp"
                                onChange={(event) => form.setData('logo', event.target.files?.[0] ?? null)}
                            />
                            <p className="text-xs leading-5 text-slate-500">
                                Gunakan JPG, PNG, atau WEBP maksimal 2MB. Path yang disimpan hanya seperti school-logos/nama-file.png.
                            </p>
                            {form.data.logo && (
                                <p className="rounded-lg bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700">
                                    File baru: {form.data.logo.name}
                                </p>
                            )}
                            {editing?.logoUrl && (
                                <div className="flex h-20 items-center justify-center rounded-xl border border-slate-200 bg-slate-50">
                                    <img src={editing.logoUrl} alt={`Logo ${form.data.name}`} className="max-h-14 max-w-40 object-contain" />
                                </div>
                            )}
                        </Field>
                        <Field label="Status" error={form.errors.status} required>
                            <SearchableSelect value={form.data.status} onChange={(value) => form.setData('status', value)} options={statusOptions} />
                        </Field>
                        <Field label="Tanggal mulai kemitraan" error={form.errors.partnered_at}>
                            <Input
                                type="date"
                                value={form.data.partnered_at}
                                onChange={(event) => form.setData('partnered_at', event.target.value)}
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

            <Dialog open={Boolean(detail)} onOpenChange={(value) => !value && setDetail(null)}>
                <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Detail {detail?.name}</DialogTitle>
                    </DialogHeader>
                    {detail && (
                        <div className="space-y-5">
                            <div className="grid gap-4 rounded-2xl border border-blue-100 bg-blue-50 p-4 md:grid-cols-[120px_1fr]">
                                <div className="flex h-24 items-center justify-center rounded-xl bg-white">
                                    {detail.logoUrl ? (
                                        <img src={detail.logoUrl} alt={`Logo ${detail.name}`} className="max-h-16 max-w-28 object-contain" />
                                    ) : (
                                        <span className="text-2xl font-extrabold text-blue-700">{initials(detail.name)}</span>
                                    )}
                                </div>
                                <div>
                                    <p className="text-sm font-bold tracking-wide text-blue-700 uppercase">Informasi Sekolah</p>
                                    <h3 className="mt-1 text-2xl font-extrabold text-slate-950">{detail.name}</h3>
                                    <p className="mt-2 text-sm text-slate-600">{detail.address || 'Alamat belum diisi.'}</p>
                                    <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold">
                                        <span className="rounded-full bg-white px-3 py-1 text-slate-700">PIC: {detail.pic || '-'}</span>
                                        <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">{detail.status}</span>
                                        <span className="rounded-full bg-white px-3 py-1 text-slate-700">{detail.students} siswa</span>
                                        <span className="rounded-full bg-white px-3 py-1 text-slate-700">{detail.teachers} guru</span>
                                    </div>
                                </div>
                            </div>

                            <div className="grid gap-5 lg:grid-cols-2">
                                <PeopleTable title="Data Siswa" people={detail.studentList} empty="Belum ada siswa pada sekolah ini." />
                                <PeopleTable title="Data Guru" people={detail.teacherList} empty="Belum ada guru pada sekolah ini." />
                            </div>
                        </div>
                    )}
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

function initials(name: string) {
    return name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join('');
}

function PeopleTable({ title, people, empty }: { title: string; people: SchoolPerson[]; empty: string }) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
                <h4 className="font-bold text-slate-950">{title}</h4>
                <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600">{people.length} user</span>
            </div>
            <div className="max-h-80 overflow-y-auto">
                <table className="w-full text-left text-sm">
                    <thead className="text-xs tracking-wide text-slate-500 uppercase">
                        <tr>
                            <th className="py-2">Nama</th>
                            <th>Email</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {people.map((person) => (
                            <tr key={person.id}>
                                <td className="py-3">
                                    <p className="font-semibold text-slate-950">{person.name}</p>
                                    <p className="text-xs text-slate-500">{person.roleLabel}</p>
                                </td>
                                <td className="max-w-48 truncate">{person.email}</td>
                                <td>
                                    <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600">{person.status}</span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {people.length === 0 && <p className="py-8 text-center text-sm text-slate-500">{empty}</p>}
            </div>
        </div>
    );
}
