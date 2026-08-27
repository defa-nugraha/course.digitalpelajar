import BrandLogo from '@/components/brand-logo';
import { PublicPageSkeleton, ShellPageSkeleton, usePageComponentLoading } from '@/components/component-skeletons';
import { ConfirmationDialogHost } from '@/components/confirmation-dialog-host';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { NavItem, adminNav, instructorNav, studentNav, teacherNav } from '@/lib/platform-data';
import { cn } from '@/lib/utils';
import { Link, usePage } from '@inertiajs/react';
import {
    ChevronDown,
    ChevronRight,
    Clock,
    LogOut,
    LucideIcon,
    Mail,
    MapPin,
    Menu,
    MoreHorizontal,
    PanelLeftClose,
    PanelLeftOpen,
    Phone,
    Search,
    Settings,
} from 'lucide-react';
import { PropsWithChildren, ReactNode, useEffect, useState } from 'react';
import { Toaster, toast } from 'sonner';

interface FlashPayload {
    success?: string;
    warning?: string;
    error?: string;
    status?: string;
}

function routeExists(name: string) {
    return typeof route === 'function' && route().has(name);
}

export function googleAuthUrl() {
    return routeExists('auth.google.redirect') ? route('auth.google.redirect') : '/auth/google';
}

export function PublicNav() {
    const page = usePage();
    const {
        auth,
        flash = {},
        errors = {},
    } = page.props as {
        auth?: { user?: unknown };
        flash?: FlashPayload;
        errors?: Record<string, string>;
    };
    const validationError = errors ? Object.values(errors)[0] : undefined;
    const currentPath = (page.url ?? '/').split('?')[0];
    const navItems = [
        { href: '/', label: 'Home' },
        { href: '/courses', label: 'Courses' },
        { href: '/learning-paths', label: 'Learning Path' },
        { href: '/store', label: 'Toko Robotik' },
    ];
    useFlashToasts(flash, validationError);

    return (
        <>
            <Toaster richColors position="top-center" />
            <ConfirmationDialogHost />
            <header className="fixed top-0 left-0 z-50 w-full border-b border-slate-200 bg-white/80 shadow-sm backdrop-blur-md">
                <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-10">
                    <Link href="/" className="flex items-center">
                        <BrandLogo className="h-10" />
                    </Link>
                    <nav className="hidden items-center gap-8 text-sm font-semibold text-slate-600 md:flex">
                        {navItems.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    'pb-1 transition-all active:scale-95',
                                    currentPath === item.href ? 'border-b-2 border-[#1C7DE8] text-[#1C7DE8]' : 'text-slate-600 hover:text-[#1C7DE8]',
                                )}
                            >
                                {item.label}
                            </Link>
                        ))}
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
                                <Button asChild className="bg-[#1C7DE8] shadow-[0_4px_20px_rgba(28,125,232,0.3)] hover:bg-[#1469c7]">
                                    <Link href="/register">Sign Up</Link>
                                </Button>
                            </>
                        )}
                    </div>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="md:hidden" aria-label="Buka menu navigasi">
                                <Menu className="size-5" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-64 border-slate-200 bg-white md:hidden">
                            <DropdownMenuLabel>Menu</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {navItems.map((item) => (
                                <DropdownMenuItem key={item.href} asChild className="cursor-pointer">
                                    <Link href={item.href} className={currentPath === item.href ? 'font-bold text-blue-700' : ''}>
                                        {item.label}
                                    </Link>
                                </DropdownMenuItem>
                            ))}
                            <DropdownMenuSeparator />
                            {auth?.user ? (
                                <>
                                    <DropdownMenuItem asChild className="cursor-pointer">
                                        <Link href="/dashboard">Dashboard</Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem asChild className="cursor-pointer text-red-700 focus:text-red-700">
                                        <Link href="/logout" method="post" as="button" className="w-full">
                                            Logout
                                        </Link>
                                    </DropdownMenuItem>
                                </>
                            ) : (
                                <>
                                    <DropdownMenuItem asChild className="cursor-pointer">
                                        <Link href="/login">Login</Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem asChild className="cursor-pointer">
                                        <Link href="/register">Register</Link>
                                    </DropdownMenuItem>
                                </>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </header>
        </>
    );
}

