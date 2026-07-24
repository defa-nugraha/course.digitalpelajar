import { AuthLoginSkeleton, usePageComponentLoading } from '@/components/component-skeletons';
import { RequiredMark } from '@/components/form-field';
import InputError from '@/components/input-error';
import { GoogleButton } from '@/components/platform';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Head, useForm } from '@inertiajs/react';
import { LoaderCircle, Lock } from 'lucide-react';
import { FormEventHandler } from 'react';

interface LoginForm {
    [key: string]: string | boolean;
    email: string;
    password: string;
    remember: boolean;
}

interface LoginProps {
    status?: string;
    canResetPassword: boolean;
}

export default function Login({ status, canResetPassword }: LoginProps) {
    const loading = usePageComponentLoading();
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
            {loading ? (
                <AuthLoginSkeleton />
            ) : (
                <div className="min-h-screen bg-[#FAF8FF] text-slate-950">
                    <main className="mx-auto flex min-h-screen max-w-7xl justify-center px-4 py-8 md:px-10 lg:items-center">
                        <section className="mx-auto w-full max-w-md">
                            <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm md:p-8">
                                <div className="mb-6">
                                    <h2 className="text-3xl font-extrabold tracking-tight">Masuk ke akun Anda</h2>
                                    <p className="mt-2 text-sm leading-6 text-slate-600">
                                        Gunakan email dan password untuk melanjutkan pembelajaran robotik.
                                    </p>
                                </div>

                                {status && <div className="mb-4 rounded-lg bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">{status}</div>}

                                <form className="flex flex-col gap-6" onSubmit={submit}>
                                    <div className="grid gap-5">
                                        <div className="grid gap-2">
                                            <Label htmlFor="email">
                                                Email <RequiredMark />
                                            </Label>
                                            <Input
                                                id="email"
                                                type="email"
                                                required
                                                autoFocus
                                                tabIndex={1}
                                                autoComplete="email"
                                                value={data.email}
                                                onChange={(e) => setData('email', e.target.value)}
                                                placeholder="email@domain.com"
                                                className="h-12"
                                            />
                                            <InputError message={errors.email} />
                                        </div>

                                        <div className="grid gap-2">
                                            <div className="flex items-center">
                                                <Label htmlFor="password">
                                                    Password <RequiredMark />
                                                </Label>
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
                                            <Checkbox
                                                id="remember"
                                                checked={data.remember}
                                                onCheckedChange={(checked) => setData('remember', checked === true)}
                                                tabIndex={3}
                                            />
                                            <Label htmlFor="remember">Ingat saya</Label>
                                        </div>

                                        <Button
                                            type="submit"
                                            className="h-12 w-full bg-[#1C7DE8] hover:bg-[#1469c7]"
                                            tabIndex={4}
                                            disabled={processing}
                                        >
                                            {processing ? <LoaderCircle className="size-4 animate-spin" /> : <Lock className="size-4" />}
                                            Login
                                        </Button>
                                    </div>

                                    <div className="flex items-center gap-3 text-xs font-semibold text-slate-400">
                                        <span className="h-px flex-1 bg-slate-200" />
                                        atau login dengan Google
                                        <span className="h-px flex-1 bg-slate-200" />
                                    </div>
                                    <GoogleButton label="Login dengan Google" />
                                </form>

                                <div className="mt-6 text-center text-sm text-slate-500">
                                    Belum punya akun?{' '}
                                    <TextLink href={route('register')} tabIndex={6}>
                                        Register siswa
                                    </TextLink>
                                </div>
                            </div>
                        </section>
                    </main>
                </div>
            )}
        </>
    );
}
