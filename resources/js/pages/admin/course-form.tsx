import { FieldLabel } from '@/components/form-field';
import InputError from '@/components/input-error';
import { Panel, Shell } from '@/components/platform';
import { SearchableSelect } from '@/components/searchable-select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SharedData } from '@/types';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { ArrowLeft, Image, Save } from 'lucide-react';
import { Children, FormEvent, ReactNode, isValidElement, useEffect, useState } from 'react';

interface Course {
    id: number;
    learning_path_id?: number | null;
    learning_path_order: number;
    instructor_id?: number | null;
    certificate_template_id?: number | null;
    title: string;
    slug?: string | null;
    description?: string | null;
    level: string;
    price_type: string;
    price: number;
    access_mode: string;
    status: string;
    meta_title?: string | null;
    meta_description?: string | null;
    canonical_url?: string | null;
    og_image?: string | null;
}

interface Option {
    id: number;
    title?: string;
    name?: string;
}

interface CourseFormData {
    [key: string]: unknown;
    learning_path_id: string;
    learning_path_order: string;
    instructor_id: string;
    certificate_template_id: string;
    prerequisite_ids: string[];
    title: string;
    slug: string;
    description: string;
    level: string;
    price_type: string;
    price: string;
    access_mode: string;
    status: string;
    meta_title: string;
    meta_description: string;
    canonical_url: string;
    og_image: string;
    course_image: File | null;
}

const seoBrand = 'RoboAcademy';

