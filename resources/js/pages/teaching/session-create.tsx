import { FieldLabel } from '@/components/form-field';
import InputError from '@/components/input-error';
import { Panel, Shell } from '@/components/platform';
import { SearchableSelect } from '@/components/searchable-select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowLeft, CalendarCheck, CheckCircle2, ClipboardList, Save } from 'lucide-react';
import { FormEvent, ReactNode } from 'react';

interface ScheduleOption {
    id: number;
    title: string;
    school: string;
    course: string;
    startsAtLabel: string;
}

interface Props {
    title: string;
    schedules: ScheduleOption[];
    defaults: {
        actual_date: string;
        started_at: string;
    };
    backUrl: string;
}

interface DraftFormData {
    [key: string]: string;
    teaching_schedule_id: string;
    actual_date: string;
    started_at: string;
    topic: string;
}

export default function TeachingSessionCreate({ title, schedules, defaults, backUrl }: Props) {
    const form = useForm<DraftFormData>({
        teaching_schedule_id: schedules[0] ? String(schedules[0].id) : '',
        actual_date: defaults.actual_date,
        started_at: defaults.started_at,
        topic: '',
    });

    const submit = (event: FormEvent) => {
        event.preventDefault();
        form.post('/instructor/teaching-sessions/draft', { preserveScroll: true });
    };

    const steps = [
        { title: 'Pilih jadwal', description: 'Gunakan jadwal offline/online yang sudah dibuat admin.', icon: CalendarCheck },
        { title: 'Isi topik', description: 'Tanggal dan jam mulai otomatis mengikuti waktu sekarang.', icon: ClipboardList },
        { title: 'Simpan draft', description: 'Laporan kegiatan dan foto bukti dilengkapi setelah pertemuan.', icon: CheckCircle2 },
    ];

    return (
        <Shell
            title={title}
            eyebrow="Pengajar / Trainer"
            nav="instructor"
            actions={
                <Button asChild variant="outline">
                    <Link href={backUrl}>
                        <ArrowLeft className="size-4" />
                        Kembali
                    </Link>
                </Button>
            }
        >
            <Head title={title} />

            <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
                <Panel title="Alur pengisian">
                    <div className="space-y-4">
                        {steps.map((step, index) => {
                            const Icon = step.icon;

                            return (
                                <div key={step.title} className="flex gap-3">
                                    <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                                        <Icon className="size-5" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold tracking-wide text-slate-400 uppercase">Step {index + 1}</p>
                                        <h2 className="font-bold text-slate-950">{step.title}</h2>
                                        <p className="mt-1 text-sm leading-6 text-slate-500">{step.description}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </Panel>

                <Panel title="Data awal laporan">
                    {schedules.length > 0 ? (
                        <form onSubmit={submit} className="space-y-5">
                            <Field label="Jadwal mengajar" error={form.errors.teaching_schedule_id} required>
                                <SearchableSelect
                                    value={form.data.teaching_schedule_id}
                                    onChange={(value) => form.setData('teaching_schedule_id', value)}
                                    options={schedules.map((schedule) => ({
                                        value: String(schedule.id),
                                        label: `${schedule.title} · ${schedule.school} · ${schedule.course} · ${schedule.startsAtLabel}`,
                                    }))}
                                    placeholder="Pilih jadwal"
                                />
                            </Field>

                            <div className="grid gap-4 md:grid-cols-2">
                                <Field label="Tanggal aktual" error={form.errors.actual_date} required>
                                    <Input
                                        type="date"
                                        value={form.data.actual_date}
                                        onChange={(event) => form.setData('actual_date', event.target.value)}
                                    />
                                </Field>
                                <Field label="Jam mulai" error={form.errors.started_at} required>
                                    <Input
                                        type="time"
                                        value={form.data.started_at}
                                        onChange={(event) => form.setData('started_at', event.target.value)}
                                    />
                                </Field>
                            </div>

                            <Field label="Topik pertemuan" error={form.errors.topic} required>
                                <Input
                                    value={form.data.topic}
                                    onChange={(event) => form.setData('topic', event.target.value)}
                                    placeholder="Contoh: Pengenalan board Arduino dan dasar rangkaian LED"
                                />
                            </Field>

                            <div className="rounded-2xl bg-blue-50 p-4 text-sm leading-6 text-blue-800">
                                Setelah draft disimpan, lanjutkan dari daftar <strong>Laporan Saya</strong> melalui tombol <strong>Lengkapi laporan</strong> untuk
                                mengisi laporan kegiatan dan upload bukti foto.
                            </div>

                            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                                <Button asChild type="button" variant="outline">
                                    <Link href={backUrl}>Batal</Link>
                                </Button>
                                <Button type="submit" disabled={form.processing}>
                                    <Save className="size-4" />
                                    Simpan draft
                                </Button>
                            </div>
                        </form>
                    ) : (
                        <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center">
                            <p className="font-bold text-slate-950">Tidak ada jadwal yang bisa dilaporkan.</p>
                            <p className="mt-2 text-sm leading-6 text-slate-500">
                                Semua jadwal Anda sudah memiliki laporan atau belum ada jadwal aktif yang ditugaskan.
                            </p>
                            <Button asChild className="mt-5" variant="outline">
                                <Link href={backUrl}>Kembali ke Laporan Saya</Link>
                            </Button>
                        </div>
                    )}
                </Panel>
            </div>
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
