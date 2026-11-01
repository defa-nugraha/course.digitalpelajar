import { confirmAction } from '@/lib/confirm-delete';
import { Panel, Shell } from '@/components/platform';
import { Button } from '@/components/ui/button';
import { Head, router, useForm } from '@inertiajs/react';
import { ArrowLeft, Send } from 'lucide-react';
import type { FormEvent } from 'react';

interface StudentContact {
    id: number;
    name: string;
    studentNumber: string;
    phone: string;
    normalizedPhone: string | null;
}

interface MessageLog {
    id: number;
    recipientName: string;
    recipientNumber: string;
    type: string;
    message: string;
    status: 'queued' | 'sent' | 'failed' | string;
    createdAt: string;
    sentAt: string | null;
}

interface Props {
    students: StudentContact[];
    messages: MessageLog[];
    gatewayConfigured: boolean;
}

export default function WhatsAppAdmin({ students, messages, gatewayConfigured }: Props) {
    const form = useForm({
        student_ids: [] as number[],
        message: '',
        consent_confirmed: false,
    });

    const selectedCount = form.data.student_ids.length;
    const allVisibleSelected = students.length > 0
        && students.slice(0, 100).every((student) => form.data.student_ids.includes(student.id));

    const toggleStudent = (studentId: number, checked: boolean) => {
        form.setData(
            'student_ids',
            checked
                ? [...form.data.student_ids.filter((id) => id !== studentId), studentId].slice(0, 100)
                : form.data.student_ids.filter((id) => id !== studentId),
        );
    };

    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        confirmAction({
            title: 'Kirim blast WhatsApp?',
            message: `Pesan akan dimasukkan ke antrean pengiriman untuk ${selectedCount} siswa yang dipilih. Pengiriman tidak dapat dibatalkan setelah diproses.`,
            description: 'Pastikan semua penerima telah menyetujui menerima pesan WhatsApp dan isi pesan sudah benar.',
            confirmLabel: 'Ya, masukkan ke antrean',
            cancelLabel: 'Periksa kembali',
            tone: 'default',
            onConfirm: () => {
                form.post('/admin/whatsapp/send', {
                    preserveScroll: true,
                    onSuccess: () => form.reset('student_ids', 'message', 'consent_confirmed'),
                });
            },
        });
    };

    const statusLabel = (status: string) => {
        if (status === 'queued') return 'Dalam antrean';
        if (status === 'sent') return 'Terkirim';
        if (status === 'failed') return 'Gagal';

        return status;
    };

    return (
        <Shell title="WhatsApp Center" eyebrow="Admin Pusat">
            <Head title="WhatsApp Center" />
            <div className="mb-6">
                <Button type="button" variant="outline" onClick={() => router.visit('/admin/course-bills')}>
                    <ArrowLeft className="size-4" />
                    Kembali ke tagihan
                </Button>
            </div>

            <div className="mb-8"><Panel title="Status gateway WhatsApp">
                {gatewayConfigured ? (
                    <p className="text-sm text-emerald-700">Kredensial gateway terisi. Pesan akan diproses melalui antrean.</p>
                ) : (
                    <p className="text-sm text-amber-700">
                        Gateway belum siap. Isi WHATSAPP_GATEWAY_API_KEY dan WHATSAPP_GATEWAY_SENDER di file .env server, lalu jalankan
                        konfigurasi ulang aplikasi.
                    </p>
                )}
                <p className="mt-2 text-sm text-slate-500">
                    Kunci API tidak ditampilkan di halaman ini. Penerima harus dipilih manual; hanya kirim kepada kontak yang menyetujui menerima
                    pesan WhatsApp dari Digital Pelajar.
                </p>
            </Panel></div>

            <div className="mb-8"><Panel title="Buat blast WhatsApp">
                <form onSubmit={submit} className="space-y-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-sm text-slate-600">
                            Pilih maksimal 100 siswa per pengiriman. Nomor tidak valid akan dilewati.
                        </p>
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={students.length === 0}
                            onClick={() => form.setData(
                                'student_ids',
                                allVisibleSelected ? [] : students.slice(0, 100).map((student) => student.id),
                            )}
                        >
                            {allVisibleSelected ? 'Batalkan pilihan' : 'Pilih 100 pertama'}
                        </Button>
                    </div>

                    <div className="max-h-80 space-y-2 overflow-y-auto rounded-xl border p-3">
                        {students.length === 0 ? (
                            <p className="p-4 text-sm text-slate-500">Belum ada siswa aktif dengan nomor WhatsApp.</p>
                        ) : students.map((student) => (
                            <label key={student.id} className="flex cursor-pointer items-start gap-3 rounded-lg p-2 hover:bg-slate-50">
                                <input
                                    type="checkbox"
                                    className="mt-1 size-4"
                                    checked={form.data.student_ids.includes(student.id)}
                                    onChange={(event) => toggleStudent(student.id, event.target.checked)}
                                    disabled={!student.normalizedPhone || (!form.data.student_ids.includes(student.id) && selectedCount >= 100)}
                                />
                                <span className="min-w-0 flex-1">
                                    <span className="block font-medium">{student.name}</span>
                                    <span className="block text-xs text-slate-500">
                                        ID {student.studentNumber} · {student.phone}
                                        {!student.normalizedPhone && ' · Format nomor tidak valid'}
                                    </span>
                                </span>
                            </label>
                        ))}
                    </div>
                    <p className="text-sm font-semibold">Penerima dipilih: {selectedCount}/100</p>
                    {form.errors.student_ids && <p className="text-sm text-red-600">{form.errors.student_ids}</p>}

                    <label className="grid gap-2 text-sm font-medium">
                        Isi pesan
                        <textarea
                            rows={5}
                            maxLength={1500}
                            required
                            value={form.data.message}
                            onChange={(event) => form.setData('message', event.target.value)}
                            placeholder="Halo {nama}, ada informasi terbaru dari Digital Pelajar..."
                            className="w-full rounded-xl border border-slate-300 bg-white p-3 font-normal"
                        />
                        <span className="font-normal text-slate-500">
                            Gunakan {'{nama}'} untuk nama siswa dan {'{id_siswa}'} untuk ID Siswa. Maksimal 1.500 karakter.
                        </span>
                        {form.errors.message && <span className="text-xs text-red-600">{form.errors.message}</span>}
                    </label>

                    <label className="flex items-start gap-2 text-sm">
                        <input
                            type="checkbox"
                            className="mt-1 size-4"
                            checked={form.data.consent_confirmed}
                            onChange={(event) => form.setData('consent_confirmed', event.target.checked)}
                        />
                        <span>Saya memastikan seluruh penerima yang dipilih telah menyetujui menerima pesan WhatsApp dari Digital Pelajar.</span>
                    </label>
                    {form.errors.consent_confirmed && <p className="text-sm text-red-600">{form.errors.consent_confirmed}</p>}

                    <Button type="submit" disabled={!gatewayConfigured || form.processing || selectedCount === 0 || !form.data.consent_confirmed}>
                        <Send className="size-4" />
                        {form.processing ? 'Memasukkan ke antrean...' : 'Kirim ke ' + selectedCount + ' penerima'}
                    </Button>
                </form>
            </Panel></div>

            <Panel title="Riwayat pesan terbaru">
                {messages.length === 0 ? (
                    <p className="text-sm text-slate-500">Belum ada riwayat pengiriman WhatsApp.</p>
                ) : (
                    <div className="space-y-3">
                        {messages.map((message) => (
                            <div key={message.id} className="rounded-xl border p-3">
                                <div className="flex flex-wrap items-start justify-between gap-2">
                                    <div>
                                        <p className="font-semibold">{message.recipientName}</p>
                                        <p className="text-xs text-slate-500">{message.recipientNumber} · {message.createdAt}</p>
                                    </div>
                                    <span className={
                                        message.status === 'sent'
                                            ? 'rounded-full bg-emerald-50 px-2 py-1 text-xs text-emerald-700'
                                            : message.status === 'failed'
                                                ? 'rounded-full bg-red-50 px-2 py-1 text-xs text-red-700'
                                                : 'rounded-full bg-amber-50 px-2 py-1 text-xs text-amber-700'
                                    }>
                                        {statusLabel(message.status)}
                                    </span>
                                </div>
                                <p className="mt-2 whitespace-pre-line text-sm text-slate-700">{message.message}</p>
                                <p className="mt-2 text-xs text-slate-500">
                                    {message.type === 'bill_reminder' ? 'Pengingat tagihan' : 'Blast manual'}
                                    {message.sentAt ? ' · Terkirim ' + message.sentAt : ''}
                                </p>
                            </div>
                        ))}
                    </div>
                )}
            </Panel>
        </Shell>
    );
}
