import { FormField } from '@/components/form-field';
import { Panel, Shell } from '@/components/platform';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Head, Link, useForm } from '@inertiajs/react';
import { KeyRound } from 'lucide-react';
import { FormEvent } from 'react';

export default function RedeemActivationCode() {
    const form = useForm({ code: '' });

    const submit = (event: FormEvent) => {
        event.preventDefault();
        form.post('/activation-codes/redeem', { preserveScroll: true });
    };

    return (
        <Shell title="Redeem Kode Aktivasi" eyebrow="Toko Robotik">
            <Head title="Redeem Kode Aktivasi" />
            <div className="mx-auto max-w-2xl">
                <Panel title="Aktivasi Materi Pelatihan">
                    <form onSubmit={submit} className="space-y-5">
                        <div className="rounded-2xl bg-blue-50 p-5 text-sm leading-6 text-blue-950">
                            Masukkan kode aktivasi yang Anda dapatkan dari pembelian kit atau paket pelatihan. Jika kode valid, course atau learning
                            path akan langsung aktif di akun Anda.
                        </div>
                        <FormField label="Kode aktivasi" required error={form.errors.code}>
                            <Input
                                className="font-mono uppercase"
                                value={form.data.code}
                                onChange={(event) => form.setData('code', event.target.value.toUpperCase())}
                                placeholder="KIT-XXXX-XXXX"
                            />
                        </FormField>
                        <div className="flex flex-col gap-2 sm:flex-row">
                            <Button type="submit" disabled={form.processing}>
                                <KeyRound className="size-4" />
                                {form.processing ? 'Memvalidasi...' : 'Aktifkan Materi'}
                            </Button>
                            <Button asChild variant="outline">
                                <Link href="/store/orders">Lihat Order Saya</Link>
                            </Button>
                        </div>
                    </form>
                </Panel>
            </div>
        </Shell>
    );
}
