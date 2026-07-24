import { FieldLabel } from '@/components/form-field';
import InputError from '@/components/input-error';
import { Panel, Shell, StatCard } from '@/components/platform';
import { SearchableSelect } from '@/components/searchable-select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Head, Link, useForm } from '@inertiajs/react';
import { CheckCircle2, Eye, ImagePlus, Plus, Save, Search, Trash2 } from 'lucide-react';
import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react';

interface SeoSetting {
    id: number;
    key: string;
    label: string;
    path: string;
    title: string;
    description: string;
    canonicalUrl?: string | null;
    ogImage?: string | null;
    type: string;
    noindex: boolean;
    keywords: string[];
    isActive: boolean;
    updatedAt?: string | null;
}

interface SeoForm {
    [key: string]: string | boolean | File | null | string[];
    title: string;
    description: string;
    canonical_url: string;
    og_image: string;
    seo_image: File | null;
    type: string;
    noindex: boolean;
    keywords: string[];
    is_active: boolean;
}

const typeOptions = [
    { value: 'website', label: 'Website' },
    { value: 'article', label: 'Article' },
];

export default function AdminSeoSettings({ settings }: { settings: SeoSetting[] }) {
    const [activeId, setActiveId] = useState(settings[0]?.id ?? 0);
    const activeSetting = settings.find((setting) => setting.id === activeId) ?? settings[0];
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const form = useForm<SeoForm>(toForm(activeSetting));
    const previewImage = imagePreview ?? imageUrl(activeSetting?.ogImage ?? form.data.og_image);

    const stats = useMemo(
        () => ({
            total: settings.length,
            active: settings.filter((setting) => setting.isActive).length,
            indexable: settings.filter((setting) => setting.isActive && !setting.noindex).length,
            withImage: settings.filter((setting) => Boolean(setting.ogImage)).length,
        }),
        [settings],
    );

    useEffect(() => {
        if (!activeSetting) return;

        setImagePreview(null);
        form.setData(toForm(activeSetting));
        form.clearErrors();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeSetting?.id]);

    const submit = (event: FormEvent) => {
        event.preventDefault();

        form.transform((data) => ({
            ...data,
            _method: 'patch',
            keywords: data.keywords.map((keyword) => keyword.trim()).filter(Boolean),
        }));
        form.post(`/admin/seo-settings/${activeSetting.id}`, {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                setImagePreview(null);
            },
        });
    };

    const updateImage = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0] ?? null;
        form.setData('seo_image', file);

        if (imagePreview) {
            URL.revokeObjectURL(imagePreview);
        }

        setImagePreview(file ? URL.createObjectURL(file) : null);
    };

    const updateKeyword = (index: number, value: string) => {
        form.setData(
            'keywords',
            form.data.keywords.map((keyword, keywordIndex) => (keywordIndex === index ? value : keyword)),
        );
    };

    const removeKeyword = (index: number) => {
        form.setData(
            'keywords',
            form.data.keywords.filter((_, keywordIndex) => keywordIndex !== index),
        );
    };

    return (
        <Shell
            title="Kelola SEO"
            eyebrow="Pengaturan Website"
            nav="admin"
            actions={
                <Button asChild variant="outline">
                    <Link href={activeSetting?.path ?? '/'} target="_blank">
                        <Eye className="size-4" />
                        Lihat Halaman
                    </Link>
                </Button>
            }
        >
            <Head title="Kelola SEO" />

            <div className="grid gap-5 md:grid-cols-4">
                <StatCard label="Halaman Dikelola" value={String(stats.total)} icon={Search} />
                <StatCard label="Aktif" value={String(stats.active)} icon={CheckCircle2} tone="purple" />
                <StatCard label="Indexable" value={String(stats.indexable)} icon={Eye} tone="amber" />
                <StatCard label="Punya OG Image" value={String(stats.withImage)} icon={ImagePlus} tone="slate" />
            </div>

            <div className="mt-6 grid gap-6 xl:grid-cols-[360px_1fr]">
                <Panel title="Halaman publik">
                    <div className="space-y-3">
                        {settings.map((setting) => (
                            <button
                                key={setting.id}
                                type="button"
                                onClick={() => setActiveId(setting.id)}
                                className={`w-full rounded-2xl border p-4 text-left transition ${
                                    activeSetting?.id === setting.id
                                        ? 'border-blue-200 bg-blue-50 text-blue-900'
                                        : 'border-slate-200 bg-white hover:border-blue-200 hover:bg-slate-50'
                                }`}
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="font-bold">{setting.label}</p>
                                        <p className="mt-1 text-sm text-slate-500">{setting.path}</p>
                                    </div>
                                    <span
                                        className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                                            setting.isActive && !setting.noindex
                                                ? 'bg-emerald-100 text-emerald-700'
                                                : 'bg-slate-100 text-slate-600'
                                        }`}
                                    >
                                        {setting.isActive && !setting.noindex ? 'Index' : 'Nonaktif'}
                                    </span>
                                </div>
                                <p className="mt-3 line-clamp-2 text-sm text-slate-600">{setting.title}</p>
                            </button>
                        ))}
                    </div>
                </Panel>

                {activeSetting && (
                    <form onSubmit={submit} className="space-y-6">
                        <Panel title={`SEO ${activeSetting.label}`}>
                            <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <FieldLabel required>Meta title</FieldLabel>
                                        <Input
                                            value={form.data.title}
                                            maxLength={70}
                                            onChange={(event) => form.setData('title', event.target.value)}
                                            placeholder="Judul halaman untuk hasil pencarian"
                                        />
                                        <div className="flex justify-between text-xs text-slate-500">
                                            <span>Format ideal: kata kunci utama + brand.</span>
                                            <span>{form.data.title.length}/70</span>
                                        </div>
                                        <InputError message={form.errors.title} />
                                    </div>

                                    <div className="space-y-2">
                                        <FieldLabel required>Meta description</FieldLabel>
                                        <textarea
                                            className="min-h-28 w-full rounded-md border border-slate-200 bg-white p-3 text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                                            value={form.data.description}
                                            maxLength={170}
                                            onChange={(event) => form.setData('description', event.target.value)}
                                            placeholder="Ringkasan halaman yang tampil di Google"
                                        />
                                        <div className="flex justify-between text-xs text-slate-500">
                                            <span>Buat natural, unik, dan relevan dengan isi halaman.</span>
                                            <span>{form.data.description.length}/170</span>
                                        </div>
                                        <InputError message={form.errors.description} />
                                    </div>

                                    <div className="grid gap-4 md:grid-cols-2">
                                        <div className="space-y-2">
                                            <FieldLabel>Canonical URL</FieldLabel>
                                            <Input
                                                value={form.data.canonical_url}
                                                onChange={(event) => form.setData('canonical_url', event.target.value)}
                                                placeholder={`Kosongkan untuk ${activeSetting.path}`}
                                            />
                                            <InputError message={form.errors.canonical_url} />
                                        </div>
                                        <div className="space-y-2">
                                            <FieldLabel required>OG type</FieldLabel>
                                            <SearchableSelect
                                                value={form.data.type}
                                                onChange={(value) => form.setData('type', value)}
                                                options={typeOptions}
                                                placeholder="Pilih tipe"
                                            />
                                            <InputError message={form.errors.type} />
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between gap-3">
                                            <FieldLabel>Keywords</FieldLabel>
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="outline"
                                                onClick={() => form.setData('keywords', [...form.data.keywords, ''])}
                                            >
                                                <Plus className="size-4" />
                                                Keyword
                                            </Button>
                                        </div>
                                        <div className="space-y-2">
                                            {form.data.keywords.map((keyword, index) => (
                                                <div key={index} className="grid gap-2 md:grid-cols-[1fr_auto]">
                                                    <Input
                                                        value={keyword}
                                                        onChange={(event) => updateKeyword(index, event.target.value)}
                                                        placeholder="contoh: kelas arduino"
                                                    />
                                                    <Button type="button" variant="ghost" size="icon" onClick={() => removeKeyword(index)}>
                                                        <Trash2 className="size-4 text-red-600" />
                                                    </Button>
                                                </div>
                                            ))}
                                            {form.data.keywords.length === 0 && (
                                                <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-500">
                                                    Belum ada keyword. Field ini opsional.
                                                </p>
                                            )}
                                        </div>
                                        <InputError message={form.errors.keywords} />
                                    </div>

                                    <div className="grid gap-3 md:grid-cols-2">
                                        <label className="flex items-center gap-2 rounded-xl border border-slate-200 p-3 text-sm font-semibold text-slate-700">
                                            <input
                                                type="checkbox"
                                                checked={form.data.is_active}
                                                onChange={(event) => form.setData('is_active', event.target.checked)}
                                            />
                                            Gunakan SEO custom
                                        </label>
                                        <label className="flex items-center gap-2 rounded-xl border border-slate-200 p-3 text-sm font-semibold text-slate-700">
                                            <input
                                                type="checkbox"
                                                checked={form.data.noindex}
                                                onChange={(event) => form.setData('noindex', event.target.checked)}
                                            />
                                            Jangan index halaman ini
                                        </label>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <FieldLabel>Upload gambar OG</FieldLabel>
                                        <label className="flex min-h-48 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border border-dashed border-blue-200 bg-blue-50/60 text-center text-sm text-slate-600">
                                            {previewImage ? (
                                                <img src={previewImage} alt="Preview gambar SEO" className="h-48 w-full object-cover" />
                                            ) : (
                                                <span className="px-4">
                                                    <ImagePlus className="mx-auto mb-2 size-8 text-blue-600" />
                                                    Upload gambar untuk Open Graph / social sharing
                                                </span>
                                            )}
                                            <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={updateImage} />
                                        </label>
                                        <InputError message={form.errors.seo_image} />
                                    </div>

                                    <div className="space-y-2">
                                        <FieldLabel>Path gambar tersimpan</FieldLabel>
                                        <Input
                                            value={form.data.og_image}
                                            onChange={(event) => form.setData('og_image', event.target.value)}
                                            placeholder="seo-images/home.webp"
                                        />
                                        <p className="text-xs text-slate-500">
                                            Path relatif disimpan di database. URL absolut dibuat otomatis dari server saat ini.
                                        </p>
                                        <InputError message={form.errors.og_image} />
                                    </div>

                                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                                        <p className="text-xs font-bold tracking-[0.2em] text-slate-400 uppercase">Preview Google</p>
                                        <p className="mt-3 text-sm text-emerald-700">{form.data.canonical_url || activeSetting.path}</p>
                                        <p className="mt-1 text-lg font-semibold text-blue-800">{form.data.title || 'Judul SEO halaman'}</p>
                                        <p className="mt-1 line-clamp-3 text-sm text-slate-600">
                                            {form.data.description || 'Deskripsi halaman akan tampil di sini.'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </Panel>

                        <Panel title="Catatan scope SEO">
                            <div className="grid gap-4 text-sm text-slate-600 md:grid-cols-2">
                                <div className="rounded-2xl bg-slate-50 p-4">
                                    <p className="font-bold text-slate-900">Halaman yang diatur di sini</p>
                                    <p className="mt-2">Homepage, katalog kelas, daftar learning path, dan verifikasi sertifikat publik.</p>
                                </div>
                                <div className="rounded-2xl bg-slate-50 p-4">
                                    <p className="font-bold text-slate-900">SEO produk/course</p>
                                    <p className="mt-2">Tetap dikelola dari Course Builder agar title, description, slug, dan gambar unik per course.</p>
                                </div>
                            </div>
                        </Panel>

                        <div className="flex justify-end">
                            <Button type="submit" disabled={form.processing}>
                                <Save className="size-4" />
                                Simpan SEO
                            </Button>
                        </div>
                    </form>
                )}
            </div>
        </Shell>
    );
}

function toForm(setting?: SeoSetting): SeoForm {
    return {
        title: setting?.title ?? '',
        description: setting?.description ?? '',
        canonical_url: setting?.canonicalUrl ?? '',
        og_image: setting?.ogImage ?? '',
        seo_image: null,
        type: setting?.type ?? 'website',
        noindex: setting?.noindex ?? false,
        keywords: setting?.keywords?.length ? setting.keywords : [],
        is_active: setting?.isActive ?? true,
    };
}

function imageUrl(path?: string | null): string | null {
    if (!path) return null;

    if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('/')) {
        return path;
    }

    return `/storage/${path.replace(/^storage\//, '')}`;
}
