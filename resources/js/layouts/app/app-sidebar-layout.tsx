import { AppContent } from '@/components/app-content';
import { AppShell } from '@/components/app-shell';
import { AppSidebar } from '@/components/app-sidebar';
import { AppSidebarHeader } from '@/components/app-sidebar-header';
import BrandLogo from '@/components/brand-logo';
import { ShellPageSkeleton, usePageComponentLoading } from '@/components/component-skeletons';
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { WalkthroughManager } from '@/components/walkthrough';
import { NavItem, adminNav, instructorNav, studentNav, teacherNav } from '@/lib/platform-data';
import { cn } from '@/lib/utils';
import { tourTargetForNavItem } from '@/lib/walkthrough-data';
import { type BreadcrumbItem } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { ChevronRight, Settings } from 'lucide-react';

export default function AppSidebarLayout({ children, breadcrumbs = [] }: { children: React.ReactNode; breadcrumbs?: BreadcrumbItem[] }) {
    const loading = usePageComponentLoading();
    const page = usePage();
    const { auth } = page.props as { auth?: { user?: { id?: number; role?: string } } };
    const role = auth?.user?.role;
    const navItems =
        role === 'admin' ? adminNav : role === 'internal_instructor' ? instructorNav : role === 'school_teacher' ? teacherNav : studentNav;

    return (
        <AppShell variant="sidebar">
            <AppSidebar />
            <AppContent variant="sidebar">
                <AppSidebarHeader breadcrumbs={breadcrumbs} />
                <div className="max-w-full overflow-hidden pb-[calc(6rem+env(safe-area-inset-bottom))] lg:pb-0">
                    {loading ? <ShellPageSkeleton /> : children}
                </div>
            </AppContent>
            <AppLayoutBottomNav items={flattenNavItems(navItems)} />
            <WalkthroughManager user={auth?.user} currentPath={(page.url ?? '/').split('?')[0]} enabled={!loading} />
        </AppShell>
    );
}

function flattenNavItems(items: NavItem[]): NavItem[] {
    return items.flatMap((item) => (item.children?.length ? item.children : [item]));
}

function AppLayoutBottomNav({ items }: { items: NavItem[] }) {
    const itemsWithHref = items.filter((item) => item.href);
    const activeItem = itemsWithHref.find((item) => isActive(item) || isSameBase(item));
    const primaryItems = selectMobilePrimaryItems(itemsWithHref, activeItem);
    const overflowItems = itemsWithHref.filter((item) => !primaryItems.includes(item));
    const hasMore = overflowItems.length > 0;

    return (
        <nav
            data-tour="tour-bottom-navigation"
            className="fixed right-0 bottom-0 left-0 z-40 border-t border-slate-200 bg-white/95 px-2 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] shadow-[0_-10px_30px_rgba(15,23,42,0.08)] backdrop-blur lg:hidden"
        >
            <div className={cn('mx-auto grid max-w-md gap-1', hasMore ? 'grid-cols-5' : 'grid-cols-4')}>
                {primaryItems.map((item) => renderNavItem(item))}
                {hasMore && (
                    <Sheet>
                        <SheetTrigger asChild>
                            <button
                                type="button"
                                className={cn(
                                    'flex min-w-0 flex-col items-center justify-center rounded-2xl px-1 py-2 text-[10px] font-bold transition active:bg-slate-100',
                                    activeItem && overflowItems.includes(activeItem) ? 'bg-blue-50 text-blue-700' : 'text-slate-500',
                                )}
                                aria-label="Buka pengaturan dan menu aplikasi"
                                data-tour="tour-nav-pengaturan"
                            >
                                <Settings className="mb-1 size-5" />
                                <span>Pengaturan</span>
                            </button>
                        </SheetTrigger>
                        <MobileMenuSheet items={overflowItems} />
                    </Sheet>
                )}
            </div>
        </nav>
    );
}

function MobileMenuSheet({ items }: { items: NavItem[] }) {
    return (
        <SheetContent side="right" className="flex h-full w-[min(88vw,24rem)] flex-col gap-0 overflow-hidden p-0">
            <SheetHeader className="border-b border-slate-200 p-5 text-left">
                <div className="mb-3">
                    <BrandLogo className="h-10" />
                </div>
                <SheetTitle>Pengaturan</SheetTitle>
                <p className="text-sm leading-6 text-slate-500">Akses menu tambahan sesuai role akun Anda.</p>
            </SheetHeader>
            <nav className="scrollbar-none min-h-0 flex-1 space-y-1 overflow-y-auto p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
                {items.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item) || isSameBase(item);

                    return (
                        <SheetClose key={item.href ?? item.title} asChild>
                            <Link
                                href={item.href ?? '#'}
                                className={cn(
                                    'flex min-h-12 items-center gap-3 rounded-2xl px-4 text-sm font-bold transition',
                                    active ? 'bg-blue-50 text-blue-700' : 'text-slate-700 hover:bg-slate-50',
                                )}
                                data-tour={tourTargetForNavItem(item)}
                            >
                                <Icon className="size-5 shrink-0" />
                                <span className="min-w-0 flex-1 truncate">{item.title}</span>
                                <ChevronRight className="size-4 shrink-0 text-slate-400" />
                            </Link>
                        </SheetClose>
                    );
                })}
            </nav>
        </SheetContent>
    );
}

function renderNavItem(item: NavItem) {
    const Icon = item.icon;
    const active = isActive(item) || isSameBase(item);
    const isScan = item.title === 'Scan Presensi' || item.href === '/student/attendance/scan';

    if (isScan) {
        return (
            <Link
                key={item.href ?? item.title}
                href={item.href ?? '#'}
                className="group relative -mt-6 flex flex-col items-center justify-center"
                data-tour={tourTargetForNavItem(item)}
            >
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
                    {shortLabel(item.title)}
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
            data-tour={tourTargetForNavItem(item)}
        >
            <Icon className="mb-1 size-5" />
            <span className="max-w-full truncate">{shortLabel(item.title)}</span>
        </Link>
    );
}

function isActive(item: NavItem) {
    if (typeof window === 'undefined' || !item.href) return false;

    const target = item.href.split(/[?#]/)[0];

    return window.location.pathname === target || (target !== '/' && window.location.pathname.startsWith(`${target}/`));
}

function isSameBase(item: NavItem) {
    return isActive(item);
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

function shortLabel(label: string) {
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
    };

    return labels[label] ?? label;
}
