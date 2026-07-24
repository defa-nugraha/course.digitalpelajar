import DeleteUser from '@/components/delete-user';
import { FormField } from '@/components/form-field';
import { Panel, Shell } from '@/components/platform';
import { SearchableSelect } from '@/components/searchable-select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { type SharedData } from '@/types';
import { Transition } from '@headlessui/react';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { Building2, KeyRound, Mail, MapPin, Phone, ShieldCheck, UserRound, type LucideIcon } from 'lucide-react';
import { FormEventHandler } from 'react';

interface SchoolOption {
    id: number;
    name: string;
    address?: string | null;
}

export default function Profile({ mustVerifyEmail, status, schools }: { mustVerifyEmail: boolean; status?: string; schools: SchoolOption[] }) {
    const { auth } = usePage<SharedData>().props;
    const user = auth.user;
    const initialSchoolId = user.school_id
        ? String(user.school_id)
        : user.requested_school_id
          ? String(user.requested_school_id)
          : user.manual_school_name
            ? 'other'
            : '';
    const schoolOptions = [
        { value: '', label: 'Pilih sekolah' },
        ...schools.map((school) => ({ value: String(school.id), label: school.name })),
        { value: 'other', label: 'Lainnya / belum terdaftar' },
    ];

    const { data, setData, patch, errors, processing, recentlySuccessful } = useForm({
        name: user.name,
        email: user.email,
        phone: String(user.phone ?? ''),
        address: String(user.address ?? ''),
        school_id: initialSchoolId,
        manual_school_name: String(user.manual_school_name ?? ''),
        manual_school_address: String(user.manual_school_address ?? ''),
    });
    const selectedSchool = schools.find((school) => String(school.id) === data.school_id);
    const profileComplete = Boolean(user.profile_completed_at);

    const submit: FormEventHandler = (event) => {
        event.preventDefault();
        patch(route('profile.update'), { preserveScroll: true });
    };

    return (
        <Shell title="Pengaturan Profil" eyebrow="Akun Pengguna">
            <Head title="Pengaturan Profil" />

            <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
                <Panel title="Informasi Akun">
                    <form onSubmit={submit} className="space-y-5">
                        <FormField label="Nama lengkap" error={errors.name} required>
                            <Input
                                id="name"
                                value={data.name}
                                onChange={(event) => setData('name', event.target.value)}
                                required
                                autoComplete="name"
                                placeholder="Nama lengkap"
                            />
                        </FormField>

                        <FormField label="Email" error={errors.email} required>
                            <Input
                                id="email"
                                type="email"
                                value={data.email}
                                onChange={(event) => setData('email', event.target.value)}
                                required
                                autoComplete="username"
                                placeholder="email@domain.com"
                            />
                        </FormField>

                        <div className="grid gap-5 md:grid-cols-2">
                            <FormField label="Nomor HP / WhatsApp" error={errors.phone} required>
                                <Input
                                    id="phone"
                                    value={data.phone}
                                    onChange={(event) => setData('phone', event.target.value)}
                                    required
                                    autoComplete="tel"
                                    placeholder="+62 812..."
                                />
                            </FormField>

                            <FormField label="Sekolah" error={errors.school_id} required>
                                <SearchableSelect
                                    value={data.school_id}
                                    onChange={(value) => {
                                        setData({
                                            ...data,
                                            school_id: value,
                                            manual_school_name: value === 'other' ? data.manual_school_name : '',
                                            manual_school_address: value === 'other' ? data.manual_school_address : '',
                                        });
                                    }}
                                    options={schoolOptions}
                                    placeholder="Pilih sekolah"
                                    searchPlaceholder="Cari sekolah..."
                                />
                                {selectedSchool?.address && <p className="text-xs text-slate-500">Alamat sekolah: {selectedSchool.address}</p>}
                                {user.role === 'student' && data.school_id && (
                                    <p className="text-xs leading-5 text-amber-700">
                                        Pilihan sekolah siswa akan masuk sebagai pengajuan profil. Akses kelas sekolah hanya aktif setelah
                                        diverifikasi admin.
                                    </p>
                                )}
                            </FormField>
                        </div>

                        {data.school_id === 'other' && (
                            <div className="grid gap-5 md:grid-cols-2">
                                <FormField label="Nama sekolah lainnya" error={errors.manual_school_name} required>
                                    <Input
                                        value={data.manual_school_name}
                                        onChange={(event) => setData('manual_school_name', event.target.value)}
                                        required
                                        placeholder="Nama sekolah"
                                    />
                                </FormField>
                                <FormField label="Alamat sekolah lainnya" error={errors.manual_school_address} required>
                                    <Input
                                        value={data.manual_school_address}
                                        onChange={(event) => setData('manual_school_address', event.target.value)}
                                        required
                                        placeholder="Alamat sekolah"
                                    />
                                </FormField>
                            </div>
                        )}

                        <FormField label="Alamat domisili" error={errors.address} required>
                            <textarea
                                className="min-h-24 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                                value={data.address}
                                onChange={(event) => setData('address', event.target.value)}
                                required
                                placeholder="Alamat rumah/domisili"
                            />
                        </FormField>

                        {mustVerifyEmail && auth.user.email_verified_at === null && (
                            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                                <p className="font-bold">Email belum diverifikasi.</p>
                                <p className="mt-1">
                                    Verifikasi email diperlukan untuk keamanan akun.{' '}
                                    <Link
                                        href={route('verification.send')}
                                        method="post"
                                        as="button"
                                        className="font-bold underline underline-offset-4"
                                    >
                                        Kirim ulang link verifikasi
                                    </Link>
                                    .
                                </p>

                                {status === 'verification-link-sent' && (
                                    <p className="mt-2 font-semibold text-emerald-700">Link verifikasi baru sudah dikirim ke email Anda.</p>
                                )}
                            </div>
                        )}

                        <div className="flex flex-wrap items-center gap-4">
                            <Button disabled={processing}>Simpan Perubahan</Button>

                            <Transition
                                show={recentlySuccessful}
                                enter="transition ease-in-out"
                                enterFrom="opacity-0"
                                leave="transition ease-in-out"
                                leaveTo="opacity-0"
                            >
                                <p className="text-sm font-semibold text-emerald-700">Profil berhasil disimpan.</p>
                            </Transition>
                        </div>
                    </form>
                </Panel>

                <div className="space-y-6">
                    {!profileComplete && (
                        <Panel title="Lengkapi Profil">
                            <p className="text-sm leading-6 text-amber-800">
                                Lengkapi nomor HP, alamat, dan data sekolah agar admin/pengajar bisa memvalidasi akun dan kebutuhan pembelajaran.
                            </p>
                        </Panel>
                    )}
                    <Panel title="Ringkasan Akses">
                        <div className="space-y-3">
                            <InfoRow icon={UserRound} label="Nama" value={user.name} />
                            <InfoRow icon={Mail} label="Email" value={user.email} />
                            <InfoRow icon={Phone} label="Nomor HP" value={String(user.phone ?? '')} />
                            <InfoRow icon={Building2} label="Sekolah" value={selectedSchool?.name ?? String(user.manual_school_name ?? '')} />
                            {user.role === 'student' && !user.school_id && user.school_verification_status === 'pending' && (
                                <InfoRow icon={ShieldCheck} label="Status sekolah" value="Menunggu verifikasi admin" />
                            )}
                            <InfoRow icon={MapPin} label="Alamat" value={String(user.address ?? '')} />
                            <InfoRow icon={ShieldCheck} label="Role" value={roleLabel(user.role)} />
                            <InfoRow icon={KeyRound} label="Status" value={statusLabel(user.status)} />
                        </div>
                    </Panel>

                    <Panel title="Keamanan Akun">
                        <p className="text-sm leading-6 text-slate-600">
                            Gunakan email aktif dan jaga kredensial akun. Akses menu akan mengikuti role yang diberikan admin.
                        </p>
                    </Panel>
                </div>
            </div>

            <div className="mt-6">
                <Panel title="Zona Berisiko">
                    <DeleteUser />
                </Panel>
            </div>
        </Shell>
    );
}

function InfoRow({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value?: string | null }) {
    return (
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <span className="inline-flex size-10 items-center justify-center rounded-lg bg-white text-blue-700">
                <Icon className="size-4" />
            </span>
            <div className="min-w-0">
                <p className="text-xs font-bold tracking-wide text-slate-500 uppercase">{label}</p>
                <p className="truncate font-semibold text-slate-950">{value || '-'}</p>
            </div>
        </div>
    );
}

function roleLabel(role?: string | null) {
    const labels: Record<string, string> = {
        admin: 'Admin Pusat',
        internal_instructor: 'Pengajar / Trainer',
        school_teacher: 'Guru Sekolah',
        student: 'Siswa',
    };

    return labels[role ?? ''] ?? '-';
}

function statusLabel(status?: string | null) {
    const labels: Record<string, string> = {
        active: 'Aktif',
        pending: 'Menunggu',
        inactive: 'Tidak Aktif',
    };

    return labels[status ?? ''] ?? status ?? '-';
}
