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
    Landmark,
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

const paymentLogoSources = {
    qris: 'https://upload.wikimedia.org/wikipedia/commons/e/e1/QRIS_logo.svg',
    gopay: 'https://upload.wikimedia.org/wikipedia/commons/b/b1/GoPay_logo.svg',
    alfamart: 'https://upload.wikimedia.org/wikipedia/commons/8/86/Alfamart_logo.svg',
    indomaret: 'https://upload.wikimedia.org/wikipedia/commons/4/44/Indomaret.svg',
    banks: {
        bca: 'https://commons.wikimedia.org/wiki/Special:FilePath/Bank_Central_Asia.svg',
        bni: 'https://commons.wikimedia.org/wiki/Special:FilePath/Bank_Negara_Indonesia_logo_(2004).svg',
        bri: 'https://commons.wikimedia.org/wiki/Special:FilePath/BRI_2025.svg',
        mandiri: 'https://commons.wikimedia.org/wiki/Special:FilePath/Bank_Mandiri_logo_2016.svg',
    },
};

export default function PublicPayment({ studentNumber, searched, bills }: Props) {
    const lookupForm = useForm({ student_number: studentNumber ?? '' });
    const paymentForm = useForm({ student_number: studentNumber ?? '', bill_ids: [] as number[] });
    const [selectedBillIds, setSelectedBillIds] = useState<number[]>([]);
    const billIdsKey = bills.map((bill) => bill.id).join(',');

    useEffect(() => {
        setSelectedBillIds([]);
    }, [studentNumber, billIdsKey]);

    const selectedBills = bills.filter((bill) => selectedBillIds.includes(bill.id));
    const activeGroupIds = Array.from(new Set(selectedBills.flatMap((bill) => bill.activePaymentBillIds)));
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
            <div className="flex min-h-screen flex-col bg-[#F7F9FC] text-[#131B2E]">
                <header className="w-full border-b border-slate-200 bg-white px-4 py-3 shadow-sm sm:px-6 sm:py-4 lg:px-10">
                    <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
                        <Link href="/" className="flex min-w-0 items-center">
                            <BrandLogo className="h-8 sm:h-10" />
                        </Link>
                        <Link
                            href="/courses"
                            className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-50 hover:text-[#005BB1] sm:text-sm"
                        >
                            <ArrowLeft className="size-4" />
                            <span>Katalog kelas</span>
                        </Link>
                    </div>
                </header>

                <PublicContent skeleton="detail">
                    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-5 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
                        <section className="mb-5 overflow-hidden rounded-2xl bg-gradient-to-r from-[#075DB5] to-[#1C7DE8] p-5 text-white shadow-[0_12px_32px_rgba(15,81,160,0.16)] sm:mb-7 sm:rounded-3xl sm:p-8">
                            <div className="flex items-center justify-between gap-4">
                                <div className="max-w-2xl">
                                    <p className="mb-2 text-[10px] font-bold tracking-[0.18em] text-blue-100 uppercase sm:mb-3 sm:text-xs sm:tracking-[0.2em]">
                                        Digital Pelajar Learning Center
                                    </p>
                                    <h1 className="text-2xl leading-tight font-extrabold tracking-tight sm:text-3xl md:text-4xl">
                                        Pembayaran Tagihan Kursus
                                    </h1>
                                    <p className="mt-2 max-w-xl text-sm leading-6 text-blue-50 sm:mt-3 sm:text-base sm:leading-7">
                                        Periksa tagihan dengan ID Siswa, pilih tagihan yang ingin dibayar, lalu
                                        selesaikan transaksi melalui halaman checkout Midtrans.
                                    </p>
                                </div>
                                <div className="hidden size-24 shrink-0 items-center justify-center rounded-3xl border border-white/20 bg-white/10 sm:flex md:size-28">
                                    <ReceiptText className="size-14 text-white" strokeWidth={1.4} />
                                </div>
                            </div>
                        </section>

                        <div className="grid items-start gap-4 sm:gap-6 lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)]">
                            <section className="min-w-0">
                                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_4px_20px_rgba(15,23,42,0.04)] sm:p-6">
                                    <div className="mb-5 flex items-center gap-3">
                                        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#1C7DE8] sm:size-11">
                                            <FileSearch className="size-5 sm:size-6" />
                                        </div>
                                        <div className="min-w-0">
                                            <h2 className="font-extrabold">Lihat tagihan Anda</h2>
                                            <p className="text-xs text-slate-500 sm:text-sm">
                                                Masukkan ID Siswa yang terdiri dari 6 digit
                                            </p>
                                        </div>
                                    </div>

                                    <form
                                        onSubmit={(event) => {
                                            event.preventDefault();
                                            lookupForm.post('/pembayaran/tagihan');
                                        }}
                                        className="space-y-3.5"
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
                                            className="h-12 rounded-xl font-mono text-lg tracking-[0.25em]"
                                            aria-invalid={Boolean(lookupForm.errors.student_number)}
                                        />
                                        {lookupForm.errors.student_number && (
                                            <p className="text-sm text-red-600">{lookupForm.errors.student_number}</p>
                                        )}
                                        <Button
                                            type="submit"
                                            className="h-11 w-full rounded-xl bg-[#1C7DE8] font-bold hover:bg-[#005DB5]"
                                            disabled={lookupForm.processing || lookupForm.data.student_number.length !== 6}
                                        >
                                            {lookupForm.processing ? 'Memeriksa...' : 'Lihat tagihan'}
                                        </Button>
                                    </form>
                                    <p className="mt-4 flex items-start gap-2 text-xs leading-5 text-slate-500">
                                        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                                        ID Siswa dapat dilihat pada akun siswa atau diminta kepada administrator Digital
                                        Pelajar.
                                    </p>
                                </div>
                            </section>

                            <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_4px_20px_rgba(15,23,42,0.04)] sm:p-6">
                                <div className="mb-4 flex flex-col gap-2 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="min-w-0">
                                        <h2 className="text-lg font-extrabold sm:text-xl">Daftar tagihan</h2>
                                        <p className="mt-1 text-xs text-slate-500 sm:text-sm">
                                            {searched && bills.length > 0
                                                ? bills.length + ' tagihan tersedia'
                                                : 'Tagihan tampil setelah ID Siswa diperiksa'}
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
                                        description="Masukkan ID Siswa pada formulir untuk melihat tagihan kursus yang masih perlu dibayarkan."
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
                                        <div className="mb-3 flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-3 sm:mb-4 sm:px-4">
                                            <label className="flex min-w-0 cursor-pointer items-center gap-2.5 text-xs font-semibold sm:gap-3 sm:text-sm">
                                                <Checkbox
                                                    checked={allSelected}
                                                    disabled={bills.some((bill) => bill.hasPendingPayment)}
                                                    onCheckedChange={(checked) => toggleAll(checked === true)}
                                                />
                                                <span>Pilih semua tagihan</span>
                                            </label>
                                            <span className="shrink-0 text-xs text-slate-500">
                                                {selectedBillIds.length} dipilih
                                            </span>
                                        </div>

                                        <div className="space-y-2.5 sm:space-y-3">
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
                                                            'flex min-w-0 gap-2.5 rounded-xl border p-3 transition sm:gap-3 sm:p-4 ' +
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
                                                            className="mt-0.5 shrink-0"
                                                        />
                                                        <div className="min-w-0 flex-1">
                                                            <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
                                                                <span className="min-w-0 flex-1 text-sm font-bold break-words sm:text-base">
                                                                    {bill.title}
                                                                </span>
                                                                <span
                                                                    className={
                                                                        'shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold sm:text-[11px] ' +
                                                                        (overdue
                                                                            ? 'bg-amber-100 text-amber-800'
                                                                            : 'bg-slate-100 text-slate-600')
                                                                    }
                                                                >
                                                                    {overdue ? 'Terlambat' : 'Belum dibayar'}
                                                                </span>
                                                            </div>
                                                            <p className="mt-1 text-xs text-slate-500 sm:text-sm">
                                                                {bill.course}
                                                            </p>
                                                            <div className="mt-3 flex min-w-0 flex-col gap-1.5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-2">
                                                                <span className="text-base font-extrabold text-[#075DB5] sm:text-lg">
                                                                    {bill.amountLabel}
                                                                </span>
                                                                <span className="flex items-center gap-1 text-[11px] text-slate-500 sm:text-xs">
                                                                    <CalendarDays className="size-3.5 shrink-0" />
                                                                    Jatuh tempo {bill.dueAt}
                                                                </span>
                                                            </div>
                                                            {bill.hasPendingPayment && (
                                                                <p className="mt-2 flex items-start gap-1.5 text-[11px] leading-5 font-medium text-blue-700 sm:text-xs">
                                                                    <CheckCircle2 className="mt-0.5 size-3.5 shrink-0" />
                                                                    <span>
                                                                        {bill.hasExistingSnap
                                                                            ? 'Sesi pembayaran sebelumnya tersedia dan akan dilanjutkan.'
                                                                            : groupIds.length > 1
                                                                              ? 'Tagihan ini termasuk satu transaksi gabungan yang masih aktif.'
                                                                              : 'Transaksi sebelumnya akan dilanjutkan tanpa membuat order baru.'}
                                                                    </span>
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
                                            <p className="mt-2 text-sm text-red-600">
                                                {paymentForm.errors.student_number}
                                            </p>
                                        )}

                                        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3.5 sm:mt-6 sm:p-4">
                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                <span className="text-xs font-semibold text-slate-600 sm:text-sm">
                                                    Total pembayaran
                                                </span>
                                                <span className="text-lg font-extrabold text-[#075DB5] sm:text-xl">
                                                    {formatRupiah(selectedTotal)}
                                                </span>
                                            </div>
                                            <Button
                                                type="button"
                                                className="mt-3 h-12 w-full rounded-xl bg-[#1C7DE8] text-sm font-bold hover:bg-[#005DB5] sm:mt-4 sm:text-base"
                                                onClick={submitPayment}
                                                disabled={
                                                    selectedBillIds.length === 0 ||
                                                    paymentForm.processing ||
                                                    selectedBillIds.length > 25
                                                }
                                            >
                                                <CreditCard className="size-5" />
                                                {paymentForm.processing
                                                    ? 'Menyiapkan pembayaran...'
                                                    : 'Bayar sekarang'}
                                            </Button>
                                            <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-[11px] text-slate-500 sm:text-xs">
                                                <LockKeyhole className="size-3.5 shrink-0" />
                                                Pembayaran diproses secara aman melalui Midtrans
                                            </p>
                                        </div>
                                    </>
                                )}
                            </section>
                        </div>

                        <section className="mt-5 grid gap-4 sm:mt-6 lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)]">
                            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_4px_20px_rgba(15,23,42,0.03)] sm:p-6">
                                <h2 className="mb-4 font-extrabold">Cara pembayaran</h2>
                                <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
                                    <Step
                                        number="01"
                                        title="Masukkan ID Siswa"
                                        description="Gunakan ID Siswa yang terdiri dari enam digit angka."
                                    />
                                    <Step
                                        number="02"
                                        title="Pilih tagihan"
                                        description="Centang satu tagihan atau beberapa tagihan yang tersedia."
                                    />
                                    <Step
                                        number="03"
                                        title="Selesaikan pembayaran"
                                        description="Pilih metode pembayaran pada halaman checkout Midtrans."
                                    />
                                </div>
                            </div>

                            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_4px_20px_rgba(15,23,42,0.03)] sm:p-6">
                                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                                    <div>
                                        <h2 className="font-extrabold">Metode pembayaran</h2>
                                        <p className="mt-1 text-xs text-slate-500">
                                            Pilih metode yang tersedia pada halaman checkout.
                                        </p>
                                    </div>
                                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600">
                                        Midtrans
                                    </span>
                                </div>
                                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
                                    <PaymentMethod name="QRIS" image={paymentLogoSources.qris} imageClassName="max-w-[84px]" />
                                    <PaymentMethod name="GoPay" image={paymentLogoSources.gopay} imageClassName="max-w-[86px]" />
                                    <PaymentMethod name="Alfamart" image={paymentLogoSources.alfamart} imageClassName="max-w-[88px]" />
                                    <PaymentMethod name="Indomaret" image={paymentLogoSources.indomaret} imageClassName="max-w-[88px]" />
                                    <PaymentMethod
                                        name="Transfer bank"
                                        bankLogos={[
                                            { name: 'BCA', src: paymentLogoSources.banks.bca },
                                            { name: 'BNI', src: paymentLogoSources.banks.bni },
                                            { name: 'BRI', src: paymentLogoSources.banks.bri },
                                            { name: 'Mandiri', src: paymentLogoSources.banks.mandiri },
                                        ]}
                                    />
                                </div>
                                <p className="mt-3 text-[11px] leading-5 text-slate-500">
                                    Ketersediaan setiap metode mengikuti aktivasi pada akun merchant dan dapat berbeda
                                    pada halaman checkout. Referensi logo: Wikimedia Commons. Logo merupakan merek masing-masing
                                    penyedia dan ditampilkan hanya sebagai identifikasi metode pembayaran.
                                </p>
                                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-medium text-blue-700">
                                    <a href="https://commons.wikimedia.org/wiki/File:QRIS_logo.svg" target="_blank" rel="noreferrer">
                                        QRIS
                                    </a>
                                    <a href="https://commons.wikimedia.org/wiki/File:GoPay_logo.svg" target="_blank" rel="noreferrer">
                                        GoPay
                                    </a>
                                    <a href="https://commons.wikimedia.org/wiki/File:Alfamart_logo.svg" target="_blank" rel="noreferrer">
                                        Alfamart
                                    </a>
                                    <a href="https://commons.wikimedia.org/wiki/File:Indomaret.svg" target="_blank" rel="noreferrer">
                                        Indomaret
                                    </a>
                                    <a href="https://commons.wikimedia.org/wiki/File:Bank_Central_Asia.svg" target="_blank" rel="noreferrer">
                                        BCA
                                    </a>
                                    <a href="https://commons.wikimedia.org/wiki/File:Bank_Negara_Indonesia_logo_(2004).svg" target="_blank" rel="noreferrer">
                                        BNI
                                    </a>
                                    <a href="https://commons.wikimedia.org/wiki/File:BRI_2025.svg" target="_blank" rel="noreferrer">
                                        BRI
                                    </a>
                                    <a href="https://commons.wikimedia.org/wiki/File:Bank_Mandiri_logo_2016.svg" target="_blank" rel="noreferrer">
                                        Mandiri
                                    </a>
                                </div>
                            </div>
                        </section>
                    </main>
                </PublicContent>
                <FooterMark />
            </div>
        </>
    );
}

