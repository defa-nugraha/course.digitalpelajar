import { Panel, Shell } from '@/components/platform';
import { Button } from '@/components/ui/button';
import { completionRules } from '@/lib/platform-data';
import { Head } from '@inertiajs/react';
import { History, Plus, QrCode, Redo2, Undo2 } from 'lucide-react';

interface Certificate {
    no: string;
    status: string;
    issueDate: string;
    student: string;
    title: string;
}

interface Template {
    name: string;
}

export default function AdminCertificates({ template, certificates }: { template?: Template | null; certificates: Certificate[] }) {
    return (
        <Shell title="Certificate Management" eyebrow="Admin Pusat" nav="admin" actions={<Button><Plus className="size-4" />Template</Button>}>
            <Head title="Manajemen Sertifikat" />
            <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
                <Panel title="Template Editor Preview" action={<div className="flex gap-2"><Button variant="outline" size="icon"><Undo2 className="size-4" /></Button><Button variant="outline" size="icon"><Redo2 className="size-4" /></Button></div>}>
                    <div className="rounded-lg border-4 border-slate-900 bg-[#fffdf4] p-8 text-center">
                        <p className="text-sm font-bold uppercase tracking-[0.25em] text-blue-700">{template?.name ?? 'Certificate of Completion'}</p>
                        <p className="mt-8 text-slate-500">This is to certify that</p>
                        <h2 className="mt-2 text-4xl font-extrabold">[Student Full Name]</h2>
                        <p className="mx-auto mt-5 max-w-xl text-slate-600">has successfully completed the requirements for the</p>
                        <h3 className="mt-2 text-2xl font-bold">[Course Title Placement]</h3>
                        <div className="mt-10 flex items-end justify-between">
                            <div className="text-left text-sm"><p className="text-slate-500">Date of Issue</p><p className="font-bold">[Issue Date]</p></div>
                            <QrCode className="size-20" />
                            <div className="text-right text-sm"><p className="text-slate-500">Instructor Signature</p><p className="font-bold">Ngawitekno</p></div>
                        </div>
                    </div>
                </Panel>
                <div className="space-y-6">
                    <Panel title="Syarat Kelulusan">
                        {completionRules.map((rule) => {
                            const Icon = rule.icon;
                            return <div key={rule.label} className="mb-3 flex items-center gap-3 rounded-lg border border-slate-200 p-3 text-sm font-semibold"><Icon className="size-4 text-blue-700" />{rule.label}</div>;
                        })}
                    </Panel>
                    <Panel title="Issued Log">
                        {certificates.map((item) => (
                            <div key={item.no} className="mb-3 flex items-center gap-3 rounded-lg border border-slate-200 p-3">
                                <History className="size-4 text-slate-500" />
                                <div><p className="text-sm font-bold">{item.student} - {item.title}</p><p className="text-xs text-slate-500">{item.no} - {item.status}</p></div>
                            </div>
                        ))}
                    </Panel>
                </div>
            </div>
        </Shell>
    );
}
