import { Panel, Shell } from '@/components/platform';
import { Button } from '@/components/ui/button';
import { Head, Link } from '@inertiajs/react';
import { Download, Fingerprint, Share2, ShieldCheck } from 'lucide-react';
import { useState } from 'react';

interface Certificate {
    id: number;
    title: string;
    no: string;
    issueDate: string;
    status: string;
}

export default function Certificates({ certificates }: { certificates: Certificate[] }) {
    const [sharedId, setSharedId] = useState<number | null>(null);

    return (
        <Shell title="My Certificates" eyebrow="Credential Wallet">
            <Head title="Sertifikat Saya" />
            <div className="grid gap-5 md:grid-cols-3">
                {certificates.map((certificate) => (
                    <Panel key={certificate.no}>
                        <div className="flex items-center justify-between">
                            <span
                                className={`rounded-full px-3 py-1 text-xs font-bold ${
                                    certificate.status.toLowerCase() === 'issued' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                                }`}
                            >
                                {certificate.status}
                            </span>
                            <ShieldCheck
                                className={`size-5 ${certificate.status.toLowerCase() === 'issued' ? 'text-emerald-600' : 'text-red-600'}`}
                            />
                        </div>
                        <h2 className="mt-5 text-xl font-extrabold">{certificate.title}</h2>
                        <div className="mt-4 space-y-2 text-sm text-slate-600">
                            <p>
                                Issue Date: <span className="font-semibold text-slate-950">{certificate.issueDate}</span>
                            </p>
                            <p className="flex items-center gap-2">
                                <Fingerprint className="size-4" />
                                {certificate.no}
                            </p>
                        </div>
                        <div className="mt-5 flex gap-2">
                            <Button asChild className="flex-1 bg-[#1C7DE8] hover:bg-[#1469c7]">
                                <a href={`/certificates/${certificate.id}/download`}>
                                    <Download className="size-4" />
                                    Download
                                </a>
                            </Button>
                            <Button
                                variant="outline"
                                size="icon"
                                aria-label="Share"
                                onClick={async () => {
                                    await navigator.clipboard.writeText(`${window.location.origin}/certificates/verify?credential=${certificate.no}`);
                                    setSharedId(certificate.id);
                                    window.setTimeout(() => setSharedId(null), 1500);
                                }}
                            >
                                <Share2 className="size-4" />
                                <span className="sr-only">{sharedId === certificate.id ? 'Link tersalin' : 'Bagikan'}</span>
                            </Button>
                        </div>
                    </Panel>
                ))}
            </div>
            {certificates.length === 0 && (
                <Panel className="mt-6" title="Belum ada sertifikat">
                    <p className="text-slate-600">
                        Sertifikat akan muncul setelah Anda menyelesaikan progress belajar, quiz, ujian akhir, dan submission proyek sesuai syarat
                        kelulusan.
                    </p>
                </Panel>
            )}
            <Panel className="mt-6" title="Verifikasi Publik">
                <p className="text-slate-600">Setiap sertifikat memiliki nomor unik dan QR/token untuk halaman verifikasi publik.</p>
                <Button asChild className="mt-4" variant="outline">
                    <Link href="/certificates/verify">Buka Halaman Verifikasi</Link>
                </Button>
            </Panel>
        </Shell>
    );
}
