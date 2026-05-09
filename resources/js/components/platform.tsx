import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { NavItem, adminNav, studentNav } from '@/lib/platform-data';
import { Link, usePage } from '@inertiajs/react';
import { Bot, ChevronRight, LogIn, LucideIcon, Menu, Search, Settings } from 'lucide-react';
import { PropsWithChildren, ReactNode } from 'react';

function routeExists(name: string) {
    return typeof route === 'function' && route().has(name);
}

export function googleAuthUrl() {
    return routeExists('auth.google.redirect') ? route('auth.google.redirect') : '/auth/google';
}

export function PublicNav() {
    const { auth } = usePage().props as { auth?: { user?: unknown } };

    return (
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
            <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-10">
                <Link href="/" className="flex items-center gap-2 font-bold text-slate-950">
                    <span className="flex size-9 items-center justify-center rounded-lg bg-[#1C7DE8] text-white">
                        <Bot className="size-5" />
                    </span>
                    Ngawitekno
                </Link>
                <nav className="hidden items-center gap-8 text-sm font-semibold text-slate-600 md:flex">
                    <Link href="/">Home</Link>
                    <Link href="/courses">Courses</Link>
                    <Link href="/courses">Learning Path</Link>
                    <Link href="/certificates/verify">Verify</Link>
                </nav>
                <div className="hidden items-center gap-3 md:flex">
                    {auth?.user ? (
                        <Button asChild>
                            <Link href="/dashboard">Dashboard</Link>
                        </Button>
                    ) : (
                        <>
                            <Button asChild variant="ghost">
                                <Link href="/login">Login</Link>
                            </Button>
                            <Button asChild className="bg-[#1C7DE8] hover:bg-[#1469c7]">
                                <Link href="/register">Sign Up</Link>
                            </Button>
                        </>
                    )}
                </div>
                <Button variant="ghost" size="icon" className="md:hidden">
                    <Menu className="size-5" />
                </Button>
            </div>
        </header>
    );
}

export function Shell({
    children,
    title,
    eyebrow,
    nav = 'student',
    actions,
}: PropsWithChildren<{ title: string; eyebrow?: string; nav?: 'student' | 'admin'; actions?: ReactNode }>) {
    const navItems = nav === 'admin' ? adminNav : studentNav;

    return (
        <div className="min-h-screen bg-[#F8FAFC] text-slate-950">
            <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-slate-200 bg-white p-4 lg:block">
                <Link href="/dashboard" className="mb-8 flex items-center gap-3 px-2">
                    <span className="flex size-10 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
                        <Bot className="size-5" />
                    </span>
                    <span>
                        <span className="block text-lg font-bold">Ngawitekno</span>
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Robotics Academy</span>
                    </span>
                </Link>
                <nav className="space-y-1">
                    {navItems.map((item: NavItem) => (
                        <SideLink key={item.href} item={item} />
                    ))}
                </nav>
                <div className="absolute inset-x-4 bottom-6 rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm font-semibold">Ngawitekno x Digital Pelajar</p>
                    <p className="mt-1 text-xs text-slate-500">Platform pembelajaran robotik berbasis SKPL.</p>
                </div>
            </aside>
            <main className="lg:pl-64">
                <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white/90 px-4 backdrop-blur md:px-8">
                    <div>
                        {eyebrow && <p className="text-xs font-bold uppercase tracking-wider text-blue-700">{eyebrow}</p>}
                        <h1 className="text-xl font-bold tracking-tight text-slate-950 md:text-2xl">{title}</h1>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="icon" aria-label="Search">
                            <Search className="size-4" />
                        </Button>
                        <Button variant="outline" size="icon" aria-label="Settings">
                            <Settings className="size-4" />
                        </Button>
                        {actions}
                    </div>
                </header>
                <div className="p-4 md:p-8">{children}</div>
            </main>
        </div>
    );
}

function SideLink({ item }: { item: NavItem }) {
    const current = typeof window !== 'undefined' ? window.location.pathname : '';
    const Icon = item.icon;
    const active = current === item.href;

    return (
        <Link
            href={item.href}
            className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition',
                active ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950',
            )}
        >
            <Icon className="size-4" />
            {item.title}
        </Link>
    );
}

export function StatCard({ label, value, icon: Icon, tone = 'blue' }: { label: string; value: string; icon: LucideIcon; tone?: 'blue' | 'purple' | 'amber' | 'slate' }) {
    const tones = {
        blue: 'bg-blue-600 text-white',
        purple: 'bg-violet-600 text-white',
        amber: 'bg-[#FED635] text-slate-950',
        slate: 'bg-white text-slate-950 border border-slate-200',
    };

    return (
        <div className={cn('rounded-lg p-5 shadow-sm', tones[tone])}>
            <div className="flex items-center justify-between">
                <p className="text-sm font-semibold opacity-80">{label}</p>
                <Icon className="size-5 opacity-80" />
            </div>
            <p className="mt-4 text-3xl font-extrabold">{value}</p>
        </div>
    );
}

export function Panel({ children, className, title, action }: PropsWithChildren<{ className?: string; title?: string; action?: ReactNode }>) {
    return (
        <section className={cn('rounded-lg border border-slate-200 bg-white p-5 shadow-sm', className)}>
            {(title || action) && (
                <div className="mb-4 flex items-center justify-between gap-3">
                    {title && <h2 className="text-lg font-bold text-slate-950">{title}</h2>}
                    {action}
                </div>
            )}
            {children}
        </section>
    );
}

export function ProgressBar({ value }: { value: number }) {
    return (
        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-[#1C7DE8]" style={{ width: `${value}%` }} />
        </div>
    );
}

export function FooterMark() {
    return (
        <footer className="border-t border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-500">
            <span className="font-semibold text-slate-700">Ngawitekno</span> x Digital Pelajar Tech Solutions
        </footer>
    );
}

export function GoogleButton({ label = 'Lanjutkan dengan Google' }: { label?: string }) {
    return (
        <Button asChild variant="outline" className="w-full gap-2">
            <a href={googleAuthUrl()}>
                <LogIn className="size-4" />
                {label}
            </a>
        </Button>
    );
}

export function Crumb({ items }: { items: string[] }) {
    return (
        <div className="mb-4 flex flex-wrap items-center gap-2 text-sm text-slate-500">
            {items.map((item, index) => (
                <span key={item} className="flex items-center gap-2">
                    {item}
                    {index < items.length - 1 && <ChevronRight className="size-4" />}
                </span>
            ))}
        </div>
    );
}
