import { FieldLabel } from '@/components/form-field';
import InputError from '@/components/input-error';
import { Panel, Shell, StatCard } from '@/components/platform';
import { SearchableSelect } from '@/components/searchable-select';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { confirmDelete } from '@/lib/confirm-delete';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { Eye, EyeOff, Home, Layers3, Pencil, Plus, Trash2, Type, Wand2 } from 'lucide-react';
import { FormEvent, useMemo, useState } from 'react';

interface SectionItem {
    [key: string]: string | boolean | undefined;
    title: string;
    description: string;
    icon?: string;
    tone?: string;
    featured?: boolean;
}

interface SectionBadge {
    [key: string]: string | undefined;
    label: string;
    icon?: string;
}

interface SectionMetadata {
    [key: string]: string | number | null | undefined | SectionBadge[];
    highlight_word?: string;
    floating_label?: string;
    trust_prefix?: string;
    trust_suffix?: string;
    limit?: number | string | null;
    badges?: SectionBadge[];
}

interface HomeSection {
    id: number;
    key: string;
    name: string;
    sectionType: string;
    eyebrow?: string | null;
    title?: string | null;
    subtitle?: string | null;
    body?: string | null;
    primaryLabel?: string | null;
    primaryUrl?: string | null;
    secondaryLabel?: string | null;
    secondaryUrl?: string | null;
    imagePath?: string | null;
    imageUrl?: string | null;
    items: SectionItem[];
    metadata: SectionMetadata;
    isVisible: boolean;
    sortOrder: number;
    updatedAt?: string | null;
}

interface HomeSectionForm {
    [key: string]: string | number | boolean | File | null | SectionItem[] | SectionMetadata;
    name: string;
    section_type: string;
    eyebrow: string;
    title: string;
    subtitle: string;
    body: string;
    primary_label: string;
    primary_url: string;
    secondary_label: string;
    secondary_url: string;
    image_url: string;
    image: File | null;
    is_visible: boolean;
    sort_order: number;
    items: SectionItem[];
    metadata: SectionMetadata;
}

const emptyForm: HomeSectionForm = {
    name: '',
    section_type: 'custom',
    eyebrow: '',
    title: '',
    subtitle: '',
    body: '',
    primary_label: '',
    primary_url: '',
    secondary_label: '',
    secondary_url: '',
    image_url: '',
    image: null,
    is_visible: true,
    sort_order: 60,
    items: [],
    metadata: {
        highlight_word: '',
        floating_label: '',
        trust_prefix: '',
        trust_suffix: '',
        limit: 3,
        badges: [],
    },
};

const sectionTypeLabels: Record<string, string> = {
    hero: 'Hero',
    features: 'Fitur',
    courses: 'Kelas Populer',
    partners: 'Partner Sekolah',
    benefits: 'Benefit / CTA',
    custom: 'Custom',
};

const iconOptions = [
    ['route', 'Route / Learning Path'],
    ['library', 'Library / Modul'],
    ['quiz', 'Quiz / Review'],
    ['upload', 'Upload / Submission'],
    ['message', 'Message / Feedback'],
    ['shield', 'Shield / Aman'],
    ['badge', 'Badge / Sertifikat'],
    ['bell', 'Bell / Notifikasi'],
];

const visibilityOptions = [
    { value: '1', label: 'Tampilkan' },
    { value: '0', label: 'Sembunyikan' },
];

const toneOptions = [
    { value: 'blue', label: 'Blue' },
    { value: 'amber', label: 'Amber' },
    { value: 'purple', label: 'Purple' },
    { value: 'slate', label: 'Slate' },
];

