import BrandLogo from '@/components/brand-logo';
import { FieldLabel } from '@/components/form-field';
import InputError from '@/components/input-error';
import { Panel, Shell } from '@/components/platform';
import { DesktopTable, MobileCardList, MobileDataCard, StatusBadge } from '@/components/responsive-data';
import { SearchableSelect } from '@/components/searchable-select';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { confirmDelete } from '@/lib/confirm-delete';
import { Head, Link, router, useForm } from '@inertiajs/react';
import {
    Award,
    BookOpen,
    Download,
    History,
    Pencil,
    Plus,
    QrCode,
    RotateCcw,
    School,
    Search,
    ShieldX,
    Trash2,
    UserRound,
    type LucideIcon,
} from 'lucide-react';
import { FormEvent, useState } from 'react';

interface Certificate {
    id: number;
    no: string;
    status: string;
    issueDate: string;
    student: string;
    title: string;
    revocationReason?: string | null;
}

interface CertificateUser {
    id: number;
    no: string;
    status: string;
    statusValue: string;
    issueDate: string;
    userId: number;
    student: string;
    email: string;
    schoolId: number;
    school: string;
    courseId: number;
    course: string;
    progress: number;
    revocationReason?: string | null;
}

interface CertificateFilters {
    schools: { id: number; name: string }[];
    courses: { id: number; title: string }[];
    statuses: string[];
}

interface EligibleEnrollment {
    id: number;
    student: string;
    course: string;
}

interface Template {
    id: number;
    name: string;
    status: string;
    layout: {
        title?: string;
        primary_color?: string;
        accent_color?: string;
    };
}

const blankTemplate = {
    name: '',
    title: 'Certificate of Completion',
    primary_color: '#1C7DE8',
    accent_color: '#FED635',
    status: 'draft',
};

