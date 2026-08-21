import { FieldLabel } from '@/components/form-field';
import InputError from '@/components/input-error';
import { Panel, Shell } from '@/components/platform';
import { SearchableSelect } from '@/components/searchable-select';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { confirmDelete } from '@/lib/confirm-delete';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { BookOpen, Boxes, Eye, FileQuestion, FileText, MousePointer2, Pencil, Plus, Trash2 } from 'lucide-react';
import { Children, FormEvent, ReactNode, isValidElement, useState } from 'react';

interface Course {
    id: number;
    learning_path_id?: number | null;
    learning_path_order: number;
    instructor_id?: number | null;
    certificate_template_id?: number | null;
    title: string;
    slug?: string | null;
    description?: string;
    level: string;
    price_type: string;
    price: number;
    access_mode: string;
    learning_format?: string | null;
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
    status?: string;
}

interface Block {
    id: number;
    type: string;
    content?: string;
    metadata: string | BlockMetadata;
    order_no: number;
    status: string;
}

interface Quiz {
    id: number;
    lesson_id?: number | null;
    title: string;
    order_no: number;
    passing_score: number;
    is_final_exam: boolean | number;
    questions: string;
}

interface Lesson {
    id: number;
    title: string;
    order_no: number;
    is_required: boolean | number;
    available_at?: string | null;
    blocks: Block[];
    quizzes: Quiz[];
}

interface Chapter {
    id: number;
    title: string;
    order_no: number;
    lessons: Lesson[];
}

interface BuilderProps {
    routeBase: string;
    course?: Course | null;
    courses: Option[];
    learningPaths: Option[];
    instructors: Option[];
    certificateTemplates: Option[];
    prerequisiteOptions: Option[];
    selectedPrerequisiteIds: number[];
    chapters: Chapter[];
    finalQuizzes: Quiz[];
}

type EditorType = 'course' | 'chapter' | 'lesson' | 'block';
type BlockMetadata = Record<string, string | string[] | number | boolean | null | undefined>;

interface Editor {
    type: EditorType;
    id?: number;
    parentId?: number;
}

interface BuilderForm {
    [key: string]: string | boolean | string[] | BlockMetadata;
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
    learning_format: string;
    status: string;
    meta_title: string;
    meta_description: string;
    canonical_url: string;
    og_image: string;
    order_no: string;
    is_required: boolean;
    available_at: string;
    type: string;
    content: string;
    metadata: BlockMetadata;
    add_initial_block: boolean;
    initial_block_type: string;
    initial_block_content: string;
    initial_block_metadata: BlockMetadata;
    initial_block_status: string;
    lesson_id: string;
    passing_score: string;
    is_final_exam: boolean;
    questions: string;
}

const blankForm: BuilderForm = {
    learning_path_id: '',
    learning_path_order: '0',
    instructor_id: '',
    certificate_template_id: '',
    prerequisite_ids: [],
    title: '',
    slug: '',
    description: '',
    level: 'beginner',
    price_type: 'free',
    price: '0',
    access_mode: 'sequential',
    learning_format: 'guided',
    status: 'draft',
    meta_title: '',
    meta_description: '',
    canonical_url: '',
    og_image: '',
    order_no: '1',
    is_required: true,
    available_at: '',
    type: 'text',
    content: '',
    metadata: {},
    add_initial_block: true,
    initial_block_type: 'text',
    initial_block_content: '',
    initial_block_metadata: {},
    initial_block_status: 'draft',
    lesson_id: '',
    passing_score: '70',
    is_final_exam: false,
    questions: '[\n  {"question": "Pertanyaan", "answer": "Jawaban"}\n]',
};

const seoBrand = 'RoboAcademy';

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
        og_image: '/logo.png',
    };
}

