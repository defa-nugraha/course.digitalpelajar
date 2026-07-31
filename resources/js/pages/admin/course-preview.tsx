import { InteractiveBlockPlayer } from '@/components/interactive-learning';
import { Crumb, Panel, ProgressBar, PublicContent, PublicNav } from '@/components/platform';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, ClipboardCheck, Code2, FileText, Image, Lock, MessageSquare, PlayCircle, Upload, Video } from 'lucide-react';
import { useMemo, useState } from 'react';

interface PreviewBlock {
    id: number;
    type: string;
    content?: string | null;
    metadata?: Record<string, unknown> | null;
    status: string;
    orderNo: number;
}

interface PreviewQuestion {
    question?: string;
    answer?: string;
    options?: string[];
}

interface PreviewQuiz {
    id: number;
    title: string;
    status: string;
    orderNo: number;
    passingScore: number;
    questions: PreviewQuestion[];
}

interface PreviewLesson {
    id: number;
    title: string;
    orderNo: number;
    blocks: PreviewBlock[];
    quizzes: PreviewQuiz[];
}

interface PreviewCourse {
    id: number;
    title: string;
    description?: string | null;
    level: string;
    status: string;
    accessMode: string;
    prerequisites: string[];
    finalQuizzes: PreviewQuiz[];
    chapters: {
        id: number;
        title: string;
        orderNo: number;
        lessons: PreviewLesson[];
    }[];
}

type LessonItem =
    | (PreviewBlock & {
          kind: 'block';
      })
    | (PreviewQuiz & {
          kind: 'quiz';
      });

