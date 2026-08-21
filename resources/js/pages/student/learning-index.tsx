import { Panel, ProgressBar, Shell } from '@/components/platform';
import { Button } from '@/components/ui/button';
import { Head, Link } from '@inertiajs/react';
import { ArrowRight, BookOpen, Clock, Layers3 } from 'lucide-react';

interface LearningCourse {
    id: number;
    title: string;
    description?: string | null;
    level: string;
    learningPath: string;
    accessMode: string;
    status: string;
    progress: number;
    lessons: number;
    updatedAt: string;
    learningUrl: string;
    nextLesson?: {
        id: number;
        title: string;
        chapter: string;
    } | null;
}

export default function LearningIndex({ role, courses }: { role: string; courses: LearningCourse[] }) {
    const isTeacher = role === 'school_teacher';
    const catalogUrl = isTeacher ? '/teacher/catalog' : '/student/catalog';

    return (
        <Shell title="Belajar" eyebrow={isTeacher ? 'Guru Sekolah' : 'Siswa'}>
            <Head title="Belajar" />
            <section className="rounded-3xl border border-blue-100 bg-gradient-to-br from-blue-50 to-white p-6 md:p-8">
                <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
                    <div>
                        <p className="text-sm font-bold tracking-wider text-blue-700 uppercase">Pilih pelajaran</p>
                        <h2 className="mt-2 text-3xl font-extrabold text-slate-950">Lanjutkan kelas yang sedang diikuti</h2>
                        <p className="mt-2 max-w-2xl text-slate-600">
                            Pilih kelas terlebih dahulu supaya Anda tidak langsung masuk ke player materi yang salah.
                        </p>
                    </div>
                    <Button asChild variant="outline">
                        <Link href={catalogUrl}>Buka katalog internal</Link>
                    </Button>
                </div>
            </section>

            <div className="mt-6 grid gap-5 lg:grid-cols-2">
                {courses.map((course) => (
                    <Panel key={course.id}>
                        <div className="flex h-full flex-col">
                            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                                <div>
                                    <div className="flex flex-wrap gap-2">
                                        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">{course.level}</span>
                                        <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-bold text-violet-700">
                                            {course.learningPath}
                                        </span>
                                    </div>
                                    <h3 className="mt-3 text-xl font-extrabold text-slate-950">{course.title}</h3>
                                    <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">{course.description}</p>
                                </div>
                                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">{course.status}</span>
                            </div>

                            <div className="mt-5 grid gap-3 sm:grid-cols-3">
                                <Metric icon={BookOpen} label="Lesson" value={`${course.lessons}`} />
                                <Metric icon={Layers3} label="Mode" value={course.accessMode} />
                                <Metric icon={Clock} label="Aktivitas" value={course.updatedAt} />
                            </div>

                            <div className="mt-5">
                                <div className="mb-2 flex justify-between text-sm font-semibold text-slate-600">
                                    <span>Progress belajar</span>
                                    <span>{course.progress}%</span>
                                </div>
                                <ProgressBar value={course.progress} />
                            </div>

                            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                <p className="text-xs font-bold tracking-wider text-slate-500 uppercase">Pelajaran berikutnya</p>
                                <p className="mt-1 font-bold text-slate-950">{course.nextLesson?.title ?? 'Semua lesson sudah terbuka'}</p>
                                {course.nextLesson?.chapter && <p className="mt-1 text-sm text-slate-500">{course.nextLesson.chapter}</p>}
                            </div>

                            <Button asChild className="mt-5">
                                <Link href={course.learningUrl}>
                                    Lanjutkan pelajaran
                                    <ArrowRight className="size-4" />
                                </Link>
                            </Button>
                        </div>
                    </Panel>
                ))}
            </div>

            {courses.length === 0 && (
                <Panel className="mt-6" title="Belum ada kelas aktif">
                    <p className="text-sm leading-6 text-slate-600">
                        Anda belum mengikuti kelas aktif. Buka katalog internal untuk memilih kelas yang tersedia untuk akun Anda.
                    </p>
                    <Button asChild className="mt-4">
                        <Link href={catalogUrl}>Buka katalog internal</Link>
                    </Button>
                </Panel>
            )}
        </Shell>
    );
}

function Metric({ icon: Icon, label, value }: { icon: typeof BookOpen; label: string; value: string }) {
    return (
        <div className="rounded-xl border border-slate-200 bg-white p-3">
            <Icon className="size-4 text-blue-700" />
            <p className="mt-2 text-xs font-bold text-slate-500 uppercase">{label}</p>
            <p className="mt-1 truncate text-sm font-extrabold text-slate-950">{value}</p>
        </div>
    );
}
