import { AppContent } from '@/components/app-content';
import { AppShell } from '@/components/app-shell';
import { AppSidebar } from '@/components/app-sidebar';
import { AppSidebarHeader } from '@/components/app-sidebar-header';
import { ShellPageSkeleton, usePageComponentLoading } from '@/components/component-skeletons';
import { NavItem, adminNav, instructorNav, studentNav, teacherNav } from '@/lib/platform-data';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import { Link, usePage } from '@inertiajs/react';

export default function AppSidebarLayout({ children, breadcrumbs = [] }: { children: React.ReactNode; breadcrumbs?: BreadcrumbItem[] }) {
    const loading = usePageComponentLoading();
    const { auth } = usePage().props as { auth?: { user?: { role?: string } } };
    const role = auth?.user?.role;
    const navItems =
        role === 'admin'
            ? adminNav
            : role === 'internal_instructor'
              ? instructorNav
              : role === 'school_teacher'
                ? teacherNav
                : studentNav;

    return (
        <AppShell variant="sidebar">
            <AppSidebar />
            <AppContent variant="sidebar">
                <AppSidebarHeader breadcrumbs={breadcrumbs} />
                <div className="pb-24 lg:pb-0">{loading ? <ShellPageSkeleton /> : children}</div>
            </AppContent>
            <AppLayoutBottomNav items={flattenNavItems(navItems)} />
        </AppShell>
    );
}

function flattenNavItems(items: NavItem[]): NavItem[] {
    return items.flatMap((item) => (item.children?.length ? item.children : [item]));
}

function AppLayoutBottomNav({ items }: { items: NavItem[] }) {
    const itemsWithHref = items.filter((item) => item.href);
    const activeItem = itemsWithHref.find((item) => isActive(item) || isSameBase(item));
    const baseItems = itemsWithHref.slice(0, activeItem && !itemsWithHref.slice(0, 5).includes(activeItem) ? 4 : 5);
    const primaryItems = activeItem && !baseItems.includes(activeItem) ? [...baseItems, activeItem] : baseItems;

    return (
        <nav className="fixed right-0 bottom-0 left-0 z-40 border-t border-slate-200 bg-white/95 px-2 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] shadow-[0_-10px_30px_rgba(15,23,42,0.08)] backdrop-blur lg:hidden">
            <div className="mx-auto grid max-w-md grid-cols-5 gap-1">
                {primaryItems.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item) || isSameBase(item);

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
                            <span className="max-w-full truncate">{shortLabel(item.title)}</span>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}

function isActive(item: NavItem) {
    if (typeof window === 'undefined' || !item.href) return false;

    return window.location.pathname === item.href.split(/[?#]/)[0];
}

function isSameBase(item: NavItem) {
    return isActive(item);
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
