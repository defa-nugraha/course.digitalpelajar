import { FieldLabel } from '@/components/form-field';
import InputError from '@/components/input-error';
import { Panel, Shell } from '@/components/platform';
import { RichTextEditor } from '@/components/rich-text-editor';
import { SearchableSelect } from '@/components/searchable-select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowLeft, FileText, Plus, Save, Trash2 } from 'lucide-react';
import { FormEvent, ReactNode } from 'react';

type BlockStep = { title: string; content: string };
type BlockMetadata = Record<string, unknown>;

interface BlockData {
    id: number;
    type: string;
    content?: string | null;
    metadata?: BlockMetadata | null;
    order_no: number;
    status: string;
    fileUrl?: string | null;
    fileName?: string | null;
}

interface LessonData {
    id: number;
    title: string;
    order_no: number;
    chapter: {
        id: number;
        title: string;
    };
}

interface CourseData {
    id: number;
    title: string;
}

interface BlockFormProps {
    block?: BlockData | null;
    lesson: LessonData;
    course: CourseData;
    backUrl: string;
    submitUrl: string;
    editorUploadUrl: string;
    nextOrder: number;
}

interface BlockFormData {
    [key: string]: string | File | null | BlockMetadata;
    type: string;
    content: string;
    metadata: BlockMetadata;
    material_file: File | null;
    order_no: string;
    status: string;
    _method: string;
}

const typeOptions = [
    { value: 'text', label: 'Teks / Materi tertulis' },
    { value: 'image', label: 'Gambar upload' },
    { value: 'video', label: 'Video URL' },
    { value: 'code', label: 'Kode program' },
    { value: 'file', label: 'File upload' },
    { value: 'pdf', label: 'PDF materi' },
    { value: 'submission', label: 'Instruksi submission' },
    { value: 'checklist', label: 'Checklist' },
    { value: 'note', label: 'Catatan' },
    { value: 'warning', label: 'Peringatan' },
];

const statusOptions = [
    { value: 'draft', label: 'Draft' },
    { value: 'reviewed', label: 'Reviewed' },
    { value: 'published', label: 'Published' },
];

export default function BlockForm({ block, lesson, course, backUrl, submitUrl, editorUploadUrl, nextOrder }: BlockFormProps) {
    const initialType = block?.type ?? 'text';
    const form = useForm<BlockFormData>({
        type: initialType,
        content: block?.content ?? '',
        metadata: defaultMetadataForType(initialType, block?.metadata ?? {}, block?.content ?? ''),
        material_file: null,
        order_no: String(block?.order_no ?? nextOrder),
        status: block?.status ?? 'draft',
        _method: block ? 'patch' : '',
    });

    const submit = (event: FormEvent) => {
        event.preventDefault();

        form.transform((data) => {
            const metadata = normalizeMetadata(data.type, data.metadata);

            return {
                ...data,
                metadata,
                content: blockContentForSubmit(data.type, data.content, metadata),
                _method: block ? 'patch' : undefined,
            };
        });

        form.post(submitUrl, {
            forceFormData: true,
            preserveScroll: true,
        });
    };

    const setType = (type: string) => {
        const useExistingBlockData = type === block?.type;
        const metadataSource = useExistingBlockData ? (block?.metadata ?? {}) : form.data.metadata;
        const contentSource = useExistingBlockData ? (block?.content ?? '') : type === 'text' ? form.data.content : '';

        form.setData({
            ...form.data,
            type,
            content: useExistingBlockData ? (block?.content ?? '') : '',
            material_file: null,
            metadata: defaultMetadataForType(type, metadataSource, contentSource),
        });
    };

    const setMetadata = (patch: BlockMetadata) => {
        form.setData('metadata', { ...form.data.metadata, ...patch });
    };

    return (
        <Shell
            title={block ? 'Edit Blok Materi' : 'Tambah Blok Materi'}
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
            <Head title={block ? 'Edit Blok Materi' : 'Tambah Blok Materi'} />
            <form onSubmit={submit} className="grid gap-6 xl:grid-cols-[1fr_360px]">
                <div className="space-y-6">
                    <Panel title="Konten blok">
                        <div className="grid gap-4 md:grid-cols-2">
                            <Field label="Tipe blok" error={form.errors.type} required>
                                <SearchableSelect value={form.data.type} onChange={setType} options={typeOptions} placeholder="Pilih tipe blok" />
                            </Field>
                            <Field label="Status" error={form.errors.status} required>
                                <SearchableSelect
                                    value={form.data.status}
                                    onChange={(value) => form.setData('status', value)}
                                    options={statusOptions}
                                    placeholder="Pilih status"
                                />
                            </Field>
                        </div>

                        <div className="mt-5">
                            <BlockContentFields
                                type={form.data.type}
                                content={form.data.content}
                                metadata={form.data.metadata}
                                file={form.data.material_file}
                                existingFileUrl={block?.fileUrl ?? null}
                                existingFileName={block?.fileName ?? null}
                                contentError={form.errors.content}
                                fileError={form.errors.material_file}
                                metadataError={form.errors.metadata}
                                editorUploadUrl={editorUploadUrl}
                                onContentChange={(value) => form.setData('content', value)}
                                onFileChange={(file) => form.setData('material_file', file)}
                                onMetadataChange={setMetadata}
                            />
                        </div>
                    </Panel>
                </div>

                <div className="space-y-6">
                    <Panel title="Pengaturan">
                        <div className="space-y-4">
                            <Field label="Urutan" error={form.errors.order_no} required>
                                <Input
                                    type="number"
                                    min={1}
                                    value={form.data.order_no}
                                    onChange={(event) => form.setData('order_no', event.target.value)}
                                />
                            </Field>
                            <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm leading-6 text-slate-700">
                                <p className="font-bold text-slate-950">{course.title}</p>
                                <p className="mt-1">{lesson.chapter.title}</p>
                                <p className="mt-1">Lesson {lesson.order_no}: {lesson.title}</p>
                            </div>
                            <Button type="submit" className="w-full" disabled={form.processing}>
                                <Save className="size-4" />
                                Simpan Blok
                            </Button>
                        </div>
                    </Panel>
                </div>
            </form>
        </Shell>
    );
}

