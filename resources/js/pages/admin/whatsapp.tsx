import { confirmAction } from '@/lib/confirm-delete';
import { Panel, Shell } from '@/components/platform';
import { Button } from '@/components/ui/button';
import { Head, router, useForm } from '@inertiajs/react';
import { ArrowLeft, Send, Trash2, Settings2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useState } from 'react';
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
    mode: 'text' | 'media' | 'button' | string;
    error?: string | null;
}

interface BillTemplate {
    mode: 'text' | 'media' | 'button';
    message: string;
    media_type?: string | null;
    media_url?: string | null;
    footer?: string | null;
    template_buttons?: string[];
}

interface Props {
    students: StudentContact[];
    messages: MessageLog[];
    gatewayConfigured: boolean;
    billTemplate: BillTemplate;
}

export default function WhatsAppAdmin({ students, messages, gatewayConfigured, billTemplate }: Props) {
    const [templateOpen, setTemplateOpen] = useState(false);
    const templateForm = useForm<BillTemplate>({ ...billTemplate, template_buttons: billTemplate.template_buttons ?? [] });
    const form = useForm({
        student_ids: [] as number[],
        message: '',
        send_mode: 'text' as 'text' | 'media' | 'button',
        media_type: 'image',
        media_url: '',
        footer: '',
        template_buttons: ['url|Lihat tagihan|https://digitalpelajar.id/pembayaran'] as string[],
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
        if (form.data.send_mode === 'media' && (!form.data.media_type || !form.data.media_url)) {
            notifyError('Tipe dan URL media wajib diisi.');
            return;
        }
        if (form.data.send_mode === 'button' && form.data.template_buttons.filter((button) => button.trim()).length < 1) {
            notifyError('Tambahkan minimal satu tombol dengan format call|Label|Nomor atau url|Label|URL.');
            return;
        }
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
                        Format pesan
                        <select value={form.data.send_mode} onChange={(event) => form.setData('send_mode', event.target.value as 'text' | 'media' | 'button')} className="rounded-xl border border-slate-300 bg-white p-3 font-normal">
                            <option value="text">Teks saja</option>
                            <option value="media">Media (URL langsung)</option>
                            <option value="button">Template tombol (1–3 tombol)</option>
                        </select>
                    </label>
                    {form.data.send_mode === 'media' && <div className="grid gap-3 rounded-xl border p-3 sm:grid-cols-2">
                        <label className="grid gap-1 text-sm font-medium">Jenis media
                            <select value={form.data.media_type} onChange={(event) => form.setData('media_type', event.target.value)} className="rounded-xl border p-2 font-normal">
                                {['image','video','audio','pdf','xls','xlsx','doc','docx','zip'].map((type) => <option key={type} value={type}>{type.toUpperCase()}</option>)}
                            </select>
                        </label>
                        <label className="grid gap-1 text-sm font-medium">URL media langsung
                            <Input type="url" required value={form.data.media_url} onChange={(event) => form.setData('media_url', event.target.value)} placeholder="https://domain.com/file.pdf" />
                        </label>
                        {form.errors.media_url && <p className="text-sm text-red-600">{form.errors.media_url}</p>}
                    </div>}
                    {form.data.send_mode === 'button' && <div className="grid gap-3 rounded-xl border p-3">
                        <label className="grid gap-1 text-sm font-medium">Footer (opsional)
                            <Input value={form.data.footer} onChange={(event) => form.setData('footer', event.target.value)} maxLength={500} />
                        </label>
                        {(form.data.template_buttons ?? []).map((button, index) => <label key={index} className="grid gap-1 text-sm font-medium">Tombol {index + 1}
                            <Input value={button} onChange={(event) => form.setData('template_buttons', (form.data.template_buttons ?? []).map((item, itemIndex) => itemIndex === index ? event.target.value : item))} placeholder="url|Lihat tagihan|https://digitalpelajar.id/pembayaran" />
                        </label>)}
                        <p className="text-xs text-slate-500">Format: url|Label tombol|https://alamat atau call|Label tombol|628123456789. Maksimal 3 tombol.</p>
                        <Button type="button" variant="outline" size="sm" disabled={(form.data.template_buttons ?? []).length >= 3} onClick={() => form.setData('template_buttons', [...(form.data.template_buttons ?? []), ''])}>Tambah tombol</Button>
                        {form.errors.template_buttons && <p className="text-sm text-red-600">{form.errors.template_buttons}</p>}
                    </div>}
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

            <div className="mb-8">
                <Panel title="Template pengingat tagihan pembayaran">
                    <p className="text-sm text-slate-600">Template ini digunakan oleh tombol pengingat WhatsApp pada halaman Admin / Pembayaran. Placeholder yang tersedia: {nama}, {id_siswa}, {tagihan}, {kursus}, {nominal}, {jatuh_tempo}, {url_pembayaran}.</p>
                    <Button className="mt-3" type="button" variant="outline" onClick={() => { templateForm.setData({ ...billTemplate, template_buttons: billTemplate.template_buttons ?? [] }); setTemplateOpen(true); }}>
                        <Settings2 className="size-4" /> Kelola template pesan tagihan
                    </Button>
                </Panel>
            </div>
            <Dialog open={templateOpen} onOpenChange={setTemplateOpen}>
                <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
                    <DialogHeader><DialogTitle>Kelola template pengingat tagihan</DialogTitle><DialogDescription>Template tersimpan di database dan digunakan saat admin mengirim pengingat tagihan dari halaman pembayaran.</DialogDescription></DialogHeader>
                    <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); confirmAction({ title: 'Simpan template tagihan?', message: 'Perubahan akan digunakan untuk pengingat tagihan berikutnya.', confirmLabel: 'Simpan template', cancelLabel: 'Batal', tone: 'default', onConfirm: () => templateForm.patch('/admin/whatsapp/bill-template', { preserveScroll: true, onSuccess: () => setTemplateOpen(false), onError: () => notifyError('Template gagal disimpan. Periksa kembali data dan URL media.') }) }); }}>
                        <label className="grid gap-2 text-sm font-medium">Format pengiriman
                            <select value={templateForm.data.mode} onChange={(event) => templateForm.setData('mode', event.target.value as BillTemplate['mode'])} className="rounded-xl border p-3 font-normal">
                                <option value="text">Teks saja</option><option value="media">Media</option><option value="button">Template tombol</option>
                            </select>
                        </label>
                        <label className="grid gap-2 text-sm font-medium">Isi pesan
                            <textarea rows={7} maxLength={1500} required value={templateForm.data.message} onChange={(event) => templateForm.setData('message', event.target.value)} className="rounded-xl border p-3 font-normal" />
                        </label>
                        {templateForm.data.mode === 'media' && <>
                            <label className="grid gap-2 text-sm font-medium">Jenis media
                                <select value={templateForm.data.media_type ?? 'image'} onChange={(event) => templateForm.setData('media_type', event.target.value)} className="rounded-xl border p-3 font-normal">{['image','video','audio','pdf','xls','xlsx','doc','docx','zip'].map((type) => <option key={type}>{type}</option>)}</select>
                            </label>
                            <label className="grid gap-2 text-sm font-medium">URL media langsung
                                <Input type="url" value={templateForm.data.media_url ?? ''} onChange={(event) => templateForm.setData('media_url', event.target.value)} required />
                            </label>
                        </>}
                        {templateForm.data.mode === 'button' && <>
                            <label className="grid gap-2 text-sm font-medium">Footer (opsional)
                                <Input value={templateForm.data.footer ?? ''} onChange={(event) => templateForm.setData('footer', event.target.value)} />
                            </label>
                            {(templateForm.data.template_buttons ?? []).map((button, index) => <label key={index} className="grid gap-2 text-sm font-medium">Tombol {index + 1}
                                <Input value={button} onChange={(event) => templateForm.setData('template_buttons', (templateForm.data.template_buttons ?? []).map((item, itemIndex) => itemIndex === index ? event.target.value : item))} placeholder="url|Lihat tagihan|https://digitalpelajar.id/pembayaran" />
                            </label>)}
                            <Button type="button" variant="outline" size="sm" disabled={(templateForm.data.template_buttons ?? []).length >= 3} onClick={() => templateForm.setData('template_buttons', [...(templateForm.data.template_buttons ?? []), ''])}>Tambah tombol</Button>
                        </>}
                        <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setTemplateOpen(false)}>Batal</Button><Button type="submit" disabled={templateForm.processing}>{templateForm.processing ? 'Menyimpan...' : 'Simpan template'}</Button></div>
                    </form>
                </DialogContent>
            </Dialog>
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
                                    {message.type === 'bill_reminder' ? 'Pengingat tagihan' : 'Blast manual'} · Format: {message.mode === 'button' ? 'Tombol' : message.mode === 'media' ? 'Media' : 'Teks'}
                                    {message.sentAt ? ' · Terkirim ' + message.sentAt : ''}
                                </p>
                                {message.error && <p className="mt-2 rounded-lg bg-red-50 p-2 text-xs text-red-700">Detail: {message.error}</p>}
                                <div className="mt-2 flex justify-end">
                                    <Button type="button" variant="destructive" size="sm" onClick={() => confirmAction({ title: 'Hapus riwayat pesan?', message: 'Riwayat ini akan dihapus permanen. Jika job belum diproses, job tidak akan mengirim pesan setelah riwayat dihapus.', confirmLabel: 'Hapus riwayat', cancelLabel: 'Batal', tone: 'destructive', onConfirm: () => router.delete('/admin/whatsapp/messages/' + message.id, { preserveScroll: true, onError: () => notifyError('Riwayat pesan gagal dihapus.') }) })}>
                                        <Trash2 className="size-4" /> Hapus
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </Panel>
        </Shell>
    );
}
