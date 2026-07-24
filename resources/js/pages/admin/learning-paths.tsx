import { FieldLabel } from '@/components/form-field';
import InputError from '@/components/input-error';
import { Panel, Shell } from '@/components/platform';
import { SearchableSelect, type SearchableSelectOption } from '@/components/searchable-select';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { confirmDelete } from '@/lib/confirm-delete';
import { Head, router, useForm } from '@inertiajs/react';
import { Pencil, Plus, Route, Trash2 } from 'lucide-react';
import { FormEvent, useState } from 'react';

interface LearningPathRow {
    id: number;
    title: string;
    slug?: string | null;
    description?: string | null;
    level: string;
    status: string;
    meta_title?: string | null;
    meta_description?: string | null;
    course_count: number;
}

interface LearningPathFormData {
    [key: string]: string;
    title: string;
    slug: string;
    description: string;
    level: string;
    status: string;
    meta_title: string;
    meta_description: string;
}

const emptyPath: LearningPathFormData = {
    title: '',
    slug: '',
    description: '',
    level: 'beginner-to-advanced',
    status: 'draft',
    meta_title: '',
    meta_description: '',
};

const levelOptions: SearchableSelectOption[] = [
    { value: 'beginner', label: 'Beginner' },
    { value: 'intermediate', label: 'Intermediate' },
    { value: 'advanced', label: 'Advanced' },
    { value: 'beginner-to-advanced', label: 'Beginner sampai Advanced' },
];

const statusOptions: SearchableSelectOption[] = [
    { value: 'draft', label: 'Draft' },
    { value: 'published', label: 'Published' },
    { value: 'archived', label: 'Archived' },
];

