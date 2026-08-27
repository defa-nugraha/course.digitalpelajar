import { FieldLabel } from '@/components/form-field';
import InputError from '@/components/input-error';
import { Panel, Shell, StatCard } from '@/components/platform';
import { DesktopTable, MobileActionMenu, MobileCardList, MobileDataCard } from '@/components/responsive-data';
import { SearchableSelect } from '@/components/searchable-select';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { confirmDelete } from '@/lib/confirm-delete';
import { Head, router, useForm } from '@inertiajs/react';
import { Banknote, CheckCircle2, ChevronDown, ChevronRight, ExternalLink, Pencil, Plus, Search, Trash2, Users, Wallet } from 'lucide-react';
import { FormEvent, Fragment, ReactNode, useMemo, useState } from 'react';

interface Option {
    id: number;
    name: string;
    bank_name?: string | null;
    bank_account_name?: string | null;
    bank_account_number?: string | null;
}

interface BankAccount {
    bankName?: string | null;
    bankAccountName?: string | null;
    bankAccountNumber?: string | null;
}

interface PayrollItemRow {
    id: number;
    sessionId: number;
    schedule: string;
    school: string;
    course: string;
    actualDate: string;
    rateAmountLabel: string;
    amountLabel: string;
}

interface PayrollRow {
    id: number;
    instructorId: number;
    instructor: string;
    periodMonth: string;
    periodLabel: string;
    totalSessions: number;
    totalAmount: number;
    totalAmountLabel: string;
    status: string;
    paidAt?: string | null;
    paymentProofPath?: string | null;
    paymentProofUrl?: string | null;
    notes?: string | null;
    bankAccount?: BankAccount;
    items: PayrollItemRow[];
}

interface RateRow {
    id: number;
    instructorId: number;
    instructor: string;
    amountPerSession: number;
    amountPerSessionLabel: string;
    effectiveFrom: string;
    effectiveUntil?: string | null;
    notes?: string | null;
    isActive: boolean;
}

interface PayrollsProps {
    scope: 'admin' | 'instructor';
    title: string;
    payrolls: PayrollRow[];
    rates: RateRow[];
    stats: {
        payrolls: number;
        sessions: number;
        totalAmount: string;
        paidAmount: string;
    };
    options: {
        instructors: Option[];
    };
    bankAccount?: BankAccount | null;
    permissions: {
        canManage: boolean;
    };
}

interface BankFormData {
    [key: string]: string;
    bank_name: string;
    bank_account_name: string;
    bank_account_number: string;
}

interface RateFormData {
    [key: string]: string | number | boolean;
    instructor_id: string;
    amount_per_session: string;
    effective_from: string;
    effective_until: string;
    notes: string;
    is_active: string;
}

interface PayrollFormData {
    [key: string]: string | number;
    instructor_id: string;
    period_month: string;
    notes: string;
}

const emptyRate: RateFormData = {
    instructor_id: '',
    amount_per_session: '',
    effective_from: new Date().toISOString().slice(0, 10),
    effective_until: '',
    notes: '',
    is_active: '1',
};

const emptyPayroll: PayrollFormData = {
    instructor_id: '',
    period_month: new Date().toISOString().slice(0, 7),
    notes: '',
};