function BlockContentFields({
    type,
    content,
    metadata,
    file,
    existingFileUrl,
    existingFileName,
    contentError,
    fileError,
    metadataError,
    editorUploadUrl,
    onContentChange,
    onFileChange,
    onMetadataChange,
}: {
    type: string;
    content: string;
    metadata: BlockMetadata;
    file: File | null;
    existingFileUrl?: string | null;
    existingFileName?: string | null;
    contentError?: string;
    fileError?: string;
    metadataError?: string;
    editorUploadUrl: string;
    onContentChange: (value: string) => void;
    onFileChange: (file: File | null) => void;
    onMetadataChange: (patch: BlockMetadata) => void;
}) {
    const steps = textSteps(metadata, type === 'text' ? content : '');
    const updateSteps = (nextSteps: BlockStep[]) => {
        onMetadataChange({ steps: nextSteps });

        if (type === 'text') {
            onContentChange(firstTextStepContent({ steps: nextSteps }));
        }
    };
    const stepEditor = (
        <BlockStepsEditor
            steps={steps}
            required={type === 'text'}
            contentError={type === 'text' ? contentError : undefined}
            editorUploadUrl={editorUploadUrl}
            onChange={updateSteps}
        />
    );

    if (type === 'text') {
        return stepEditor;
    }


    if (type === 'image') {
        return (
            <div className="space-y-4">
                {stepEditor}
                <Field label="Upload gambar" error={fileError} required={!existingFileUrl}>
                    <Input type="file" accept="image/*" onChange={(event) => onFileChange(event.target.files?.[0] ?? null)} />
                    {file && <p className="rounded-lg bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700">File baru: {file.name}</p>}
                    {existingFileUrl && (
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                            <p className="mb-2 text-xs font-bold text-slate-500 uppercase">Gambar saat ini</p>
                            <img src={existingFileUrl} alt={String(metadata.alt ?? 'Gambar materi')} className="max-h-64 w-full object-contain" />
                        </div>
                    )}
                </Field>
                <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Alt text gambar" error={metadataError}>
                        <Input value={String(metadata.alt ?? '')} onChange={(event) => onMetadataChange({ alt: event.target.value })} />
                    </Field>
                    <Field label="Caption">
                        <Input value={String(metadata.caption ?? '')} onChange={(event) => onMetadataChange({ caption: event.target.value })} />
                    </Field>
                </div>
            </div>
        );
    }

    if (type === 'file' || type === 'pdf') {
        const isPdf = type === 'pdf';

        return (
            <div className="space-y-4">
                {stepEditor}
                <Field label={isPdf ? 'Upload PDF materi' : 'Upload file materi'} error={fileError} required={!existingFileUrl}>
                    <Input type="file" accept={isPdf ? 'application/pdf,.pdf' : undefined} onChange={(event) => onFileChange(event.target.files?.[0] ?? null)} />
                    <p className="text-xs leading-5 text-slate-500">
                        {isPdf ? 'Maksimal 20MB. PDF akan tampil sebagai preview di halaman belajar siswa.' : 'Maksimal 20MB. File akan diunduh melalui endpoint aplikasi.'}
                    </p>
                    {file && <p className="rounded-lg bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700">File baru: {file.name}</p>}
                    {existingFileUrl && (
                        <a
                            href={existingFileUrl}
                            className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900"
                        >
                            <FileText className="size-4" />
                            {existingFileName || (isPdf ? 'PDF saat ini' : 'File saat ini')}
                        </a>
                    )}
                </Field>
                <Field label={isPdf ? 'Judul/label PDF' : 'Label tombol/file'} error={metadataError}>
                    <Input value={String(metadata.label ?? '')} onChange={(event) => onMetadataChange({ label: event.target.value })} />
                </Field>
            </div>
        );
    }

    if (type === 'video') {
        return (
            <div className="space-y-4">
                {stepEditor}
                <Field label="URL video" error={contentError} required>
                    <Input value={content} onChange={(event) => onContentChange(event.target.value)} placeholder="https://youtube.com/..." />
                </Field>
                <div className="grid gap-4 md:grid-cols-3">
                    <Field label="Judul video" error={metadataError}>
                        <Input value={String(metadata.title ?? '')} onChange={(event) => onMetadataChange({ title: event.target.value })} />
                    </Field>
                    <Field label="Durasi">
                        <Input value={String(metadata.duration ?? '')} onChange={(event) => onMetadataChange({ duration: event.target.value })} />
                    </Field>
                    <Field label="Provider">
                        <Input value={String(metadata.provider ?? '')} onChange={(event) => onMetadataChange({ provider: event.target.value })} />
                    </Field>
                </div>
            </div>
        );
    }

    if (type === 'code') {
        return (
            <div className="space-y-4">
                {stepEditor}
                <Field label="Kode program" error={contentError} required>
                    <textarea
                        className="min-h-72 w-full rounded-md border border-slate-200 bg-slate-950 p-4 font-mono text-sm text-slate-50"
                        value={content}
                        onChange={(event) => onContentChange(event.target.value)}
                    />
                </Field>
                <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Nama file" error={metadataError}>
                        <Input value={String(metadata.file ?? 'program.ino')} onChange={(event) => onMetadataChange({ file: event.target.value })} />
                    </Field>
                    <Field label="Bahasa kode">
                        <SearchableSelect
                            value={String(metadata.language ?? 'cpp')}
                            onChange={(value) => onMetadataChange({ language: value })}
                            options={[
                                { value: 'cpp', label: 'Arduino/C++' },
                                { value: 'python', label: 'Python' },
                                { value: 'javascript', label: 'JavaScript' },
                                { value: 'text', label: 'Plain text' },
                            ]}
                        />
                    </Field>
                </div>
            </div>
        );
    }

    if (type === 'checklist') {
        const items = checklistItems(metadata);

        return (
            <div className="space-y-4">
                {stepEditor}
                <div className="space-y-3">
                    <FieldLabel required>Item checklist</FieldLabel>
                    {items.map((item, index) => (
                        <div key={index} className="flex gap-2">
                            <Input
                                value={item}
                                onChange={(event) =>
                                    onMetadataChange({ items: items.map((value, itemIndex) => (itemIndex === index ? event.target.value : value)) })
                                }
                                placeholder={`Checklist ${index + 1}`}
                            />
                            <Button
                                type="button"
                                variant="outline"
                                disabled={items.length === 1}
                                onClick={() => onMetadataChange({ items: items.filter((_, itemIndex) => itemIndex !== index) })}
                            >
                                <Trash2 className="size-4" />
                            </Button>
                        </div>
                    ))}
                    <Button type="button" variant="outline" onClick={() => onMetadataChange({ items: [...items, ''] })}>
                        <Plus className="size-4" />
                        Tambah Item
                    </Button>
                    <InputError message={metadataError || contentError} />
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {stepEditor}
            <Field label={type === 'submission' ? 'Instruksi submission' : type === 'warning' ? 'Isi peringatan' : 'Isi catatan'} error={contentError} required>
                <textarea
                    className="min-h-40 w-full rounded-md border border-slate-200 bg-white p-3 text-sm"
                    value={content}
                    onChange={(event) => onContentChange(event.target.value)}
                />
            </Field>
        </div>
    );
}

function BlockStepsEditor({
    steps,
    required,
    contentError,
    editorUploadUrl,
    onChange,
}: {
    steps: BlockStep[];
    required: boolean;
    contentError?: string;
    editorUploadUrl: string;
    onChange: (steps: BlockStep[]) => void;
}) {
    return (
        <div className="space-y-4 rounded-2xl border border-blue-100 bg-blue-50/50 p-4">
            <div className="text-sm leading-6 text-blue-800">
                <p className="font-bold text-slate-950">Step pembelajaran</p>
                <p className="mt-1">
                    Pecah materi menjadi beberapa step agar siswa membaca bertahap. Posisi terakhir siswa akan tersimpan dan lesson belum bisa
                    ditandai selesai sebelum step terakhir dibuka.
                </p>
            </div>
            {steps.map((step, index) => (
                <div key={index} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-end">
                        <Field label={`Judul step ${index + 1}`}>
                            <Input
                                value={step.title}
                                onChange={(event) =>
                                    onChange(steps.map((item, stepIndex) => (stepIndex === index ? { ...item, title: event.target.value } : item)))
                                }
                                placeholder={`Step ${index + 1}`}
                            />
                        </Field>
                        <Button
                            type="button"
                            variant="outline"
                            disabled={steps.length === 1}
                            onClick={() => onChange(steps.filter((_, stepIndex) => stepIndex !== index))}
                        >
                            <Trash2 className="size-4" />
                            Hapus
                        </Button>
                    </div>
                    <Field label="Materi step" error={index === 0 ? contentError : undefined} required={required && index === 0}>
                        <RichTextEditor
                            value={step.content}
                            uploadUrl={editorUploadUrl}
                            onChange={(value) => onChange(steps.map((item, stepIndex) => (stepIndex === index ? { ...item, content: value } : item)))}
                        />
                    </Field>
                </div>
            ))}
            <Button type="button" variant="outline" onClick={() => onChange([...steps, { title: `Step ${steps.length + 1}`, content: '' }])}>
                <Plus className="size-4" />
                Tambah Step
            </Button>
            <InputError message={contentError} />
        </div>
    );
}

function Field({ label, error, children, required = false }: { label: string; error?: string; children: ReactNode; required?: boolean }) {
    return (
        <div className="space-y-2">
            <FieldLabel required={required}>{label}</FieldLabel>
            {children}
            <InputError message={error} />
        </div>
    );
}

function defaultMetadataForType(type: string, current: BlockMetadata = {}, content = ''): BlockMetadata {
    const steps = textSteps(current, type === 'text' ? content : '');

    if (type === 'text') {
        return { ...current, steps };
    }

    if (type === 'image') {
        return { alt: current.alt ?? '', caption: current.caption ?? '', steps };
    }

    if (type === 'video') {
        return { title: current.title ?? '', provider: current.provider ?? '', duration: current.duration ?? '', steps };
    }

    if (type === 'code') {
        return { language: current.language ?? 'cpp', file: current.file ?? 'program.ino', steps };
    }

    if (type === 'file' || type === 'pdf') {
        return { label: current.label ?? current.original_name ?? '', steps };
    }

    if (type === 'checklist') {
        return { items: checklistItems(current), steps };
    }

    return { steps };
}

function normalizeMetadata(type: string, metadata: BlockMetadata): BlockMetadata {
    const steps = textSteps(metadata).filter((step) => hasReadableStepContent(step.content));
    const cleanedMetadata = Object.fromEntries(
        Object.entries(metadata).filter(([key, value]) => {
            if (key === 'steps') {
                return false;
            }

            if (Array.isArray(value)) {
                return value.length > 0;
            }

            return value !== undefined && value !== null && String(value).trim() !== '';
        }),
    );

    if (type === 'text') {
        return {
            ...cleanedMetadata,
            steps,
        };
    }

    if (type === 'checklist') {
        return {
            ...cleanedMetadata,
            items: checklistItems(metadata).map((item) => item.trim()).filter(Boolean),
            ...(steps.length > 0 ? { steps } : {}),
        };
    }

    return {
        ...cleanedMetadata,
        ...(steps.length > 0 ? { steps } : {}),
    };
}

function blockContentForSubmit(type: string, content: string, metadata: BlockMetadata): string {
    if (type === 'checklist') {
        return checklistItems(metadata).join('\n');
    }

    if (type === 'text') {
        return firstTextStepContent(metadata) || content;
    }

    return content;
}

function checklistItems(metadata: BlockMetadata): string[] {
    const items = Array.isArray(metadata.items) ? metadata.items.map(String) : [''];

    return items.length > 0 ? items : [''];
}

function textSteps(metadata: BlockMetadata, fallbackContent = ''): BlockStep[] {
    const rawSteps = Array.isArray(metadata.steps) ? metadata.steps : [];
    const steps = rawSteps
        .filter((step): step is Record<string, unknown> => typeof step === 'object' && step !== null)
        .map((step, index) => ({
            title: String(step.title ?? `Step ${index + 1}`),
            content: String(step.content ?? ''),
        }));

    return steps.length > 0 ? steps : [{ title: 'Step 1', content: fallbackContent }];
}

function firstTextStepContent(metadata: BlockMetadata): string {
    return textSteps(metadata)
        .map((step) => step.content)
        .find((content) => hasReadableStepContent(content)) ?? '';
}

function hasReadableStepContent(content: string): boolean {
    return content.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim() !== '' || /<(img|video)\b/i.test(content);
}
