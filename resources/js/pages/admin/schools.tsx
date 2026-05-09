import { Panel, Shell, StatCard } from '@/components/platform';
import { Button } from '@/components/ui/button';
import { Head, Link } from '@inertiajs/react';
import { Building2, Handshake, MoreVertical, Plus, School, Users } from 'lucide-react';

interface SchoolRow {
    id: number;
    name: string;
    pic: string;
    students: number;
    teachers: number;
    status: string;
}

interface SchoolsProps {
    stats: {
        totalSchools: number;
        activePartners: number;
        totalStudents: number;
        totalTeachers: number;
    };
    schools: SchoolRow[];
}

export default function Schools({ stats, schools }: SchoolsProps) {
    return (
        <Shell title="Manajemen Sekolah" eyebrow="Admin Pusat" nav="admin" actions={<Button><Plus className="size-4" />Tambah</Button>}>
            <Head title="Manajemen Sekolah" />
            <div className="grid gap-5 md:grid-cols-4">
                <StatCard label="Total Schools" value={String(stats.totalSchools)} icon={Building2} />
                <StatCard label="Active Partners" value={String(stats.activePartners)} icon={Handshake} tone="purple" />
                <StatCard label="Total Students" value={String(stats.totalStudents)} icon={School} tone="amber" />
                <StatCard label="Total Teachers" value={String(stats.totalTeachers)} icon={Users} tone="slate" />
            </div>
            <Panel className="mt-6" title="Registered Institutions">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="text-xs uppercase tracking-wider text-slate-500">
                            <tr><th className="py-3">Sekolah</th><th>PIC</th><th>Siswa</th><th>Guru</th><th>Status</th><th /></tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {schools.map((school) => (
                                <tr key={school.name}>
                                    <td className="py-4 font-bold"><Link href={`/admin/schools/detail?school=${school.id}`}>{school.name}</Link></td>
                                    <td>{school.pic}</td>
                                    <td>{school.students}</td>
                                    <td>{school.teachers}</td>
                                    <td><span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700">{school.status}</span></td>
                                    <td><Button variant="ghost" size="icon"><MoreVertical className="size-4" /></Button></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Panel>
        </Shell>
    );
}