export default function CoursePreview({ course, routeBase }: { course: PreviewCourse; routeBase: string }) {
    const lessons = course.chapters.flatMap((chapter) => chapter.lessons);
    const [activeLessonId, setActiveLessonId] = useState<number | null>(lessons[0]?.id ?? null);
    const [activeQuiz, setActiveQuiz] = useState<PreviewQuiz | null>(null);
    const activeLesson = lessons.find((lesson) => lesson.id === activeLessonId) ?? lessons[0] ?? null;
    const lessonItems = useMemo<LessonItem[]>(() => {
        if (!activeLesson) return [];

        return [
            ...activeLesson.blocks.map((item) => ({ ...item, kind: 'block' as const })),
            ...activeLesson.quizzes.map((item) => ({ ...item, kind: 'quiz' as const })),
        ].sort((left, right) => left.orderNo - right.orderNo);
    }, [activeLesson]);

    return (
        <>
            <Head title={`Preview ${course.title}`} />
            <div className="min-h-screen bg-[#FAF8FF]">
                <PublicNav />
                <PublicContent skeleton="detail">
                    <main className="grid min-h-screen pt-16 lg:grid-cols-[320px_1fr]">
                        <aside className="border-r border-slate-200 bg-white p-5">
                            <Button asChild variant="outline" className="mb-5 w-full">
                                <Link href={`${routeBase}/course-builder?course=${course.id}`}>
                                    <ArrowLeft className="size-4" />
                                    Kembali ke Builder
                                </Link>
                            </Button>
                            <h1 className="text-xl font-extrabold">{course.title}</h1>
                            <p className="mt-2 text-sm text-slate-500">
                                Preview siswa · {course.level} · {course.accessMode}
                            </p>
                            <div className="mt-4 flex items-center gap-3">
                                <ProgressBar value={0} />
                                <span className="text-sm font-bold text-blue-700">0%</span>
                            </div>
                            <div className="mt-6 space-y-5">
                                {course.chapters.map((chapter) => (
                                    <div key={chapter.id}>
                                        <p className="mb-2 text-sm font-bold text-slate-500">
                                            {chapter.orderNo}. {chapter.title}
                                        </p>
                                        <div className="space-y-2">
                                            {chapter.lessons.map((lesson) => (
                                                <button
                                                    key={lesson.id}
                                                    type="button"
                                                    onClick={() => setActiveLessonId(lesson.id)}
                                                    className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left text-sm ${
                                                        activeLesson?.id === lesson.id
                                                            ? 'border-blue-300 bg-blue-50 text-blue-900'
                                                            : 'border-slate-200 hover:border-blue-300 hover:bg-blue-50'
                                                    }`}
                                                >
                                                    {activeLesson?.id === lesson.id ? (
                                                        <PlayCircle className="size-4 text-blue-700" />
                                                    ) : (
                                                        <Lock className="size-4 text-slate-400" />
                                                    )}
                                                    <span className="font-semibold">{lesson.title}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </aside>

                        <section className="p-4 md:p-8">
                            <Crumb items={['Admin', 'Preview Course', course.title, activeLesson?.title ?? 'Lesson']} />
                            <div className="rounded-lg border border-blue-100 bg-blue-50 p-6 text-slate-950">
                                <p className="text-sm font-bold tracking-wider text-blue-700 uppercase">Materi Lesson</p>
                                <h2 className="mt-2 text-3xl font-extrabold">{activeLesson?.title ?? course.title}</h2>
                                <p className="mt-2 text-slate-600">{course.description || 'Deskripsi course belum diisi.'}</p>
                                {course.prerequisites.length > 0 && (
                                    <p className="mt-3 text-sm font-semibold text-blue-900">Prasyarat: {course.prerequisites.join(', ')}</p>
                                )}
                            </div>

                            <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
                                <Panel title="Materi Lesson">
                                    <div className="space-y-5">
                                        {lessonItems.map((item) =>
                                            item.kind === 'quiz' ? (
                                                <button
                                                    key={`quiz-${item.id}`}
                                                    type="button"
                                                    onClick={() => setActiveQuiz(item)}
                                                    className="flex w-full items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4 text-left hover:border-blue-400"
                                                >
                                                    <ClipboardCheck className="size-5 text-blue-700" />
                                                    <span>
                                                        <span className="block font-bold">{item.title}</span>
                                                        <span className="text-sm text-slate-600">Passing score {item.passingScore}</span>
                                                    </span>
                                                </button>
                                            ) : (
                                                <PreviewBlockCard key={`block-${item.id}`} item={item} />
                                            ),
                                        )}
                                        {lessonItems.length === 0 && (
                                            <p className="leading-7 text-slate-600">Lesson belum memiliki materi atau kuis.</p>
                                        )}
                                    </div>
                                </Panel>
                                <Panel title="Aktivitas Lesson">
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-3 rounded-lg border border-slate-200 p-3 text-sm font-semibold">
                                            <Code2 className="size-4 text-blue-700" />
                                            {activeLesson?.blocks.length ?? 0} block materi
                                        </div>
                                        <div className="flex items-center gap-3 rounded-lg border border-slate-200 p-3 text-sm font-semibold">
                                            <ClipboardCheck className="size-4 text-blue-700" />
                                            {activeLesson?.quizzes.length ?? 0} kuis lesson
                                        </div>
                                        <Button variant="outline" className="w-full" disabled>
                                            <MessageSquare className="size-4" />
                                            Diskusi Forum
                                        </Button>
                                    </div>
                                    <Button className="mt-5 w-full bg-[#1C7DE8] hover:bg-[#1469c7]" disabled>
                                        Tandai Lesson Selesai
                                    </Button>
                                </Panel>
                            </div>

                            {course.finalQuizzes.length > 0 && (
                                <Panel className="mt-6" title="Ujian Akhir">
                                    <div className="space-y-3">
                                        {course.finalQuizzes.map((quiz) => (
                                            <div
                                                key={quiz.id}
                                                className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-slate-200 p-4"
                                            >
                                                <div>
                                                    <p className="font-bold">{quiz.title}</p>
                                                    <p className="mt-1 text-sm text-slate-500">Passing score {quiz.passingScore}</p>
                                                </div>
                                                <Button type="button" onClick={() => setActiveQuiz(quiz)}>
                                                    <ClipboardCheck className="size-4" />
                                                    Preview Ujian
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                </Panel>
                            )}
                        </section>
                    </main>
                </PublicContent>
            </div>

            <Dialog open={Boolean(activeQuiz)} onOpenChange={(value) => !value && setActiveQuiz(null)}>
                <DialogContent className="max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{activeQuiz?.title}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-5">
                        {activeQuiz?.questions.map((question, index) => (
                            <div key={index} className="space-y-2">
                                <Label>
                                    {index + 1}. {question.question || 'Pertanyaan belum diisi'}
                                </Label>
                                {question.options && question.options.length > 0 ? (
                                    <div className="space-y-2">
                                        {question.options.map((option) => (
                                            <label key={option} className="flex items-center gap-2 rounded-lg border border-slate-200 p-3 text-sm">
                                                <input type="radio" readOnly />
                                                {option}
                                            </label>
                                        ))}
                                    </div>
                                ) : (
                                    <Input disabled placeholder="Field jawaban siswa" />
                                )}
                            </div>
                        ))}
                        {activeQuiz?.questions.length === 0 && <p className="text-sm text-slate-500">Ujian belum memiliki pertanyaan.</p>}
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setActiveQuiz(null)}>
                            Tutup
                        </Button>
                        <Button type="button" disabled>
                            Kirim Jawaban
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

function PreviewBlockCard({ item }: { item: PreviewBlock }) {
    const metadata = item.metadata ?? {};

    if (item.type === 'code') {
        return (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 font-mono text-sm text-slate-800">
                <div className="mb-3 text-slate-500">{String(metadata.file ?? 'program.ino')}</div>
                <pre className="overflow-x-auto whitespace-pre-wrap">{item.content}</pre>
            </div>
        );
    }

    if (item.type === 'image') {
        return (
            <figure className="overflow-hidden rounded-lg border border-slate-200">
                {item.content ? (
                    <img src={item.content} alt={String(metadata.alt ?? 'Gambar materi')} className="max-h-[520px] w-full object-contain" />
                ) : (
                    <div className="flex h-40 items-center justify-center bg-slate-50 text-slate-400">
                        <Image className="size-6" />
                    </div>
                )}
                {Boolean(metadata.caption) && <figcaption className="p-3 text-sm text-slate-500">{String(metadata.caption)}</figcaption>}
            </figure>
        );
    }

    if (item.type === 'video') {
        return (
            <a
                href={item.content ?? '#'}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-3 rounded-lg border border-slate-200 p-4 font-semibold text-blue-700 hover:bg-blue-50"
            >
                <Video className="size-5" />
                Buka video materi
            </a>
        );
    }

    if (item.type === 'interactive') {
        return <InteractiveBlockPlayer metadata={(metadata ?? {}) as Record<string, unknown>} />;
    }

    if (item.type === 'file') {
        return (
            <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-900">
                <FileText className="size-5" />
                {item.content || 'File materi'}
            </div>
        );
    }

    if (item.type === 'submission') {
        return (
            <div className="flex w-full items-center gap-3 rounded-lg border border-violet-200 bg-violet-50 p-4 text-left font-semibold text-violet-900">
                <Upload className="size-5" />
                {item.content || 'Kirim submission proyek'}
            </div>
        );
    }

    return (
        <div className="rounded-lg border border-slate-200 bg-white p-4 leading-7 text-slate-600">
            {item.type === 'text' ? (
                <div className="prose-content" dangerouslySetInnerHTML={{ __html: item.content || '<p>Block tanpa konten teks</p>' }} />
            ) : (
                <p className="whitespace-pre-wrap">{item.content || 'Block tanpa konten teks'}</p>
            )}
        </div>
    );
}
