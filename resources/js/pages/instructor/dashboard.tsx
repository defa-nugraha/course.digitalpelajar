import { Panel, ProgressBar, Shell, StatCard } from '@/components/platform';
import { Button } from '@/components/ui/button';
import { Head, Link } from '@inertiajs/react';
import { Award, BookOpen, ClipboardCheck, MessageSquare, PanelLeft, TrendingUp, Users } from 'lucide-react';

interface InstructorProps {
    stats: {
        courses: number;
        students: number;
        pendingReviews: number;
        openDiscussions: number;
        averageProgress: number;
        certificates: number;
    };
    courses: {
        id: number;
        title: string;
        status: string;
        students: number;
        progress: number;
        pendingReviews: number;
        certificates: number;
    }[];
    pendingSubmissions: {
        id: number;
        student: string;
        course: string;
        lesson?: string | null;
        status: string;
        submittedAt: string;
    }[];
    certificates: {
        id: number;
        no: string;
        status: string;
        student: string;
        school: string;
        course: string;
        issueDate: string;
    }[];
    discussions: { id: number; title: string; status: string; courseId: number; course: string; author: string }[];
}

export default function InstructorDashboard({ stats, courses, pendingSubmissions, certificates, discussions }: InstructorProps) {
    return (
        <Shell
            title="Dashboard Pengajar"
            eyebrow="Pengajar / Trainer"
            actions={
                <Button asChild>
                    <Link href="/instructor/course-builder">
                        <PanelLeft className="size-4" />
                        Course Builder
                    </Link>
                </Button>
            }
        >
            <Head title="Dashboard Pengajar" />
            <div className="grid gap-5 md:grid-cols-4">
                <StatCard label="Kelas Diampu" value={String(stats.courses)} icon={BookOpen} />
                <StatCard label="Siswa" value={String(stats.students)} icon={Users} tone="purple" />
                <StatCard label="Review Pending" value={String(stats.pendingReviews)} icon={ClipboardCheck} tone="amber" />
                <StatCard label="Rata-rata Progress" value={`${stats.averageProgress}%`} icon={TrendingUp} tone="slate" />
                <StatCard label="Diskusi Aktif" value={String(stats.openDiscussions)} icon={MessageSquare} />
                <StatCard label="Sertifikat Terbit" value={String(stats.certificates)} icon={Award} tone="purple" />
            </div>

            <div className="mt-6 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
                <Panel title="Progress dan Operasional Course">
                    <div className="space-y-4">
                        {courses.map((course) => (
                            <div key={course.id} className="rounded-lg border border-slate-200 p-4">
                                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                    <div className="min-w-0">
                                        <Link href={`/instructor/course-builder?course=${course.id}`} className="font-bold hover:text-blue-700">
                                            {course.title}
                                        </Link>
                                        <p className="mt-1 text-sm text-slate-500">
                                            {course.students} siswa · {course.status}
                                        </p>
                                    </div>
                                    <div className="flex flex-wrap gap-2 text-xs font-bold">
                                        <span className="rounded-full bg-amber-50 px-2 py-1 text-amber-700">{course.pendingReviews} review</span>
                                        <span className="rounded-full bg-emerald-50 px-2 py-1 text-emerald-700">
                                            {course.certificates} sertifikat
                                        </span>
                                    </div>
                                </div>
                                <div className="mt-3">
                                    <div className="mb-2 flex justify-between text-xs font-bold text-slate-500">
                                        <span>Progress rata-rata</span>
                                        <span>{course.progress}%</span>
                                    </div>
                                    <ProgressBar value={course.progress} />
                                </div>
                            </div>
                        ))}
                        {courses.length === 0 && <p className="text-sm text-slate-500">Belum ada kelas yang ditugaskan.</p>}
                    </div>
                </Panel>

                <div className="space-y-6">
                    <Panel
                        title="Submission Perlu Review"
                        action={
                            <Button asChild size="sm" variant="outline">
                                <Link href="/reviews">Buka Review</Link>
                            </Button>
                        }
                    >
                        <div className="space-y-3">
                            {pendingSubmissions.map((submission) => (
                                <Link
                                    key={submission.id}
                                    href="/reviews"
                                    className="block rounded-lg border border-slate-200 p-4 hover:border-blue-300 hover:bg-blue-50"
                                >
                                    <p className="font-bold">{submission.student}</p>
                                    <p className="mt-1 text-sm text-slate-500">
                                        {submission.course} · {submission.lesson || 'Final project'} · {statusLabel(submission.status)}
                                    </p>
                                    <p className="mt-1 text-xs text-slate-400">{formatDate(submission.submittedAt)}</p>
                                </Link>
                            ))}
                            {pendingSubmissions.length === 0 && <p className="text-sm text-slate-500">Tidak ada submission pending.</p>}
                        </div>
                    </Panel>

                    <Panel title="Sertifikat Terbaru">
                        <div className="space-y-3">
                            {certificates.map((certificate) => (
                                <Link
                                    key={certificate.id}
                                    href={`/certificates/${certificate.id}`}
                                    className="block rounded-lg border border-slate-200 p-4 hover:border-blue-300 hover:bg-blue-50"
                                >
                                    <p className="font-bold">{certificate.student}</p>
                                    <p className="mt-1 text-sm text-slate-500">
                                        {certificate.course} · {certificate.school}
                                    </p>
                                    <p className="mt-1 font-mono text-xs text-slate-400">
                                        {certificate.no} · {certificate.issueDate}
                                    </p>
                                </Link>
                            ))}
                            {certificates.length === 0 && <p className="text-sm text-slate-500">Belum ada sertifikat pada course Anda.</p>}
                        </div>
                    </Panel>
                </div>
            </div>

            <Panel className="mt-6" title="Diskusi Terbaru">
                <div className="grid gap-3 md:grid-cols-2">
                    {discussions.map((discussion) => (
                        <Link
                            key={discussion.id}
                            href={`/courses/${discussion.courseId}/forum`}
                            className="block rounded-lg border border-slate-200 p-4 hover:border-blue-300 hover:bg-blue-50"
                        >
                            <p className="font-bold">{discussion.title}</p>
                            <p className="mt-1 text-sm text-slate-500">
                                {discussion.course} · {discussion.author} · {discussion.status}
                            </p>
                        </Link>
                    ))}
                    {discussions.length === 0 && <p className="text-sm text-slate-500">Belum ada diskusi kelas.</p>}
                </div>
            </Panel>
        </Shell>
    );
}

function statusLabel(status: string) {
    const labels: Record<string, string> = {
        submitted: 'Menunggu review',
        revised: 'Perlu revisi',
    };

    return labels[status] ?? status;
}

function formatDate(value?: string | null) {
    if (!value) return '-';

    return new Intl.DateTimeFormat('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    }).format(new Date(value));
}