export function PublicContent({ children, skeleton = 'default' }: PropsWithChildren<{ skeleton?: 'default' | 'catalog' | 'detail' | 'centered' }>) {
    const loading = usePageComponentLoading();

    return loading ? <PublicPageSkeleton variant={skeleton} /> : <>{children}</>;
}

export function Shell({
    children,
    title,
    eyebrow,
    nav,
    actions,
}: PropsWithChildren<{ title: string; eyebrow?: string; nav?: 'student' | 'admin' | 'teacher' | 'instructor'; actions?: ReactNode }>) {
    const page = usePage();
    const {
        flash = {},
        auth,
        errors = {},
    } = page.props as {
        flash?: FlashPayload;
        auth?: { user?: { name?: string; email?: string; role?: string; avatar?: string | null } };
        errors?: Record<string, string>;
    };
    const validationError = errors ? Object.values(errors)[0] : undefined;
    const isLearningRoute = (page.url ?? '').split('?')[0] === '/learning';
    const [sidebarHidden, setSidebarHidden] = useState(isLearningRoute);
    const resolvedNav = nav ?? auth?.user?.role ?? 'student';
    const navItems =
        resolvedNav === 'admin'
            ? adminNav
            : resolvedNav === 'internal_instructor' || resolvedNav === 'instructor'
              ? instructorNav
              : resolvedNav === 'school_teacher' || resolvedNav === 'teacher'
                ? teacherNav
                : studentNav;
    const mobileNavItems = flattenNavItems(navItems);
    const loading = usePageComponentLoading();
    const SidebarToggleIcon = sidebarHidden ? PanelLeftOpen : PanelLeftClose;
    useFlashToasts(flash, validationError);

    useEffect(() => {
        if (isLearningRoute) {
            setSidebarHidden(true);
        }
    }, [isLearningRoute]);

    return (
        <div className="min-h-screen bg-[#F8FAFC] text-slate-950">
            <Toaster richColors position="top-center" />
            <ConfirmationDialogHost />
            {!sidebarHidden && (
                <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-slate-200 bg-white p-4 lg:flex">
                    <Link href="/dashboard" className="mb-8 flex shrink-0 items-center px-2">
                        <BrandLogo className="h-12" />
                    </Link>
                    <nav className="scrollbar-none -mx-1 min-h-0 flex-1 space-y-1 overflow-y-auto px-1 pb-4">
                        {navItems.map((item: NavItem) => (
                            <SideLink key={item.href ?? item.title} item={item} />
                        ))}
                    </nav>
                </aside>
            )}
            <main className={cn('pb-[calc(6rem+env(safe-area-inset-bottom))] lg:pb-0', !sidebarHidden && 'lg:pl-64')}>
                <header className="sticky top-0 z-20 flex min-h-16 items-center justify-between gap-3 border-b border-slate-200 bg-white/90 px-3 backdrop-blur sm:px-4 md:px-8">
                    <div className="flex min-w-0 items-center gap-3">
                        <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="hidden lg:inline-flex"
                            onClick={() => setSidebarHidden((hidden) => !hidden)}
                            aria-label={sidebarHidden ? 'Tampilkan sidebar' : 'Sembunyikan sidebar'}
                        >
                            <SidebarToggleIcon className="size-4" />
                        </Button>
                        <div className="min-w-0">
                            {eyebrow && <p className="text-xs font-bold tracking-wider text-blue-700 uppercase">{eyebrow}</p>}
                            <h1 className="truncate text-lg font-bold tracking-tight text-slate-950 sm:text-xl md:text-2xl">{title}</h1>
                        </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1 sm:gap-2">
                        <Button asChild variant="outline" size="icon" className="hidden sm:inline-flex">
                            <Link href="/courses" aria-label="Cari kursus">
                                <Search className="size-4" />
                            </Link>
                        </Button>
                        {actions && <div className="hidden items-center gap-2 sm:flex">{actions}</div>}
                        <ProfileDropdown user={auth?.user} />
                    </div>
                </header>
                {actions && <div className="border-b border-slate-200 bg-white px-3 py-2 sm:hidden">{actions}</div>}
                {!sidebarHidden && (
                    <nav className="hidden gap-2 overflow-x-auto border-b border-slate-200 bg-white px-4 py-2 lg:hidden">
                        {mobileNavItems.map((item: NavItem) => {
                            const Icon = item.icon;

                            return (
                                <Link
                                    key={item.href ?? item.title}
                                    href={item.href ?? '#'}
                                    className="flex shrink-0 items-center gap-2 rounded-md bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700"
                                >
                                    <Icon className="size-4" />
                                    {item.title}
                                </Link>
                            );
                        })}
                    </nav>
                )}
                <div className="max-w-full overflow-hidden p-3 sm:p-4 md:p-8">{loading ? <ShellPageSkeleton /> : children}</div>
            </main>
            <MobileBottomNav items={mobileNavItems} />
        </div>
    );
}

