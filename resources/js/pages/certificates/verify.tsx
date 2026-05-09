import { FooterMark, PublicNav } from '@/components/platform';
import { Button } from '@/components/ui/button';
import { Head, router } from '@inertiajs/react';
import { Download, Eye, QrCode, Search, ShieldCheck, XCircle } from 'lucide-react';
import { FormEvent, useState } from 'react';

interface VerifiedCertificate {
    no: string;
    status: string;
    student: string;
    course: string;
    school: string;
    issueDate: string;
}

interface VerifyProps {
    credential: string;
    certificate?: VerifiedCertificate | null;
}

export default function Verify({ credential, certificate }: VerifyProps) {
    const [query, setQuery] = useState(credential || '');
    const hasSubmitted = credential.trim() !== '';

    function submit(event: FormEvent) {
        event.preventDefault();
        router.get('/certificates/verify', { credential: query }, { preserveState: true });
    }

    return (
        <>
            <Head title="Verifikasi Sertifikat" />
            <div className="min-h-screen bg-[#FAF8FF]">
                <PublicNav />
                <main className="mx-auto grid max-w-6xl gap-8 px-4 py-14 md:px-10 lg:grid-cols-[0.9fr_1.1fr]">
                    <section>
                        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">Global Registry</span>
                        <h1 className="mt-5 text-4xl font-extrabold">Verify Credential</h1>
                        <p className="mt-3 leading-7 text-slate-600">
                            Masukkan nomor sertifikat atau token QR. Sesuai SKPL, informasi sertifikat hanya ditampilkan setelah proses verifikasi dilakukan.
                        </p>
                        <form onSubmit={submit} className="mt-6 flex rounded-lg border border-slate-200 bg-white p-2 shadow-sm">
                            <input
                                className="min-w-0 flex-1 border-0 bg-transparent px-3 text-sm outline-none"
                                value={query}
                                onChange={(event) => setQuery(event.target.value)}
                                placeholder="Contoh: NGT-2026-8F92A"
                            />
                            <Button className="bg-[#1C7DE8] hover:bg-[#1469c7]">
                                <Search className="size-4" />
                                Verify
                            </Button>
                        </form>
                        <p className="mt-3 text-sm text-slate-500">Demo valid: NGT-2026-8F92A</p>
                    </section>

                    {!hasSubmitted && (
                        <section className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm">
                            <QrCode className="mx-auto size-20 text-slate-300" />
                            <h2 className="mt-5 text-2xl font-extrabold">Masukkan credential terlebih dahulu</h2>
                            <p className="mt-2 text-slate-600">Card hasil verifikasi sengaja disembunyikan sampai user menekan tombol Verify.</p>
                        </section>
                    )}

                    {hasSubmitted && !certificate && (
                        <section className="rounded-lg border border-red-200 bg-white p-8 text-center shadow-sm">
                            <XCircle className="mx-auto size-16 text-red-600" />
                            <h2 className="mt-5 text-2xl font-extrabold">Sertifikat tidak ditemukan</h2>
                            <p className="mt-2 text-slate-600">Nomor atau token tidak cocok dengan registry sertifikat Ngawitekno.</p>
                        </section>
                    )}

                    {certificate && (
                        <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-bold text-emerald-700">{certificate.status} Status</p>
                                    <h2 className="mt-1 text-2xl font-extrabold">{certificate.course}</h2>
                                </div>
                                <ShieldCheck className="size-10 text-emerald-600" />
                            </div>
                            <div className="mt-6 grid gap-4 md:grid-cols-2">
                                <Info label="Student" value={certificate.student} />
                                <Info label="Issue Date" value={certificate.issueDate} />
                                <Info label="Credential ID" value={certificate.no} />
                                <Info label="Authenticating Body" value={certificate.school} />
                            </div>
                            <div className="mt-6 flex items-center justify-between rounded-lg bg-slate-50 p-5">
                                <QrCode className="size-20 text-slate-900" />
                                <div className="flex gap-2">
                                    <Button variant="outline"><Eye className="size-4" />Preview</Button>
                                    <Button><Download className="size-4" />PDF</Button>
                                </div>
                            </div>
                        </section>
                    )}
                </main>
                <FooterMark />
            </div>
        </>
    );
}

function Info({ label, value }: { label: string; value: string }) {
    return <div className="rounded-lg border border-slate-200 p-4"><p className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</p><p className="mt-1 font-bold">{value}</p></div>;
}
