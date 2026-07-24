import { FieldLabel } from '@/components/form-field';
import InputError from '@/components/input-error';
import { Panel, Shell } from '@/components/platform';
import { SearchableSelect } from '@/components/searchable-select';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { confirmDelete } from '@/lib/confirm-delete';
import { Head, router, useForm } from '@inertiajs/react';
import { Download, Pencil, Search, Trash2, Upload, UserPlus } from 'lucide-react';
import { FormEvent, useState } from 'react';

interface UserRow {
    id: number;
    schoolId?: number | null;
    name: string;
    email: string;
    role: string;
    roleLabel: string;
    school: string;
    schoolRequest?: string | null;
    schoolRequestStatus?: string | null;
    status: string;
}

interface SchoolOption {
    id: number;
    name: string;
}

const emptyUser = {
    school_id: '',
    name: '',
    email: '',
    role: 'student',
    status: 'active',
    password: '',
    password_confirmation: '',
};

export default function UsersPage({ users, schools }: { users: UserRow[]; schools: SchoolOption[] }) {
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<UserRow | null>(null);
    const [importOpen, setImportOpen] = useState(false);
    const [term, setTerm] = useState('');
    const [role, setRole] = useState('all');
    const form = useForm(emptyUser);
    const importForm = useForm({ file: null as File | null });
    const visibleUsers = users.filter(
        (user) =>
            (role === 'all' || user.role === role) &&
            `${user.name} ${user.email} ${user.school} ${user.schoolRequest ?? ''}`.toLowerCase().includes(term.toLowerCase()),
    );
    const roleOptions = [
        { value: 'all', label: 'All Roles' },
        { value: 'admin', label: 'Admin' },
        { value: 'internal_instructor', label: 'Pengajar Internal' },
        { value: 'school_teacher', label: 'Guru Sekolah' },
        { value: 'student', label: 'Siswa' },
    ];
    const userRoleOptions = roleOptions.filter((item) => item.value !== 'all');
    const statusOptions = [
        { value: 'active', label: 'Aktif' },
        { value: 'inactive', label: 'Tidak Aktif' },
    ];
    const schoolOptions = [{ value: '', label: 'Tanpa sekolah' }, ...schools.map((school) => ({ value: String(school.id), label: school.name }))];

    const showCreate = () => {
        setEditing(null);
        form.setData(emptyUser);
        form.clearErrors();
        setOpen(true);
    };

    const showEdit = (user: UserRow) => {
        setEditing(user);
        form.setData({
            ...emptyUser,
            school_id: user.schoolId ? String(user.schoolId) : '',
            name: user.name,
            email: user.email,
            role: user.role,
            status: user.status,
        });
        form.clearErrors();
        setOpen(true);
    };

    const submit = (event: FormEvent) => {
        event.preventDefault();
        form.transform((data) => ({ ...data, school_id: data.school_id || null }));
        const options = { preserveScroll: true, onSuccess: () => setOpen(false) };

        if (editing) {
            form.patch(`/admin/users/${editing.id}`, options);
        } else {
            form.post('/admin/users', options);
        }
    };

    const remove = (user: UserRow) => {
        confirmDelete(`Hapus pengguna "${user.name}"?`, () => {
            router.delete(`/admin/users/${user.id}`, { preserveScroll: true });
        });
    };

    const submitImport = (event: FormEvent) => {
        event.preventDefault();
        importForm.post('/admin/users/import', {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                setImportOpen(false);
                importForm.reset();
            },
        });
    };

    return (
        <Shell
            title="User Management"
            eyebrow="Manajemen User"
            nav="admin"
            actions={
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setImportOpen(true)}>
                        <Upload className="size-4" />
                        Import
                    </Button>
                    <Button onClick={showCreate}>
                        <UserPlus className="size-4" />
                        Tambah User
                    </Button>
                </div>
            }
        >
            <Head title="Manajemen User" />
            <Panel
                title="Siswa, guru, pengajar internal, dan administrator"
                action={
                    <div className="flex flex-col gap-2 sm:flex-row">
                        <label className="relative block w-full sm:w-64">
                            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
                            <Input
                                className="bg-[#FAF8FF] pl-9"
                                placeholder="Search by name or email..."
                                value={term}
                                onChange={(event) => setTerm(event.target.value)}
                            />
                        </label>
                        <SearchableSelect value={role} onChange={setRole} options={roleOptions} placeholder="Filter role" className="sm:w-56" />
                    </div>
                }
            >
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="text-xs tracking-wider text-slate-500 uppercase">
                            <tr>
                                <th className="py-3">Nama</th>
                                <th>Email</th>
                                <th>Role</th>
                                <th>Sekolah</th>
                                <th>Pengajuan Sekolah</th>
                                <th>Status</th>
                                <th className="text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {visibleUsers.map((user) => (
                                <tr key={user.id}>
                                    <td className="py-4 font-bold">{user.name}</td>
                                    <td>{user.email}</td>
                                    <td>{user.roleLabel}</td>
                                    <td>{user.school}</td>
                                    <td>
                                        {user.schoolRequest ? (
                                            <div>
                                                <p className="font-semibold text-slate-700">{user.schoolRequest}</p>
                                                <p className="text-xs text-amber-700">{user.schoolRequestStatus ?? 'pending'}</p>
                                            </div>
                                        ) : (
                                            '-'
                                        )}
                                    </td>
                                    <td className="capitalize">{user.status}</td>
                                    <td>
                                        <div className="flex justify-end gap-1">
                                            <Button variant="ghost" size="icon" aria-label="Edit user" onClick={() => showEdit(user)}>
                                                <Pencil className="size-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" aria-label="Hapus user" onClick={() => remove(user)}>
                                                <Trash2 className="size-4 text-red-600" />
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {visibleUsers.length === 0 && <p className="py-8 text-center text-sm text-slate-500">Tidak ada pengguna yang cocok.</p>}
                </div>
                <InputError message={(form.errors as Record<string, string>).user} className="mt-4" />
            </Panel>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{editing ? 'Edit Pengguna' : 'Tambah Pengguna'}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={submit} className="space-y-4">
                        <Field label="Nama" error={form.errors.name} required>
                            <Input value={form.data.name} onChange={(event) => form.setData('name', event.target.value)} />
                        </Field>
                        <Field label="Email" error={form.errors.email} required>
                            <Input type="email" value={form.data.email} onChange={(event) => form.setData('email', event.target.value)} />
                        </Field>
                        <Field label="Sekolah" error={form.errors.school_id}>
                            <SearchableSelect
                                value={form.data.school_id}
                                onChange={(value) => form.setData('school_id', value)}
                                options={schoolOptions}
                                placeholder="Pilih sekolah"
                                searchPlaceholder="Cari sekolah..."
                            />
                        </Field>
                        <Field label="Role" error={form.errors.role} required>
                            <SearchableSelect value={form.data.role} onChange={(value) => form.setData('role', value)} options={userRoleOptions} />
                        </Field>
                        <Field label="Status" error={form.errors.status} required>
                            <SearchableSelect value={form.data.status} onChange={(value) => form.setData('status', value)} options={statusOptions} />
                        </Field>
                        <Field label={editing ? 'Password baru (opsional)' : 'Password'} error={form.errors.password} required={!editing}>
                            <Input type="password" value={form.data.password} onChange={(event) => form.setData('password', event.target.value)} />
                        </Field>
                        <Field label="Konfirmasi password" error={form.errors.password_confirmation} required={!editing}>
                            <Input
                                type="password"
                                value={form.data.password_confirmation}
                                onChange={(event) => form.setData('password_confirmation', event.target.value)}
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

            <Dialog open={importOpen} onOpenChange={setImportOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Import Pengguna CSV/Excel</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={submitImport} className="space-y-4">
                        <p className="text-sm leading-6 text-slate-600">
                            Header: name, email, role, school, status, password. Import bersifat atomik: seluruh file dibatalkan jika satu baris tidak
                            valid.
                        </p>
                        <Button asChild type="button" variant="outline">
                            <a href="/admin/users/import/template">
                                <Download className="size-4" />
                                Unduh Template CSV
                            </a>
                        </Button>
                        <Field label="File CSV/XLS/XLSX" error={importForm.errors.file} required>
                            <Input
                                type="file"
                                accept=".csv,.xls,.xlsx"
                                onChange={(event) => importForm.setData('file', event.target.files?.[0] ?? null)}
                            />
                        </Field>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setImportOpen(false)}>
                                Batal
                            </Button>
                            <Button type="submit" disabled={importForm.processing || !importForm.data.file}>
                                Import
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
