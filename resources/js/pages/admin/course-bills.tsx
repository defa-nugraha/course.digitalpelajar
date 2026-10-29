import { Panel, Shell } from '@/components/platform';
import { MobileCardList, MobileDataCard, StatusBadge } from '@/components/responsive-data';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Head, router, useForm } from '@inertiajs/react';
import { Trash2 } from 'lucide-react';
import type { FormEvent } from 'react';

interface StudentOption {
    id: number;
    name: string;
    email: string;
}

interface CourseOption {
    id: number;
    title: string;
}

interface BillRow {
    id: number;
    title: string;
    student: string;
    email: string;
    course: string;
    amount: number;
    amountLabel: string;
    dueAt: string;
    status: string;
    checkoutUrl?: string | null;
    orderId?: string | null;
    createdAt: string;
}

interface Props {
    students: StudentOption[];
    courses: CourseOption[];
    bills: BillRow[];
}

export default function CourseBills({ students, courses, bills }: Props) {
    const form = useForm({
        student_id: '',
        course_id: '',
        title: '',
        amount: '',
        due_at: '',
    });

    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        form.post('/admin/course-bills', {
            onSuccess: () => form.reset('title', 'amount', 'due_at'),
        });
    };

    return (
        <Shell title="Tagihan Kursus" eyebrow="Admin Pusat">
            <Head title="Tagihan Kursus" />
            <Panel title="Buat tagihan siswa">
                <form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
                    <label className="grid gap-1 text-sm font-medium">
                        Siswa
                        <select
                            required
                            value={form.data.student_id}
                            onChange={(event) => form.setData('student_id', event.target.value)}
                            className="h-10 rounded-md border border-slate-300 bg-white px-3"
                        >
                            <option value="">Pilih siswa</option>
                            {students.map((student) => (
                                <option key={student.id} value={student.id}>
                                    {student.name} — {student.email}
                                </option>
                            ))}
                        </select>
                        {form.errors.student_id && <span className="text-xs text-red-600">{form.errors.student_id}</span>}
                    </label>
                    <label className="grid gap-1 text-sm font-medium">
                        Kursus
                        <select
                            required
                            value={form.data.course_id}
                            onChange={(event) => form.setData('course_id', event.target.value)}
                            className="h-10 rounded-md border border-slate-300 bg-white px-3"
                        >
                            <option value="">Pilih kursus</option>
                            {courses.map((course) => (
                                <option key={course.id} value={course.id}>
                                    {course.title}
                                </option>
                            ))}
                        </select>
                        {form.errors.course_id && <span className="text-xs text-red-600">{form.errors.course_id}</span>}
                    </label>
                    <label className="grid gap-1 text-sm font-medium">
                        Nama tagihan
                        <Input
                            value={form.data.title}
                            onChange={(event) => form.setData('title', event.target.value)}
                            required
                            maxLength={160}
                            placeholder="Contoh: Tagihan Kursus Oktober"
                        />
                        {form.errors.title && <span className="text-xs text-red-600">{form.errors.title}</span>}
                    </label>
                    <label className="grid gap-1 text-sm font-medium">
                        Nominal (Rupiah)
                        <Input
                            type="number"
                            min="1000"
                            max="1000000000"
                            step="1"
                            value={form.data.amount}
                            onChange={(event) => form.setData('amount', event.target.value)}
                            required
                            placeholder="150000"
                        />
                        {form.errors.amount && <span className="text-xs text-red-600">{form.errors.amount}</span>}
                    </label>
                    <label className="grid gap-1 text-sm font-medium">
                        Jatuh tempo
                        <Input
                            type="date"
                            value={form.data.due_at}
                            onChange={(event) => form.setData('due_at', event.target.value)}
                            required
                        />
                        {form.errors.due_at && <span className="text-xs text-red-600">{form.errors.due_at}</span>}
                    </label>
                    <div className="flex items-end">
                        <Button type="submit" disabled={form.processing || students.length === 0 || courses.length === 0}>
                            {form.processing ? 'Membuat tagihan...' : 'Buat tagihan'}
                        </Button>
                    </div>
                </form>
                <p className="mt-4 text-sm text-slate-500">
                    Setiap tagihan dibuat untuk satu siswa. Tautan pembayaran Midtrans baru dibuat saat siswa membuka informasi
                    tagihan dan menekan tombol bayar.
                </p>
            </Panel>
            <Panel title="Daftar tagihan">
                <MobileCardList
                    empty={<p className="rounded-xl border border-dashed p-6 text-center text-sm text-slate-500">Belum ada tagihan kursus.</p>}
                >
                    {bills.map((bill) => (
                        <MobileDataCard
                            key={bill.id}
                            title={bill.title}
                            subtitle={bill.student + ' · ' + bill.email}
                            badge={
                                <StatusBadge
                                    status={bill.status}
                                    label={
                                        bill.status === 'pending'
                                            ? 'Belum dibayar'
                                            : bill.status === 'paid'
                                              ? 'Lunas'
                                              : bill.status === 'overdue'
                                                ? 'Terlambat'
                                                : bill.status
                                    }
                                />
                            }
                            meta={[
                                { label: 'Kursus', value: bill.course },
                                { label: 'Nominal', value: bill.amountLabel },
                                { label: 'Jatuh tempo', value: bill.dueAt },
                                { label: 'Order', value: bill.orderId ?? '-' },
                            ]}
                            actions={
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => {
                                        if (
                                            window.confirm(
                                                'Hapus tagihan ini beserta data pembayaran terkait? Tagihan juga akan hilang dari akun siswa.',
                                            )
                                        ) {
                                            router.delete(`/admin/course-bills/${bill.id}`);
                                        }
                                    }}
                                >
                                    <Trash2 className="size-4" />
                                    Hapus tagihan
                                </Button>
                            }
                        />
                    ))}
                </MobileCardList>
            </Panel>
        </Shell>
    );
}
