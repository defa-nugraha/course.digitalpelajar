import InputError from '@/components/input-error';
import { Crumb, Panel, ProgressBar, Shell } from '@/components/platform';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Head, Link, router, useForm } from '@inertiajs/react';
import {
    CheckCircle2,
    ClipboardCheck,
    Code2,
    Copy,
    FileText,
    Image,
    Info,
    Lock,
    MessageSquare,
    PlayCircle,
    TriangleAlert,
    Upload,
    Video,
} from 'lucide-react';
import { FormEvent, ReactNode, useEffect, useState } from 'react';

interface Lesson {
    id: number;
    title: string;
    state: 'done' | 'current' | 'locked';
}

interface Chapter {
    id: number;
    title: string;
    lessons: Lesson[];
}

interface ContentBlock {
    id: number;
    type: string;
    content: string;
    status: string;
    metadata: Record<string, string | string[]>;
    steps?: BlockStep[];
    hasCustomSteps?: boolean;
    currentStepIndex?: number;
}

interface BlockStep {
    title: string;
    content: string;
}

interface QuizData {
    id: number;
    title: string;
    passingScore: number;
    bestScore: number;
    questions: { index: number; question: string; options?: string[] }[];
}

interface SubmissionData {
    id: number;
    status: string;
    score?: number | null;
    feedback?: string | null;
    submittedAt: string;
}

interface LessonItem {
    kind: 'block' | 'quiz';
    id: number;
    type?: string;
    content?: string;
    status?: string;
    metadata?: Record<string, string | string[] | number>;
    steps?: BlockStep[];
    hasCustomSteps?: boolean;
    currentStepIndex?: number;
    title?: string;
    passingScore?: number;
    bestScore?: number;
    questions?: { index: number; question: string; options?: string[] }[];
}

interface LearningProps {
    course: {
        id: number;
        title: string;
        description: string;
        progress: number;
        accessMode: string;
        chapters: Chapter[];
    };
    currentLesson?: Lesson | null;
    blocks: ContentBlock[];
    lessonItems?: LessonItem[];
    quiz?: QuizData | null;
    finalQuiz?: QuizData | null;
    submission?: SubmissionData | null;
}

