import InputError from '@/components/input-error';
import { Panel, Shell } from '@/components/platform';
import { Button } from '@/components/ui/button';
import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowLeft, MessageSquare, Star } from 'lucide-react';
import { FormEvent } from 'react';

interface SchedulePayload {
    id: number;
    title: string;
    topic?: string | null;
    course: string;
    instructor: string;
    startsAtLabel?: string | null;
    endsAtLabel?: string | null;
    location?: string | null;
}

interface FeedbackPayload {
    rating: number;
    understanding_level: string;
    comment?: string | null;
    suggestion?: string | null;
}

export default function AttendanceFeedback({ schedule, feedback }: { schedule: SchedulePayload; feedback?: FeedbackPayload | null }) {
    const form = useForm({
        rating: feedback?.rating ?? 5,
        understanding_level: feedback?.understanding_level ?? 'understand',
        comment: feedback?.comment ?? '',
        suggestion: feedback?.suggestion ?? '',
    });

    const submit = (event: FormEvent) => {
        event.preventDefault();
        form.post(`/student/teaching-schedules/${schedule.id}/feedback`, { preserveScroll: true });
    };

    return (
        <Shell title="Feedback Pertemuan" eyebrow="Siswa" nav="student">
            <Head title="Feedback Pertemuan" />
            <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[0.85fr_1.15fr]">
                <Panel title="Pertemuan yang diikuti">
                    <div className="space-y-4 text-sm leading-6 text-slate-600">
                        <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
                            <p className="text-xs font-bold tracking-wider text-blue-700 uppercase">{schedule.course}</p>
                            <h2 className="mt-2 text-xl font-extrabold text-slate-950">{schedule.topic || schedule.title}</h2>
                            <p className="mt-2 text-slate-600">
                                {schedule.startsAtLabel || '-'}–{schedule.endsAtLabel || '-'}
                            </p>
                            <p className="mt-1 text-slate-600">{schedule.location || 'Lokasi sekolah'}</p>
                        </div>
                        <div className="flex items-start gap-3 rounded-2xl border border-slate-200 p-4">
                            <MessageSquare className="mt-1 size-5 shrink-0 text-blue-700" />
                            <div>
                                <p className="font-bold text-slate-950">Pengajar: {schedule.instructor}</p>
                                <p className="mt-1">
                                    Feedback ini membantu pengajar memperbaiki cara penyampaian materi pada pertemuan berikutnya.
                                </p>
                            </div>
                        </div>
                        <Button asChild variant="outline" className="w-full">
                            <Link href="/student/dashboard">
                                <ArrowLeft className="size-4" />
                                Kembali ke Dashboard
                            </Link>
                        </Button>
                    </div>
                </Panel>

                <Panel title={feedback ? 'Ubah feedback' : 'Isi feedback'}>
                    <form onSubmit={submit} className="space-y-5">
                        <div>
                            <label className="text-sm font-bold text-slate-950">
                                Rating pertemuan <span className="text-red-600">*</span>
                            </label>
                            <div className="mt-3 flex flex-wrap gap-2">
                                {[1, 2, 3, 4, 5].map((rating) => (
                                    <button
                                        key={rating}
                                        type="button"
                                        onClick={() => form.setData('rating', rating)}
                                        className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-bold transition ${
                                            form.data.rating === rating
                                                ? 'border-amber-400 bg-amber-100 text-amber-800'
                                                : 'border-slate-200 bg-white text-slate-600 hover:border-amber-200'
                                        }`}
                                    >
                                        <Star className={`size-4 ${form.data.rating >= rating ? 'fill-current' : ''}`} />
                                        {rating}
                                    </button>
                                ))}
                            </div>
                            <InputError message={form.errors.rating} className="mt-2" />
                        </div>

                        <div>
                            <label className="text-sm font-bold text-slate-950">
                                Pemahaman materi <span className="text-red-600">*</span>
                            </label>
                            <div className="mt-3 grid gap-2 md:grid-cols-3">
                                {[
                                    { value: 'understand', label: 'Paham' },
                                    { value: 'partly_understand', label: 'Sebagian paham' },
                                    { value: 'need_help', label: 'Butuh bantuan' },
                                ].map((option) => (
                                    <button
                                        key={option.value}
                                        type="button"
                                        onClick={() => form.setData('understanding_level', option.value)}
                                        className={`rounded-xl border px-4 py-3 text-sm font-bold transition ${
                                            form.data.understanding_level === option.value
                                                ? 'border-blue-600 bg-blue-600 text-white'
                                                : 'border-slate-200 bg-white text-slate-600 hover:border-blue-200'
                                        }`}
                                    >
                                        {option.label}
                                    </button>
                                ))}
                            </div>
                            <InputError message={form.errors.understanding_level} className="mt-2" />
                        </div>

                        <div>
                            <label className="text-sm font-bold text-slate-950">Komentar untuk pengajar</label>
                            <textarea
                                className="mt-2 min-h-28 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                                value={form.data.comment}
                                onChange={(event) => form.setData('comment', event.target.value)}
                                placeholder="Contoh: Penjelasannya jelas, tapi praktik wiring butuh waktu tambahan."
                            />
                            <InputError message={form.errors.comment} className="mt-2" />
                        </div>

                        <div>
                            <label className="text-sm font-bold text-slate-950">Saran untuk pertemuan berikutnya</label>
                            <textarea
                                className="mt-2 min-h-28 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                                value={form.data.suggestion}
                                onChange={(event) => form.setData('suggestion', event.target.value)}
                                placeholder="Contoh: Mohon contoh kode ditampilkan lebih besar atau diberi modul cetak."
                            />
                            <InputError message={form.errors.suggestion} className="mt-2" />
                        </div>

                        <Button type="submit" disabled={form.processing} className="w-full">
                            Simpan Feedback
                        </Button>
                    </form>
                </Panel>
            </div>
        </Shell>
    );
}
