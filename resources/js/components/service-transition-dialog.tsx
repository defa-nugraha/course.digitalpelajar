import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArrowUpRight, Code2, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';

export function ServiceTransitionDialog() {
    const [open, setOpen] = useState(false);

    useEffect(() => {
        setOpen(true);
    }, []);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="overflow-hidden border-0 bg-white p-0 shadow-2xl sm:max-w-xl">
                <div className="relative overflow-hidden bg-gradient-to-br from-sky-50 via-white to-indigo-50 px-6 pt-12 pb-7 sm:px-9 sm:pt-10 sm:pb-9">
                    <div className="pointer-events-none absolute -top-16 -right-16 size-48 rounded-full bg-sky-200/35 blur-2xl" />
                    <div className="pointer-events-none absolute -bottom-20 -left-16 size-48 rounded-full bg-indigo-200/30 blur-2xl" />

                    <div className="relative flex flex-col items-center text-center">
                        <div className="relative mb-6 grid size-24 place-items-center rounded-[2rem] bg-[#1478e8] text-white shadow-[0_18px_45px_rgba(20,120,232,0.28)]">
                            <Code2 className="size-11" strokeWidth={1.8} aria-hidden="true" />
                            <span className="absolute -top-2 -right-2 grid size-9 place-items-center rounded-full border-4 border-white bg-amber-400 text-slate-900">
                                <Sparkles className="size-4" aria-hidden="true" />
                            </span>
                        </div>

                        <DialogHeader className="items-center space-y-3 text-center">
                            <span className="rounded-full border border-sky-200 bg-white/80 px-3 py-1 text-xs font-bold tracking-wide text-[#0869c5] uppercase">
                                Informasi layanan
                            </span>
                            <DialogTitle className="max-w-md text-2xl leading-tight font-extrabold tracking-tight text-slate-950 sm:text-3xl">
                                Layanan pembuatan aplikasi telah dipindahkan ke Sasana Kode
                            </DialogTitle>
                            <DialogDescription className="max-w-md text-sm leading-6 text-slate-600 sm:text-base sm:leading-7">
                                Untuk konsultasi dan layanan pembuatan website, aplikasi, atau sistem digital, kini seluruh layanannya dialihkan ke
                                <strong className="font-bold text-slate-900"> sasanakode.id</strong>.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="mt-7 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
                            <Button asChild size="lg" className="min-h-12 rounded-xl bg-[#1478e8] px-6 shadow-lg shadow-sky-200 hover:bg-[#0869c5]">
                                <a href="https://sasanakode.id" target="_blank" rel="noreferrer">
                                    Kunjungi Sasana Kode
                                    <ArrowUpRight className="size-4" aria-hidden="true" />
                                </a>
                            </Button>
                            <DialogClose asChild>
                                <Button type="button" size="lg" variant="outline" className="min-h-12 rounded-xl border-slate-300 bg-white/80 px-6">
                                    Tetap di Digital Pelajar
                                </Button>
                            </DialogClose>
                        </div>

                        <p className="mt-5 text-xs leading-5 text-slate-500">
                            Pembelajaran robotik dan layanan pendidikan tetap tersedia di Digital Pelajar.
                        </p>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
