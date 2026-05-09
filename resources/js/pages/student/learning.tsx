import { Crumb, Panel, ProgressBar, PublicNav } from '@/components/platform';
import { Button } from '@/components/ui/button';
import { Head } from '@inertiajs/react';
import { CheckCircle2, ClipboardCheck, Code2, Copy, FileText, Lock, LucideIcon, PlayCircle, Upload } from 'lucide-react';

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
    quiz?: {
        id: number;
        title: string;
        passingScore: number;
    } | null;
}

export default function Learning({ course, currentLesson, blocks, quiz }: LearningProps) {
    const codeBlock = blocks.find((block) => block.type === 'code');
    const textBlock = blocks.find((block) => block.type === 'text' || block.type === 'file');
    const submissionBlock = blocks.find((block) => block.type === 'submission');

    return (
        <>
            <Head title="Halaman Belajar" />
            <div className="min-h-screen bg-[#FAF8FF]">
                <PublicNav />
                <main className="grid min-h-[calc(100vh-4rem)] lg:grid-cols-[320px_1fr]">
                    <aside className="border-r border-slate-200 bg-white p-5">
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
                                        {chapter.lessons.map((lesson) => (
                                            <div key={lesson.id} className="flex items-center gap-3 rounded-lg border border-slate-200 p-3 text-sm">
                                                {lesson.state === 'done' && <CheckCircle2 className="size-4 text-emerald-600" />}
                                                {lesson.state === 'current' && <PlayCircle className="size-4 text-blue-700" />}
                                                {lesson.state === 'locked' && <Lock className="size-4 text-slate-400" />}
                                                <span className={lesson.state === 'locked' ? 'text-slate-400' : 'font-semibold'}>{lesson.title}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </aside>
                    <section className="p-4 md:p-8">
                        <Crumb items={['Dashboard', 'Kursus', course.title, currentLesson?.title ?? 'Lesson']} />
                        <div className="rounded-lg border border-blue-100 bg-blue-50 p-6 text-slate-950">
                            <div className="flex aspect-video items-center justify-center rounded-lg bg-white">
                                <PlayCircle className="size-16 text-blue-700" />
                            </div>
                            <p className="mt-4 text-sm text-slate-500">Lesson aktif dari database</p>
                            <h2 className="mt-2 text-3xl font-extrabold">{currentLesson?.title ?? course.title}</h2>
                        </div>

                        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
                            <Panel title="Materi Lesson">
                                <p className="leading-7 text-slate-600">
                                    {textBlock?.content ?? course.description}
                                </p>
                                {codeBlock && (
                                    <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4 font-mono text-sm text-slate-800">
                                        <div className="mb-3 flex items-center justify-between text-slate-400">
                                            <span>{String(codeBlock.metadata.file ?? 'program.ino')}</span>
                                            <Copy className="size-4" />
                                        </div>
                                        <pre className="overflow-x-auto whitespace-pre-wrap">{codeBlock.content}</pre>
                                    </div>
                                )}
                                {textBlock?.type === 'file' && (
                                    <div className="mt-5 flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                                        <FileText className="size-5" />
                                        Materi PDF masih berstatus draft dan wajib direview sebelum publish.
                                    </div>
                                )}
                            </Panel>
                            <Panel title="Aktivitas Lesson">
                                <div className="space-y-3">
                                    {quiz && <Action icon={ClipboardCheck} title={`${quiz.title} - passing ${quiz.passingScore}`} />}
                                    {submissionBlock && <Action icon={Upload} title="Submission: kode, laporan, gambar, video" />}
                                    {codeBlock && <Action icon={Code2} title="Praktik kode program" />}
                                </div>
                                <Button className="mt-5 w-full bg-[#1C7DE8] hover:bg-[#1469c7]">Tandai Lesson Selesai</Button>
                            </Panel>
                        </div>
                    </section>
                </main>
            </div>
        </>
    );
}

function Action({ icon: Icon, title }: { icon: LucideIcon; title: string }) {
    return (
        <div className="flex items-center gap-3 rounded-lg border border-slate-200 p-3">
            <Icon className="size-4 text-blue-700" />
            <span className="text-sm font-semibold">{title}</span>
        </div>
    );
}
