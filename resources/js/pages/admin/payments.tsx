import { Panel, Shell } from '@/components/platform';
import { DesktopTable, MobileCardList, MobileDataCard, StatusBadge } from '@/components/responsive-data';
import { SearchableSelect } from '@/components/searchable-select';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Head, router, useForm } from '@inertiajs/react';
import { Copy, Download, Edit, ExternalLink, Printer, ReceiptText, Trash2 } from 'lucide-react';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { toast } from 'sonner';

interface PaymentRow {
    id: number;
    orderId: string;
    transactionId?: string | null;
    student: string;
    email: string;
    course: string;
    amountLabel: string;
    status: string;
    method?: string | null;
    checkoutUrl?: string | null;
    paidAt?: string | null;
}

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
    studentId: number;
    courseId: number;
    title: string;
    student: string;
    email: string;
    course: string;
    amountLabel: string;
    dueAt: string;
    status: string;
    orderId?: string | null;
    canDelete: boolean;
    canEdit: boolean;
}

interface Props {
    payments: PaymentRow[];
    students: StudentOption[];
    courses: CourseOption[];
    bills: BillRow[];
}

export default function Payments({ payments, students, courses, bills }: Props) {
    const [term, setTerm] = useState('');
    const [status, setStatus] = useState('all');
    const [billsOpen, setBillsOpen] = useState(false);
    const [editingBillId, setEditingBillId] = useState<number | null>(null);
    const form = useForm({
        student_id: '',
        course_id: '',
        title: '',
        amount: '',
        due_at: '',
    });
    const visible = payments.filter(
        (payment) =>
            (status === 'all' || payment.status === status) &&
            `${payment.orderId} ${payment.student} ${payment.email} ${payment.course}`.toLowerCase().includes(term.toLowerCase()),
    );

    const copy = async (value: string, label: string) => {
        try {
            await navigator.clipboard.writeText(value);
            toast.success(`${label} berhasil disalin.`);
        } catch {
            toast.error(`Tidak dapat menyalin ${label.toLowerCase()}.`);
        }
    };

    const submitBill = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const options = {
            onSuccess: () => {
                form.reset();
                setEditingBillId(null);
                setBillsOpen(false);
            },
        };

        if (editingBillId !== null) {
            form.patch(`/admin/course-bills/${editingBillId}`, options);
            return;
        }

        form.post('/admin/course-bills', options);
    };

    const beginEditBill = (bill: BillRow) => {
        if (!bill.canEdit) return;
        setEditingBillId(bill.id);
        form.setData({
            student_id: String(bill.studentId),
            course_id: String(bill.courseId),
            title: bill.title,
            amount: String(Number(bill.amountLabel.replace(/[^0-9]/g, '')) || ''),
            due_at: bill.dueAt,
        });
        setBillsOpen(true);
    };

    const openCreateBill = () => {
        setEditingBillId(null);
        form.reset();
        setBillsOpen(true);
    };

    const billActions = (bill: BillRow, compact = false) => (
        <div className={compact ? 'flex flex-wrap gap-2' : 'flex justify-end gap-1'}>
            <Button type="button" variant="outline" size={compact ? 'sm' : 'icon'} disabled={!bill.canEdit} title={bill.canEdit ? 'Edit tagihan' : 'Tagihan yang sudah memiliki transaksi tidak dapat diedit'} aria-label="Edit tagihan" onClick={() => beginEditBill(bill)}>
                <Edit className="size-4" />
                {compact && 'Edit'}
            </Button>
            <Button asChild type="button" variant="outline" size={compact ? 'sm' : 'icon'} title="Cetak invoice" aria-label="Cetak invoice">
                <a href={`/admin/course-bills/${bill.id}/invoice`} target="_blank" rel="noreferrer">
                    <Printer className="size-4" />
                    {compact && 'Cetak invoice'}
                </a>
            </Button>
            <Button type="button" variant="destructive" size={compact ? 'sm' : 'icon'} disabled={!bill.canDelete} title={bill.canDelete ? 'Hapus tagihan' : 'Tagihan yang sudah dibayar tidak dapat dihapus'} aria-label="Hapus tagihan" onClick={() => deleteBill(bill)}>
                <Trash2 className="size-4" />
                {compact && 'Hapus'}
            </Button>
        </div>
    );

    const deleteBill = (bill: BillRow) => {
        if (!bill.canDelete) return;
        if (window.confirm('Hapus tagihan ini beserta data pembayaran terkait? Tagihan juga akan hilang dari akun siswa.')) {
            router.delete(`/admin/course-bills/${bill.id}`);
        }
    };

    const actions = (payment: PaymentRow, compact = false) => {
        const isPaid = ['paid', 'settlement', 'capture', 'success'].includes(payment.status);
        return (
            <div className={compact ? 'flex flex-wrap justify-end gap-2' : 'flex justify-end gap-1'}>
                {payment.checkoutUrl && payment.status === 'pending' && (
                    <>
                        <Button
                            type="button"
                            variant="outline"
                            size={compact ? 'sm' : 'icon'}
                            onClick={() => void copy(payment.checkoutUrl ?? '', 'Link pembayaran')}
                        >
                            <Copy className="size-4" />
                            {compact && 'Salin link'}
                        </Button>
                        <Button asChild size={compact ? 'sm' : 'icon'}>
                            <a href={payment.checkoutUrl} target="_blank" rel="noreferrer" aria-label="Buka halaman pembayaran">
                                <ExternalLink className="size-4" />
                                {compact && 'Buka pembayaran'}
                            </a>
                        </Button>
                    </>
                )}
                <Button type="button" variant="ghost" size={compact ? 'sm' : 'icon'} onClick={() => void copy(payment.orderId, 'ID order')}>
                    <ReceiptText className="size-4" />
                    {compact && 'Salin order'}
                </Button>
                <Button asChild variant="outline" size={compact ? 'sm' : 'icon'}>
                    <a href={`/payments/${payment.id}/invoice`} aria-label="Unduh invoice">
                        <Download className="size-4" />
                        {compact && 'Invoice'}
                    </a>
                </Button>
                <Button
                    type="button"
                    variant="destructive"
                    size={compact ? 'sm' : 'icon'}
                    disabled={isPaid}
                    title={isPaid ? 'Pembayaran paid tidak dapat dihapus' : 'Hapus pembayaran'}
                    aria-label="Hapus pembayaran"
                    onClick={() => {
                        if (!isPaid && window.confirm('Hapus data pembayaran ini? Tagihan kursus tetap tersedia dan pembayaran dapat dibuat kembali.')) {
                            router.delete(`/admin/payments/${payment.id}`);
                        }
                    }}
                >
                    <Trash2 className="size-4" />
                    {compact && 'Hapus'}
                </Button>
            </div>
        );
    };

    return (
        <Shell title="Monitoring Pembayaran" eyebrow="Admin Pusat">
            <Head title="Monitoring Pembayaran" />
            <div className="mb-4 flex justify-end">
                <Dialog open={billsOpen} onOpenChange={setBillsOpen}>
                    <DialogTrigger asChild>
                        <Button onClick={openCreateBill}>Kelola Tagihan Kursus</Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-3xl">
                        <DialogHeader>
                            <DialogTitle>{editingBillId === null ? 'Buat Tagihan Kursus' : 'Edit Tagihan Kursus'}</DialogTitle>
                            <DialogDescription>
                                Tagihan langsung tampil di akun siswa. Snap Midtrans dibuat ketika siswa menekan tombol bayar.
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={submitBill} className="grid gap-3 sm:grid-cols-2">
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
                                <Input value={form.data.title} onChange={(event) => form.setData('title', event.target.value)} required maxLength={160} />
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
                                />
                                {form.errors.amount && <span className="text-xs text-red-600">{form.errors.amount}</span>}
                            </label>
                            <label className="grid gap-1 text-sm font-medium sm:col-span-2">
                                Jatuh tempo
                                <Input type="date" value={form.data.due_at} onChange={(event) => form.setData('due_at', event.target.value)} required />
                                {form.errors.due_at && <span className="text-xs text-red-600">{form.errors.due_at}</span>}
                            </label>
                            <div className="sm:col-span-2">
                                <Button type="submit" disabled={form.processing || students.length === 0 || courses.length === 0}>
                                    {form.processing ? 'Menyimpan...' : editingBillId === null ? 'Buat tagihan' : 'Simpan perubahan'}
                                </Button>
                            </div>
                        </form>
                        <div className="space-y-3 border-t pt-4">
                            <h3 className="font-semibold">Daftar tagihan ({bills.length})</h3>
                            <MobileCardList empty={<p className="rounded-xl border border-dashed p-5 text-center text-sm text-slate-500">Belum ada tagihan kursus.</p>}>
                                {bills.map((bill) => (
                                    <MobileDataCard
                                        key={bill.id}
                                        title={bill.title}
                                        subtitle={bill.student + ' · ' + bill.email}
                                        badge={<StatusBadge status={bill.status} label={bill.status === 'paid' ? 'Lunas' : bill.status === 'overdue' ? 'Terlambat' : 'Belum dibayar'} />}
                                        meta={[
                                            { label: 'Kursus', value: bill.course },
                                            { label: 'Nominal', value: bill.amountLabel },
                                            { label: 'Jatuh tempo', value: bill.dueAt },
                                            { label: 'Order', value: bill.orderId ?? '-' },
                                        ]}
                                        actions={billActions(bill, true)}
                                    />
                                ))}
                            </MobileCardList>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
            <div className="mb-8">
                <Panel title={`Tagihan kursus (${bills.length})`}>
                <div className="space-y-4">
                    <MobileCardList
                        empty={<p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">Belum ada tagihan kursus.</p>}
                    >
                        {bills.map((bill) => (
                            <MobileDataCard
                                key={bill.id}
                                title={bill.title}
                                subtitle={bill.student + ' · ' + bill.email}
                                badge={
                                    <StatusBadge
                                        status={bill.status}
                                        label={bill.status === 'paid' ? 'Lunas' : bill.status === 'overdue' ? 'Terlambat' : 'Belum dibayar'}
                                    />
                                }
                                meta={[
                                    { label: 'Kursus', value: bill.course },
                                    { label: 'Nominal', value: bill.amountLabel },
                                    { label: 'Jatuh tempo', value: bill.dueAt },
                                    { label: 'ID order', value: bill.orderId ?? '-' },
                                ]}
                                actions={billActions(bill, true)}
                            />
                        ))}
                    </MobileCardList>
                    <DesktopTable>
                        <table className="w-full text-left text-sm">
                            <thead className="text-xs tracking-wider text-slate-500 uppercase">
                                <tr>
                                    <th className="py-3">Tagihan</th>
                                    <th>Siswa</th>
                                    <th>Kursus</th>
                                    <th>Nominal</th>
                                    <th>Jatuh tempo</th>
                                    <th>Status</th>
                                    <th>ID order</th>
                                    <th className="text-right">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                                {bills.map((bill) => (
                                    <tr key={bill.id}>
                                        <td className="py-4 font-semibold">{bill.title}</td>
                                        <td>
                                            <p>{bill.student}</p>
                                            <p className="text-xs text-slate-500">{bill.email}</p>
                                        </td>
                                        <td>{bill.course}</td>
                                        <td>{bill.amountLabel}</td>
                                        <td>{bill.dueAt}</td>
                                        <td>
                                            <StatusBadge
                                                status={bill.status}
                                                label={bill.status === 'paid' ? 'Lunas' : bill.status === 'overdue' ? 'Terlambat' : 'Belum dibayar'}
                                            />
                                        </td>
                                        <td className="font-mono text-xs">{bill.orderId ?? '-'}</td>
                                        <td className="py-3 text-right">{billActions(bill)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {bills.length === 0 && <p className="py-8 text-center text-sm text-slate-500">Belum ada tagihan kursus.</p>}
                    </DesktopTable>
                </div>
                </Panel>
            </div>
            <Panel
                title="Riwayat transaksi"
                action={
                    <div className="flex flex-col gap-2 sm:flex-row">
                        <Input
                            className="w-full sm:w-56"
                            placeholder="Cari order atau siswa"
                            value={term}
                            onChange={(event) => setTerm(event.target.value)}
                        />
                        <SearchableSelect
                            className="w-full sm:w-48"
                            value={status}
                            onChange={setStatus}
                            options={[
                                { value: 'all', label: 'Semua status' },
                                { value: 'pending', label: 'Pending' },
                                { value: 'paid', label: 'Paid' },
                                { value: 'failed', label: 'Failed' },
                                { value: 'expired', label: 'Expired' },
                            ]}
                        />
                    </div>
                }
            >
                <div className="space-y-4">
                    <MobileCardList
                        empty={<p className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">Tidak ada transaksi yang cocok.</p>}
                    >
                        {visible.map((payment) => (
                            <MobileDataCard
                                key={payment.id}
                                title={payment.student}
                                subtitle={payment.email}
                                badge={<StatusBadge status={payment.status} label={payment.status} />}
                                meta={[
                                    { label: 'Order', value: <span className="font-mono text-xs">{payment.orderId}</span> },
                                    { label: 'Kursus', value: payment.course },
                                    { label: 'Total', value: payment.amountLabel },
                                    { label: 'Metode', value: payment.method?.replaceAll('_', ' ') ?? '-' },
                                ]}
                                actions={actions(payment, true)}
                            />
                        ))}
                    </MobileCardList>
                    <DesktopTable>
                        <table className="w-full text-left text-sm">
                            <thead className="text-xs tracking-wider text-slate-500 uppercase">
                                <tr>
                                    <th className="py-3">Order</th>
                                    <th>Siswa</th>
                                    <th>Kursus</th>
                                    <th>Total</th>
                                    <th>Status</th>
                                    <th>Metode</th>
                                    <th className="text-right">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                                {visible.map((payment) => (
                                    <tr key={payment.id}>
                                        <td className="py-4 font-mono text-xs">{payment.orderId}</td>
                                        <td>
                                            <p className="font-semibold">{payment.student}</p>
                                            <p className="text-xs text-slate-500">{payment.email}</p>
                                        </td>
                                        <td>{payment.course}</td>
                                        <td>{payment.amountLabel}</td>
                                        <td className="capitalize">{payment.status}</td>
                                        <td className="capitalize">{payment.method?.replaceAll('_', ' ') ?? '-'}</td>
                                        <td className="text-right">{actions(payment)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {visible.length === 0 && <p className="py-8 text-center text-sm text-slate-500">Tidak ada transaksi yang cocok.</p>}
                    </DesktopTable>
                </div>
            </Panel>
        </Shell>
    );
}
