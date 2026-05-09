import { Panel, Shell } from '@/components/platform';
import { Button } from '@/components/ui/button';
import { Head } from '@inertiajs/react';
import { Filter, MoreVertical, Upload, UserPlus } from 'lucide-react';

interface UserRow {
    name: string;
    email: string;
    role: string;
    school: string;
    status: string;
}

export default function UsersPage({ users }: { users: UserRow[] }) {
    return (
        <Shell title="User Management" eyebrow="Manajemen User" nav="admin" actions={<Button><UserPlus className="size-4" />Tambah User</Button>}>
            <Head title="Manajemen User" />
            <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
                <Panel title="Manage students, instructors, and administrators" action={<Button variant="outline" size="sm"><Filter className="size-4" />Filter</Button>}>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="text-xs uppercase tracking-wider text-slate-500">
                                <tr><th className="py-3">Nama</th><th>Email</th><th>Role</th><th>Sekolah</th><th>Status</th><th /></tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                                {users.map((user) => (
                                    <tr key={user.email}>
                                        <td className="py-4 font-bold">{user.name}</td><td>{user.email}</td><td>{user.role}</td><td>{user.school}</td>
                                        <td><span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700">{user.status}</span></td>
                                        <td><Button variant="ghost" size="icon"><MoreVertical className="size-4" /></Button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Panel>
                <Panel title="Bulk Import Users">
                    <Upload className="size-10 text-blue-700" />
                    <p className="mt-4 text-sm leading-6 text-slate-600">Upload CSV atau Excel untuk menambahkan siswa, guru sekolah, pengajar internal, atau admin. File harus memuat nama, email, role, dan school_id.</p>
                    <Button className="mt-5 w-full bg-[#1C7DE8] hover:bg-[#1469c7]"><Upload className="size-4" />Upload File</Button>
                </Panel>
            </div>
        </Shell>
    );
}