export default function TeachingPayrolls({ scope, title, payrolls, rates, stats, options, bankAccount, permissions }: PayrollsProps) {
    const [term, setTerm] = useState('');
    const [status, setStatus] = useState('all');
    const [rateOpen, setRateOpen] = useState(false);
    const [payrollOpen, setPayrollOpen] = useState(false);
    const [editingRate, setEditingRate] = useState<RateRow | null>(null);
    const [editingPayroll, setEditingPayroll] = useState<PayrollRow | null>(null);
    const [expanded, setExpanded] = useState<number[]>([]);
    const rateForm = useForm<RateFormData>(emptyRate);
    const payrollForm = useForm<PayrollFormData>(emptyPayroll);
    const statusForm = useForm<{ status: string; notes: string; payment_proof: File | null; [key: string]: string | File | null }>({
        status: 'draft',
        notes: '',
        payment_proof: null,
    });
    const bankForm = useForm<BankFormData>({
        bank_name: bankAccount?.bankName ?? '',
        bank_account_name: bankAccount?.bankAccountName ?? '',
        bank_account_number: bankAccount?.bankAccountNumber ?? '',
    });
    const nav = scope === 'admin' ? 'admin' : 'instructor';
    const visiblePayrolls = useMemo(
        () =>
            payrolls.filter((payroll) => {
                const text = `${payroll.instructor} ${payroll.periodLabel} ${payroll.notes ?? ''}`.toLowerCase();

                return text.includes(term.toLowerCase()) && (status === 'all' || payroll.status === status);
            }),
        [payrolls, status, term],
    );
    const payrollStatusOptions = [
        { value: 'all', label: 'Semua status' },
        { value: 'draft', label: 'Draft' },
        { value: 'reviewed', label: 'Reviewed' },
        { value: 'paid', label: 'Paid' },
    ];
    const payrollStatusFormOptions = payrollStatusOptions.filter((option) => option.value !== 'all');
    const instructorOptions = [
        { value: '', label: 'Pilih pengajar' },
        ...options.instructors.map((instructor) => ({ value: String(instructor.id), label: instructor.name })),
    ];
    const activeOptions = [
        { value: '1', label: 'Aktif' },
        { value: '0', label: 'Nonaktif' },
    ];

    const showRateCreate = () => {
        setEditingRate(null);
        rateForm.setData({ ...emptyRate, instructor_id: options.instructors[0] ? String(options.instructors[0].id) : '' });
        rateForm.clearErrors();
        setRateOpen(true);
    };

    const showRateEdit = (rate: RateRow) => {
        setEditingRate(rate);
        rateForm.setData({
            instructor_id: String(rate.instructorId),
            amount_per_session: String(rate.amountPerSession),
            effective_from: rate.effectiveFrom,
            effective_until: rate.effectiveUntil ?? '',
            notes: rate.notes ?? '',
            is_active: rate.isActive ? '1' : '0',
        });
        rateForm.clearErrors();
        setRateOpen(true);
    };

    const submitRate = (event: FormEvent) => {
        event.preventDefault();
        const payload = {
            ...rateForm.data,
            instructor_id: Number(rateForm.data.instructor_id),
            amount_per_session: Number(rateForm.data.amount_per_session),
            is_active: rateForm.data.is_active === '1',
        };
        rateForm.transform(() => payload);
        const requestOptions = { preserveScroll: true, onSuccess: () => setRateOpen(false) };

        if (editingRate) {
            rateForm.patch(`/admin/instructor-pay-rates/${editingRate.id}`, requestOptions);
        } else {
            rateForm.post('/admin/instructor-pay-rates', requestOptions);
        }
    };

    const removeRate = (rate: RateRow) => {
        confirmDelete(`Hapus tarif ${rate.instructor} (${rate.amountPerSessionLabel})?`, () => {
            router.delete(`/admin/instructor-pay-rates/${rate.id}`, { preserveScroll: true });
        });
    };

    const showPayrollCreate = () => {
        payrollForm.setData({ ...emptyPayroll, instructor_id: options.instructors[0] ? String(options.instructors[0].id) : '' });
        payrollForm.clearErrors();
        setPayrollOpen(true);
    };

    const submitPayroll = (event: FormEvent) => {
        event.preventDefault();
        const payload = {
            ...payrollForm.data,
            instructor_id: Number(payrollForm.data.instructor_id),
        };
        payrollForm.transform(() => payload);
        payrollForm.post('/admin/instructor-payrolls', {
            preserveScroll: true,
            onSuccess: () => setPayrollOpen(false),
        });
    };

    const showPayrollEdit = (payroll: PayrollRow) => {
        setEditingPayroll(payroll);
        statusForm.setData({ status: payroll.status, notes: payroll.notes ?? '', payment_proof: null });
        statusForm.clearErrors();
    };

    const submitPayrollStatus = (event: FormEvent) => {
        event.preventDefault();
        if (!editingPayroll) return;

        statusForm.transform((data) => ({ ...data, _method: 'patch' }));
        statusForm.post(`/admin/instructor-payrolls/${editingPayroll.id}`, {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                setEditingPayroll(null);
                statusForm.reset('payment_proof');
            },
        });
    };

    const submitBankAccount = (event: FormEvent) => {
        event.preventDefault();
        bankForm.patch('/instructor/payrolls/bank-account', { preserveScroll: true });
    };

    const removePayroll = (payroll: PayrollRow) => {
        confirmDelete(`Hapus payroll ${payroll.instructor} periode ${payroll.periodLabel}?`, () => {
            router.delete(`/admin/instructor-payrolls/${payroll.id}`, { preserveScroll: true });
        });
    };

    const toggleExpanded = (id: number) => {
        setExpanded((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
    };

    return (
        <Shell
            title={title}
            eyebrow={scope === 'admin' ? 'Admin Operasional' : 'Pengajar / Trainer'}
            nav={nav}
            actions={
                permissions.canManage && (
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={showRateCreate}>
                            <Plus className="size-4" />
                            Tarif
                        </Button>
                        <Button onClick={showPayrollCreate}>
                            <Plus className="size-4" />
                            Generate Payroll
                        </Button>
                    </div>
                )
            }
        >
            <Head title={title} />
            <div className="grid gap-5 md:grid-cols-4">
                <StatCard label="Payroll" value={String(stats.payrolls)} icon={Wallet} />
                <StatCard label="Pertemuan Dibayar" value={String(stats.sessions)} icon={Users} tone="purple" />
                <StatCard label="Total Gaji" value={stats.totalAmount} icon={Banknote} tone="amber" />
                <StatCard label="Sudah Dibayar" value={stats.paidAmount} icon={CheckCircle2} tone="slate" />
            </div>

            {scope === 'instructor' && (
                <Panel className="mt-6" title="Rekening Penerimaan Gaji">
                    <form onSubmit={submitBankAccount} className="grid gap-4 lg:grid-cols-[1fr_1fr_1fr_auto] lg:items-start">
                        <Field label="Nama bank" error={bankForm.errors.bank_name} required>
                            <Input value={bankForm.data.bank_name} onChange={(event) => bankForm.setData('bank_name', event.target.value)} />
                        </Field>
                        <Field label="Nama pemilik rekening" error={bankForm.errors.bank_account_name} required>
                            <Input
                                value={bankForm.data.bank_account_name}
                                onChange={(event) => bankForm.setData('bank_account_name', event.target.value)}
                            />
                        </Field>
                        <Field label="Nomor rekening" error={bankForm.errors.bank_account_number} required>
                            <Input
                                inputMode="numeric"
                                value={bankForm.data.bank_account_number}
                                onChange={(event) => bankForm.setData('bank_account_number', event.target.value)}
                            />
                        </Field>
                        <Button type="submit" disabled={bankForm.processing} className="mt-7">
                            Simpan Rekening
                        </Button>
                    </form>
                </Panel>
            )}

            {permissions.canManage && (
                <Panel className="mt-6" title="Tarif gaji per pertemuan">
                    <div className="space-y-4">
                        <MobileCardList
                            empty={
                                <p className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
                                    Belum ada tarif pengajar.
                                </p>
                            }
                        >
                            {rates.map((rate) => (
                                <MobileDataCard
                                    key={rate.id}
                                    title={rate.instructor}
                                    subtitle={rate.notes || 'Tidak ada catatan'}
                                    badge={
                                        <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">
                                            {rate.isActive ? 'Aktif' : 'Nonaktif'}
                                        </span>
                                    }
                                    meta={[
                                        { label: 'Tarif', value: rate.amountPerSessionLabel },
                                        {
                                            label: 'Efektif',
                                            value: `${rate.effectiveFrom}${rate.effectiveUntil ? ` – ${rate.effectiveUntil}` : ' – sekarang'}`,
                                        },
                                    ]}
                                    actions={
                                        <>
                                            <Button type="button" variant="outline" size="sm" onClick={() => showRateEdit(rate)}>
                                                <Pencil className="size-4" />
                                                Edit
                                            </Button>
                                            <MobileActionMenu
                                                items={[
                                                    {
                                                        label: 'Hapus tarif',
                                                        destructive: true,
                                                        icon: <Trash2 className="size-4" />,
                                                        onClick: () => removeRate(rate),
                                                    },
                                                ]}
                                            />
                                        </>
                                    }
                                />
                            ))}
                        </MobileCardList>
                        <DesktopTable>
                            <table className="w-full text-left text-sm">
                                <thead className="text-xs tracking-wider text-slate-500 uppercase">
                                    <tr>
                                        <th className="py-3">Pengajar</th>
                                        <th>Tarif</th>
                                        <th>Efektif</th>
                                        <th>Status</th>
                                        <th>Catatan</th>
                                        <th className="text-right">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200">
                                    {rates.map((rate) => (
                                        <tr key={rate.id}>
                                            <td className="py-4 font-bold">{rate.instructor}</td>
                                            <td>{rate.amountPerSessionLabel}</td>
                                            <td>
                                                {rate.effectiveFrom}
                                                {rate.effectiveUntil ? ` – ${rate.effectiveUntil}` : ' – sekarang'}
                                            </td>
                                            <td>{rate.isActive ? 'Aktif' : 'Nonaktif'}</td>
                                            <td className="max-w-sm text-xs text-slate-500">{rate.notes || '-'}</td>
                                            <td>
                                                <div className="flex justify-end gap-1">
                                                    <Button variant="ghost" size="icon" aria-label="Edit tarif" onClick={() => showRateEdit(rate)}>
                                                        <Pencil className="size-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" aria-label="Hapus tarif" onClick={() => removeRate(rate)}>
                                                        <Trash2 className="size-4 text-red-600" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {rates.length === 0 && <p className="py-8 text-center text-sm text-slate-500">Belum ada tarif pengajar.</p>}
                        </DesktopTable>
                    </div>
                </Panel>
            )}

            <Panel
                className="mt-6"
                title="Payroll bulanan"
                action={
                    <div className="flex flex-col gap-2 md:flex-row">
                        <label className="relative block w-full md:w-72">
                            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
                            <Input
                                className="bg-[#FAF8FF] pl-9"
                                placeholder="Cari pengajar atau periode..."
                                value={term}
                                onChange={(event) => setTerm(event.target.value)}
                            />
                        </label>
                        <SearchableSelect
                            value={status}
                            onChange={setStatus}
                            options={payrollStatusOptions}
                            placeholder="Status"
                            className="md:w-52"
                        />
                    </div>
                }
            >
                <div className="space-y-4">
                    <MobileCardList
                        empty={
                            <p className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
                                Belum ada payroll yang cocok.
                            </p>
                        }
                    >
                        {visiblePayrolls.map((payroll) => (
                            <MobileDataCard
                                key={payroll.id}
                                title={payroll.instructor}
                                subtitle={`Periode ${payroll.periodLabel}`}
                                badge={<StatusPill status={payroll.status} />}
                                meta={[
                                    { label: 'Pertemuan', value: payroll.totalSessions },
                                    { label: 'Total', value: payroll.totalAmountLabel },
                                    { label: 'Dibayar', value: payroll.paidAt || '-' },
                                ]}
                                actions={
                                    <>
                                        <Button type="button" size="sm" variant="outline" onClick={() => toggleExpanded(payroll.id)}>
                                            {expanded.includes(payroll.id) ? 'Tutup Detail' : 'Detail'}
                                        </Button>
                                        {permissions.canManage && (
                                            <Button type="button" size="sm" variant="outline" onClick={() => showPayrollEdit(payroll)}>
                                                <Pencil className="size-4" />
                                                Edit
                                            </Button>
                                        )}
                                        <MobileActionMenu
                                            items={[
                                                permissions.canManage && payroll.status !== 'paid'
                                                    ? {
                                                          label: 'Hapus payroll',
                                                          destructive: true,
                                                          icon: <Trash2 className="size-4" />,
                                                          onClick: () => removePayroll(payroll),
                                                      }
                                                    : { label: '' },
                                            ]}
                                        />
                                    </>
                                }
                            >
                                {payroll.bankAccount?.bankAccountNumber && (
                                    <p className="text-sm leading-6 text-slate-600">
                                        Rekening: {payroll.bankAccount.bankName ?? '-'} · {payroll.bankAccount.bankAccountNumber} ·{' '}
                                        {payroll.bankAccount.bankAccountName ?? payroll.instructor}
                                    </p>
                                )}
                                {expanded.includes(payroll.id) && (
                                    <div className="mt-3 grid gap-3">
                                        {payroll.paymentProofUrl && (
                                            <a
                                                href={payroll.paymentProofUrl}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700"
                                            >
                                                <ExternalLink className="size-4" />
                                                Lihat bukti pembayaran
                                            </a>
                                        )}
                                        {payroll.items.map((item) => (
                                            <div key={item.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                                                <p className="font-bold text-slate-950">{item.schedule}</p>
                                                <p className="mt-1 text-xs text-slate-500">
                                                    {item.school} · {item.course} · {item.actualDate}
                                                </p>
                                                <p className="mt-2 text-sm font-semibold text-blue-700">
                                                    {item.rateAmountLabel} / pertemuan · Total {item.amountLabel}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </MobileDataCard>
                        ))}
                    </MobileCardList>
                    <DesktopTable>
                        <table className="w-full text-left text-sm">
                            <thead className="text-xs tracking-wider text-slate-500 uppercase">
                                <tr>
                                    <th className="py-3">Payroll</th>
                                    <th>Pertemuan</th>
                                    <th>Total</th>
                                    <th>Status</th>
                                    <th>Dibayar</th>
                                    <th className="text-right">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                                {visiblePayrolls.map((payroll) => (
                                    <Fragment key={payroll.id}>
                                        <tr>
                                            <td className="py-4">
                                                <button
                                                    type="button"
                                                    onClick={() => toggleExpanded(payroll.id)}
                                                    className="flex items-center gap-2 text-left font-bold text-slate-950 hover:text-blue-700"
                                                >
                                                    {expanded.includes(payroll.id) ? (
                                                        <ChevronDown className="size-4" />
                                                    ) : (
                                                        <ChevronRight className="size-4" />
                                                    )}
                                                    {payroll.instructor}
                                                </button>
                                                <p className="mt-1 text-xs text-slate-500">Periode {payroll.periodLabel}</p>
                                                {payroll.bankAccount?.bankAccountNumber && (
                                                    <p className="mt-1 text-xs text-slate-500">
                                                        Rekening: {payroll.bankAccount.bankName ?? '-'} · {payroll.bankAccount.bankAccountNumber} ·{' '}
                                                        {payroll.bankAccount.bankAccountName ?? payroll.instructor}
                                                    </p>
                                                )}
                                                {payroll.notes && <p className="mt-1 text-xs text-slate-500">{payroll.notes}</p>}
                                            </td>
                                            <td>{payroll.totalSessions}</td>
                                            <td className="font-bold">{payroll.totalAmountLabel}</td>
                                            <td>
                                                <StatusPill status={payroll.status} />
                                            </td>
                                            <td>{payroll.paidAt || '-'}</td>
                                            <td>
                                                <div className="flex justify-end gap-1">
                                                    {permissions.canManage && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            aria-label="Edit payroll"
                                                            onClick={() => showPayrollEdit(payroll)}
                                                        >
                                                            <Pencil className="size-4" />
                                                        </Button>
                                                    )}
                                                    {permissions.canManage && payroll.status !== 'paid' && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            aria-label="Hapus payroll"
                                                            onClick={() => removePayroll(payroll)}
                                                        >
                                                            <Trash2 className="size-4 text-red-600" />
                                                        </Button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                        {expanded.includes(payroll.id) && (
                                            <tr key={`${payroll.id}-items`} className="bg-slate-50">
                                                <td colSpan={6} className="p-4">
                                                    {payroll.paymentProofUrl && (
                                                        <a
                                                            href={payroll.paymentProofUrl}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="mb-3 inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 hover:border-emerald-300"
                                                        >
                                                            <ExternalLink className="size-4" />
                                                            Lihat bukti pembayaran
                                                        </a>
                                                    )}
                                                    <div className="grid gap-3 md:grid-cols-2">
                                                        {payroll.items.map((item) => (
                                                            <div key={item.id} className="rounded-lg border border-slate-200 bg-white p-4">
                                                                <p className="font-bold text-slate-950">{item.schedule}</p>
                                                                <p className="mt-1 text-xs text-slate-500">
                                                                    {item.school} · {item.course} · {item.actualDate}
                                                                </p>
                                                                <p className="mt-2 text-sm font-semibold text-blue-700">
                                                                    {item.rateAmountLabel} / pertemuan · Total {item.amountLabel}
                                                                </p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </Fragment>
                                ))}
                            </tbody>
                        </table>
                        {visiblePayrolls.length === 0 && <p className="py-8 text-center text-sm text-slate-500">Belum ada payroll yang cocok.</p>}
                    </DesktopTable>
                </div>
            </Panel>

            <Dialog open={rateOpen} onOpenChange={setRateOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingRate ? 'Edit Tarif Pengajar' : 'Tambah Tarif Pengajar'}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={submitRate} className="space-y-4">
                        <Field label="Pengajar" error={rateForm.errors.instructor_id} required>
                            <SearchableSelect
                                value={rateForm.data.instructor_id}
                                onChange={(value) => rateForm.setData('instructor_id', value)}
                                options={instructorOptions}
                                placeholder="Pilih pengajar"
                            />
                        </Field>
                        <Field label="Tarif per pertemuan" error={rateForm.errors.amount_per_session} required>
                            <Input
                                type="number"
                                min="1"
                                value={rateForm.data.amount_per_session}
                                onChange={(event) => rateForm.setData('amount_per_session', event.target.value)}
                            />
                        </Field>
                        <div className="grid gap-4 md:grid-cols-2">
                            <Field label="Efektif dari" error={rateForm.errors.effective_from} required>
                                <Input
                                    type="date"
                                    value={rateForm.data.effective_from}
                                    onChange={(event) => rateForm.setData('effective_from', event.target.value)}
                                />
                            </Field>
                            <Field label="Efektif sampai" error={rateForm.errors.effective_until}>
                                <Input
                                    type="date"
                                    value={rateForm.data.effective_until}
                                    onChange={(event) => rateForm.setData('effective_until', event.target.value)}
                                />
                            </Field>
                        </div>
                        <Field label="Status" error={rateForm.errors.is_active} required>
                            <SearchableSelect
                                value={rateForm.data.is_active}
                                onChange={(value) => rateForm.setData('is_active', value)}
                                options={activeOptions}
                            />
                        </Field>
                        <Field label="Catatan" error={rateForm.errors.notes}>
                            <textarea
                                className="min-h-24 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                                value={rateForm.data.notes}
                                onChange={(event) => rateForm.setData('notes', event.target.value)}
                            />
                        </Field>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setRateOpen(false)}>
                                Batal
                            </Button>
                            <Button type="submit" disabled={rateForm.processing}>
                                Simpan Tarif
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog open={payrollOpen} onOpenChange={setPayrollOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Generate Payroll Bulanan</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={submitPayroll} className="space-y-4">
                        <Field label="Pengajar" error={payrollForm.errors.instructor_id} required>
                            <SearchableSelect
                                value={payrollForm.data.instructor_id}
                                onChange={(value) => payrollForm.setData('instructor_id', value)}
                                options={instructorOptions}
                                placeholder="Pilih pengajar"
                            />
                        </Field>
                        <Field label="Periode payroll" error={payrollForm.errors.period_month} required>
                            <Input
                                type="month"
                                value={payrollForm.data.period_month}
                                onChange={(event) => payrollForm.setData('period_month', event.target.value)}
                            />
                        </Field>
                        <Field label="Catatan" error={payrollForm.errors.notes}>
                            <textarea
                                className="min-h-24 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                                value={payrollForm.data.notes}
                                onChange={(event) => payrollForm.setData('notes', event.target.value)}
                            />
                        </Field>
                        <p className="rounded-lg bg-blue-50 px-3 py-2 text-xs leading-5 text-blue-700">
                            Payroll hanya mengambil laporan pertemuan berstatus approved pada periode ini dan yang belum pernah masuk payroll lain.
                        </p>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setPayrollOpen(false)}>
                                Batal
                            </Button>
                            <Button type="submit" disabled={payrollForm.processing}>
                                Generate
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog open={Boolean(editingPayroll)} onOpenChange={(next) => !next && setEditingPayroll(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Update Status Payroll</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={submitPayrollStatus} className="space-y-4">
                        {editingPayroll && (
                            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
                                <p className="font-bold text-slate-950">{editingPayroll.instructor}</p>
                                <p className="mt-1 text-slate-500">
                                    {editingPayroll.periodLabel} · {editingPayroll.totalSessions} pertemuan · {editingPayroll.totalAmountLabel}
                                </p>
                            </div>
                        )}
                        <Field label="Status payroll" error={statusForm.errors.status} required>
                            <SearchableSelect
                                value={statusForm.data.status}
                                onChange={(value) => statusForm.setData('status', value)}
                                options={payrollStatusFormOptions}
                            />
                        </Field>
                        <Field label="Catatan" error={statusForm.errors.notes}>
                            <textarea
                                className="min-h-24 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                                value={statusForm.data.notes}
                                onChange={(event) => statusForm.setData('notes', event.target.value)}
                            />
                        </Field>
                        <Field label="Upload bukti pembayaran (opsional)" error={statusForm.errors.payment_proof}>
                            <Input
                                type="file"
                                accept="image/png,image/jpeg,image/webp,application/pdf"
                                onChange={(event) => statusForm.setData('payment_proof', event.target.files?.[0] ?? null)}
                            />
                            <p className="text-xs text-slate-500">
                                Format JPG, PNG, WEBP, atau PDF maksimal 5MB. Database hanya menyimpan path file.
                            </p>
                            {editingPayroll?.paymentProofUrl && (
                                <a
                                    href={editingPayroll.paymentProofUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-2 text-xs font-bold text-blue-700"
                                >
                                    <ExternalLink className="size-4" />
                                    Lihat bukti tersimpan
                                </a>
                            )}
                        </Field>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setEditingPayroll(null)}>
                                Batal
                            </Button>
                            <Button type="submit" disabled={statusForm.processing}>
                                Simpan Status
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </Shell>
    );
}

function Field({ label, error, required = false, children }: { label: string; error?: string; required?: boolean; children: ReactNode }) {
    return (
        <div className="space-y-2">
            <FieldLabel required={required}>{label}</FieldLabel>
            {children}
            <InputError message={error} />
        </div>
    );
}

function StatusPill({ status }: { status: string }) {
    const className =
        status === 'paid' ? 'bg-emerald-50 text-emerald-700' : status === 'reviewed' ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700';

    return <span className={`rounded-full px-2 py-1 text-xs font-bold capitalize ${className}`}>{status}</span>;
}
