import { Panel, ProgressBar, Shell, StatCard } from '@/components/platform';
import { Head } from '@inertiajs/react';
import { BookOpen, GraduationCap, TrendingUp, Users } from 'lucide-react';

interface Student {
    id: number;
    name: string;
    email: string;
    status: string;
    enrollments: number;
    progress: number;
    attendance: {
        total: number;
        present: number;
        sick: number;
        permission: number;
        absent: number;
        rate: number;
    };
}

export default function Students({ school, students }: { school: string; students: Student[] }) {
    const activeStudents = students.filter((student) => student.status === 'active').length;
    const totalEnrollments = students.reduce((total, student) => total + student.enrollments, 0);
    const averageProgress = Math.round(students.reduce((total, student) => total + student.progress, 0) / Math.max(students.length, 1));
    const averageAttendance = Math.round(students.reduce((total, student) => total + student.attendance.rate, 0) / Math.max(students.length, 1));

    return (
        <Shell title="Monitoring Siswa" eyebrow={school} nav="teacher">
            <Head title="Monitoring Siswa" />
            <div className="grid gap-5 md:grid-cols-4">
                <StatCard label="Total Siswa" value={String(students.length)} icon={Users} />
                <StatCard label="Siswa Aktif" value={String(activeStudents)} icon={GraduationCap} tone="purple" />
                <StatCard label="Total Enrollment" value={String(totalEnrollments)} icon={BookOpen} tone="amber" />
                <StatCard label="Progress / Hadir" value={`${averageProgress}% / ${averageAttendance}%`} icon={TrendingUp} tone="slate" />
            </div>

            <Panel className="mt-6" title="Progress siswa sekolah">
                <div className="space-y-3">
                    {students.map((student) => (
                        <div key={student.id} className="rounded-lg border border-slate-200 p-4">
                            <div className="flex flex-col gap-3 md:flex-row md:items-center">
                                <div className="min-w-0 flex-1">
                                    <p className="font-bold">{student.name}</p>
                                    <p className="text-sm text-slate-500">
                                        {student.email} · {student.status} · {student.enrollments} kelas · hadir {student.attendance.rate}%
                                    </p>
                                </div>
                                <span className="text-sm font-bold text-blue-700">{student.progress}%</span>
                            </div>
                            <div className="mt-3">
                                <ProgressBar value={student.progress} />
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold">
                                <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">Presensi {student.attendance.total}</span>
                                <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">H {student.attendance.present}</span>
                                <span className="rounded-full bg-amber-50 px-3 py-1 text-amber-700">S {student.attendance.sick}</span>
                                <span className="rounded-full bg-blue-50 px-3 py-1 text-blue-700">I {student.attendance.permission}</span>
                                <span className="rounded-full bg-rose-50 px-3 py-1 text-rose-700">A {student.attendance.absent}</span>
                            </div>
                        </div>
                    ))}
                    {students.length === 0 && <p className="text-sm text-slate-500">Belum ada siswa pada sekolah ini.</p>}
                </div>
            </Panel>
        </Shell>
    );
}
