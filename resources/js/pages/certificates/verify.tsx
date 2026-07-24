import { FooterMark, PublicContent, PublicNav } from '@/components/platform';
import { SeoData, SeoHead } from '@/components/seo-head';
import { Button } from '@/components/ui/button';
import { router } from '@inertiajs/react';
import { Copy, Download, QrCode, Search, ShieldCheck, XCircle } from 'lucide-react';
import { FormEvent, useState } from 'react';

interface VerifiedCertificate {
    no: string;
    status: string;
    student: string;
    course: string;
    school: string;
    issueDate: string;
    qrUrl: string;
    revocationReason?: string | null;
}

interface VerifyProps {
    seo?: SeoData;
    credential: string;
    certificate?: VerifiedCertificate | null;
}

export default function Verify({ seo, credential, certificate }: VerifyProps) {
    const [query, setQuery] = useState(credential || '');
    const [copied, setCopied] = useState(false);
    const hasSubmitted = credential.trim() !== '';
    const isValid = certificate?.status.toLowerCase() === 'issued';

    function submit(event: FormEvent) {
        event.preventDefault();
        router.get('/certificates/verify', { credential: query }, { preserveState: true });
    }

    return (
        <>
            <SeoHead seo={seo} fallbackTitle="Verifikasi Sertifikat" />
            <div className="min-h-screen bg-[#FAF8FF]">
                <PublicNav />
                <PublicContent skeleton="centered">
                    <main className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-5xl flex-col px-4 pt-32 pb-16 md:px-10">
                        <section className="mx-auto w-full max-w-3xl text-center">
                            <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-2xl bg-[#D6E3FF] text-[#005BB1]">
                                <ShieldCheck className="size-8" />
                            </div>
                            <h1 className="text-4xl leading-tight font-extrabold tracking-[-0.02em] text-[#131B2E] md:text-5xl">Verify Credential</h1>
                            <p className="mx-auto mt-4 max-w-2xl text-lg leading-8 text-[#414753]">
                                Masukkan nomor sertifikat atau token QR untuk memastikan credential diterbitkan resmi dan masih berlaku.
                            </p>
                            <form
                                onSubmit={submit}
                                className="mt-8 flex rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_4px_20px_rgba(15,23,42,0.05)]"
                            >
                                <div className="relative min-w-0 flex-1">
                                    <Search className="absolute top-1/2 left-4 size-5 -translate-y-1/2 text-slate-400" />
                                    <input
                                        className="h-14 w-full border-0 bg-transparent pr-3 pl-12 text-base font-semibold text-[#131B2E] outline-none placeholder:text-slate-400"
                                        value={query}
                                        onChange={(event) => setQuery(event.target.value)}
                                        placeholder="e.g. NGT-2026-8F92A"
                                    />
                                </div>
                                <Button className="h-14 rounded-xl bg-[#1C7DE8] px-6 hover:bg-[#1469c7]">Verify</Button>
                            </form>
                        </section>

                        <section className="mx-auto mt-10 w-full max-w-4xl">
                            {!hasSubmitted && (
                                <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
                                    <QrCode className="mx-auto size-20 text-slate-300" />
                                    <h2 className="mt-5 text-2xl font-extrabold text-[#131B2E]">Masukkan credential sertifikat</h2>
                                    <p className="mt-2 text-[#414753]">Hasil verifikasi akan tampil setelah nomor sertifikat diperiksa.</p>
                                </div>
                            )}

                            {hasSubmitted && !certificate && (
                                <div className="rounded-2xl border border-red-200 bg-white p-10 text-center shadow-sm">
                                    <XCircle className="mx-auto size-16 text-red-600" />
                                    <h2 className="mt-5 text-2xl font-extrabold text-[#131B2E]">Sertifikat tidak ditemukan</h2>
                                    <p className="mt-2 text-[#414753]">Nomor atau token tidak cocok dengan registry sertifikat.</p>
                                </div>
                            )}

                            {certificate && (
                                <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.08)]">
                                    <div className="border-b border-slate-200 bg-[#F2F3FF] p-8">
                                        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
                                            <div>
                                                <p className={`text-sm font-bold uppercase ${isValid ? 'text-emerald-700' : 'text-red-700'}`}>
                                                    {isValid ? 'Verified Credential' : 'Credential Revoked'}
                                                </p>
                                                <h2 className="mt-2 text-3xl font-extrabold text-[#131B2E]">{certificate.course}</h2>
                                            </div>
                                            <div
                                                className={`flex size-16 items-center justify-center rounded-2xl ${
                                                    isValid ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                                                }`}
                                            >
                                                {isValid ? <ShieldCheck className="size-8" /> : <XCircle className="size-8" />}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="grid gap-6 p-8 lg:grid-cols-[1fr_180px]">
                                        <div className="grid gap-4 md:grid-cols-2">
                                            <Info label="Student" value={certificate.student} />
                                            <Info label="Issue Date" value={certificate.issueDate} />
                                            <Info label="Credential ID" value={certificate.no} />
                                            <Info label="Authenticating Body" value={certificate.school} />
                                        </div>
                                        <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center">
                                            <img src={certificate.qrUrl} alt="QR sertifikat" className="mx-auto size-28" />
                                            <p className="mt-3 text-xs font-semibold text-slate-500">Scan untuk validasi</p>
                                        </div>
                                    </div>
                                    {!isValid && certificate.revocationReason && (
                                        <div className="mx-8 mb-8 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                                            Alasan pencabutan: {certificate.revocationReason}
                                        </div>
                                    )}
                                    <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50 p-6 sm:flex-row sm:justify-end">
                                        <Button
                                            variant="outline"
                                            onClick={async () => {
                                                await navigator.clipboard.writeText(window.location.href);
                                                setCopied(true);
                                                window.setTimeout(() => setCopied(false), 1500);
                                            }}
                                        >
                                            <Copy className="size-4" />
                                            {copied ? 'Tersalin' : 'Salin Link'}
                                        </Button>
                                        <Button onClick={() => window.print()} className="bg-[#1C7DE8] hover:bg-[#1469c7]">
                                            <Download className="size-4" />
                                            Cetak Hasil
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </section>
                    </main>
                </PublicContent>
                <FooterMark />
            </div>
        </>
    );
}

function Info({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-bold tracking-wider text-slate-500 uppercase">{label}</p>
            <p className="mt-1 font-bold text-[#131B2E]">{value}</p>
        </div>
    );
}