export default function AdminHomePage({
    sections,
    stats,
}: {
    sections: HomeSection[];
    stats: { total: number; visible: number; custom: number; system: number };
}) {
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<HomeSection | null>(null);
    const form = useForm<HomeSectionForm>(emptyForm);
    const orderedSections = useMemo(() => [...sections].sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id), [sections]);

    const showCreate = () => {
        setEditing(null);
        form.setData({
            ...emptyForm,
            name: 'Section Custom',
            sort_order: nextSortOrder(sections),
            items: [{ title: '', description: '', icon: 'route', tone: 'blue', featured: false }],
            metadata: { ...emptyForm.metadata, badges: [] },
        });
        form.clearErrors();
        setOpen(true);
    };

    const showEdit = (section: HomeSection) => {
        setEditing(section);
        form.setData(toForm(section));
        form.clearErrors();
        setOpen(true);
    };

    const submit = (event: FormEvent) => {
        event.preventDefault();
        const payload = normalizedPayload(form.data);
        form.transform(() => payload);

        if (editing) {
            form.transform(() => ({ ...payload, _method: 'patch' }));
            form.post(`/admin/home-page/sections/${editing.id}`, {
                forceFormData: true,
                preserveScroll: true,
                onSuccess: () => setOpen(false),
            });
        } else {
            form.post('/admin/home-page/sections', {
                forceFormData: true,
                preserveScroll: true,
                onSuccess: () => setOpen(false),
            });
        }
    };

    const toggleVisibility = (section: HomeSection) => {
        router.patch(`/admin/home-page/sections/${section.id}`, normalizedPayload({ ...toForm(section), is_visible: !section.isVisible }), {
            preserveScroll: true,
        });
    };

    const remove = (section: HomeSection) => {
        if (section.sectionType !== 'custom') return;
        confirmDelete(`Hapus section "${section.name}"?`, () => {
            router.delete(`/admin/home-page/sections/${section.id}`, { preserveScroll: true });
        });
    };

    return (
        <Shell
            title="Kelola Home Page"
            eyebrow="Admin Pusat"
            nav="admin"
            actions={
                <div className="flex gap-2">
                    <Button asChild variant="outline">
                        <Link href="/" target="_blank">
                            <Eye className="size-4" />
                            Lihat Home
                        </Link>
                    </Button>
                    <Button onClick={showCreate}>
                        <Plus className="size-4" />
                        Section Custom
                    </Button>
                </div>
            }
        >
            <Head title="Kelola Home Page" />

            <div className="grid gap-5 md:grid-cols-4">
                <StatCard label="Total Section" value={String(stats.total)} icon={Layers3} />
                <StatCard label="Tampil" value={String(stats.visible)} icon={Eye} tone="purple" />
                <StatCard label="Section Bawaan" value={String(stats.system)} icon={Home} tone="amber" />
                <StatCard label="Custom" value={String(stats.custom)} icon={Wand2} tone="slate" />
            </div>

            <Panel className="mt-6" title="Section Halaman Home">
                <div className="space-y-4">
                    {orderedSections.map((section) => (
                        <div
                            key={section.id}
                            className="grid gap-4 rounded-2xl border border-slate-200 p-4 md:grid-cols-[80px_1fr_auto] md:items-center"
                        >
                            <div className="rounded-xl bg-slate-50 p-3 text-center">
                                <p className="text-xs font-bold text-slate-500">Order</p>
                                <p className="text-2xl font-extrabold text-slate-950">{section.sortOrder}</p>
                            </div>
                            <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                    <h2 className="font-bold text-slate-950">{section.name}</h2>
                                    <span className="rounded-full bg-blue-50 px-2 py-1 text-xs font-bold text-blue-700">
                                        {sectionTypeLabels[section.sectionType] ?? section.sectionType}
                                    </span>
                                    <span
                                        className={`rounded-full px-2 py-1 text-xs font-bold ${
                                            section.isVisible ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                                        }`}
                                    >
                                        {section.isVisible ? 'Tampil' : 'Hidden'}
                                    </span>
                                </div>
                                <p className="mt-1 text-sm text-slate-500">
                                    {section.title || section.subtitle || section.body || 'Belum ada konten.'}
                                </p>
                                <p className="mt-2 text-xs font-semibold text-slate-400">
                                    Key: {section.key} · {section.items.length} item · update {section.updatedAt || '-'}
                                </p>
                            </div>
                            <div className="flex flex-wrap justify-end gap-1">
                                <Button variant="ghost" size="icon" aria-label="Toggle visibility" onClick={() => toggleVisibility(section)}>
                                    {section.isVisible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                                </Button>
                                <Button variant="ghost" size="icon" aria-label="Edit section" onClick={() => showEdit(section)}>
                                    <Pencil className="size-4" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    aria-label="Hapus section"
                                    disabled={section.sectionType !== 'custom'}
                                    onClick={() => remove(section)}
                                >
                                    <Trash2 className={`size-4 ${section.sectionType === 'custom' ? 'text-red-600' : 'text-slate-300'}`} />
                                </Button>
                            </div>
                        </div>
                    ))}
                    {orderedSections.length === 0 && <p className="text-sm text-slate-500">Belum ada section home. Jalankan migration terbaru.</p>}
                </div>
            </Panel>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="max-h-[90vh] max-w-6xl overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{editing ? `Edit ${editing.name}` : 'Tambah Section Custom'}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={submit} className="space-y-5">
                        <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
                            <div className="space-y-5">
                                <div className="grid gap-4 rounded-2xl border border-slate-200 p-4 md:grid-cols-2">
                                    <Field label="Nama section" error={form.errors.name} required>
                                        <Input value={form.data.name} onChange={(event) => form.setData('name', event.target.value)} />
                                    </Field>
                                    <Field label="Tipe section" error={form.errors.section_type} required>
                                        <SearchableSelect
                                            value={form.data.section_type}
                                            disabled={Boolean(editing && editing.sectionType !== 'custom')}
                                            onChange={(value) => form.setData('section_type', value)}
                                            options={Object.entries(sectionTypeLabels).map(([value, label]) => ({ value, label }))}
                                        />
                                    </Field>
                                    <Field label="Urutan tampil" error={form.errors.sort_order} required>
                                        <Input
                                            type="number"
                                            min={0}
                                            max={1000}
                                            value={form.data.sort_order}
                                            onChange={(event) => form.setData('sort_order', Number(event.target.value))}
                                        />
                                    </Field>
                                    <Field label="Status tampil" error={form.errors.is_visible} required>
                                        <SearchableSelect
                                            value={form.data.is_visible ? '1' : '0'}
                                            onChange={(value) => form.setData('is_visible', value === '1')}
                                            options={visibilityOptions}
                                        />
                                    </Field>
                                </div>

                                <div className="space-y-4 rounded-2xl border border-slate-200 p-4">
                                    <p className="text-xs font-bold tracking-wide text-blue-700 uppercase">Konten Utama</p>
                                    <Field label="Eyebrow / label kecil" error={form.errors.eyebrow}>
                                        <Input value={form.data.eyebrow} onChange={(event) => form.setData('eyebrow', event.target.value)} />
                                    </Field>
                                    <Field label="Judul" error={form.errors.title}>
                                        <Input value={form.data.title} onChange={(event) => form.setData('title', event.target.value)} />
                                    </Field>
                                    <Field label="Subtitle" error={form.errors.subtitle}>
                                        <textarea
                                            className="min-h-24 w-full rounded-md border border-slate-200 bg-white p-3 text-sm"
                                            value={form.data.subtitle}
                                            onChange={(event) => form.setData('subtitle', event.target.value)}
                                        />
                                    </Field>
                                    <Field label="Body / deskripsi tambahan" error={form.errors.body}>
                                        <textarea
                                            className="min-h-28 w-full rounded-md border border-slate-200 bg-white p-3 text-sm"
                                            value={form.data.body}
                                            onChange={(event) => form.setData('body', event.target.value)}
                                        />
                                    </Field>
                                </div>

                                <div className="space-y-4 rounded-2xl border border-slate-200 p-4">
                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                        <p className="text-xs font-bold tracking-wide text-blue-700 uppercase">Item Card Dinamis</p>
                                        <Button type="button" size="sm" variant="outline" onClick={() => addItem(form)}>
                                            <Plus className="size-4" />
                                            Tambah Item
                                        </Button>
                                    </div>
                                    <div className="space-y-3">
                                        {form.data.items.map((item, index) => (
                                            <div key={index} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                                                <div className="mb-3 flex items-center justify-between">
                                                    <p className="font-bold">Item {index + 1}</p>
                                                    <Button type="button" variant="ghost" size="sm" onClick={() => removeItem(form, index)}>
                                                        Hapus
                                                    </Button>
                                                </div>
                                                <div className="grid gap-3 md:grid-cols-2">
                                                    <Input
                                                        placeholder="Judul item"
                                                        value={item.title}
                                                        onChange={(event) => updateItem(form, index, { title: event.target.value })}
                                                    />
                                                    <SearchableSelect
                                                        value={item.icon ?? 'route'}
                                                        onChange={(value) => updateItem(form, index, { icon: value })}
                                                        options={iconOptions.map(([value, label]) => ({ value, label }))}
                                                    />
                                                    <textarea
                                                        className="min-h-20 rounded-md border border-slate-200 bg-white p-3 text-sm md:col-span-2"
                                                        placeholder="Deskripsi item"
                                                        value={item.description}
                                                        onChange={(event) => updateItem(form, index, { description: event.target.value })}
                                                    />
                                                    <SearchableSelect
                                                        value={item.tone ?? 'blue'}
                                                        onChange={(value) => updateItem(form, index, { tone: value })}
                                                        options={toneOptions}
                                                    />
                                                    <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                                                        <input
                                                            type="checkbox"
                                                            checked={Boolean(item.featured)}
                                                            onChange={(event) => updateItem(form, index, { featured: event.target.checked })}
                                                        />
                                                        Jadikan item unggulan
                                                    </label>
                                                </div>
                                            </div>
                                        ))}
                                        {form.data.items.length === 0 && <p className="text-sm text-slate-500">Belum ada item card.</p>}
                                    </div>
                                    <InputError message={(form.errors as Record<string, string>).items} />
                                </div>
                            </div>

                            <div className="space-y-5">
                                <div className="space-y-4 rounded-2xl border border-blue-100 bg-blue-50 p-4">
                                    <p className="text-xs font-bold tracking-wide text-blue-700 uppercase">CTA dan Media</p>
                                    <Field label="Primary CTA label" error={form.errors.primary_label}>
                                        <Input
                                            value={form.data.primary_label}
                                            onChange={(event) => form.setData('primary_label', event.target.value)}
                                        />
                                    </Field>
                                    <Field label="Primary CTA URL" error={form.errors.primary_url}>
                                        <Input
                                            placeholder="/courses"
                                            value={form.data.primary_url}
                                            onChange={(event) => form.setData('primary_url', event.target.value)}
                                        />
                                    </Field>
                                    <Field label="Secondary CTA label" error={form.errors.secondary_label}>
                                        <Input
                                            value={form.data.secondary_label}
                                            onChange={(event) => form.setData('secondary_label', event.target.value)}
                                        />
                                    </Field>
                                    <Field label="Secondary CTA URL" error={form.errors.secondary_url}>
                                        <Input
                                            placeholder="/learning-paths"
                                            value={form.data.secondary_url}
                                            onChange={(event) => form.setData('secondary_url', event.target.value)}
                                        />
                                    </Field>
                                    <Field label="Upload gambar section" error={form.errors.image}>
                                        <Input
                                            type="file"
                                            accept="image/png,image/jpeg,image/webp"
                                            onChange={(event) => form.setData('image', event.target.files?.[0] ?? null)}
                                        />
                                        <p className="text-xs leading-5 text-slate-500">
                                            Gunakan JPG, PNG, atau WEBP maksimal 2MB. Gambar lama tetap dipakai jika tidak memilih file baru.
                                        </p>
                                        {form.data.image && (
                                            <p className="rounded-lg bg-white px-3 py-2 text-xs font-semibold text-blue-700">
                                                File baru: {form.data.image.name}
                                            </p>
                                        )}
                                        {editing?.imageUrl && (
                                            <div className="overflow-hidden rounded-xl border border-white bg-white">
                                                <img src={editing.imageUrl} alt={`Gambar ${form.data.name}`} className="h-36 w-full object-cover" />
                                            </div>
                                        )}
                                    </Field>
                                </div>

                                <div className="space-y-4 rounded-2xl border border-slate-200 p-4">
                                    <p className="text-xs font-bold tracking-wide text-blue-700 uppercase">Metadata Section</p>
                                    <Field label="Highlight word hero">
                                        <Input
                                            value={form.data.metadata.highlight_word ?? ''}
                                            onChange={(event) => updateMetadata(form, { highlight_word: event.target.value })}
                                        />
                                    </Field>
                                    <Field label="Floating label hero">
                                        <Input
                                            value={form.data.metadata.floating_label ?? ''}
                                            onChange={(event) => updateMetadata(form, { floating_label: event.target.value })}
                                        />
                                    </Field>
                                    <Field label="Trust prefix">
                                        <Input
                                            value={form.data.metadata.trust_prefix ?? ''}
                                            onChange={(event) => updateMetadata(form, { trust_prefix: event.target.value })}
                                        />
                                    </Field>
                                    <Field label="Trust suffix">
                                        <Input
                                            value={form.data.metadata.trust_suffix ?? ''}
                                            onChange={(event) => updateMetadata(form, { trust_suffix: event.target.value })}
                                        />
                                    </Field>
                                    <Field label="Limit kelas populer">
                                        <Input
                                            type="number"
                                            min={1}
                                            max={12}
                                            value={form.data.metadata.limit ?? 3}
                                            onChange={(event) => updateMetadata(form, { limit: event.target.value })}
                                        />
                                    </Field>
                                </div>

                                <div className="space-y-4 rounded-2xl border border-slate-200 p-4">
                                    <div className="flex items-center justify-between gap-3">
                                        <p className="text-xs font-bold tracking-wide text-blue-700 uppercase">Badge Benefit</p>
                                        <Button type="button" size="sm" variant="outline" onClick={() => addBadge(form)}>
                                            <Plus className="size-4" />
                                            Badge
                                        </Button>
                                    </div>
                                    {(form.data.metadata.badges ?? []).map((badge, index) => (
                                        <div key={index} className="grid gap-2 md:grid-cols-[1fr_120px_auto]">
                                            <Input
                                                placeholder="Label badge"
                                                value={badge.label}
                                                onChange={(event) => updateBadge(form, index, { label: event.target.value })}
                                            />
                                            <SearchableSelect
                                                value={badge.icon ?? 'badge'}
                                                onChange={(value) => updateBadge(form, index, { icon: value })}
                                                options={iconOptions.map(([value, label]) => ({ value, label: label.split(' / ')[0] }))}
                                            />
                                            <Button type="button" variant="ghost" size="sm" onClick={() => removeBadge(form, index)}>
                                                Hapus
                                            </Button>
                                        </div>
                                    ))}
                                    {(form.data.metadata.badges ?? []).length === 0 && <p className="text-sm text-slate-500">Belum ada badge.</p>}
                                </div>

                                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                                    <div className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-950">
                                        <Type className="size-4 text-blue-700" />
                                        Preview ringkas
                                    </div>
                                    <p className="text-xs font-bold tracking-wide text-blue-700 uppercase">{form.data.eyebrow || 'Eyebrow'}</p>
                                    <h3 className="mt-2 text-2xl font-extrabold text-slate-950">{form.data.title || form.data.name}</h3>
                                    <p className="mt-2 text-sm leading-6 text-slate-600">
                                        {form.data.subtitle || form.data.body || 'Konten section akan tampil di halaman home.'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                                Batal
                            </Button>
                            <Button type="submit" disabled={form.processing}>
                                Simpan Section
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

function toForm(section: HomeSection): HomeSectionForm {
    return {
        name: section.name,
        section_type: section.sectionType,
        eyebrow: section.eyebrow ?? '',
        title: section.title ?? '',
        subtitle: section.subtitle ?? '',
        body: section.body ?? '',
        primary_label: section.primaryLabel ?? '',
        primary_url: section.primaryUrl ?? '',
        secondary_label: section.secondaryLabel ?? '',
        secondary_url: section.secondaryUrl ?? '',
        image_url: section.imagePath ?? '',
        image: null,
        is_visible: section.isVisible,
        sort_order: section.sortOrder,
        items: section.items ?? [],
        metadata: {
            highlight_word: section.metadata?.highlight_word ?? '',
            floating_label: section.metadata?.floating_label ?? '',
            trust_prefix: section.metadata?.trust_prefix ?? '',
            trust_suffix: section.metadata?.trust_suffix ?? '',
            limit: section.metadata?.limit ?? 3,
            badges: section.metadata?.badges ?? [],
        },
    };
}

function normalizedPayload(data: HomeSectionForm): HomeSectionForm {
    return {
        ...data,
        sort_order: Number(data.sort_order),
        metadata: {
            ...data.metadata,
            limit:
                data.metadata.limit === '' || data.metadata.limit === null || data.metadata.limit === undefined ? null : Number(data.metadata.limit),
            badges: data.metadata.badges ?? [],
        },
        items: data.items ?? [],
    };
}

function nextSortOrder(sections: HomeSection[]) {
    return Math.max(50, ...sections.map((section) => section.sortOrder)) + 10;
}

function addItem(form: ReturnType<typeof useForm<HomeSectionForm>>) {
    form.setData('items', [...form.data.items, { title: '', description: '', icon: 'route', tone: 'blue', featured: false }]);
}

function updateItem(form: ReturnType<typeof useForm<HomeSectionForm>>, index: number, patch: Partial<SectionItem>) {
    form.setData(
        'items',
        form.data.items.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)),
    );
}

function removeItem(form: ReturnType<typeof useForm<HomeSectionForm>>, index: number) {
    form.setData(
        'items',
        form.data.items.filter((_, itemIndex) => itemIndex !== index),
    );
}

function updateMetadata(form: ReturnType<typeof useForm<HomeSectionForm>>, patch: Partial<SectionMetadata>) {
    form.setData('metadata', { ...form.data.metadata, ...patch });
}

function addBadge(form: ReturnType<typeof useForm<HomeSectionForm>>) {
    updateMetadata(form, {
        badges: [...(form.data.metadata.badges ?? []), { label: '', icon: 'badge' }],
    });
}

function updateBadge(form: ReturnType<typeof useForm<HomeSectionForm>>, index: number, patch: Partial<SectionBadge>) {
    updateMetadata(form, {
        badges: (form.data.metadata.badges ?? []).map((badge, badgeIndex) => (badgeIndex === index ? { ...badge, ...patch } : badge)),
    });
}

function removeBadge(form: ReturnType<typeof useForm<HomeSectionForm>>, index: number) {
    updateMetadata(form, {
        badges: (form.data.metadata.badges ?? []).filter((_, badgeIndex) => badgeIndex !== index),
    });
}
