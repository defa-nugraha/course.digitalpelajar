import { Panel, Shell } from '@/components/platform';
import { Button } from '@/components/ui/button';
import { Head, Link } from '@inertiajs/react';
import { Download, Fingerprint, Share2, ShieldCheck } from 'lucide-react';

interface Certificate {
    title: string;
    no: string;
    issueDate: string;
    status: string;
}

export default function Certificates({ certificates }: { certificates: Certificate[] }) {
    return (
        <Shell title="My Certificates" eyebrow="Credential Wallet">
            <Head title="Sertifikat Saya" />
            <div className="grid gap-5 md:grid-cols-3">
                {certificates.map((certificate) => (
                    <Panel key={certificate.no}>
                        <div className="flex items-center justify-between">
                            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">{certificate.status}</span>
                            <ShieldCheck className="size-5 text-emerald-600" />
                        </div>
                        <h2 className="mt-5 text-xl font-extrabold">{certificate.title}</h2>
                        <div className="mt-4 space-y-2 text-sm text-slate-600">
                            <p>Issue Date: <span className="font-semibold text-slate-950">{certificate.issueDate}</span></p>
                            <p className="flex items-center gap-2"><Fingerprint className="size-4" />{certificate.no}</p>
                        </div>
                        <div className="mt-5 flex gap-2">
                            <Button className="flex-1 bg-[#1C7DE8] hover:bg-[#1469c7]"><Download className="size-4" />Download</Button>
                            <Button variant="outline" size="icon" aria-label="Share"><Share2 className="size-4" /></Button>
                        </div>
                    </Panel>
                ))}
            </div>
            {certificates.length === 0 && (
                <Panel className="mt-6" title="Belum ada sertifikat">
                    <p className="text-slate-600">Sertifikat akan muncul setelah progress, quiz, ujian akhir, dan submission memenuhi syarat kelulusan SKPL.</p>
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
