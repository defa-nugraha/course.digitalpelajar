import { Panel, ProgressBar, Shell, StatCard } from '@/components/platform';
import { Button } from '@/components/ui/button';
import { Head } from '@inertiajs/react';
import { Award, BookOpen, GraduationCap, TrendingUp, Users } from 'lucide-react';

interface Student {
    name: string;
    progress: number;
    status: string;
}

interface ReviewItem {
    student: string;
    course: string;
    status: string;
}

interface TeacherProps {
    school?: {
        name: string;
    };
    stats: {
        students: number;
        averageProgress: number;
        activeClasses: number;
        certificates: number;
    };
    students: Student[];
    reviewItems: ReviewItem[];
}

export default function TeacherDashboard({ school, stats, students, reviewItems }: TeacherProps) {
    return (
        <Shell title={`${school?.name ?? 'Sekolah'} Dashboard`} eyebrow="Guru Sekolah">
            <Head title="Dashboard Guru Sekolah" />
            <div className="grid gap-5 md:grid-cols-4">
                <StatCard label="Students Enrolled" value={String(stats.students)} icon={Users} />
                <StatCard label="Average Progress" value={`${stats.averageProgress}%`} icon={TrendingUp} tone="purple" />
                <StatCard label="Active Classes" value={String(stats.activeClasses)} icon={BookOpen} tone="amber" />
                <StatCard label="Certificates Earned" value={String(stats.certificates)} icon={Award} tone="slate" />
            </div>
            <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_0.85fr]">
                <Panel title="Siswa Sekolah" action={<Button variant="outline" size="sm">View All</Button>}>
                    <div className="space-y-4">
                        {students.map((student) => (
                            <div key={student.name} className="rounded-lg border border-slate-200 p-4">
                                <div className="flex items-center justify-between">
                                    <p className="font-bold">{student.name}</p>
                                    <span className="text-sm font-semibold text-slate-500">{student.progress}%</span>
                                </div>
                                <div className="mt-3"><ProgressBar value={student.progress} /></div>
                                <p className="mt-2 text-sm text-slate-500">{student.status}</p>
                            </div>
                        ))}
                    </div>
                </Panel>
                <Panel title="Review Pending">
                    {reviewItems.map((item) => (
                        <div key={`${item.student}-${item.course}`} className="mb-3 flex items-center gap-3 rounded-lg border border-slate-200 p-4">
                            <GraduationCap className="size-5 text-blue-700" />
                            <span className="font-semibold">{item.student} - {item.course} ({item.status})</span>
                        </div>
                    ))}
                </Panel>
            </div>
        </Shell>
    );
}