function parseBlockMetadata(value: string | BlockMetadata | null | undefined): BlockMetadata {
    if (!value) {
        return {};
    }

    if (typeof value !== 'string') {
        return value;
    }

    try {
        const parsed = JSON.parse(value);

        return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch {
        return {};
    }
}

function defaultMetadataForType(type: string, current: BlockMetadata = {}): BlockMetadata {
    const metadata = { ...current };

    if (type === 'image') {
        return { alt: metadata.alt ?? '', caption: metadata.caption ?? '' };
    }

    if (type === 'video') {
        return { title: metadata.title ?? '', provider: metadata.provider ?? '', duration: metadata.duration ?? '' };
    }

    if (type === 'code') {
        return { language: metadata.language ?? 'cpp', file: metadata.file ?? 'program.ino' };
    }

    if (type === 'file') {
        return { label: metadata.label ?? '', source: metadata.source ?? '' };
    }

    if (type === 'checklist') {
        const items = Array.isArray(metadata.items) ? metadata.items.map(String) : [''];

        return { items: items.length > 0 ? items : [''] };
    }

    return {};
}

function contentLabelForType(type: string) {
    return (
        {
            text: 'Isi materi',
            image: 'URL gambar',
            video: 'URL video',
            code: 'Kode program',
            file: 'URL file',
            submission: 'Instruksi submission',
            checklist: 'Checklist',
            note: 'Catatan',
            warning: 'Peringatan',
        }[type] ?? 'Konten'
    );
}

function prepareBlockPayload(type: string, content: string, metadata: BlockMetadata) {
    const normalizedMetadata = normalizeBlockMetadata(type, metadata);

    return {
        content: type === 'checklist' ? (normalizedMetadata.items as string[]).join('\n') : content,
        metadata: normalizedMetadata,
    };
}

function prepareInitialBlockPayload(type: string, content: string, metadata: BlockMetadata) {
    const normalizedMetadata = normalizeBlockMetadata(type, metadata);

    return {
        initial_block_content: type === 'checklist' ? (normalizedMetadata.items as string[]).join('\n') : content,
        initial_block_metadata: normalizedMetadata,
    };
}

function normalizeBlockMetadata(type: string, metadata: BlockMetadata): BlockMetadata {
    const parsed = parseBlockMetadata(metadata);

    if (type === 'checklist') {
        return {
            items: (Array.isArray(parsed.items) ? parsed.items : [])
                .map(String)
                .map((item) => item.trim())
                .filter(Boolean),
        };
    }

    return Object.fromEntries(
        Object.entries(parsed).filter(([, value]) => {
            if (Array.isArray(value)) {
                return value.length > 0;
            }

            return value !== undefined && value !== null && String(value).trim() !== '';
        }),
    );
}

function blankLessonFor(chapter: Chapter): Lesson {
    return {
        id: 0,
        title: '',
        order_no: chapter.lessons.length + 1,
        is_required: true,
        available_at: '',
        blocks: [],
        quizzes: [],
    };
}

export default function CourseBuilder({
    routeBase,
    course,
    courses,
    learningPaths,
    instructors,
    certificateTemplates,
    prerequisiteOptions,
    selectedPrerequisiteIds,
    chapters,
    finalQuizzes,
}: BuilderProps) {
    const [editor, setEditor] = useState<Editor | null>(null);
    const form = useForm<BuilderForm>(blankForm);
    const isStudioCourse = course?.learning_format === 'interactive';

    const setCourseFormData = (patch: Partial<BuilderForm>) => {
        const nextData = { ...form.data, ...patch };
        const preferredSlug = Object.prototype.hasOwnProperty.call(patch, 'slug') ? nextData.slug : undefined;

        form.setData({
            ...nextData,
            ...generatedCourseSeo(nextData.title, nextData.description, preferredSlug),
        });
    };

    const openEditor = (next: Editor, entity?: Course | Chapter | Lesson | Block) => {
        const data = { ...blankForm };

        if (next.type === 'course' && entity) {
            const item = entity as Course;
            const generatedSeo = generatedCourseSeo(item.title, item.description ?? '', item.slug ?? undefined);
            Object.assign(data, {
                learning_path_id: item.learning_path_id ? String(item.learning_path_id) : '',
                learning_path_order: String(item.learning_path_order ?? 0),
                instructor_id: item.instructor_id ? String(item.instructor_id) : '',
                certificate_template_id: item.certificate_template_id ? String(item.certificate_template_id) : '',
                prerequisite_ids: selectedPrerequisiteIds.map(String),
                title: item.title,
                slug: item.slug ?? generatedSeo.slug,
                description: item.description ?? '',
                level: item.level,
                price_type: item.price_type,
                price: String(item.price),
                access_mode: item.access_mode,
                learning_format: item.learning_format ?? 'guided',
                status: item.status,
                meta_title: item.meta_title ?? generatedSeo.meta_title,
                meta_description: item.meta_description ?? generatedSeo.meta_description,
                canonical_url: item.canonical_url ?? generatedSeo.canonical_url,
                og_image: item.og_image ?? generatedSeo.og_image,
            });
        } else if (next.type === 'chapter' && entity) {
            const item = entity as Chapter;
            Object.assign(data, { title: item.title, order_no: String(item.order_no) });
        } else if (next.type === 'lesson' && entity) {
            const item = entity as Lesson;
            Object.assign(data, {
                title: item.title,
                order_no: String(item.order_no),
                is_required: Boolean(item.is_required),
                available_at: item.available_at?.slice(0, 16) ?? '',
            });
        } else if (next.type === 'block' && entity) {
            const item = entity as Block;
            Object.assign(data, {
                type: item.type,
                content: item.content ?? '',
                metadata: defaultMetadataForType(item.type, parseBlockMetadata(item.metadata)),
                order_no: String(item.order_no),
                status: item.status,
            });
        }

        form.setData(data);
        form.clearErrors();
        setEditor(next);
    };

    const submit = (event: FormEvent) => {
        event.preventDefault();
        if (!editor) return;

        form.transform((data) => ({
            ...data,
            ...(editor.type === 'course' ? generatedCourseSeo(data.title, data.description, data.slug) : {}),
            ...(editor.type === 'block' ? prepareBlockPayload(data.type, data.content, data.metadata) : {}),
            ...(editor.type === 'lesson'
                ? prepareInitialBlockPayload(data.initial_block_type, data.initial_block_content, data.initial_block_metadata)
                : {}),
            learning_path_id: data.learning_path_id || null,
            instructor_id: data.instructor_id || null,
            certificate_template_id: data.certificate_template_id || null,
            lesson_id: data.lesson_id || null,
            price: Number(data.price),
            learning_path_order: Number(data.learning_path_order),
            order_no: Number(data.order_no),
            passing_score: Number(data.passing_score),
            is_final_exam: data.is_final_exam,
            add_initial_block: data.add_initial_block,
        }));

        const options = { preserveScroll: true, onSuccess: () => setEditor(null) };
        const base = routeBase;

        if (editor.type === 'course') {
            if (editor.id) form.patch(`${base}/courses/${editor.id}`, options);
            else form.post(`${base}/courses`, options);
        } else if (editor.type === 'chapter') {
            if (editor.id) form.patch(`${base}/chapters/${editor.id}`, options);
            else form.post(`${base}/courses/${editor.parentId}/chapters`, options);
        } else if (editor.type === 'lesson') {
            if (editor.id) form.patch(`${base}/lessons/${editor.id}`, options);
            else form.post(`${base}/chapters/${editor.parentId}/lessons`, options);
        } else if (editor.type === 'block') {
            if (editor.id) form.patch(`${base}/blocks/${editor.id}`, options);
            else form.post(`${base}/lessons/${editor.parentId}/blocks`, options);
        }
    };

    const setBlockType = (type: string) => {
        form.setData({
            ...form.data,
            type,
            metadata: defaultMetadataForType(type, parseBlockMetadata(form.data.metadata)),
        });
    };

    const setInitialBlockType = (type: string) => {
        form.setData({
            ...form.data,
            initial_block_type: type,
            initial_block_metadata: defaultMetadataForType(type, parseBlockMetadata(form.data.initial_block_metadata)),
        });
    };

    const setBlockMetadata = (patch: BlockMetadata) => {
        form.setData('metadata', { ...parseBlockMetadata(form.data.metadata), ...patch });
    };

    const setInitialBlockMetadata = (patch: BlockMetadata) => {
        form.setData('initial_block_metadata', { ...parseBlockMetadata(form.data.initial_block_metadata), ...patch });
    };

    const remove = (type: EditorType | 'quiz', id: number, label: string) => {
        confirmDelete(`Hapus ${label}?`, () => {
            const resource = type === 'course' ? 'courses' : type === 'quiz' ? 'quizzes' : `${type}s`;

            router.delete(`${routeBase}/${resource}/${id}`, { preserveScroll: true });
        });
    };

    const openStudio = (lesson: Lesson) => {
        const interactiveBlock = lesson.blocks.find((block) => block.type === 'interactive');

        if (interactiveBlock) {
            router.visit(`${routeBase}/blocks/${interactiveBlock.id}/interactive-editor`);

            return;
        }

        router.post(`${routeBase}/lessons/${lesson.id}/interactive-editor`, {}, { preserveScroll: true });
    };

    return (
        <Shell
            title={course?.title ?? 'Course Builder'}
            eyebrow="Curriculum"
            actions={
                <Button asChild>
                    <Link href={`${routeBase}/courses/create`}>
                        <Plus className="size-4" />
                        Kursus
                    </Link>
                </Button>
            }
        >
            <Head title="Course Builder" />
            <div className="mb-6 flex flex-wrap items-center gap-2">
                {courses.map((item) => (
                    <Button key={item.id} asChild variant={item.id === course?.id ? 'default' : 'outline'} size="sm">
                        <Link href={`${routeBase}/course-builder?course=${item.id}`}>{item.title}</Link>
                    </Button>
                ))}
            </div>

            {!course ? (
                <Panel title="Belum ada kursus">
                    <p className="text-sm text-slate-600">Buat kursus untuk mulai menyusun materi.</p>
                </Panel>
            ) : (
                <>
                    <Panel
                        title="Informasi Kursus"
                        action={
                            <div className="flex gap-1">
                                <Button asChild variant="outline" size="sm">
                                    <Link href={`${routeBase}/courses/${course.id}/preview`}>
                                        <Eye className="size-4" />
                                        Preview
                                    </Link>
                                </Button>
                                <Button asChild variant="outline" size="sm">
                                    <Link href={`${routeBase}/courses/${course.id}/edit`}>
                                        <Pencil className="size-4" />
                                        Edit
                                    </Link>
                                </Button>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    aria-label="Hapus kursus"
                                    onClick={() => remove('course', course.id, course.title)}
                                >
                                    <Trash2 className="size-4 text-red-600" />
                                </Button>
                            </div>
                        }
                    >
                        <div className="grid gap-4 text-sm md:grid-cols-5">
                            <Info label="Level" value={course.level} />
                            <Info label="Harga" value={course.price_type === 'free' ? 'Gratis' : `Rp ${course.price.toLocaleString('id-ID')}`} />
                            <Info label="Mode akses" value={course.access_mode} />
                            <Info label="Format" value={course.learning_format === 'interactive' ? 'Studio Interaktif' : 'Materi Bertahap'} />
                            <Info label="Status" value={course.status} />
                        </div>
                        <p className="mt-4 leading-6 text-slate-600">{course.description || 'Belum ada deskripsi.'}</p>
                    </Panel>

                    <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_320px]">
                        <div className="space-y-5">
                            {chapters.map((chapter) => (
                                <Panel
                                    key={chapter.id}
                                    title={`${chapter.order_no}. ${chapter.title}`}
                                    action={
                                        <div className="flex gap-1">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                aria-label="Edit bab"
                                                onClick={() => openEditor({ type: 'chapter', id: chapter.id }, chapter)}
                                            >
                                                <Pencil className="size-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                aria-label="Hapus bab"
                                                onClick={() => remove('chapter', chapter.id, chapter.title)}
                                            >
                                                <Trash2 className="size-4 text-red-600" />
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => openEditor({ type: 'lesson', parentId: chapter.id }, blankLessonFor(chapter))}
                                            >
                                                <Plus className="size-4" />
                                                Lesson
                                            </Button>
                                        </div>
                                    }
                                >
                                    <div className="space-y-4">
                                        {chapter.lessons.map((lesson) => (
                                            <div key={lesson.id} className="rounded-lg border border-slate-200 p-4">
                                                <div className="flex flex-wrap items-center justify-between gap-3">
                                                    <div className="flex items-center gap-3">
                                                        <BookOpen className="size-5 text-blue-700" />
                                                        <div>
                                                            <p className="font-bold">
                                                                {lesson.order_no}. {lesson.title}
                                                            </p>
                                                            <p className="text-xs text-slate-500">
                                                                {lesson.is_required ? 'Wajib' : 'Opsional'} ·{' '}
                                                                {isStudioCourse ? 'Studio Interaktif' : `${lesson.blocks.length} blok`} ·{' '}
                                                                {lesson.quizzes.length} kuis
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-1">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            aria-label="Edit lesson"
                                                            onClick={() => openEditor({ type: 'lesson', id: lesson.id }, lesson)}
                                                        >
                                                            <Pencil className="size-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            aria-label="Hapus lesson"
                                                            onClick={() => remove('lesson', lesson.id, lesson.title)}
                                                        >
                                                            <Trash2 className="size-4 text-red-600" />
                                                        </Button>
                                                        {isStudioCourse ? (
                                                            <Button type="button" size="sm" onClick={() => openStudio(lesson)}>
                                                                <MousePointer2 className="size-4" />
                                                                Buka Studio
                                                            </Button>
                                                        ) : (
                                                            <Button asChild variant="outline" size="sm">
                                                                <Link href={`${routeBase}/lessons/${lesson.id}/blocks/create`}>
                                                                    <Plus className="size-4" />
                                                                    Blok
                                                                </Link>
                                                            </Button>
                                                        )}
                                                        <Button asChild variant="outline" size="sm">
                                                            <Link href={`${routeBase}/courses/${course.id}/quizzes/create?lesson=${lesson.id}`}>
                                                                <Plus className="size-4" />
                                                                Kuis
                                                            </Link>
                                                        </Button>
                                                    </div>
                                                </div>
                                                <div className="mt-4 grid gap-3 md:grid-cols-2">
                                                    {isStudioCourse ? (
                                                        <StudioLessonCard lesson={lesson} onOpen={() => openStudio(lesson)} />
                                                    ) : (
                                                        lesson.blocks.map((block) => (
                                                            <ResourceRow
                                                                key={`block-${block.id}`}
                                                                icon={Boxes}
                                                                title={`${block.type} · ${block.status}`}
                                                                editHref={`${routeBase}/blocks/${block.id}/edit`}
                                                                secondaryHref={
                                                                    block.type === 'interactive'
                                                                        ? `${routeBase}/blocks/${block.id}/interactive-editor`
                                                                        : undefined
                                                                }
                                                                secondaryLabel="Editor Visual"
                                                                onDelete={() => remove('block', block.id, `blok ${block.type}`)}
                                                            />
                                                        ))
                                                    )}
                                                    {lesson.quizzes.map((quiz) => (
                                                        <ResourceRow
                                                            key={`quiz-${quiz.id}`}
                                                            icon={FileQuestion}
                                                            title={`${quiz.title} · passing ${quiz.passing_score}`}
                                                            editHref={`${routeBase}/quizzes/${quiz.id}/edit`}
                                                            onDelete={() => remove('quiz', quiz.id, quiz.title)}
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                        {chapter.lessons.length === 0 && <p className="text-sm text-slate-500">Bab ini belum memiliki lesson.</p>}
                                    </div>
                                </Panel>
                            ))}
                            <Button variant="outline" className="w-full" onClick={() => openEditor({ type: 'chapter', parentId: course.id })}>
                                <Plus className="size-4" />
                                Tambah Bab
                            </Button>
                        </div>

                        <Panel title="Ujian Akhir">
                            <Button asChild className="mb-4 w-full">
                                <Link href={`${routeBase}/courses/${course.id}/quizzes/create`}>
                                    <Plus className="size-4" />
                                    Tambah Ujian
                                </Link>
                            </Button>
                            {finalQuizzes.map((quiz) => (
                                <ResourceRow
                                    key={quiz.id}
                                    icon={FileText}
                                    title={`${quiz.title} · passing ${quiz.passing_score}`}
                                    editHref={`${routeBase}/quizzes/${quiz.id}/edit`}
                                    onDelete={() => remove('quiz', quiz.id, quiz.title)}
                                />
                            ))}
                        </Panel>
                    </div>
                </>
            )}

            <Dialog open={Boolean(editor)} onOpenChange={(value) => !value && setEditor(null)}>
                <DialogContent className="max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{editor ? `${editor.id ? 'Edit' : 'Tambah'} ${editorLabel(editor.type)}` : 'Editor'}</DialogTitle>
                    </DialogHeader>
                    {editor && (
                        <form onSubmit={submit} className="space-y-4">
                            {editor.type === 'course' && (
                                <>
                                    <TextField
                                        label="Judul"
                                        required
                                        value={form.data.title}
                                        error={form.errors.title}
                                        onChange={(value) => setCourseFormData({ title: value })}
                                    />
                                    <AreaField
                                        label="Deskripsi"
                                        required
                                        value={form.data.description}
                                        error={form.errors.description}
                                        onChange={(value) => setCourseFormData({ description: value })}
                                    />
                                    <TextField
                                        label="Slug SEO otomatis"
                                        required
                                        value={form.data.slug}
                                        error={form.errors.slug}
                                        onChange={(value) => setCourseFormData({ slug: value })}
                                    />
                                    <TextField
                                        label="Meta title otomatis"
                                        value={form.data.meta_title}
                                        error={form.errors.meta_title}
                                        onChange={() => undefined}
                                        readOnly
                                    />
                                    <AreaField
                                        label="Meta description otomatis"
                                        value={form.data.meta_description}
                                        error={form.errors.meta_description}
                                        onChange={() => undefined}
                                        readOnly
                                    />
                                    <TextField
                                        label="Canonical URL otomatis"
                                        value={form.data.canonical_url}
                                        error={form.errors.canonical_url}
                                        onChange={() => undefined}
                                        readOnly
                                    />
                                    <TextField
                                        label="OG image otomatis"
                                        value={form.data.og_image}
                                        error={form.errors.og_image}
                                        onChange={() => undefined}
                                        readOnly
                                    />
                                    <SelectField
                                        label="Learning Path"
                                        value={form.data.learning_path_id}
                                        onChange={(value) => form.setData('learning_path_id', value)}
                                    >
                                        <option value="">Tanpa learning path</option>
                                        {learningPaths.map((item) => (
                                            <option key={item.id} value={item.id}>
                                                {item.title}
                                            </option>
                                        ))}
                                    </SelectField>
                                    <TextField
                                        label="Urutan dalam learning path"
                                        type="number"
                                        value={form.data.learning_path_order}
                                        error={form.errors.learning_path_order}
                                        onChange={(value) => form.setData('learning_path_order', value)}
                                    />
                                    <SelectField
                                        label="Pengajar"
                                        value={form.data.instructor_id}
                                        onChange={(value) => form.setData('instructor_id', value)}
                                    >
                                        <option value="">Belum ditentukan</option>
                                        {instructors.map((item) => (
                                            <option key={item.id} value={item.id}>
                                                {item.name}
                                            </option>
                                        ))}
                                    </SelectField>
                                    <SelectField
                                        label="Template sertifikat"
                                        value={form.data.certificate_template_id}
                                        onChange={(value) => form.setData('certificate_template_id', value)}
                                    >
                                        <option value="">Gunakan template published</option>
                                        {certificateTemplates.map((item) => (
                                            <option key={item.id} value={item.id}>
                                                {item.name}
                                            </option>
                                        ))}
                                    </SelectField>
                                    <div className="space-y-2">
                                        <FieldLabel>Prasyarat kelas</FieldLabel>
                                        <div className="max-h-40 space-y-2 overflow-y-auto rounded-md border border-slate-200 p-3">
                                            {prerequisiteOptions.map((item) => {
                                                const id = String(item.id);

                                                return (
                                                    <label key={item.id} className="flex items-center gap-2 text-sm">
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
                                    <SelectField label="Level" required value={form.data.level} onChange={(value) => form.setData('level', value)}>
                                        <option value="beginner">Beginner</option>
                                        <option value="intermediate">Intermediate</option>
                                        <option value="advanced">Advanced</option>
                                    </SelectField>
                                    <SelectField
                                        label="Jenis harga"
                                        required
                                        value={form.data.price_type}
                                        onChange={(value) => form.setData('price_type', value)}
                                    >
                                        <option value="free">Gratis</option>
                                        <option value="paid">Berbayar</option>
                                    </SelectField>
                                    <TextField
                                        label="Harga"
                                        required
                                        type="number"
                                        value={form.data.price}
                                        error={form.errors.price}
                                        onChange={(value) => form.setData('price', value)}
                                    />
                                    <SelectField
                                        label="Mode akses"
                                        required
                                        value={form.data.access_mode}
                                        onChange={(value) => form.setData('access_mode', value)}
                                    >
                                        <option value="sequential">Sequential</option>
                                        <option value="open">Open</option>
                                        <option value="scheduled">Scheduled</option>
                                    </SelectField>
                                    <SelectField label="Status" required value={form.data.status} onChange={(value) => form.setData('status', value)}>
                                        <option value="draft">Draft</option>
                                        <option value="reviewed">Reviewed</option>
                                        <option value="published">Published</option>
                                        <option value="archived">Archived</option>
                                    </SelectField>
                                </>
                            )}
                            {editor.type === 'chapter' && (
                                <>
                                    <TextField
                                        label="Judul bab"
                                        required
                                        value={form.data.title}
                                        error={form.errors.title}
                                        onChange={(value) => form.setData('title', value)}
                                    />
                                    <TextField
                                        label="Urutan"
                                        required
                                        type="number"
                                        value={form.data.order_no}
                                        error={form.errors.order_no}
                                        onChange={(value) => form.setData('order_no', value)}
                                    />
                                </>
                            )}
                            {editor.type === 'lesson' && (
                                <>
                                    <TextField
                                        label="Judul lesson"
                                        required
                                        value={form.data.title}
                                        error={form.errors.title}
                                        onChange={(value) => form.setData('title', value)}
                                    />
                                    <TextField
                                        label="Urutan"
                                        required
                                        type="number"
                                        value={form.data.order_no}
                                        error={form.errors.order_no}
                                        onChange={(value) => form.setData('order_no', value)}
                                    />
                                    <TextField
                                        label="Tersedia mulai"
                                        type="datetime-local"
                                        value={form.data.available_at}
                                        error={form.errors.available_at}
                                        onChange={(value) => form.setData('available_at', value)}
                                    />
                                    <CheckField
                                        label="Lesson wajib diselesaikan"
                                        checked={form.data.is_required}
                                        onChange={(value) => form.setData('is_required', value)}
                                    />
                                    {!editor.id && isStudioCourse && (
                                        <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm leading-6 text-blue-900">
                                            Setelah lesson dibuat, sistem otomatis membuat draft Studio Interaktif dan langsung membuka Visual Editor.
                                        </div>
                                    )}
                                    {!editor.id && !isStudioCourse && (
                                        <div className="space-y-4 rounded-xl border border-blue-100 bg-blue-50/50 p-4">
                                            <div>
                                                <p className="text-sm font-bold text-slate-900">Materi awal</p>
                                                <p className="mt-1 text-sm leading-6 text-slate-600">
                                                    Aktifkan ini jika lesson langsung memiliki blok materi awal.
                                                </p>
                                            </div>
                                            <CheckField
                                                label="Tambahkan blok materi awal"
                                                checked={form.data.add_initial_block}
                                                onChange={(value) => form.setData('add_initial_block', value)}
                                            />
                                            {form.data.add_initial_block && (
                                                <div className="grid gap-4 md:grid-cols-2">
                                                    <SelectField
                                                        label="Tipe blok awal"
                                                        required
                                                        value={form.data.initial_block_type}
                                                        onChange={setInitialBlockType}
                                                    >
                                                        <option value="text">Text</option>
                                                        <option value="image">Image URL</option>
                                                        <option value="video">Video URL</option>
                                                        <option value="code">Code</option>
                                                        <option value="file">File URL</option>
                                                        <option value="submission">Submission</option>
                                                        <option value="checklist">Checklist</option>
                                                        <option value="note">Note</option>
                                                        <option value="warning">Warning</option>
                                                    </SelectField>
                                                    <SelectField
                                                        label="Status blok awal"
                                                        required
                                                        value={form.data.initial_block_status}
                                                        onChange={(value) => form.setData('initial_block_status', value)}
                                                    >
                                                        <option value="draft">Draft</option>
                                                        <option value="reviewed">Reviewed</option>
                                                        <option value="published">Published</option>
                                                    </SelectField>
                                                    <BlockContentFields
                                                        type={form.data.initial_block_type}
                                                        content={form.data.initial_block_content}
                                                        metadata={parseBlockMetadata(form.data.initial_block_metadata)}
                                                        contentError={form.errors.initial_block_content}
                                                        metadataError={form.errors.initial_block_metadata}
                                                        onContentChange={(value) => form.setData('initial_block_content', value)}
                                                        onMetadataChange={setInitialBlockMetadata}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </>
                            )}
                            {editor.type === 'block' && (
                                <>
                                    <SelectField label="Tipe blok" required value={form.data.type} onChange={setBlockType}>
                                        <option value="text">Text</option>
                                        <option value="image">Image</option>
                                        <option value="video">Video</option>
                                        <option value="code">Code</option>
                                        <option value="file">File</option>
                                        <option value="submission">Submission</option>
                                        <option value="checklist">Checklist</option>
                                        <option value="note">Note</option>
                                        <option value="warning">Warning</option>
                                    </SelectField>
                                    <BlockContentFields
                                        type={form.data.type}
                                        content={form.data.content}
                                        metadata={parseBlockMetadata(form.data.metadata)}
                                        contentError={form.errors.content}
                                        metadataError={form.errors.metadata}
                                        onContentChange={(value) => form.setData('content', value)}
                                        onMetadataChange={setBlockMetadata}
                                    />
                                    <TextField
                                        label="Urutan"
                                        required
                                        type="number"
                                        value={form.data.order_no}
                                        error={form.errors.order_no}
                                        onChange={(value) => form.setData('order_no', value)}
                                    />
                                    <SelectField label="Status" required value={form.data.status} onChange={(value) => form.setData('status', value)}>
                                        <option value="draft">Draft</option>
                                        <option value="reviewed">Reviewed</option>
                                        <option value="published">Published</option>
                                    </SelectField>
                                </>
                            )}
                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setEditor(null)}>
                                    Batal
                                </Button>
                                <Button type="submit" disabled={form.processing}>
                                    Simpan
                                </Button>
                            </DialogFooter>
                        </form>
                    )}
                </DialogContent>
            </Dialog>
        </Shell>
    );
}

function editorLabel(type: EditorType) {
    return { course: 'Kursus', chapter: 'Bab', lesson: 'Lesson', block: 'Blok Materi' }[type];
}

function Info({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <p className="text-xs font-bold text-slate-500 uppercase">{label}</p>
            <p className="mt-1 font-semibold capitalize">{value}</p>
        </div>
    );
}

function StudioLessonCard({ lesson, onOpen }: { lesson: Lesson; onOpen: () => void }) {
    const interactiveBlock = lesson.blocks.find((block) => block.type === 'interactive');

    return (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <p className="flex items-center gap-2 font-bold text-slate-950">
                        <MousePointer2 className="size-4 text-blue-700" />
                        Studio Visual
                    </p>
                    <p className="mt-1 text-sm leading-6 text-slate-600">
                        {interactiveBlock
                            ? `Draft studio tersedia · status ${interactiveBlock.status}`
                            : 'Belum ada draft studio. Sistem akan membuat draft otomatis saat dibuka.'}
                    </p>
                </div>
                <Button type="button" onClick={onOpen}>
                    <MousePointer2 className="size-4" />
                    Buka Studio
                </Button>
            </div>
        </div>
    );
}

function ResourceRow({
    icon: Icon,
    title,
    editHref,
    secondaryHref,
    secondaryLabel = 'Buka',
    onEdit,
    onDelete,
}: {
    icon: typeof Boxes;
    title: string;
    editHref?: string;
    secondaryHref?: string;
    secondaryLabel?: string;
    onEdit?: () => void;
    onDelete: () => void;
}) {
    const content = (
        <>
            <Icon className="size-4 shrink-0 text-blue-700" />
            <span className="min-w-0 flex-1 truncate text-sm font-semibold">{title}</span>
        </>
    );

    return (
        <div className="flex flex-col gap-3 rounded-lg border border-slate-200 p-3 sm:flex-row sm:items-center">
            {editHref ? (
                <Link href={editHref} className="flex min-w-0 flex-1 items-center gap-3 hover:text-blue-700">
                    {content}
                </Link>
            ) : (
                <button type="button" onClick={onEdit} className="flex min-w-0 flex-1 items-center gap-3 text-left hover:text-blue-700">
                    {content}
                </button>
            )}
            {editHref ? (
                <Button asChild variant="ghost" size="icon" aria-label="Edit">
                    <Link href={editHref}>
                        <Pencil className="size-4" />
                    </Link>
                </Button>
            ) : (
                <Button variant="ghost" size="icon" aria-label="Edit" onClick={onEdit}>
                    <Pencil className="size-4" />
                </Button>
            )}
            {secondaryHref && (
                <Button asChild size="sm" className="w-full sm:w-auto">
                    <Link href={secondaryHref}>
                        <MousePointer2 className="size-4" />
                        {secondaryLabel}
                    </Link>
                </Button>
            )}
            <Button variant="ghost" size="icon" aria-label="Hapus" onClick={onDelete}>
                <Trash2 className="size-4 text-red-600" />
            </Button>
        </div>
    );
}

function BlockContentFields({
    type,
    content,
    metadata,
    contentError,
    metadataError,
    onContentChange,
    onMetadataChange,
}: {
    type: string;
    content: string;
    metadata: BlockMetadata;
    contentError?: string;
    metadataError?: string;
    onContentChange: (value: string) => void;
    onMetadataChange: (patch: BlockMetadata) => void;
}) {
    const checklistItems = Array.isArray(metadata.items) ? metadata.items.map(String) : [''];

    const updateChecklistItem = (index: number, value: string) => {
        onMetadataChange({
            items: checklistItems.map((item, itemIndex) => (itemIndex === index ? value : item)),
        });
    };

    const addChecklistItem = () => {
        onMetadataChange({ items: [...checklistItems, ''] });
    };

    const removeChecklistItem = (index: number) => {
        const nextItems = checklistItems.filter((_, itemIndex) => itemIndex !== index);

        onMetadataChange({ items: nextItems.length > 0 ? nextItems : [''] });
    };

    if (type === 'checklist') {
        return (
            <div className="space-y-3 md:col-span-2">
                <FieldLabel required>Item checklist</FieldLabel>
                <div className="space-y-2">
                    {checklistItems.map((item, index) => (
                        <div key={index} className="flex gap-2">
                            <Input
                                value={item}
                                onChange={(event) => updateChecklistItem(index, event.target.value)}
                                placeholder={`Checklist ${index + 1}`}
                            />
                            <Button type="button" variant="outline" onClick={() => removeChecklistItem(index)} disabled={checklistItems.length === 1}>
                                Hapus
                            </Button>
                        </div>
                    ))}
                </div>
                <Button type="button" variant="outline" onClick={addChecklistItem}>
                    <Plus className="size-4" />
                    Tambah Item
                </Button>
                <InputError message={metadataError || contentError} />
            </div>
        );
    }

    return (
        <>
            <div className="md:col-span-2">
                <AreaField
                    label={contentLabelForType(type)}
                    required={type !== 'submission'}
                    value={content}
                    error={contentError}
                    onChange={onContentChange}
                />
                {['image', 'video', 'file'].includes(type) && (
                    <p className="mt-1 text-xs text-slate-500">Isi URL lengkap, misalnya https://example.com/materi.</p>
                )}
            </div>

            {type === 'image' && (
                <>
                    <TextField
                        label="Alt text gambar"
                        value={String(metadata.alt ?? '')}
                        error={metadataError}
                        onChange={(value) => onMetadataChange({ alt: value })}
                    />
                    <TextField
                        label="Caption gambar"
                        value={String(metadata.caption ?? '')}
                        onChange={(value) => onMetadataChange({ caption: value })}
                    />
                </>
            )}

            {type === 'video' && (
                <>
                    <TextField
                        label="Judul video"
                        value={String(metadata.title ?? '')}
                        error={metadataError}
                        onChange={(value) => onMetadataChange({ title: value })}
                    />
                    <TextField label="Durasi" value={String(metadata.duration ?? '')} onChange={(value) => onMetadataChange({ duration: value })} />
                    <TextField label="Provider" value={String(metadata.provider ?? '')} onChange={(value) => onMetadataChange({ provider: value })} />
                </>
            )}

            {type === 'code' && (
                <>
                    <TextField
                        label="Nama file"
                        value={String(metadata.file ?? 'program.ino')}
                        error={metadataError}
                        onChange={(value) => onMetadataChange({ file: value })}
                    />
                    <SelectField
                        label="Bahasa kode"
                        value={String(metadata.language ?? 'cpp')}
                        onChange={(value) => onMetadataChange({ language: value })}
                    >
                        <option value="cpp">Arduino/C++</option>
                        <option value="python">Python</option>
                        <option value="javascript">JavaScript</option>
                        <option value="text">Plain text</option>
                    </SelectField>
                </>
            )}

            {type === 'file' && (
                <>
                    <TextField
                        label="Label tombol/file"
                        value={String(metadata.label ?? '')}
                        error={metadataError}
                        onChange={(value) => onMetadataChange({ label: value })}
                    />
                    <TextField label="Sumber file" value={String(metadata.source ?? '')} onChange={(value) => onMetadataChange({ source: value })} />
                </>
            )}
        </>
    );
}

function TextField({
    label,
    value,
    error,
    type = 'text',
    readOnly = false,
    required = false,
    onChange,
}: {
    label: string;
    value: string;
    error?: string;
    type?: string;
    readOnly?: boolean;
    required?: boolean;
    onChange: (value: string) => void;
}) {
    return (
        <div className="space-y-2">
            <FieldLabel required={required}>{label}</FieldLabel>
            <Input type={type} value={value} readOnly={readOnly} onChange={(event) => onChange(event.target.value)} />
            <InputError message={error} />
        </div>
    );
}

function AreaField({
    label,
    value,
    error,
    readOnly = false,
    required = false,
    onChange,
}: {
    label: string;
    value: string;
    error?: string;
    readOnly?: boolean;
    required?: boolean;
    onChange: (value: string) => void;
}) {
    return (
        <div className="space-y-2">
            <FieldLabel required={required}>{label}</FieldLabel>
            <textarea
                className="min-h-28 w-full rounded-md border border-slate-200 bg-white p-3 text-sm"
                value={value}
                readOnly={readOnly}
                onChange={(event) => onChange(event.target.value)}
            />
            <InputError message={error} />
        </div>
    );
}

function SelectField({
    label,
    value,
    children,
    required = false,
    onChange,
}: {
    label: string;
    value: string;
    children: ReactNode;
    required?: boolean;
    onChange: (value: string) => void;
}) {
    const options = Children.toArray(children)
        .filter(isValidElement)
        .map((child) => {
            const props = child.props as { value?: string; children?: ReactNode };

            return {
                value: String(props.value ?? ''),
                label: String(props.children ?? props.value ?? ''),
            };
        });

    return (
        <div className="space-y-2">
            <FieldLabel required={required}>{label}</FieldLabel>
            <SearchableSelect value={value} onChange={onChange} options={options} placeholder={label} />
        </div>
    );
}

function CheckField({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
    return (
        <label className="flex items-center gap-3 rounded-lg border border-slate-200 p-3 text-sm font-semibold">
            <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
            {label}
        </label>
    );
}