export default function CourseForm({
    course,
    learningPaths,
    instructors,
    certificateTemplates,
    prerequisiteOptions,
    selectedPrerequisiteIds,
    backUrl,
    routeBase,
}: {
    course?: Course | null;
    learningPaths: Option[];
    instructors: Option[];
    certificateTemplates: Option[];
    prerequisiteOptions: Option[];
    selectedPrerequisiteIds: number[];
    backUrl: string;
    routeBase: string;
}) {
    const { auth } = usePage<SharedData>().props;
    const isInstructorRole = auth.user.role === 'internal_instructor';
    const fixedInstructor = isInstructorRole ? (instructors.find((item) => item.id === auth.user.id) ?? instructors[0]) : null;
    const initialSeo = generatedCourseSeo(course?.title ?? '', course?.description ?? '', course?.slug ?? undefined);
    const form = useForm<CourseFormData>({
        learning_path_id: course?.learning_path_id ? String(course.learning_path_id) : '',
        learning_path_order: String(course?.learning_path_order ?? 0),
        instructor_id: course?.instructor_id ? String(course.instructor_id) : fixedInstructor ? String(fixedInstructor.id) : '',
        certificate_template_id: course?.certificate_template_id ? String(course.certificate_template_id) : '',
        prerequisite_ids: selectedPrerequisiteIds.map(String),
        title: course?.title ?? '',
        slug: course?.slug ?? initialSeo.slug,
        description: course?.description ?? '',
        level: course?.level ?? 'beginner',
        price_type: course?.price_type ?? 'free',
        price: String(course?.price ?? 0),
        access_mode: course?.access_mode ?? 'sequential',
        status: course?.status ?? 'draft',
        meta_title: course?.meta_title ?? initialSeo.meta_title,
        meta_description: course?.meta_description ?? initialSeo.meta_description,
        canonical_url: course?.canonical_url ?? initialSeo.canonical_url,
        og_image: course?.og_image ?? '',
        course_image: null,
    });
    const [imagePreview, setImagePreview] = useState(publicImageUrl(form.data.og_image));

    useEffect(() => {
        if (!form.data.course_image) {
            setImagePreview(publicImageUrl(form.data.og_image));
            return;
        }

        const objectUrl = URL.createObjectURL(form.data.course_image);
        setImagePreview(objectUrl);

        return () => URL.revokeObjectURL(objectUrl);
    }, [form.data.course_image, form.data.og_image]);

    const setCourseData = (patch: Partial<CourseFormData>) => {
        const nextData = { ...form.data, ...patch };
        const preferredSlug = Object.prototype.hasOwnProperty.call(patch, 'slug') ? nextData.slug : undefined;

        form.setData({
            ...nextData,
            ...generatedCourseSeo(nextData.title, nextData.description, preferredSlug),
        });
    };

    const submit = (event: FormEvent) => {
        event.preventDefault();
        form.transform((data) => ({
            ...data,
            ...generatedCourseSeo(data.title, data.description, data.slug),
            learning_path_id: data.learning_path_id || null,
            certificate_template_id: data.certificate_template_id || null,
            instructor_id: isInstructorRole ? auth.user.id : data.instructor_id || null,
            price: Number(data.price),
            learning_path_order: Number(data.learning_path_order),
        }));

        if (course) {
            form.patch(`${routeBase}/courses/${course.id}`, { preserveScroll: true, forceFormData: true });
        } else {
            form.post(`${routeBase}/courses`, { preserveScroll: true, forceFormData: true });
        }
    };

    return (
        <Shell
            title={course ? 'Edit Kursus' : 'Tambah Kursus'}
            eyebrow="Course Builder"
            actions={
                <Button asChild variant="outline">
                    <Link href={backUrl}>
                        <ArrowLeft className="size-4" />
                        Kembali
                    </Link>
                </Button>
            }
        >
            <Head title={course ? 'Edit Kursus' : 'Tambah Kursus'} />
            <form onSubmit={submit} className="grid gap-6 xl:grid-cols-[1fr_380px]">
                <div className="space-y-6">
                    <Panel title="Informasi kursus">
                        <div className="grid gap-4 md:grid-cols-2">
                            <Field label="Judul" error={form.errors.title} required>
                                <Input value={form.data.title} onChange={(event) => setCourseData({ title: event.target.value })} />
                            </Field>
                            <Field label="Slug SEO otomatis" error={form.errors.slug}>
                                <Input value={form.data.slug} onChange={(event) => setCourseData({ slug: event.target.value })} />
                            </Field>
                        </div>
                        <Field className="mt-4" label="Deskripsi" error={form.errors.description}>
                            <textarea
                                className="min-h-32 w-full rounded-md border border-slate-200 bg-white p-3 text-sm"
                                value={form.data.description}
                                onChange={(event) => setCourseData({ description: event.target.value })}
                            />
                        </Field>
                    </Panel>

                    <Panel title="Kurikulum dan akses">
                        <div className="grid gap-4 md:grid-cols-2">
                            <Field label="Learning Path" error={form.errors.learning_path_id}>
                                <Select value={form.data.learning_path_id} onChange={(value) => form.setData('learning_path_id', value)}>
                                    <option value="">Tanpa learning path</option>
                                    {learningPaths.map((item) => (
                                        <option key={item.id} value={item.id}>
                                            {item.title}
                                        </option>
                                    ))}
                                </Select>
                            </Field>
                            <Field label="Urutan di learning path" error={form.errors.learning_path_order}>
                                <Input
                                    type="number"
                                    min={0}
                                    value={form.data.learning_path_order}
                                    onChange={(event) => form.setData('learning_path_order', event.target.value)}
                                />
                            </Field>
                            {isInstructorRole ? (
                                <Field label="Pengajar" error={form.errors.instructor_id} required>
                                    <Input value={fixedInstructor?.name ?? auth.user.name} disabled className="bg-slate-100 text-slate-600" />
                                    <p className="text-xs leading-5 text-slate-500">
                                        Untuk akun pengajar, pengajar otomatis memakai akun Anda dan tidak dapat diubah.
                                    </p>
                                </Field>
                            ) : (
                                <Field label="Pengajar" error={form.errors.instructor_id}>
                                    <Select value={form.data.instructor_id} onChange={(value) => form.setData('instructor_id', value)}>
                                        <option value="">Belum ditentukan</option>
                                        {instructors.map((item) => (
                                            <option key={item.id} value={item.id}>
                                                {item.name}
                                            </option>
                                        ))}
                                    </Select>
                                </Field>
                            )}
                            <Field label="Template sertifikat" error={form.errors.certificate_template_id}>
                                <Select
                                    value={form.data.certificate_template_id}
                                    onChange={(value) => form.setData('certificate_template_id', value)}
                                >
                                    <option value="">Gunakan template published</option>
                                    {certificateTemplates.map((item) => (
                                        <option key={item.id} value={item.id}>
                                            {item.name}
                                        </option>
                                    ))}
                                </Select>
                            </Field>
                            <Field label="Level" error={form.errors.level} required>
                                <Select value={form.data.level} onChange={(value) => form.setData('level', value)}>
                                    <option value="beginner">Beginner</option>
                                    <option value="intermediate">Intermediate</option>
                                    <option value="advanced">Advanced</option>
                                </Select>
                            </Field>
                            <Field label="Mode akses" error={form.errors.access_mode} required>
                                <Select value={form.data.access_mode} onChange={(value) => form.setData('access_mode', value)}>
                                    <option value="sequential">Sequential</option>
                                    <option value="open">Open</option>
                                    <option value="scheduled">Scheduled</option>
                                </Select>
                            </Field>
                            <Field label="Jenis harga" error={form.errors.price_type} required>
                                <Select
                                    value={form.data.price_type}
                                    onChange={(value) =>
                                        form.setData({
                                            ...form.data,
                                            price_type: value,
                                            price: value === 'free' ? '0' : form.data.price === '0' ? '100000' : form.data.price,
                                        })
                                    }
                                >
                                    <option value="free">Gratis</option>
                                    <option value="paid">Berbayar</option>
                                </Select>
                            </Field>
                            <Field label="Harga" error={form.errors.price} required>
                                <Input
                                    type="number"
                                    min={0}
                                    value={form.data.price}
                                    onChange={(event) => form.setData('price', event.target.value)}
                                />
                            </Field>
                            <Field label="Status" error={form.errors.status} required>
                                <Select value={form.data.status} onChange={(value) => form.setData('status', value)}>
                                    <option value="draft">Draft</option>
                                    <option value="reviewed">Reviewed</option>
                                    <option value="published">Published</option>
                                    <option value="archived">Archived</option>
                                </Select>
                            </Field>
                        </div>
                        <div className="mt-5 space-y-2">
                            <FieldLabel>Prasyarat kelas</FieldLabel>
                            <div className="grid gap-2 rounded-xl border border-slate-200 p-4 md:grid-cols-2">
                                {prerequisiteOptions.map((item) => {
                                    const id = String(item.id);

                                    return (
                                        <label key={item.id} className="flex items-center gap-2 text-sm font-medium text-slate-700">
                                            <input
                                                type="checkbox"
                                                checked={form.data.prerequisite_ids.includes(id)}
                                                onChange={(event) =>
                                                    form.setData(
                                                        'prerequisite_ids',
                                                        event.target.checked
                                                            ? [...form.data.prerequisite_ids, id]
                                                            : form.data.prerequisite_ids.filter((value) => value !== id),
                                                    )
                                                }
                                            />
                                            {item.title}
                                        </label>
                                    );
                                })}
                                {prerequisiteOptions.length === 0 && (
                                    <p className="text-sm text-slate-500">Belum ada kursus lain yang dapat dijadikan prasyarat.</p>
                                )}
                            </div>
                            <InputError message={form.errors.prerequisite_ids} />
                        </div>
                    </Panel>
                </div>

                <div className="space-y-6">
                    <Panel title="SEO otomatis">
                        <div className="space-y-4">
                            <Field label="Meta title" error={form.errors.meta_title}>
                                <Input value={form.data.meta_title} readOnly />
                            </Field>
                            <Field label="Meta description" error={form.errors.meta_description}>
                                <textarea
                                    className="min-h-28 w-full rounded-md border border-slate-200 bg-slate-50 p-3 text-sm"
                                    value={form.data.meta_description}
                                    readOnly
                                />
                            </Field>
                            <Field label="Canonical URL" error={form.errors.canonical_url}>
                                <Input value={form.data.canonical_url} readOnly />
                            </Field>
                            <Field label="Gambar course" error={form.errors.course_image}>
                                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                                    {imagePreview ? (
                                        <img src={imagePreview} alt="Preview gambar course" className="h-44 w-full object-cover" />
                                    ) : (
                                        <div className="flex h-44 flex-col items-center justify-center text-slate-400">
                                            <Image className="size-8" />
                                            <span className="mt-2 text-sm font-semibold">Belum ada gambar</span>
                                        </div>
                                    )}
                                </div>
                                <Input
                                    type="file"
                                    accept="image/png,image/jpeg,image/jpg,image/webp"
                                    onChange={(event) => form.setData('course_image', event.target.files?.[0] ?? null)}
                                />
                                <p className="text-xs leading-5 text-slate-500">
                                    Format JPG, PNG, atau WebP maksimal 4MB. Gambar ini akan muncul di card katalog dan metadata Open Graph.
                                </p>
                                {form.data.og_image && <p className="text-xs break-all text-slate-400">Path saat ini: {form.data.og_image}</p>}
                            </Field>
                        </div>
                    </Panel>
                    <Panel title="Preview publish">
                        {imagePreview && (
                            <img src={imagePreview} alt="Preview cover course" className="mb-4 h-40 w-full rounded-2xl object-cover" />
                        )}
                        <p className="text-xs font-bold tracking-wider text-blue-700 uppercase">{form.data.level}</p>
                        <h2 className="mt-2 text-2xl font-extrabold text-slate-950">{form.data.title || 'Judul kursus'}</h2>
                        <p className="mt-2 text-sm leading-6 text-slate-600">
                            {form.data.description || 'Deskripsi kursus akan menjadi dasar meta description dan halaman produk.'}
                        </p>
                        <p className="mt-4 rounded-lg bg-blue-50 p-3 text-sm font-semibold text-blue-800">/produk/{form.data.slug}</p>
                    </Panel>
                    <Button type="submit" className="w-full bg-[#1C7DE8] hover:bg-[#1469c7]" disabled={form.processing}>
                        <Save className="size-4" />
                        Simpan Kursus
                    </Button>
                </div>
            </form>
        </Shell>
    );
}

