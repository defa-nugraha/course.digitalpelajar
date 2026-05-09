import InputError from '@/components/input-error';
import { GoogleButton } from '@/components/platform';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowRight, Bot, CheckCircle2, GraduationCap, LoaderCircle, Lock, ShieldCheck } from 'lucide-react';
import { FormEventHandler } from 'react';

interface LoginForm {
    email: string;
    password: string;
    remember: boolean;
}

interface LoginProps {
    status?: string;
    canResetPassword: boolean;
}

const demoAccounts = [
    { role: 'Admin', email: 'admin@ngawitekno.test' },
    { role: 'Pengajar', email: 'pengajar@ngawitekno.test' },
    { role: 'Guru', email: 'guru@ngawitekno.test' },
    { role: 'Siswa', email: 'siswa@ngawitekno.test' },
];

export default function Login({ status, canResetPassword }: LoginProps) {
    const { data, setData, post, processing, errors, reset } = useForm<LoginForm>({
        email: '',
        password: '',
        remember: false,
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('login'), {
            onFinish: () => reset('password'),
        });
    };

    return (
        <>
            <Head title="Login" />
            <div className="min-h-screen bg-[#FAF8FF] text-slate-950">
                <header className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-10">
                    <Link href="/" className="flex items-center gap-3 font-bold">
                        <span className="flex size-10 items-center justify-center rounded-lg bg-[#1C7DE8] text-white">
                            <Bot className="size-5" />
                        </span>
                        <span>
                            <span className="block leading-5">Ngawitekno</span>
                            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Robotics Academy</span>
                        </span>
                    </Link>
                    <Button asChild variant="outline">
                        <Link href="/courses">Lihat Katalog</Link>
                    </Button>
                </header>

                <main className="mx-auto grid max-w-7xl gap-8 px-4 py-8 md:px-10 lg:min-h-[calc(100vh-4rem)] lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
                    <section className="hidden lg:block">
                        <div className="rounded-lg border border-blue-100 bg-blue-50 p-8 text-slate-950 shadow-sm">
                            <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-sm font-bold text-blue-700">
                                <GraduationCap className="size-4" />
                                Platform Pembelajaran Robotik
                            </div>
                            <h1 className="mt-6 max-w-xl text-5xl font-extrabold leading-tight tracking-tight">
                                Lanjutkan learning path, quiz, submission, dan sertifikat dalam satu aplikasi.
                            </h1>
                            <p className="mt-5 max-w-2xl leading-7 text-slate-600">
                                Login memberi akses ke kelas gratis, kelas berbayar setelah pembayaran Midtrans, halaman belajar bertahap, review proyek, forum, dan sertifikat digital terverifikasi.
                            </p>

                            <div className="mt-8 grid gap-4 sm:grid-cols-3">
                                <Metric label="Progress aktif" value="68%" />
                                <Metric label="Quiz pending" value="2" />
                                <Metric label="Sertifikat" value="3" />
                            </div>

                            <div className="mt-8 grid gap-3">
                                {['Role-based access untuk Admin, Pengajar, Guru Sekolah, dan Siswa', 'Google login/register via Laravel Socialite', 'Sertifikat memiliki nomor unik dan QR/token verifikasi'].map((item) => (
                                    <div key={item} className="flex items-center gap-3 rounded-lg bg-white p-3 text-sm font-semibold text-slate-700">
                                        <CheckCircle2 className="size-4 text-emerald-400" />
                                        {item}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>

                    <section className="mx-auto w-full max-w-md">
                        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm md:p-8">
                            <div className="mb-6">
                                <p className="text-sm font-bold uppercase tracking-wider text-blue-700">Login</p>
                                <h2 className="mt-2 text-3xl font-extrabold tracking-tight">Masuk ke Ngawitekno</h2>
                                <p className="mt-2 text-sm leading-6 text-slate-600">Gunakan Google atau email untuk melanjutkan pembelajaran robotik.</p>
                            </div>

                            {status && <div className="mb-4 rounded-lg bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">{status}</div>}

                            <form className="flex flex-col gap-6" onSubmit={submit}>
                                <GoogleButton label="Login dengan Google" />
                                <div className="flex items-center gap-3 text-xs font-semibold text-slate-400">
                                    <span className="h-px flex-1 bg-slate-200" />
                                    atau login manual
                                    <span className="h-px flex-1 bg-slate-200" />
                                </div>

                                <div className="grid gap-5">
                                    <div className="grid gap-2">
                                        <Label htmlFor="email">Email</Label>
                                        <Input
                                            id="email"
                                            type="email"
                                            required
                                            autoFocus
                                            tabIndex={1}
                                            autoComplete="email"
                                            value={data.email}
                                            onChange={(e) => setData('email', e.target.value)}
                                            placeholder="siswa@ngawitekno.test"
                                            className="h-12"
                                        />
                                        <InputError message={errors.email} />
                                    </div>

                                    <div className="grid gap-2">
                                        <div className="flex items-center">
                                            <Label htmlFor="password">Password</Label>
                                            {canResetPassword && (
                                                <TextLink href={route('password.request')} className="ml-auto text-sm" tabIndex={5}>
                                                    Lupa password?
                                                </TextLink>
                                            )}
                                        </div>
                                        <Input
                                            id="password"
                                            type="password"
                                            required
                                            tabIndex={2}
                                            autoComplete="current-password"
                                            value={data.password}
                                            onChange={(e) => setData('password', e.target.value)}
                                            placeholder="password"
                                            className="h-12"
                                        />
                                        <InputError message={errors.password} />
                                    </div>

                                    <div className="flex items-center space-x-3">
                                        <Checkbox id="remember" checked={data.remember} onCheckedChange={(checked) => setData('remember', checked === true)} tabIndex={3} />
                                        <Label htmlFor="remember">Ingat saya</Label>
                                    </div>

                                    <Button type="submit" className="h-12 w-full bg-[#1C7DE8] hover:bg-[#1469c7]" tabIndex={4} disabled={processing}>
                                        {processing ? <LoaderCircle className="size-4 animate-spin" /> : <Lock className="size-4" />}
                                        Login
                                    </Button>
                                </div>
                            </form>

                            <div className="mt-6 rounded-lg bg-slate-50 p-4">
                                <div className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-700">
                                    <ShieldCheck className="size-4 text-emerald-600" />
                                    Akun demo seeder
                                </div>
                                <div className="grid gap-2 text-xs text-slate-600">
                                    {demoAccounts.map((account) => (
                                        <button
                                            key={account.email}
                                            type="button"
                                            onClick={() => {
                                                setData('email', account.email);
                                                setData('password', 'password');
                                            }}
                                            className="flex items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-left hover:border-blue-200"
                                        >
                                            <span className="font-semibold">{account.role}</span>
                                            <span>{account.email}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="mt-6 text-center text-sm text-slate-500">
                                Belum punya akun?{' '}
                                <TextLink href={route('register')} tabIndex={6}>
                                    Register siswa
                                </TextLink>
                            </div>
                        </div>
                        <Link href="/certificates/verify" className="mt-4 flex items-center justify-center gap-2 text-sm font-semibold text-blue-700">
                            Verifikasi sertifikat publik
                            <ArrowRight className="size-4" />
                        </Link>
                    </section>
                </main>
            </div>
        </>
    );
}

function Metric({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-lg bg-white p-4">
            <p className="text-sm text-slate-500">{label}</p>
            <p className="mt-2 text-3xl font-extrabold text-blue-700">{value}</p>
        </div>
    );
}