function PaymentMethod({
    name,
    image,
    imageClassName,
    bankLogos,
}: {
    name: string;
    image?: string;
    imageClassName?: string;
    bankLogos?: { name: string; src: string }[];
}) {
    return (
        <div className="flex min-h-[76px] min-w-0 flex-col items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-2 py-3">
            <div className="flex h-8 w-full items-center justify-center">
                {bankLogos?.length ? (
                    <div className="flex w-full items-center justify-center gap-1.5">
                        {bankLogos.map((bank) => (
                            <img
                                key={bank.name}
                                src={bank.src}
                                alt={'Logo ' + bank.name}
                                loading="lazy"
                                className="max-h-5 w-auto max-w-[30px] object-contain"
                            />
                        ))}
                    </div>
                ) : image ? (
                    <img
                        src={image}
                        alt={'Logo ' + name}
                        loading="lazy"
                        className={'max-h-8 w-auto object-contain ' + (imageClassName ?? 'max-w-[88px]')}
                    />
                ) : (
                    <Landmark className="size-7 text-slate-600" strokeWidth={1.7} />
                )}
            </div>
            <span className="text-center text-[11px] font-bold text-slate-700 sm:text-xs">{name}</span>
        </div>
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
        <div className="grid min-h-64 place-items-center py-8 text-center sm:min-h-80 sm:py-10">
            <div>
                <div className="relative mx-auto mb-5 flex size-24 items-center justify-center rounded-full bg-slate-50 sm:size-28">
                    <div className="absolute inset-2 rounded-full border border-dashed border-slate-200" />
                    {icon === 'receipt' ? (
                        <ReceiptText className="size-10 text-[#1C7DE8] sm:size-12" strokeWidth={1.4} />
                    ) : (
                        <>
                            <FileSearch className="size-10 text-slate-400 sm:size-12" strokeWidth={1.4} />
                            <span className="absolute right-1 bottom-1 flex size-8 items-center justify-center rounded-full border-4 border-white bg-emerald-100 text-emerald-700 sm:size-9">
                                <CheckCircle2 className="size-4" />
                            </span>
                        </>
                    )}
                </div>
                <h3 className="font-bold">{title}</h3>
                <p className="mx-auto mt-2 max-w-sm text-xs leading-6 text-slate-500 sm:text-sm">
                    {description}
                </p>
            </div>
        </div>
    );
}

function Step({ number, title, description }: { number: string; title: string; description: string }) {
    return (
        <div className="flex min-w-0 gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-xs font-extrabold text-[#075DB5]">
                {number}
            </span>
            <div className="min-w-0">
                <p className="text-sm font-bold">{title}</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
            </div>
        </div>
    );
}
