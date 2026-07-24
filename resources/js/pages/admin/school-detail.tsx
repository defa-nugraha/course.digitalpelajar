import { Panel, ProgressBar, Shell, StatCard } from '@/components/platform';
import { Button } from '@/components/ui/button';
import { Head, Link } from '@inertiajs/react';
import { Award, BadgeCheck, BookOpen, MapPin, TrendingUp, Users } from 'lucide-react';

interface School {
    name: string;
    address: string;
    status: string;
    students: number;
    teachers: number;
    certificates: number;
    partneredAt?: string | null;
}

interface Program {
    title: string;
    progress: number;
    students: number;
}

export default function SchoolDetail({ school, programs }: { school: School; programs: Program[] }) {
    return (
        <Shell
            title={school.name}
            eyebrow="Detail Sekolah"
            nav="admin"
            actions={
                <Button asChild variant="outline">
                    <Link href="/admin/schools">Kelola Sekolah</Link>
                </Button>
            }
        >
            <Head title="Detail Sekolah" />
            <Panel>
                <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
                    <div>
                        <p className="flex items-center gap-2 text-sm text-slate-500">
                            <MapPin className="size-4" />
                            {school.address}
                        </p>
                        <h2 className="mt-2 text-2xl font-extrabold">
                            {school.partneredAt
                                ? `Partner sejak ${new Date(school.partneredAt).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}`
                                : 'Tanggal kemitraan belum dicatat'}
                        </h2>
                    </div>
                    <span className="rounded-full bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-700">{school.status}</span>
                </div>
            </Panel>
            <div className="mt-6 grid gap-5 md:grid-cols-4">
                <StatCard label="Total Students" value={String(school.students)} icon={Users} />
                <StatCard label="Teachers" value={String(school.teachers)} icon={TrendingUp} tone="purple" />
                <StatCard label="Programs" value={String(programs.length)} icon={BookOpen} tone="amber" />
                <StatCard label="Certificates" value={String(school.certificates)} icon={Award} tone="slate" />
            </div>
            <Panel className="mt-6" title="Program Aktif">
                {programs.map((program) => (
                    <div key={program.title} className="mb-4 rounded-lg border border-slate-200 p-4">
                        <div className="flex items-center justify-between">
                            <p className="font-bold">{program.title}</p>
                            <span className="flex items-center gap-2 text-sm text-slate-500">
                                {program.students} siswa
                                <BadgeCheck className="size-5 text-blue-700" />
                            </span>
                        </div>
                        <div className="mt-3">
                            <ProgressBar value={program.progress} />
                        </div>
                    </div>
                ))}
                {programs.length === 0 && <p className="text-sm text-slate-500">Belum ada enrollment kelas dari sekolah ini.</p>}
            </Panel>
        </Shell>
    );
}