function slugify(value: string) {
    return (
        value
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '') || 'kelas-baru'
    );
}

function publicUrl(path: string) {
    const origin = typeof window === 'undefined' ? '' : window.location.origin;

    return `${origin}${path}`;
}

function publicImageUrl(path?: string | null) {
    if (!path) return '';
    if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('/')) return path;

    return `/storage/${path.replace(/^storage\//, '')}`;
}

function truncateSeo(value: string, maxLength: number) {
    return value.length > maxLength ? value.slice(0, maxLength).trim() : value;
}

function generatedCourseSeo(title: string, description: string, preferredSlug?: string) {
    const cleanTitle = title.trim() || 'Kelas Baru';
    const slug = slugify(preferredSlug || cleanTitle);
    const cleanDescription = description.replace(/\s+/g, ' ').trim();
    const metaDescription =
        cleanDescription ||
        `Pelajari ${cleanTitle} melalui kelas robotik terstruktur dengan materi praktik, kuis, submission, dan sertifikat digital.`;

    return {
        slug,
        meta_title: truncateSeo(`${cleanTitle} | ${seoBrand}`, 70),
        meta_description: truncateSeo(metaDescription, 165),
        canonical_url: publicUrl(`/produk/${slug}`),
    };
}

function Field({
    label,
    error,
    className = '',
    required = false,
    children,
}: {
    label: string;
    error?: string;
    className?: string;
    required?: boolean;
    children: React.ReactNode;
}) {
    return (
        <div className={`space-y-2 ${className}`}>
            <FieldLabel required={required}>{label}</FieldLabel>
            {children}
            <InputError message={error} />
        </div>
    );
}

function Select({ value, onChange, children }: { value: string; onChange: (value: string) => void; children: ReactNode }) {
    const options = Children.toArray(children)
        .filter(isValidElement)
        .map((child) => {
            const props = child.props as { value?: string; children?: ReactNode };

            return {
                value: String(props.value ?? ''),
                label: String(props.children ?? props.value ?? ''),
            };
        });

    return <SearchableSelect value={value} onChange={onChange} options={options} />;
}