function useFlashToasts(flash: FlashPayload, validationError?: string) {
    useEffect(() => {
        if (flash.error) {
            toast.error(flash.error);
            return;
        }

        if (validationError) {
            toast.error(validationError);
            return;
        }

        if (flash.warning) {
            toast.warning(flash.warning);
            return;
        }

        if (flash.success) {
            toast.success(flash.success);
            return;
        }

        if (flash.status) {
            toast.message(flash.status);
        }
    }, [flash.error, flash.status, flash.success, flash.warning, validationError]);
}

function ProfileDropdown({ user }: { user?: { name?: string; email?: string; avatar?: string | null } }) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button
                    type="button"
                    className="inline-flex size-10 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-white text-sm font-bold text-blue-700 shadow-sm transition hover:border-blue-300 hover:bg-blue-50"
                    aria-label="Buka menu profil"
                >
                    {user?.avatar ? (
                        <img src={user.avatar} alt={`Foto profil ${user.name ?? 'pengguna'}`} className="size-full object-cover" />
                    ) : (
                        <span>{initials(user?.name ?? 'User')}</span>
                    )}
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64 border-slate-200 bg-white">
                <DropdownMenuLabel>
                    <span className="block truncate font-bold text-slate-950">{user?.name ?? 'Pengguna'}</span>
                    {user?.email && <span className="mt-0.5 block truncate text-xs font-normal text-slate-500">{user.email}</span>}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild className="cursor-pointer">
                    <Link href="/settings/profile">
                        <Settings className="size-4" />
                        Pengaturan
                    </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="cursor-pointer text-red-700 focus:text-red-700">
                    <Link href="/logout" method="post" as="button" className="w-full">
                        <LogOut className="size-4" />
                        Logout
                    </Link>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

function initials(name: string) {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    const first = parts[0]?.[0] ?? 'U';
    const second = parts.length > 1 ? parts[parts.length - 1]?.[0] : '';

    return `${first}${second}`.toUpperCase();
}

function SideLink({ item }: { item: NavItem }) {
    if (item.children?.length) {
        return <SideGroup item={item} />;
    }

    return <SideLeaf item={item} />;
}

function SideGroup({ item }: { item: NavItem }) {
    const active = item.children?.some((child) => isNavItemActive(child) || isSameBasePath(child)) ?? false;
    const [open, setOpen] = useState(active);
    const Icon = item.icon;

    return (
        <div>
            <button
                type="button"
                onClick={() => setOpen((value) => !value)}
                className={cn(
                    'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold transition',
                    active ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950',
                )}
            >
                <Icon className="size-4" />
                <span className="min-w-0 flex-1">{item.title}</span>
                <ChevronDown className={cn('size-4 transition-transform', open ? 'rotate-180' : 'rotate-0')} />
            </button>
            {open && (
                <div className="mt-1 space-y-1 pl-4">
                    {item.children?.map((child) => <SideLeaf key={child.href ?? child.title} item={child} nested />)}
                </div>
            )}
        </div>
    );
}