export default function Learning({ course, currentLesson, blocks, lessonItems = [], quiz, finalQuiz, submission }: LearningProps) {
    const [activeQuiz, setActiveQuiz] = useState<QuizData | null>(null);
    const [submissionOpen, setSubmissionOpen] = useState(false);
    const [copiedBlockId, setCopiedBlockId] = useState<number | null>(null);
    const quizForm = useForm<{ answers: string[] }>({ answers: [] });
    const submissionForm = useForm({
        lesson_id: currentLesson ? String(currentLesson.id) : '',
        code: '',
        report: null as File | null,
        image: null as File | null,
        video_url: '',
    });
    const submissionBlock = blocks.find((block) => block.type === 'submission');
    const videoBlock = blocks.find((block) => block.type === 'video');
    const renderedItems: LessonItem[] =
        lessonItems.length > 0
            ? lessonItems
            : blocks.map((block) => ({
                  ...block,
                  kind: 'block' as const,
              }));
    const unfinishedStepBlocks = renderedItems.filter((item) => {
        if (item.kind !== 'block' || !item.hasCustomSteps) {
            return false;
        }

        const steps = readableSteps(item.steps);

        return steps.length > 1 && (item.currentStepIndex ?? 0) < steps.length - 1;
    });
    const canCompleteLesson = Boolean(currentLesson) && currentLesson?.state !== 'done' && unfinishedStepBlocks.length === 0;

    const openQuiz = (item: QuizData) => {
        setActiveQuiz(item);
        quizForm.setData(
            'answers',
            item.questions.map(() => ''),
        );
        quizForm.clearErrors();
    };

    const submitQuiz = (event: FormEvent) => {
        event.preventDefault();
        if (!activeQuiz) return;
        quizForm.post(`/quizzes/${activeQuiz.id}/attempts`, {
            preserveScroll: true,
            onSuccess: () => setActiveQuiz(null),
        });
    };

    const submitProject = (event: FormEvent) => {
        event.preventDefault();
        submissionForm.post(`/courses/${course.id}/submissions`, {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                setSubmissionOpen(false);
                submissionForm.reset('code', 'report', 'image', 'video_url');
            },
        });
    };

    const completeLesson = () => {
        if (!currentLesson || !canCompleteLesson) return;
        router.post(`/courses/${course.id}/lessons/${currentLesson.id}/complete`, {}, { preserveScroll: true });
    };

    return (
        <>
            <Head title="Halaman Belajar" />
            <Shell title="Halaman Belajar" eyebrow="Belajar">
                <main className="grid gap-6 lg:grid-cols-[320px_1fr]">
                    <aside className="self-start rounded-2xl border border-slate-200 bg-white p-5 lg:sticky lg:top-24">
                        <h1 className="text-xl font-extrabold">{course.title}</h1>
                        <p className="mt-2 text-sm text-slate-500">Mode akses: {course.accessMode}</p>
                        <div className="mt-4 flex items-center gap-3">
                            <ProgressBar value={course.progress} />
                            <span className="text-sm font-bold text-blue-700">{course.progress}%</span>
                        </div>
                        <div className="mt-6 space-y-5">
                            {course.chapters.map((chapter) => (
                                <div key={chapter.id}>
                                    <p className="mb-2 text-sm font-bold text-slate-500">{chapter.title}</p>
                                    <div className="space-y-2">
                                        {chapter.lessons.map((lesson) =>
                                            lesson.state === 'locked' ? (
                                                <div
                                                    key={lesson.id}
                                                    className="flex items-center gap-3 rounded-lg border border-slate-200 p-3 text-sm text-slate-400"
                                                >
                                                    <Lock className="size-4" />
                                                    <span>{lesson.title}</span>
                                                </div>
                                            ) : (
                                                <Link
                                                    key={lesson.id}
                                                    href={`/learning?course=${course.id}&lesson=${lesson.id}`}
                                                    className="flex items-center gap-3 rounded-lg border border-slate-200 p-3 text-sm hover:border-blue-300 hover:bg-blue-50"
                                                >
                                                    {lesson.state === 'done' ? (
                                                        <CheckCircle2 className="size-4 text-emerald-600" />
                                                    ) : (
                                                        <PlayCircle className="size-4 text-blue-700" />
                                                    )}
                                                    <span className="font-semibold">{lesson.title}</span>
                                                </Link>
                                            ),
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </aside>
                    <section>
                        <Crumb items={['Dashboard', 'Kursus', course.title, currentLesson?.title ?? 'Lesson']} />
                        <div className="rounded-lg border border-blue-100 bg-blue-50 p-6 text-slate-950">
                            {videoBlock ? (
                                <a
                                    href={videoBlock.content}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex aspect-video items-center justify-center rounded-lg bg-white hover:bg-slate-50"
                                >
                                    <span className="text-center">
                                        <PlayCircle className="mx-auto size-16 text-blue-700" />
                                        <span className="mt-3 block font-bold text-blue-700">Buka video lesson</span>
                                    </span>
                                </a>
                            ) : (
                                <p className="text-sm font-bold tracking-wider text-blue-700 uppercase">Materi Lesson</p>
                            )}
                            <h2 className={`${videoBlock ? 'mt-4' : 'mt-2'} text-3xl font-extrabold`}>{currentLesson?.title ?? course.title}</h2>
                            {!videoBlock && <p className="mt-2 text-slate-600">{course.description}</p>}
                        </div>

                        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
                            <Panel title="Materi Lesson">
                                <div className="space-y-5">
                                    {renderedItems.map((item) =>
                                        item.kind === 'quiz' ? (
                                            <button
                                                key={`quiz-${item.id}`}
                                                type="button"
                                                onClick={() =>
                                                    openQuiz({
                                                        id: item.id,
                                                        title: item.title ?? 'Quiz',
                                                        passingScore: item.passingScore ?? 70,
                                                        bestScore: item.bestScore ?? 0,
                                                        questions: item.questions ?? [],
                                                    })
                                                }
                                                className="flex w-full items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4 text-left hover:border-blue-400"
                                            >
                                                <ClipboardCheck className="size-5 text-blue-700" />
                                                <span>
                                                    <span className="block font-bold">{item.title}</span>
                                                    <span className="text-sm text-slate-600">
                                                        Nilai terbaik {item.bestScore ?? 0} · passing {item.passingScore ?? 70}
                                                    </span>
                                                </span>
                                            </button>
                                        ) : (
                                            <LearningBlock
                                                key={`block-${item.id}`}
                                                item={item}
                                                submission={submission}
                                                copied={copiedBlockId === item.id}
                                                onCopy={async (content) => {
                                                    await navigator.clipboard.writeText(content ?? item.content ?? '');
                                                    setCopiedBlockId(item.id);
                                                    window.setTimeout(() => setCopiedBlockId(null), 1500);
                                                }}
                                                onSubmission={() => setSubmissionOpen(true)}
                                            />
                                        ),
                                    )}
                                    {renderedItems.length === 0 && <p className="leading-7 text-slate-600">{course.description}</p>}
                                </div>
                            </Panel>
                            <Panel title="Aktivitas Lesson">
                                <div className="space-y-3">
                                    {quiz && lessonItems.length === 0 && (
                                        <ActionButton
                                            icon={ClipboardCheck}
                                            title={`${quiz.title} · nilai terbaik ${quiz.bestScore}`}
                                            onClick={() => openQuiz(quiz)}
                                        />
                                    )}
                                    {submissionBlock && !renderedItems.some((item) => item.type === 'submission') && (
                                        <ActionButton
                                            icon={Upload}
                                            title={submission ? `Submission: ${submission.status}` : 'Kirim submission proyek'}
                                            onClick={() => setSubmissionOpen(true)}
                                        />
                                    )}
                                    <div className="flex items-center gap-3 rounded-lg border border-slate-200 p-3 text-sm font-semibold">
                                        <Code2 className="size-4 text-blue-700" />
                                        {blocks.length} block published
                                    </div>
                                    <Button asChild variant="outline" className="w-full">
                                        <Link href={`/courses/${course.id}/forum`}>
                                            <MessageSquare className="size-4" />
                                            Diskusi Forum
                                        </Link>
                                    </Button>
                                </div>
                                {submission?.feedback && (
                                    <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
                                        <p className="font-bold">Feedback pengajar</p>
                                        <p className="mt-1">{submission.feedback}</p>
                                    </div>
                                )}
                                {currentLesson?.state !== 'done' && unfinishedStepBlocks.length > 0 && (
                                    <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-900">
                                        Buka materi sampai step terakhir terlebih dahulu sebelum menandai lesson selesai.
                                    </div>
                                )}
                                <Button
                                    className="mt-5 w-full bg-[#1C7DE8] hover:bg-[#1469c7]"
                                    disabled={!canCompleteLesson}
                                    onClick={completeLesson}
                                >
                                    {currentLesson?.state === 'done' ? 'Lesson Sudah Selesai' : 'Tandai Lesson Selesai'}
                                </Button>
                            </Panel>
                        </div>

                        {finalQuiz && (
                            <Panel className="mt-6" title="Ujian Akhir">
                                <div className="flex flex-wrap items-center justify-between gap-4">
                                    <div>
                                        <p className="font-bold">{finalQuiz.title}</p>
                                        <p className="mt-1 text-sm text-slate-500">
                                            Passing score {finalQuiz.passingScore}. Nilai terbaik {finalQuiz.bestScore}.
                                        </p>
                                    </div>
                                    <Button onClick={() => openQuiz(finalQuiz)}>
                                        <ClipboardCheck className="size-4" />
                                        Kerjakan Ujian
                                    </Button>
                                </div>
                            </Panel>
                        )}
                    </section>
                </main>
            </Shell>

            <Dialog open={Boolean(activeQuiz)} onOpenChange={(value) => !value && setActiveQuiz(null)}>
                <DialogContent className="max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{activeQuiz?.title}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={submitQuiz} className="space-y-5">
                        {activeQuiz?.questions.map((question) => (
                            <div key={question.index} className="space-y-2">
                                <Label>
                                    {question.index + 1}. {question.question}
                                </Label>
                                {question.options && question.options.length > 0 ? (
                                    <div className="space-y-2">
                                        {question.options.map((option) => (
                                            <label
                                                key={option}
                                                className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 p-3 text-sm hover:border-blue-300 hover:bg-blue-50"
                                            >
                                                <input
                                                    type="radio"
                                                    name={`question-${question.index}`}
                                                    checked={(quizForm.data.answers[question.index] ?? '') === option}
                                                    onChange={() => {
                                                        const answers = [...quizForm.data.answers];
                                                        answers[question.index] = option;
                                                        quizForm.setData('answers', answers);
                                                    }}
                                                />
                                                {option}
                                            </label>
                                        ))}
                                    </div>
                                ) : (
                                    <Input
                                        value={quizForm.data.answers[question.index] ?? ''}
                                        onChange={(event) => {
                                            const answers = [...quizForm.data.answers];
                                            answers[question.index] = event.target.value;
                                            quizForm.setData('answers', answers);
                                        }}
                                    />
                                )}
                                <InputError message={quizForm.errors[`answers.${question.index}` as keyof typeof quizForm.errors]} />
                            </div>
                        ))}
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setActiveQuiz(null)}>
                                Batal
                            </Button>
                            <Button type="submit" disabled={quizForm.processing}>
                                Kirim Jawaban
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog open={submissionOpen} onOpenChange={setSubmissionOpen}>
                <DialogContent className="max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Submission Proyek</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={submitProject} className="space-y-4">
                        <div className="space-y-2">
                            <Label>Kode program</Label>
                            <textarea
                                className="min-h-32 w-full rounded-md border border-slate-200 bg-white p-3 font-mono text-sm"
                                value={submissionForm.data.code}
                                onChange={(event) => submissionForm.setData('code', event.target.value)}
                            />
                            <InputError message={submissionForm.errors.code} />
                        </div>
                        <FileField
                            label="Laporan (PDF/DOC)"
                            accept=".pdf,.doc,.docx"
                            error={submissionForm.errors.report}
                            onChange={(file) => submissionForm.setData('report', file)}
                        />
                        <FileField
                            label="Foto proyek"
                            accept="image/*"
                            error={submissionForm.errors.image}
                            onChange={(file) => submissionForm.setData('image', file)}
                        />
                        <div className="space-y-2">
                            <Label>URL video demonstrasi</Label>
                            <Input
                                value={submissionForm.data.video_url}
                                onChange={(event) => submissionForm.setData('video_url', event.target.value)}
                            />
                            <InputError message={submissionForm.errors.video_url} />
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setSubmissionOpen(false)}>
                                Batal
                            </Button>
                            <Button type="submit" disabled={submissionForm.processing}>
                                Kirim Submission
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}

function LearningBlock({
    item,
    submission,
    copied,
    onCopy,
    onSubmission,
}: {
    item: LessonItem;
    submission?: SubmissionData | null;
    copied: boolean;
    onCopy: (content?: string) => void;
    onSubmission: () => void;
}) {
    const metadata = item.metadata ?? {};
    const steps = readableSteps(item.steps);
    const hasCustomSteps = Boolean(item.hasCustomSteps);
    const hasSteps = hasCustomSteps && steps.length > 1;
    const [currentStep, setCurrentStep] = useState(Math.min(item.currentStepIndex ?? 0, Math.max(0, steps.length - 1)));
    const activeStep = steps[currentStep];
    const activeContent = item.type === 'text' ? (activeStep?.content ?? item.content) : item.content;
    const stepItem = { ...item, content: activeContent };
    const stepInstruction =
        hasCustomSteps && item.type !== 'text' && activeStep?.content ? (
            <div className="mb-4 rounded-xl border border-blue-100 bg-blue-50 p-4">
                <p className="mb-2 text-xs font-bold tracking-wide text-blue-700 uppercase">Instruksi step</p>
                <div className="prose-content" dangerouslySetInnerHTML={{ __html: activeStep.content }} />
            </div>
        ) : null;

    useEffect(() => {
        setCurrentStep(Math.min(item.currentStepIndex ?? 0, Math.max(0, steps.length - 1)));
    }, [item.currentStepIndex, item.id, steps.length]);

    const goToStep = (stepIndex: number) => {
        const nextStep = Math.min(Math.max(stepIndex, 0), Math.max(0, steps.length - 1));
        setCurrentStep(nextStep);
        router.post(`/learning/blocks/${item.id}/step`, { step_index: nextStep }, { preserveScroll: true, preserveState: true });
    };

    const withStepNavigation = (content: ReactNode) => (
        <div className={hasSteps ? 'rounded-2xl border border-slate-200 bg-white p-4' : ''}>
            {hasSteps && (
                <div className="mb-4 flex flex-col gap-3 border-b border-slate-200 pb-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <p className="text-xs font-bold tracking-wide text-blue-700 uppercase">
                            Step {currentStep + 1} dari {steps.length}
                        </p>
                        <h3 className="mt-1 font-bold text-slate-950">{activeStep?.title ?? `Step ${currentStep + 1}`}</h3>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button type="button" variant="outline" size="sm" disabled={currentStep === 0} onClick={() => goToStep(currentStep - 1)}>
                            Sebelumnya
                        </Button>
                        <Button type="button" size="sm" disabled={currentStep >= steps.length - 1} onClick={() => goToStep(currentStep + 1)}>
                            Berikutnya
                        </Button>
                    </div>
                </div>
            )}
            {stepInstruction}
            {content}
        </div>
    );

    if (item.type === 'code') {
        return withStepNavigation(
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 font-mono text-sm text-slate-800">
                <div className="mb-3 flex items-center justify-between text-slate-500">
                    <span>{String(metadata.file ?? 'program.ino')}</span>
                    <button type="button" onClick={() => onCopy(stepItem.content)} className="flex items-center gap-1 font-sans text-xs font-bold text-blue-700">
                        <Copy className="size-4" />
                        {copied ? 'Tersalin' : 'Salin'}
                    </button>
                </div>
                <pre className="overflow-x-auto whitespace-pre-wrap">{stepItem.content}</pre>
            </div>,
        );
    }

    if (item.type === 'image') {
        return withStepNavigation(
            <figure className="overflow-hidden rounded-lg border border-slate-200">
                <img src={stepItem.content} alt={String(metadata.alt ?? 'Gambar materi')} className="max-h-[520px] w-full object-contain" />
                {metadata.caption && <figcaption className="p-3 text-sm text-slate-500">{String(metadata.caption)}</figcaption>}
            </figure>,
        );
    }

    if (item.type === 'video') {
        return withStepNavigation(
            <a
                href={stepItem.content}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-3 rounded-lg border border-slate-200 p-4 font-semibold text-blue-700 hover:bg-blue-50"
            >
                <Video className="size-5" />
                Buka video materi
            </a>,
        );
    }

    if (item.type === 'file') {
        const href = String(metadata.download_url ?? stepItem.content ?? '#');

        return withStepNavigation(
            <a
                href={href}
                className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-900"
            >
                <FileText className="size-5" />
                {stepItem.content || 'Unduh file materi'}
            </a>,
        );
    }

    if (item.type === 'pdf') {
        const previewUrl = String(metadata.preview_url ?? metadata.download_url ?? '');
        const downloadUrl = String(metadata.download_url ?? previewUrl ?? '#');
        const title = String(metadata.label ?? metadata.original_name ?? stepItem.content ?? 'Materi PDF');

        return withStepNavigation(
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50 p-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-3">
                        <span className="rounded-xl bg-red-50 p-2 text-red-700">
                            <FileText className="size-5" />
                        </span>
                        <div>
                            <p className="font-bold text-slate-950">{title}</p>
                            <p className="text-xs text-slate-500">Preview PDF materi</p>
                        </div>
                    </div>
                    <Button asChild variant="outline" size="sm">
                        <a href={downloadUrl}>Unduh PDF</a>
                    </Button>
                </div>
                {previewUrl ? (
                    <iframe src={previewUrl} title={title} className="h-[70vh] min-h-[520px] w-full bg-slate-100" />
                ) : (
                    <p className="p-4 text-sm text-slate-500">Preview PDF belum tersedia.</p>
                )}
            </div>,
        );
    }

    if (item.type === 'submission') {
        const statusLabel = submission ? `Status: ${submission.status}` : 'Belum dikirim';

        return withStepNavigation(
            <div className="rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 to-white p-5">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="flex gap-4">
                        <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-2xl bg-violet-600 text-white shadow-sm">
                            <Upload className="size-5" />
                        </span>
                        <div>
                            <div className="flex flex-wrap items-center gap-2">
                                <p className="text-xs font-bold tracking-wider text-violet-700 uppercase">Tugas praktik</p>
                                <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-violet-700 shadow-sm">{statusLabel}</span>
                            </div>
                            <h3 className="mt-2 text-lg font-extrabold text-slate-950">Kirim hasil pekerjaan Anda</h3>
                            <p className="mt-2 leading-7 text-slate-700">
                                {stepItem.content || 'Upload kode, laporan, foto wiring, atau link video sesuai instruksi pengajar.'}
                            </p>
                            {submission?.feedback && (
                                <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                                    <p className="font-bold">Feedback pengajar</p>
                                    <p className="mt-1">{submission.feedback}</p>
                                </div>
                            )}
                        </div>
                    </div>
                    <Button type="button" onClick={onSubmission} className="shrink-0">
                        {submission ? 'Update submission' : 'Kirim submission'}
                        <Upload className="size-4" />
                    </Button>
                </div>
            </div>,
        );
    }

    if (item.type === 'checklist') {
        const values = Array.isArray(metadata.items) ? metadata.items : (stepItem.content ?? '').split('\n').filter(Boolean);

        return withStepNavigation(
            <div className="rounded-lg border border-slate-200 p-4">
                {values.map((value) => (
                    <div key={String(value)} className="flex items-center gap-2 py-1 text-sm">
                        <CheckCircle2 className="size-4 text-emerald-600" />
                        {String(value)}
                    </div>
                ))}
            </div>,
        );
    }

    if (item.type === 'note' || item.type === 'warning') {
        const warning = item.type === 'warning';
        const Icon = warning ? TriangleAlert : Info;

        return withStepNavigation(
            <div
                className={`flex gap-3 rounded-lg border p-4 ${warning ? 'border-amber-200 bg-amber-50 text-amber-900' : 'border-blue-200 bg-blue-50 text-blue-900'}`}
            >
                <Icon className="mt-0.5 size-5 shrink-0" />
                <p className="leading-7">{stepItem.content}</p>
            </div>,
        );
    }

    return withStepNavigation(
        <div className="leading-7 text-slate-600">
            {item.type === 'text' ? (
                <div className="prose-content" dangerouslySetInnerHTML={{ __html: stepItem.content || '<p>Block tanpa konten teks</p>' }} />
            ) : (
                <Image className="size-5" />
            )}
        </div>,
    );
}

function ActionButton({ icon: Icon, title, onClick }: { icon: typeof Upload; title: string; onClick: () => void }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="flex w-full items-center gap-3 rounded-lg border border-slate-200 p-3 text-left hover:border-blue-300 hover:bg-blue-50"
        >
            <Icon className="size-4 text-blue-700" />
            <span className="text-sm font-semibold">{title}</span>
        </button>
    );
}

function FileField({ label, accept, error, onChange }: { label: string; accept: string; error?: string; onChange: (file: File | null) => void }) {
    return (
        <div className="space-y-2">
            <Label>{label}</Label>
            <Input type="file" accept={accept} onChange={(event) => onChange(event.target.files?.[0] ?? null)} />
            <InputError message={error} />
        </div>
    );
}

function readableSteps(steps: BlockStep[] | undefined): BlockStep[] {
    return (steps ?? []).filter((step) => hasReadableContent(step.content));
}

function hasReadableContent(content: string): boolean {
    return content.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim() !== '' || /<(img|video)\b/i.test(content);
}