export default function AdminCertificates({
    templates,
    certificates,
    certificateUsers,
    certificateFilters,
    eligibleEnrollments,
    canManageTemplates,
}: {
    templates: Template[];
    certificates: Certificate[];
    certificateUsers: CertificateUser[];
    certificateFilters: CertificateFilters;
    eligibleEnrollments: EligibleEnrollment[];
    canManageTemplates: boolean;
}) {
    const active = templates.find((item) => item.status === 'published') ?? templates[0];
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<Template | null>(null);
    const [issueOpen, setIssueOpen] = useState(false);
    const [revoking, setRevoking] = useState<Certificate | null>(null);
    const [userSearch, setUserSearch] = useState('');
    const [schoolFilter, setSchoolFilter] = useState('');
    const [courseFilter, setCourseFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const form = useForm(blankTemplate);
    const issueForm = useForm({ enrollment_id: '' });
    const revokeForm = useForm({ reason: '' });
    const visibleCertificateUsers = certificateUsers.filter((item) => {
        const matchesSearch = `${item.student} ${item.email} ${item.no} ${item.school} ${item.course}`
            .toLowerCase()
            .includes(userSearch.toLowerCase());
        const matchesSchool = !schoolFilter || String(item.schoolId) === schoolFilter;
        const matchesCourse = !courseFilter || String(item.courseId) === courseFilter;
        const matchesStatus = !statusFilter || item.statusValue === statusFilter;

        return matchesSearch && matchesSchool && matchesCourse && matchesStatus;
    });

    const showEditor = (template?: Template) => {
        setEditing(template ?? null);
        form.setData(
            template
                ? {
                      name: template.name,
                      title: template.layout.title ?? 'Certificate of Completion',
                      primary_color: template.layout.primary_color ?? '#1C7DE8',
                      accent_color: template.layout.accent_color ?? '#FED635',
                      status: template.status,
                  }
                : blankTemplate,
        );
        form.clearErrors();
        setOpen(true);
    };

    const submit = (event: FormEvent) => {
        event.preventDefault();
        const options = { preserveScroll: true, onSuccess: () => setOpen(false) };
        if (editing) {
            form.patch(`/admin/certificate-templates/${editing.id}`, options);
        } else {
            form.post('/admin/certificate-templates', options);
        }
    };

    const remove = (template: Template) => {
        confirmDelete(`Hapus template "${template.name}"?`, () => {
            router.delete(`/admin/certificate-templates/${template.id}`, { preserveScroll: true });
        });
    };

    const issue = (event: FormEvent) => {
        event.preventDefault();
        issueForm.post('/admin/certificates/issue', {
            preserveScroll: true,
            onSuccess: () => {
                setIssueOpen(false);
                issueForm.reset();
            },
        });
    };

    const revoke = (event: FormEvent) => {
        event.preventDefault();
        if (!revoking) return;
        revokeForm.patch(`/admin/certificates/${revoking.id}/revoke`, {
            preserveScroll: true,
            onSuccess: () => {
                setRevoking(null);
                revokeForm.reset();
            },
        });
    };

    return (
        <Shell
            title="Certificate Management"
            eyebrow={canManageTemplates ? 'Admin Pusat' : 'Pengajar Internal'}
            actions={
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setIssueOpen(true)} disabled={eligibleEnrollments.length === 0}>
                        <Plus className="size-4" />
                        Terbitkan
                    </Button>
                    {canManageTemplates && (
                        <Button onClick={() => showEditor()}>
                            <Plus className="size-4" />
                            Template
                        </Button>
                    )}
                </div>
            }
        >
            <Head title="Manajemen Sertifikat" />
            <div id="pengaturan-sertifikat" className="grid scroll-mt-24 gap-6 lg:grid-cols-[1fr_360px]">
                <Panel title="Template Aktif">
                    <div
                        className="rounded-lg border-4 bg-[#fffdf4] p-8 text-center"
                        style={{ borderColor: active?.layout.primary_color ?? '#1C7DE8' }}
                    >
                        <p className="text-sm font-bold tracking-[0.25em] uppercase" style={{ color: active?.layout.primary_color ?? '#1C7DE8' }}>
                            {active?.name ?? 'Belum ada template'}
                        </p>
                        <p className="mt-8 text-slate-500">Diberikan kepada</p>
                        <h2 className="mt-2 text-4xl font-extrabold">[Nama Siswa]</h2>
                        <p className="mx-auto mt-5 max-w-xl text-slate-600">atas keberhasilan menyelesaikan</p>
                        <h3 className="mt-2 text-2xl font-bold">{active?.layout.title ?? 'Certificate of Completion'}</h3>
                        <div className="mt-10 flex items-end justify-between">
                            <p className="text-sm font-bold">[Tanggal Terbit]</p>
                            <QrCode className="size-20" />
                            <BrandLogo className="h-10" />
                        </div>
                    </div>
                </Panel>
                <div className="space-y-6">
                    <Panel title="Daftar Template">
                        {templates.map((template) => (
                            <div key={template.id} className="mb-3 flex items-center gap-3 rounded-lg border border-slate-200 p-3">
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-bold">{template.name}</p>
                                    <p className="text-xs text-slate-500 capitalize">{template.status}</p>
                                </div>
                                {canManageTemplates && (
                                    <>
                                        <Button variant="ghost" size="icon" aria-label="Edit template" onClick={() => showEditor(template)}>
                                            <Pencil className="size-4" />
                                        </Button>
                                        <Button variant="ghost" size="icon" aria-label="Hapus template" onClick={() => remove(template)}>
                                            <Trash2 className="size-4 text-red-600" />
                                        </Button>
                                    </>
                                )}
                            </div>
                        ))}
                        {templates.length === 0 && <p className="text-sm text-slate-500">Belum ada template sertifikat.</p>}
                    </Panel>
                    <Panel title="Sertifikat Terbit">
                        {certificates.map((item) => (
                            <div key={item.id} className="mb-3 flex items-center gap-3 rounded-lg border border-slate-200 p-3">
                                <History className="size-4 text-slate-500" />
                                <Link href={`/certificates/${item.id}`} className="min-w-0 flex-1">
                                    <p className="text-sm font-bold">
                                        {item.student} - {item.title}
                                    </p>
                                    <p className="text-xs text-slate-500">
                                        {item.no} - {item.status}
                                    </p>
                                </Link>
                                <Button asChild variant="ghost" size="icon">
                                    <a href={`/certificates/${item.id}/download`} aria-label="Unduh PDF">
                                        <Download className="size-4" />
                                    </a>
                                </Button>
                                {item.status.toLowerCase() === 'revoked' ? (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        aria-label="Aktifkan kembali"
                                        onClick={() => router.patch(`/admin/certificates/${item.id}/reinstate`, {}, { preserveScroll: true })}
                                    >
                                        <RotateCcw className="size-4 text-emerald-700" />
                                    </Button>
                                ) : (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        aria-label="Cabut sertifikat"
                                        onClick={() => {
                                            setRevoking(item);
                                            revokeForm.setData('reason', '');
                                            revokeForm.clearErrors();
                                        }}
                                    >
                                        <ShieldX className="size-4 text-red-600" />
                                    </Button>
                                )}
                            </div>
                        ))}
                        {certificates.length === 0 && <p className="text-sm text-slate-500">Belum ada sertifikat pada scope Anda.</p>}
                    </Panel>
                </div>
            </div>

            <div id="data-sertifikat" className="scroll-mt-24">
                <Panel
                    className="mt-6"
                    title="Pemilik Sertifikat"
                    action={
                        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                            {visibleCertificateUsers.length} dari {certificateUsers.length} sertifikat
                        </span>
                    }
                >
                    <div className="mb-5 grid gap-3 lg:grid-cols-[1fr_220px_220px_180px]">
                        <label className="relative block">
                            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
                            <Input
                                className="pl-9"
                                placeholder="Cari nama, email, nomor sertifikat..."
                                value={userSearch}
                                onChange={(event) => setUserSearch(event.target.value)}
                            />
                        </label>
                        <SearchableSelect
                            value={schoolFilter}
                            onChange={setSchoolFilter}
                            options={[
                                { value: '', label: 'Semua sekolah' },
                                ...certificateFilters.schools.map((school) => ({ value: String(school.id), label: school.name })),
                            ]}
                            placeholder="Sekolah"
                        />
                        <SearchableSelect
                            value={courseFilter}
                            onChange={setCourseFilter}
                            options={[
                                { value: '', label: 'Semua course' },
                                ...certificateFilters.courses.map((course) => ({ value: String(course.id), label: course.title })),
                            ]}
                            placeholder="Course"
                        />
                        <SearchableSelect
                            value={statusFilter}
                            onChange={setStatusFilter}
                            options={[
                                { value: '', label: 'Semua status' },
                                ...certificateFilters.statuses.map((status) => ({ value: status, label: statusLabel(status) })),
                            ]}
                            placeholder="Status"
                        />
                    </div>

                    <div className="grid gap-4 md:grid-cols-3">
                        <SummaryTile
                            icon={UserRound}
                            label="User tersertifikasi"
                            value={String(new Set(visibleCertificateUsers.map((item) => item.userId)).size)}
                        />
                        <SummaryTile
                            icon={School}
                            label="Sekolah"
                            value={String(new Set(visibleCertificateUsers.map((item) => item.schoolId)).size)}
                        />
                        <SummaryTile
                            icon={BookOpen}
                            label="Course"
                            value={String(new Set(visibleCertificateUsers.map((item) => item.courseId)).size)}
                        />
                    </div>

                    <div className="mt-5 space-y-4">
                        <MobileCardList
                            empty={
                                <p className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
                                    Tidak ada pemilik sertifikat yang cocok dengan filter.
                                </p>
                            }
                        >
                            {visibleCertificateUsers.map((item) => (
                                <MobileDataCard
                                    key={item.id}
                                    title={item.student}
                                    subtitle={item.email}
                                    badge={<StatusBadge status={item.statusValue} label={item.status} />}
                                    meta={[
                                        { label: 'Sekolah', value: item.school },
                                        { label: 'Course', value: `${item.course} · Progress ${item.progress}%` },
                                        { label: 'No.', value: <span className="font-mono text-xs">{item.no}</span> },
                                        { label: 'Tanggal', value: item.issueDate },
                                    ]}
                                    actions={
                                        <>
                                            <Button asChild variant="outline" size="sm">
                                                <Link href={`/certificates/${item.id}`}>
                                                    <Award className="size-4" />
                                                    Lihat
                                                </Link>
                                            </Button>
                                            <Button asChild variant="outline" size="sm">
                                                <a href={`/certificates/${item.id}/download`}>
                                                    <Download className="size-4" />
                                                    PDF
                                                </a>
                                            </Button>
                                        </>
                                    }
                                />
                            ))}
                        </MobileCardList>
                        <DesktopTable>
                            <table className="w-full text-left text-sm">
                                <thead className="text-xs tracking-wide text-slate-500 uppercase">
                                    <tr>
                                        <th className="py-3">Siswa</th>
                                        <th>Sekolah</th>
                                        <th>Course</th>
                                        <th>No. Sertifikat</th>
                                        <th>Status</th>
                                        <th>Tanggal</th>
                                        <th className="text-right">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200">
                                    {visibleCertificateUsers.map((item) => (
                                        <tr key={item.id}>
                                            <td className="py-4">
                                                <p className="font-bold text-slate-950">{item.student}</p>
                                                <p className="text-xs text-slate-500">{item.email}</p>
                                            </td>
                                            <td>{item.school}</td>
                                            <td>
                                                <p className="font-semibold">{item.course}</p>
                                                <p className="text-xs text-slate-500">Progress {item.progress}%</p>
                                            </td>
                                            <td className="font-mono text-xs">{item.no}</td>
                                            <td>
                                                <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600">
                                                    {item.status}
                                                </span>
                                            </td>
                                            <td>{item.issueDate}</td>
                                            <td>
                                                <div className="flex justify-end gap-1">
                                                    <Button asChild variant="ghost" size="icon">
                                                        <Link href={`/certificates/${item.id}`} aria-label="Lihat sertifikat">
                                                            <Award className="size-4" />
                                                        </Link>
                                                    </Button>
                                                    <Button asChild variant="ghost" size="icon">
                                                        <a href={`/certificates/${item.id}/download`} aria-label="Unduh PDF">
                                                            <Download className="size-4" />
                                                        </a>
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {visibleCertificateUsers.length === 0 && (
                                <p className="py-8 text-center text-sm text-slate-500">Tidak ada pemilik sertifikat yang cocok dengan filter.</p>
                            )}
                        </DesktopTable>
                    </div>
                </Panel>
            </div>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editing ? 'Edit Template' : 'Tambah Template'}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={submit} className="space-y-4">
                        <Field label="Nama template" error={form.errors.name} required>
                            <Input value={form.data.name} onChange={(event) => form.setData('name', event.target.value)} />
                        </Field>
                        <Field label="Judul sertifikat" error={form.errors.title} required>
                            <Input value={form.data.title} onChange={(event) => form.setData('title', event.target.value)} />
                        </Field>
                        <Field label="Warna utama" error={form.errors.primary_color} required>
                            <Input
                                type="color"
                                value={form.data.primary_color}
                                onChange={(event) => form.setData('primary_color', event.target.value)}
                            />
                        </Field>
                        <Field label="Warna aksen" error={form.errors.accent_color} required>
                            <Input
                                type="color"
                                value={form.data.accent_color}
                                onChange={(event) => form.setData('accent_color', event.target.value)}
                            />
                        </Field>
                        <Field label="Status" error={form.errors.status} required>
                            <SearchableSelect
                                value={form.data.status}
                                onChange={(value) => form.setData('status', value)}
                                options={[
                                    { value: 'draft', label: 'Draft' },
                                    { value: 'published', label: 'Published' },
                                ]}
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

            <Dialog open={issueOpen} onOpenChange={setIssueOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Terbitkan Sertifikat</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={issue} className="space-y-4">
                        <Field label="Siswa yang sudah memenuhi syarat" error={issueForm.errors.enrollment_id} required>
                            <SearchableSelect
                                value={issueForm.data.enrollment_id}
                                onChange={(value) => issueForm.setData('enrollment_id', value)}
                                options={[
                                    { value: '', label: 'Pilih enrollment' },
                                    ...eligibleEnrollments.map((item) => ({ value: String(item.id), label: `${item.student} · ${item.course}` })),
                                ]}
                                placeholder="Pilih enrollment"
                            />
                        </Field>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIssueOpen(false)}>
                                Batal
                            </Button>
                            <Button type="submit" disabled={issueForm.processing || !issueForm.data.enrollment_id}>
                                Terbitkan
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog open={Boolean(revoking)} onOpenChange={(value) => !value && setRevoking(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Cabut Sertifikat</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={revoke} className="space-y-4">
                        <p className="text-sm text-slate-600">
                            {revoking?.student} · {revoking?.title}
                        </p>
                        <Field label="Alasan pencabutan" error={revokeForm.errors.reason} required>
                            <textarea
                                className="min-h-28 w-full rounded-md border border-slate-200 bg-white p-3 text-sm"
                                value={revokeForm.data.reason}
                                onChange={(event) => revokeForm.setData('reason', event.target.value)}
                            />
                        </Field>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setRevoking(null)}>
                                Batal
                            </Button>
                            <Button type="submit" disabled={revokeForm.processing}>
                                Cabut Sertifikat
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </Shell>
    );
}

function Field({ label, error, required = false, children }: { label: string; error?: string; required?: boolean; children: React.ReactNode }) {
    return (
        <div className="space-y-2">
            <FieldLabel required={required}>{label}</FieldLabel>
            {children}
            <InputError message={error} />
        </div>
    );
}

function SummaryTile({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
    return (
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <span className="inline-flex size-11 items-center justify-center rounded-xl bg-white text-blue-700">
                <Icon className="size-5" />
            </span>
            <div>
                <p className="text-xs font-bold tracking-wide text-slate-500 uppercase">{label}</p>
                <p className="text-xl font-extrabold text-slate-950">{value}</p>
            </div>
        </div>
    );
}

function statusLabel(status: string) {
    const labels: Record<string, string> = {
        issued: 'Issued',
        revoked: 'Revoked',
    };

    return labels[status] ?? status;
}
