import { Panel, Shell } from '@/components/platform';
import { Button } from '@/components/ui/button';
import { builderBlocks } from '@/lib/platform-data';
import { Head } from '@inertiajs/react';
import { ArrowDownUp, Eye, FileText, GripVertical, Plus, Upload } from 'lucide-react';

interface OutlineItem {
    id: string;
    title: string;
    type: string;
}

interface BlockItem {
    type: string;
    status: string;
    metadata: Record<string, string | string[]>;
}

interface CourseBuilderProps {
    course?: {
        title: string;
    } | null;
    outline: OutlineItem[];
    blocks: BlockItem[];
    statusCounts: Record<string, number>;
}

export default function CourseBuilder({ course, outline, blocks, statusCounts }: CourseBuilderProps) {
    return (
        <Shell title={course?.title ?? 'Course Builder'} eyebrow="Curriculum" nav="admin" actions={<Button><Plus className="size-4" />Tambah Block</Button>}>
            <Head title="Course Builder" />
            <div className="grid gap-6 lg:grid-cols-[320px_1fr_340px]">
                <Panel title="Struktur Materi">
                    {outline.map((item) => (
                        <div key={item.id} className="mb-2 flex items-center gap-3 rounded-lg border border-slate-200 p-3 text-sm font-semibold">
                            <GripVertical className="size-4 text-slate-400" />
                            <span className={item.type === 'chapter' ? 'font-extrabold' : ''}>{item.title}</span>
                        </div>
                    ))}
                    <Button variant="outline" className="mt-3 w-full"><ArrowDownUp className="size-4" />Ubah Urutan</Button>
                </Panel>
                <Panel title="Editor Lesson">
                    <div className="rounded-lg border border-dashed border-blue-300 bg-blue-50 p-6 text-center">
                        <FileText className="mx-auto size-10 text-blue-700" />
                        <h2 className="mt-3 text-xl font-extrabold">Upload PDF to Convert</h2>
                        <p className="mt-2 text-sm text-slate-600">Hasil konversi disimpan sebagai draft dan wajib review sebelum publish.</p>
                        <Button className="mt-4 bg-[#1C7DE8] hover:bg-[#1469c7]"><Upload className="size-4" />Upload PDF</Button>
                    </div>
                    <div className="mt-5 grid gap-3 md:grid-cols-2">
                        {builderBlocks.map((block) => {
                            const Icon = block.icon;
                            const total = blocks.filter((item) => item.type === block.title.toLowerCase().split(' ')[0] || item.type === block.title.toLowerCase().replace(' block', '')).length;
                            return (
                                <div key={block.title} className="rounded-lg border border-slate-200 p-4">
                                    <Icon className="size-5 text-blue-700" />
                                    <p className="mt-3 font-bold">{block.title}</p>
                                    <p className="mt-1 text-sm text-slate-500">{block.status} - {total} dari database</p>
                                </div>
                            );
                        })}
                    </div>
                </Panel>
                <Panel title="Status Publish">
                    {['draft', 'reviewed', 'published'].map((status, index) => (
                        <div key={status} className="mb-3 rounded-lg border border-slate-200 p-4">
                            <p className="font-bold capitalize">{status} ({statusCounts[status] ?? 0})</p>
                            <p className="mt-1 text-sm text-slate-500">{index === 0 ? 'PDF import dan edit awal.' : index === 1 ? 'Sudah dipreview sebagai siswa.' : 'Siap diakses sesuai mode.'}</p>
                        </div>
                    ))}
                    <Button variant="outline" className="w-full"><Eye className="size-4" />Preview sebagai Siswa</Button>
                </Panel>
            </div>
        </Shell>
    );
}