function SideLeaf({ item, nested = false }: { item: NavItem; nested?: boolean }) {
    const Icon = item.icon;
    const active = isNavItemActive(item);

    return (
        <Link
            href={item.href ?? '#'}
            className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition',
                nested && 'py-2 pl-3 text-xs',
                active ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950',
            )}
        >
            <Icon className="size-4" />
            {item.title}
        </Link>
    );
}

function isNavItemActive(item: NavItem) {
    if (typeof window === 'undefined' || !item.href) {
        return false;
    }

    const currentPath = window.location.pathname;
    const currentFull = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    const itemPath = item.href.split(/[?#]/)[0];

    if (item.href.includes('#') || item.href.includes('?')) {
        return currentFull === item.href;
    }

    return currentPath === itemPath || (itemPath !== '/' && currentPath.startsWith(`${itemPath}/`));
}

function isSameBasePath(item: NavItem) {
    if (typeof window === 'undefined' || !item.href) {
        return false;
    }

    const target = item.href.split(/[?#]/)[0];

    return window.location.pathname === target || (target !== '/' && window.location.pathname.startsWith(`${target}/`));
}

function flattenNavItems(items: NavItem[]): NavItem[] {
    return items.flatMap((item) => (item.children?.length ? item.children : [item]));
}

function MobileBottomNav({ items }: { items: NavItem[] }) {
    const itemsWithHref = items.filter((item) => item.href);
    const activeItem = itemsWithHref.find((item) => isNavItemActive(item) || isSameBasePath(item));
    const primaryItems = selectMobilePrimaryItems(itemsWithHref, activeItem);
    const overflowItems = itemsWithHref.filter((item) => !primaryItems.includes(item));
    const hasMore = overflowItems.length > 0;

    return (
        <nav className="fixed right-0 bottom-0 left-0 z-40 border-t border-slate-200 bg-white/95 px-2 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] shadow-[0_-10px_30px_rgba(15,23,42,0.08)] backdrop-blur lg:hidden">
            <div className={cn('mx-auto grid max-w-md gap-1', hasMore ? 'grid-cols-5' : 'grid-cols-4')}>
                {primaryItems.map((item) => renderMobileNavItem(item))}
                {hasMore && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button
                                type="button"
                                className="flex min-w-0 flex-col items-center justify-center rounded-2xl px-1 py-2 text-[10px] font-bold text-slate-500 transition active:bg-slate-100"
                                aria-label="Menu lainnya"
                            >
                                <MoreHorizontal className="mb-1 size-5" />
                                <span>Lainnya</span>
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" side="top" className="mb-3 max-h-[60dvh] w-64 overflow-y-auto bg-white">
                            <DropdownMenuLabel>Menu lainnya</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {overflowItems.map((item) => {
                                const Icon = item.icon;

                                return (
                                    <DropdownMenuItem key={item.href ?? item.title} asChild className="cursor-pointer">
                                        <Link href={item.href ?? '#'}>
                                            <Icon className="size-4" />
                                            {item.title}
                                        </Link>
                                    </DropdownMenuItem>
                                );
                            })}
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
            </div>
        </nav>
    );
}

function renderMobileNavItem(item: NavItem) {
    const Icon = item.icon;
    const active = isNavItemActive(item) || isSameBasePath(item);
    const isScan = item.title === 'Scan Presensi' || item.href === '/student/attendance/scan';

    if (isScan) {
        return (
            <Link key={item.href ?? item.title} href={item.href ?? '#'} className="group relative -mt-6 flex flex-col items-center justify-center">
                <div
                    className={cn(
                        'flex size-12 items-center justify-center rounded-full shadow-lg transition-all duration-200 active:scale-95',
                        active
                            ? 'bg-gradient-to-tr from-blue-700 to-indigo-600 text-white ring-4 shadow-blue-500/40 ring-white'
                            : 'bg-blue-600 text-white ring-4 shadow-blue-600/30 ring-white hover:bg-blue-700',
                    )}
                >
                    <Icon className="size-6" />
                </div>
                <span className={cn('mt-0.5 max-w-full truncate text-[10px] font-bold tracking-tight', active ? 'text-blue-700' : 'text-slate-600')}>
                    {shortMobileLabel(item.title)}
                </span>
            </Link>
        );
    }

    return (
        <Link
            key={item.href ?? item.title}
            href={item.href ?? '#'}
            className={cn(
                'flex min-w-0 flex-col items-center justify-center rounded-2xl px-1 py-2 text-[10px] font-bold transition',
                active ? 'bg-blue-50 text-blue-700' : 'text-slate-500 active:bg-slate-100',
            )}
        >
            <Icon className="mb-1 size-5" />
            <span className="max-w-full truncate">{shortMobileLabel(item.title)}</span>
        </Link>
    );
}

function selectMobilePrimaryItems(items: NavItem[], activeItem?: NavItem) {
    const preferred = [
        'Dashboard',
        'Belajar',
        'Scan Presensi',
        'Siswa',
        'Course Builder',
        'Jadwal Saya',
        'Jadwal Mengajar',
        'Laporan Saya',
        'Laporan Pertemuan',
        'Toko Robotik',
        'Pengaturan SEO',
    ];
    const scored = [...items].sort((a, b) => {
        const aScore = preferred.indexOf(a.title);
        const bScore = preferred.indexOf(b.title);

        return (aScore === -1 ? 999 : aScore) - (bScore === -1 ? 999 : bScore);
    });
    const primary = scored.slice(0, 4);

    if (activeItem && !primary.includes(activeItem)) {
        return [...primary.slice(0, 3), activeItem];
    }

    return primary;
}

function shortMobileLabel(label: string) {
    const labels: Record<string, string> = {
        Dashboard: 'Home',
        'Course Builder': 'Course',
        'Jadwal Mengajar': 'Jadwal',
        'Jadwal Saya': 'Jadwal',
        'Laporan Pertemuan': 'Laporan',
        'Laporan Saya': 'Laporan',
        'Feedback Pertemuan': 'Feedback',
        'Feedback Siswa': 'Feedback',
        'Scan Presensi': 'Scan',
        'Data Sekolah': 'Sekolah',
        'Akses Learning Path': 'Akses',
    };

    return labels[label] ?? label;
}

export function StatCard({
    label,
    value,
    icon: Icon,
    tone = 'blue',
}: {
    label: string;
    value: string;
    icon: LucideIcon;
    tone?: 'blue' | 'purple' | 'amber' | 'slate';
}) {
    const tones = {
        blue: 'bg-blue-600 text-white',
        purple: 'bg-violet-600 text-white',
        amber: 'bg-[#FED635] text-slate-950',
        slate: 'bg-white text-slate-950 border border-slate-200',
    };

    return (
        <div className={cn('rounded-xl p-5 shadow-sm', tones[tone])}>
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
        <section className={cn('rounded-2xl border border-slate-200 bg-white p-5 shadow-sm', className)}>
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

interface FooterLinkItem {
    label: string;
    href: string;
}

interface FooterColumnData {
    title: string;
    links: FooterLinkItem[];
}

interface FooterSettingData {
    description?: string | null;
    address?: string | null;
    email?: string | null;
    phone?: string | null;
    businessHours?: string | null;
    copyrightText?: string | null;
    linkColumns?: FooterColumnData[];
    bottomLinks?: FooterLinkItem[];
    isVisible?: boolean;
}

const fallbackFooter: FooterSettingData = {
    description:
        'Platform pembelajaran robotik dan teknologi yang membantu sekolah, pengajar, dan siswa menjalankan kelas digital terstruktur dari materi hingga sertifikat.',
    address: 'Ngawi, Jawa Timur, Indonesia',
    email: 'support@roboacademy.id',
    phone: 'Layanan sekolah dan kemitraan',
    businessHours: 'Senin–Jumat, 09.00–17.00 WIB',
    copyrightText: '© 2026. Seluruh hak cipta dilindungi.',
    linkColumns: [
        {
            title: 'Perusahaan',
            links: [
                { label: 'Tentang Platform', href: '/' },
                { label: 'Katalog Kelas', href: '/courses' },
                { label: 'Learning Path', href: '/learning-paths' },
            ],
        },
        {
            title: 'Layanan',
            links: [
                { label: 'Masuk', href: '/login' },
                { label: 'Daftar Siswa', href: '/register' },
                { label: 'Verifikasi Sertifikat', href: '/certificates/verify' },
            ],
        },
    ],
    bottomLinks: [
        { label: 'Kelas', href: '/courses' },
        { label: 'Verifikasi', href: '/certificates/verify' },
        { label: 'Login', href: '/login' },
    ],
    isVisible: true,
};

export function FooterMark() {
    const { footer } = usePage().props as { footer?: FooterSettingData };
    const footerData = { ...fallbackFooter, ...(footer ?? {}) };
    const linkColumns = footerData.linkColumns ?? [];
    const bottomLinks = footerData.bottomLinks ?? [];

    if (footerData.isVisible === false) {
        return null;
    }

    return (
        <footer className="mt-auto border-t border-slate-200 bg-slate-950 text-slate-300">
            <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 md:grid-cols-2 md:px-10 lg:grid-cols-4">
                <div>
                    <div className="inline-flex rounded-2xl bg-white px-4 py-3">
                        <BrandLogo className="h-14" />
                    </div>
                    {footerData.description && <p className="mt-5 max-w-sm text-sm leading-7 text-slate-400">{footerData.description}</p>}
                </div>

                {linkColumns.map((column, index) => (
                    <FooterColumn key={`${column.title}-${index}`} title={column.title} links={column.links ?? []} />
                ))}

                <div>
                    <h2 className="text-sm font-bold tracking-wider text-white uppercase">Kontak & Alamat</h2>
                    <div className="mt-4 space-y-3 text-sm leading-6 text-slate-400">
                        {footerData.address && <FooterContact icon={MapPin}>{footerData.address}</FooterContact>}
                        {footerData.email && <FooterContact icon={Mail}>{footerData.email}</FooterContact>}
                        {footerData.phone && <FooterContact icon={Phone}>{footerData.phone}</FooterContact>}
                        {footerData.businessHours && <FooterContact icon={Clock}>{footerData.businessHours}</FooterContact>}
                    </div>
                </div>
            </div>

            <div className="border-t border-slate-800 px-4 py-5 md:px-10">
                <div className="mx-auto flex max-w-7xl flex-col justify-between gap-3 text-xs text-slate-500 md:flex-row md:items-center">
                    {footerData.copyrightText && <p>{footerData.copyrightText}</p>}
                    <div className="flex flex-wrap gap-4">
                        {bottomLinks.map((item) => (
                            <FooterLink key={`${item.label}-${item.href}`} item={item} className="transition hover:text-white" />
                        ))}
                    </div>
                </div>
            </div>
        </footer>
    );
}

function FooterColumn({ title, links }: { title: string; links: { label: string; href: string }[] }) {
    return (
        <div>
            <h2 className="text-sm font-bold tracking-wider text-white uppercase">{title}</h2>
            <nav className="mt-4 space-y-3 text-sm">
                {links.map((item) => (
                    <FooterLink key={`${item.label}-${item.href}`} item={item} className="block text-slate-400 transition hover:text-white" />
                ))}
            </nav>
        </div>
    );
}

function FooterContact({ icon: Icon, children }: PropsWithChildren<{ icon: LucideIcon }>) {
    return (
        <p className="flex gap-3">
            <Icon className="mt-0.5 size-4 shrink-0 text-[#1C7DE8]" />
            {children}
        </p>
    );
}

function FooterLink({ item, className }: { item: FooterLinkItem; className?: string }) {
    if (externalFooterHref(item.href)) {
        return (
            <a href={item.href} className={className}>
                {item.label}
            </a>
        );
    }

    return (
        <Link href={item.href} className={className}>
            {item.label}
        </Link>
    );
}

function externalFooterHref(href: string) {
    return /^(https?:|mailto:|tel:|#)/i.test(href);
}

export function GoogleButton({ label = 'Lanjutkan dengan Google' }: { label?: string }) {
    return (
        <Button asChild variant="outline" className="w-full gap-2">
            <a href={googleAuthUrl()}>
                <img src="/google.png" alt="" aria-hidden="true" className="size-5 object-contain" />
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
