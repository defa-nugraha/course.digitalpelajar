import BrandLogo from '@/components/brand-logo';
import { FooterMark, PublicContent } from '@/components/platform';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Head, Link, useForm } from '@inertiajs/react';
import { useEffect, useMemo, useState } from 'react';
import {
    ArrowLeft,
    CalendarDays,
    CheckCircle2,
    CreditCard,
    FileSearch,
    LockKeyhole,
    ReceiptText,
    ShieldCheck,
} from 'lucide-react';

interface Bill {
    id: number;
    title: string;
    course: string;
    amount: number;
    amountLabel: string;
    dueAt: string;
    status: string;
    hasPendingPayment: boolean;
    hasExistingSnap: boolean;
    activePaymentBillIds: number[];
}

interface Props {
    studentNumber: string | null;
    searched: boolean;
    bills: Bill[];
}

export default function PublicPayment({ studentNumber, searched, bills }: Props) {
    const lookupForm = useForm({ student_number: studentNumber ?? '' });
    const paymentForm = useForm({ student_number: studentNumber ?? '', bill_ids: [] as number[] });
    const [selectedBillIds, setSelectedBillIds] = useState<number[]>([]);
    const billIdsKey = bills.map((bill) => bill.id).join(',');

    useEffect(() => {
        setSelectedBillIds([]);
    }, [studentNumber, billIdsKey]);

    const selectedBills = bills.filter((bill) => selectedBillIds.includes(bill.id));
    const activeGroupIds = Array.from(
        new Set(selectedBills.flatMap((bill) => bill.activePaymentBillIds)),
    );
    const hasActiveGroup = activeGroupIds.length > 0;
    const allSelected = bills.length > 0 && bills.every((bill) => selectedBillIds.includes(bill.id));
    const selectedTotal = useMemo(
        () => bills.filter((bill) => selectedBillIds.includes(bill.id)).reduce((total, bill) => total + bill.amount, 0),
        [bills, selectedBillIds],
    );

    const formatRupiah = (amount: number) =>
        new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            maximumFractionDigits: 0,
        }).format(amount);

    const toggleBill = (billId: number, checked: boolean) => {
        const bill = bills.find((item) => item.id === billId);
        if (!bill) return;

        const groupIds = bill.activePaymentBillIds.length ? bill.activePaymentBillIds : [billId];
        setSelectedBillIds((current) => {
            if (!checked) {
                return current.filter((id) => !groupIds.includes(id));
            }

            const currentGroupIds = current.flatMap(
                (id) => bills.find((item) => item.id === id)?.activePaymentBillIds ?? [],
            );

            if (currentGroupIds.length && !groupIds.every((id) => currentGroupIds.includes(id))) {
                return current;
            }

            if (groupIds.length > 1 && current.some((id) => !groupIds.includes(id))) {
                return current;
            }

            return Array.from(new Set([...current, ...groupIds]));
        });
    };

    const toggleAll = (checked: boolean) => {
        setSelectedBillIds(checked ? bills.map((bill) => bill.id) : []);
    };

    const submitPayment = () => {
        paymentForm.transform(() => ({
            student_number: studentNumber ?? '',
            bill_ids: selectedBillIds,
        }));
        paymentForm.post('/pembayaran/bayar');
    };

    return (
        <>
            <Head title="Pembayaran Tagihan Kursus" />
            <div className="flex min-h-screen flex-col bg-[#FAF8FF] text-[#131B2E]">
                <header className="w-full border-b border-slate-200 bg-white px-4 py-4 shadow-sm md:px-10">
                    <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
                        <Link href="/" className="flex items-center">
                            <BrandLogo className="h-10" />
                        </Link>
                        <Link
                            href="/courses"
                            className="flex items-center gap-1 text-sm font-bold text-[#414753] transition hover:text-[#005BB1]"
                        >
                            <ArrowLeft className="size-4" />
                            Katalog kelas
                        </Link>
                    </div>
                </header>

                <PublicContent skeleton="detail">
                    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 md:px-10 md:py-12">
                        <section className="mb-8 overflow-hidden rounded-2xl bg-gradient-to-r from-[#075DB5] to-[#1C7DE8] p-6 text-white shadow-[0_12px_32px_rgba(15,81,160,0.18)] md:p-9">
                            <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
                                <div className="max-w-2xl">
                                    <p className="mb-3 text-xs font-bold tracking-[0.2em] text-blue-100 uppercase">
                                        Digital Pelajar Learning Center
                                    </p>
                                    <h1 className="text-2xl font-extrabold tracking-tight md:text-4xl">
                                        Pembayaran Tagihan Kursus
                                    </h1>
                                    <p className="mt-3 leading-7 text-blue-50">
                                        Periksa tagihan kursus menggunakan ID Siswa, pilih satu atau beberapa tagihan,
                                        lalu lanjutkan pembayaran melalui Midtrans.
                                    </p>
                                </div>
                                <div className="mx-auto flex size-28 shrink-0 items-center justify-center rounded-3xl border border-white/20 bg-white/10 md:mx-0 md:size-32">
                                    <ReceiptText className="size-16 text-white" strokeWidth={1.4} />
                                </div>
                            </div>
                        </section>

                        <div className="grid items-start gap-6 lg:grid-cols-[0.85fr_1.15fr]">
                            <section className="space-y-6">
                                <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-[0_4px_20px_rgba(15,23,42,0.05)]">
                                    <div className="mb-5 flex items-center gap-3">
                                        <div className="flex size-11 items-center justify-center rounded-xl bg-blue-50 text-[#1C7DE8]">
                                            <FileSearch className="size-6" />
                                        </div>
                                        <div>
                                            <h2 className="font-extrabold">Lihat tagihan Anda</h2>
                                            <p className="text-sm text-slate-500">Masukkan ID Siswa 6 digit</p>
                                        </div>
                                    </div>

                                    <form
                                        onSubmit={(event) => {
                                            event.preventDefault();
                                            lookupForm.post('/pembayaran/tagihan');
                                        }}
                                        className="space-y-4"
                                    >
                                        <label className="block text-sm font-semibold" htmlFor="student_number">
                                            ID Siswa
                                        </label>
                                        <Input
                                            id="student_number"
                                            type="text"
                                            inputMode="numeric"
                                            autoComplete="off"
                                            maxLength={6}
                                            placeholder="Contoh: 482915"
                                            value={lookupForm.data.student_number}
                                            onChange={(event) =>
                                                lookupForm.setData(
                                                    'student_number',
                                                    event.target.value.replace(/\D/g, '').slice(0, 6),
                                                )
                                            }
                                            className="h-12 font-mono text-lg tracking-[0.25em]"
                                            aria-invalid={Boolean(lookupForm.errors.student_number)}
                                        />
                                        {lookupForm.errors.student_number && (
                                            <p className="text-sm text-red-600">{lookupForm.errors.student_number}</p>
                                        )}
                                        <Button
                                            type="submit"
                                            className="h-11 w-full bg-[#1C7DE8] hover:bg-[#005DB5]"
                                            disabled={lookupForm.processing || lookupForm.data.student_number.length !== 6}
                                        >
                                            {lookupForm.processing ? 'Memeriksa...' : 'Lihat tagihan'}
                                        </Button>
                                    </form>
                                    <p className="mt-4 text-xs leading-5 text-slate-500">
                                        ID Siswa dapat dilihat pada akun siswa atau diminta kepada administrator Digital
                                        Pelajar.
                                    </p>
                                </div>

                                <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-[0_4px_20px_rgba(15,23,42,0.05)]">
                                    <h2 className="mb-5 font-extrabold">Cara pembayaran</h2>
                                    <div className="space-y-4">
                                        <Step
                                            number="01"
                                            title="Masukkan ID Siswa"
                                            description="Gunakan ID Siswa yang terdiri dari enam digit angka."
                                        />
                                        <Step
                                            number="02"
                                            title="Pilih tagihan"
                                            description="Centang satu tagihan atau pilih semua tagihan yang tersedia."
                                        />
                                        <Step
                                            number="03"
                                            title="Selesaikan pembayaran"
                                            description="Lanjutkan ke halaman pembayaran Midtrans dan pilih metode pembayaran."
                                        />
                                    </div>
                                    <div className="mt-6 flex items-start gap-3 rounded-lg border border-blue-100 bg-blue-50 p-4">
                                        <ShieldCheck className="mt-0.5 size-5 shrink-0 text-[#1C7DE8]" />
                                        <p className="text-xs leading-5 text-blue-900">
                                            Nominal dan rincian transaksi diverifikasi langsung dari sistem. Jangan
                                            membagikan tautan pembayaran kepada pihak yang tidak berkepentingan.
                                        </p>
                                    </div>
                                </div>
                            </section>

                            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-[0_4px_20px_rgba(15,23,42,0.05)] sm:p-6">
                                <div className="mb-5 flex flex-col gap-2 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
                                    <div>
                                        <h2 className="text-xl font-extrabold">Daftar tagihan</h2>
                                        <p className="mt-1 text-sm text-slate-500">
                                            {searched && bills.length > 0
                                                ? bills.length + ' tagihan tersedia'
                                                : 'Tagihan akan tampil setelah ID Siswa diperiksa'}
                                        </p>
                                    </div>
                                    {searched && bills.length > 0 && (
                                        <span className="w-fit rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-[#075DB5]">
                                            ID {studentNumber}
                                        </span>
                                    )}
                                </div>

                                {!searched ? (
                                    <EmptyState
                                        title="Tagihan Anda akan tampil di sini"
                                        description="Masukkan ID Siswa pada formulir di samping untuk melihat tagihan kursus yang masih perlu dibayarkan."
                                        icon="receipt"
                                    />
                                ) : bills.length === 0 ? (
                                    <EmptyState
                                        title="Tidak ada tagihan yang perlu dibayar"
                                        description="Tagihan aktif untuk ID tersebut tidak ditemukan. Periksa kembali nomor ID Siswa atau hubungi administrator apabila Anda merasa masih memiliki tagihan."
                                        icon="empty"
                                    />
                                ) : (
                                    <>
                                        <div className="mb-4 flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-4 py-3">
                                            <label className="flex cursor-pointer items-center gap-3 text-sm font-semibold">
                                                <Checkbox
                                                    checked={allSelected}
                                                    disabled={bills.some((bill) => bill.hasPendingPayment)}
                                                    onCheckedChange={(checked) => toggleAll(checked === true)}
                                                />
                                                Pilih semua tagihan
                                            </label>
                                            <span className="text-xs text-slate-500">{selectedBillIds.length} dipilih</span>
                                        </div>

                                        <div className="space-y-3">
                                            {bills.map((bill) => {
                                                const overdue = bill.status === 'overdue';
                                                const groupIds = bill.activePaymentBillIds.length
                                                    ? bill.activePaymentBillIds
                                                    : [bill.id];
                                                const disabledByActiveGroup =
                                                    hasActiveGroup && !activeGroupIds.includes(bill.id);

                                                return (
                                                    <label
                                                        key={bill.id}
                                                        className={
                                                            'flex gap-3 rounded-xl border p-4 transition ' +
                                                            (selectedBillIds.includes(bill.id)
                                                                ? 'border-blue-300 bg-blue-50/60'
                                                                : 'border-slate-200') +
                                                            (disabledByActiveGroup
                                                                ? ' cursor-not-allowed opacity-60'
                                                                : ' cursor-pointer hover:border-slate-300')
                                                        }
                                                    >
                                                        <Checkbox
                                                            checked={selectedBillIds.includes(bill.id)}
                                                            disabled={disabledByActiveGroup}
                                                            onCheckedChange={(checked) =>
                                                                toggleBill(bill.id, checked === true)
                                                            }
                                                            className="mt-1"
                                                        />
                                                        <div className="min-w-0 flex-1">
                                                            <div className="flex flex-wrap items-start justify-between gap-2">
                                                                <span className="font-bold">{bill.title}</span>
                                                                <span
                                                                    className={
                                                                        'rounded-full px-2.5 py-1 text-[11px] font-bold ' +
                                                                        (overdue
                                                                            ? 'bg-amber-100 text-amber-800'
                                                                            : 'bg-slate-100 text-slate-600')
                                                                    }
                                                                >
                                                                    {overdue ? 'Terlambat' : 'Belum dibayar'}
                                                                </span>
                                                            </div>
                                                            <p className="mt-1 text-sm text-slate-500">{bill.course}</p>
                                                            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                                                                <span className="text-base font-extrabold text-[#075DB5]">
                                                                    {bill.amountLabel}
                                                                </span>
                                                                <span className="flex items-center gap-1 text-xs text-slate-500">
                                                                    <CalendarDays className="size-3.5" />
                                                                    Jatuh tempo {bill.dueAt}
                                                                </span>
                                                            </div>
                                                            {bill.hasPendingPayment && (
                                                                <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-blue-700">
                                                                    <CheckCircle2 className="size-3.5" />
                                                                    {bill.hasExistingSnap
                                                                        ? 'Sesi pembayaran sebelumnya tersedia dan akan dilanjutkan.'
                                                                        : groupIds.length > 1
                                                                          ? 'Tagihan ini termasuk satu transaksi gabungan yang masih aktif.'
                                                                          : 'Transaksi sebelumnya akan dilanjutkan tanpa membuat order baru.'}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </label>
                                                );
                                            })}
                                        </div>

                                        {paymentForm.errors.bill_ids && (
                                            <p className="mt-4 text-sm text-red-600">{paymentForm.errors.bill_ids}</p>
                                        )}
                                        {paymentForm.errors.student_number && (
                                            <p className="mt-2 text-sm text-red-600">{paymentForm.errors.student_number}</p>
                                        )}

                                        <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
                                            <div className="flex items-center justify-between gap-3">
                                                <span className="text-sm font-semibold text-slate-600">
                                                    Total pembayaran
                                                </span>
                                                <span className="text-xl font-extrabold text-[#075DB5]">
                                                    {formatRupiah(selectedTotal)}
                                                </span>
                                            </div>
                                            <Button
                                                type="button"
                                                className="mt-4 h-12 w-full bg-[#1C7DE8] text-base font-bold hover:bg-[#005DB5]"
                                                onClick={submitPayment}
                                                disabled={
                                                    selectedBillIds.length === 0 ||
                                                    paymentForm.processing ||
                                                    selectedBillIds.length > 25
                                                }
                                            >
                                                <CreditCard className="size-5" />
                                                {paymentForm.processing ? 'Menyiapkan pembayaran...' : 'Bayar sekarang'}
                                            </Button>
                                            <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-xs text-slate-500">
                                                <LockKeyhole className="size-3.5" />
                                                Pembayaran diproses secara aman melalui Midtrans
                                            </p>
                                        </div>
                                    </>
                                )}
                            </section>
                        </div>
                    </main>
                </PublicContent>
                <FooterMark />
            </div>
        </>
    );
}

function EmptyState({
    title,
    description,
    icon,
}: {
    title: string;
    description: string;
    icon: 'receipt' | 'empty';
}) {
    return (
        <div className="grid min-h-80 place-items-center py-10 text-center">
            <div>
                <div className="relative mx-auto mb-5 flex size-28 items-center justify-center rounded-full bg-slate-50">
                    <div className="absolute inset-2 rounded-full border border-dashed border-slate-200" />
                    {icon === 'receipt' ? (
                        <ReceiptText className="size-12 text-[#1C7DE8]" strokeWidth={1.4} />
                    ) : (
                        <>
                            <FileSearch className="size-12 text-slate-400" strokeWidth={1.4} />
                            <span className="absolute right-1 bottom-1 flex size-9 items-center justify-center rounded-full border-4 border-white bg-emerald-100 text-emerald-700">
                                <CheckCircle2 className="size-4" />
                            </span>
                        </>
                    )}
                </div>
                <h3 className="font-bold">{title}</h3>
                <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">{description}</p>
            </div>
        </div>
    );
}

function Step({ number, title, description }: { number: string; title: string; description: string }) {
    return (
        <div className="flex gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-xs font-extrabold text-[#075DB5]">
                {number}
            </span>
            <div>
                <p className="text-sm font-bold">{title}</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
            </div>
        </div>
    );
}
