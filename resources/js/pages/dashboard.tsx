import { Panel, ProgressBar, Shell, StatCard } from '@/components/platform';
import { Button } from '@/components/ui/button';
import { Head, Link } from '@inertiajs/react';
import { ArrowRight, Award, BookOpen, CalendarDays, TrendingUp } from 'lucide-react';

interface DashboardCourse {
    id: number;
    title: string;
    description: string;
    level: string;
    status: string;
    progress: number;
}

interface Task {
    title: string;
    meta: string;
    status: string;
}

interface DashboardProps {
    stats: {
        classes: number;
        averageProgress: number;
        quizPending: number;
        certificates: number;
    };
    currentCourse?: DashboardCourse | null;
    courses: DashboardCourse[];
    tasks: Task[];
}

export default function Dashboard({ stats, currentCourse, courses, tasks }: DashboardProps) {
    return (
        <Shell title="Dashboard Siswa" eyebrow="Halo, Siswa">
            <Head title="Dashboard Siswa" />
            <div className="grid gap-5 md:grid-cols-4">
                <StatCard label="Classes Enrolled" value={String(stats.classes)} icon={BookOpen} />
                <StatCard label="Avg. Progress" value={`${stats.averageProgress}%`} icon={TrendingUp} tone="purple" />
                <StatCard label="Quiz Pending" value={String(stats.quizPending)} icon={CalendarDays} tone="amber" />
                <StatCard label="Certificates" value={String(stats.certificates)} icon={Award} tone="slate" />
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-[1.35fr_0.85fr]">
                <Panel>
                    <div className="rounded-lg border border-blue-100 bg-blue-50 p-6 text-slate-950">
                        <p className="text-sm font-bold uppercase tracking-wider text-blue-700">{currentCourse?.level ?? 'Learning Path'}</p>
                        <h2 className="mt-2 text-3xl font-extrabold">{currentCourse?.title ?? 'Belum ada kelas aktif'}</h2>
                        <p className="mt-2 text-slate-600">{currentCourse?.description ?? 'Pilih kelas dari katalog untuk mulai belajar.'}</p>
                        <div className="mt-8">
                            <div className="mb-2 flex justify-between text-sm font-semibold">
                                <span>Current Progress</span>
                                <span>{currentCourse?.progress ?? 0}%</span>
                            </div>
                            <div className="h-3 overflow-hidden rounded-full bg-white">
                                <div className="h-full rounded-full bg-blue-600" style={{ width: `${currentCourse?.progress ?? 0}%` }} />
                            </div>
                        </div>
                        <Button asChild className="mt-6 bg-white text-slate-950 hover:bg-slate-100">
                            <Link href={currentCourse ? `/learning?course=${currentCourse.id}` : '/courses'}>
                                Lanjut Belajar
                                <ArrowRight className="size-4" />
                            </Link>
                        </Button>
                    </div>
                </Panel>

                <Panel title="Upcoming Tasks">
                    <div className="space-y-4">
                        {tasks.map((task) => (
                            <div key={task.title} className="rounded-lg border border-slate-200 p-4">
                                <div className="flex items-center justify-between">
                                    <p className="font-bold">{task.title}</p>
                                    <span className="rounded-full bg-blue-50 px-2 py-1 text-xs font-bold text-blue-700">{task.status}</span>
                                </div>
                                <p className="mt-1 text-sm text-slate-500">{task.meta}</p>
                            </div>
                        ))}
                    </div>
                </Panel>
            </div>

            <Panel className="mt-6" title="Kelas Diikuti">
                <div className="grid gap-4 md:grid-cols-3">
                    {courses.map((course) => (
                        <div key={course.title} className="rounded-lg border border-slate-200 p-4">
                            <p className="text-xs font-bold uppercase tracking-wider text-violet-700">{course.level}</p>
                            <h3 className="mt-2 font-bold">{course.title}</h3>
                            <p className="mt-2 text-sm text-slate-500">{course.description}</p>
                            <div className="mt-4">
                                <ProgressBar value={course.progress} />
                                <p className="mt-2 text-sm font-semibold text-slate-600">{course.progress}% selesai</p>
                            </div>
                        </div>
                    ))}
                </div>
            </Panel>
        </Shell>
    );
}