export default function LearningPaths({ paths, routeBase }: { paths: LearningPathRow[]; routeBase: string }) {
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<LearningPathRow | null>(null);
    const form = useForm<LearningPathFormData>(emptyPath);

    const showEditor = (path?: LearningPathRow) => {
        setEditing(path ?? null);

        if (path) {
            const generated = generatedLearningPathSeo(path.title, path.description ?? '', path.slug ?? undefined);

            form.setData({
                title: path.title,
                slug: path.slug ?? generated.slug,
                description: path.description ?? '',
                level: path.level,
                status: path.status,
                meta_title: path.meta_title ?? generated.meta_title,
                meta_description: path.meta_description ?? generated.meta_description,
            });
        } else {
            form.setData({ ...emptyPath, ...generatedLearningPathSeo('', '') });
        }

        form.clearErrors();
        setOpen(true);
    };

    const setPathData = (patch: Partial<LearningPathFormData>) => {
        const nextData = { ...form.data, ...patch };
        const preferredSlug = Object.prototype.hasOwnProperty.call(patch, 'slug') ? nextData.slug : undefined;

        form.setData({
            ...nextData,
            ...generatedLearningPathSeo(nextData.title, nextData.description, preferredSlug),
        });
    };

    const submit = (event: FormEvent) => {
        event.preventDefault();
        form.transform((data) => ({
            ...data,
            ...generatedLearningPathSeo(data.title, data.description, data.slug),
        }));

        const options = { preserveScroll: true, onSuccess: () => setOpen(false) };

        if (editing) form.patch(`${routeBase}/learning-paths/${editing.id}`, options);
        else form.post(`${routeBase}/learning-paths`, options);
    };

    const remove = (path: LearningPathRow) => {
        confirmDelete(`Hapus learning path "${path.title}"?`, () => {
            router.delete(`${routeBase}/learning-paths/${path.id}`, { preserveScroll: true });
        });
    };

    return (
        <Shell
            title="Learning Path"
            eyebrow="Kurikulum"
            actions={
                <Button onClick={() => showEditor()}>
                    <Plus className="size-4" />
                    Tambah
                </Button>
            }
        >
            <Head title="Learning Path" />
            <Panel title="Jalur belajar dan urutan kelas">
                <div className="space-y-3">
                    {paths.map((path) => (
                        <div key={path.id} className="flex flex-col gap-4 rounded-lg border border-slate-200 p-4 md:flex-row md:items-center">
                            <Route className="size-5 shrink-0 text-blue-700" />
                            <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                    <h2 className="font-bold">{path.title}</h2>
                                    <span className="rounded-full bg-blue-50 px-2 py-1 text-xs font-bold text-blue-700">{path.status}</span>
                                </div>
                                <p className="mt-1 text-sm text-slate-600">{path.description || 'Belum ada deskripsi.'}</p>
                                <p className="mt-2 text-xs font-semibold text-slate-500">
                                    {path.level} · {path.course_count} kursus · /learning-paths/{path.slug || '-'}
                                </p>
                            </div>
                            <div className="flex gap-1">
                                <Button variant="ghost" size="icon" aria-label="Edit learning path" onClick={() => showEditor(path)}>
                                    <Pencil className="size-4" />
                                </Button>
                                <Button variant="ghost" size="icon" aria-label="Hapus learning path" onClick={() => remove(path)}>
                                    <Trash2 className="size-4 text-red-600" />
                                </Button>
                            </div>
                        </div>
                    ))}
                    {paths.length === 0 && <p className="text-sm text-slate-500">Belum ada learning path.</p>}
                </div>
                <InputError message={(form.errors as Record<string, string>).learning_path} className="mt-4" />
            </Panel>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{editing ? 'Edit Learning Path' : 'Tambah Learning Path'}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={submit} className="space-y-5">
                        <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
                            <div className="space-y-4 rounded-2xl border border-slate-200 p-4">
                                <p className="text-xs font-bold tracking-wide text-blue-700 uppercase">Konten Jalur</p>
                                <Field label="Judul" error={form.errors.title} required>
                                    <Input value={form.data.title} onChange={(event) => setPathData({ title: event.target.value })} />
                                </Field>
                                <Field label="Deskripsi" error={form.errors.description}>
                                    <textarea
                                        className="min-h-40 w-full rounded-md border border-slate-200 bg-white p-3 text-sm"
                                        value={form.data.description}
                                        onChange={(event) => setPathData({ description: event.target.value })}
                                    />
                                </Field>
                                <div className="grid gap-4 md:grid-cols-2">
                                    <Field label="Level" error={form.errors.level} required>
                                        <SearchableSelect
                                            value={form.data.level}
                                            onChange={(value) => form.setData('level', value)}
                                            options={levelOptions}
                                        />
                                    </Field>
                                    <Field label="Status" error={form.errors.status} required>
                                        <SearchableSelect
                                            value={form.data.status}
                                            onChange={(value) => form.setData('status', value)}
                                            options={statusOptions}
                                        />
                                    </Field>
                                </div>
                            </div>

                            <div className="space-y-4 rounded-2xl border border-blue-100 bg-blue-50 p-4">
                                <p className="text-xs font-bold tracking-wide text-blue-700 uppercase">SEO otomatis</p>
                                <Field label="Slug SEO" error={form.errors.slug} required>
                                    <Input value={form.data.slug} onChange={(event) => setPathData({ slug: event.target.value })} />
                                </Field>
                                <Field label="Meta title" error={form.errors.meta_title}>
                                    <Input value={form.data.meta_title} readOnly className="bg-white/80" />
                                </Field>
                                <Field label="Meta description" error={form.errors.meta_description}>
                                    <textarea
                                        className="min-h-28 w-full rounded-md border border-slate-200 bg-white/80 p-3 text-sm"
                                        value={form.data.meta_description}
                                        readOnly
                                    />
                                </Field>
                                <div className="rounded-xl bg-white p-4">
                                    <p className="text-xs font-bold tracking-wide text-slate-500 uppercase">Preview URL</p>
                                    <p className="mt-2 text-sm font-semibold break-all text-blue-800">/learning-paths/{form.data.slug}</p>
                                </div>
                            </div>
                        </div>
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

function generatedLearningPathSeo(title: string, description: string, preferredSlug?: string) {
    const cleanTitle = title.trim() || 'Learning Path Baru';
    const cleanDescription = description.replace(/\s+/g, ' ').trim();

    return {
        slug: slugify(preferredSlug || cleanTitle),
        meta_title: truncateSeo(`${cleanTitle} | RoboAcademy`, 70),
        meta_description: truncateSeo(
            cleanDescription || `Ikuti jalur belajar ${cleanTitle} untuk mempelajari robotik secara bertahap dari dasar sampai proyek praktik.`,
            165,
        ),
    };
}

function slugify(value: string) {
    return (
        value
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '') || 'learning-path-baru'
    );
}

function truncateSeo(value: string, maxLength: number) {
    return value.length > maxLength ? value.slice(0, maxLength).trim() : value;
}
