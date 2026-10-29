import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { Link } from '@inertiajs/react';
import { MoreVertical } from 'lucide-react';
import { ReactNode } from 'react';

export function DesktopTable({ children, className }: { children: ReactNode; className?: string }) {
    return <div className={cn('hidden max-w-full overflow-x-auto md:block', className)}>{children}</div>;
}

export function MobileCardList({ children, empty, className }: { children: ReactNode; empty?: ReactNode; className?: string }) {
    const hasContent = Array.isArray(children) ? children.length > 0 : Boolean(children);

    return <div className={cn('grid gap-3 md:hidden', className)}>{hasContent ? children : empty}</div>;
}

export function MobileDataCard({
    title,
    subtitle,
    badge,
    meta = [],
    actions,
    children,
    className,
}: {
    title: ReactNode;
    subtitle?: ReactNode;
    badge?: ReactNode;
    meta?: Array<{ label: string; value: ReactNode }>;
    actions?: ReactNode;
    children?: ReactNode;
    className?: string;
}) {
    return (
        <article className={cn('rounded-2xl border border-slate-200 bg-white p-4 shadow-sm', className)}>
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                    <div className="text-base font-extrabold break-words text-slate-950">{title}</div>
                    {subtitle && <div className="mt-1 text-sm leading-5 break-words text-slate-500">{subtitle}</div>}
                </div>
                {badge && <div className="shrink-0">{badge}</div>}
            </div>

            {meta.length > 0 && (
                <dl className="mt-4 grid gap-3 text-sm">
                    {meta.map((item) => (
                        <div key={item.label} className="grid grid-cols-[7.5rem_1fr] gap-3">
                            <dt className="text-xs font-bold tracking-wide text-slate-500 uppercase">{item.label}</dt>
                            <dd className="min-w-0 font-semibold break-words text-slate-800">{item.value}</dd>
                        </div>
                    ))}
                </dl>
            )}

            {children && <div className="mt-4">{children}</div>}

            {actions && <div className="mt-4 flex flex-wrap items-center justify-end gap-2">{actions}</div>}
        </article>
    );
}

export function StatusBadge({ status, label }: { status?: string | null; label?: ReactNode }) {
    const normalized = (status ?? '').toLowerCase();
    const isFailure = ['failed', 'expired', 'rejected', 'inactive', 'nonaktif'].some((keyword) => normalized.includes(keyword));
    const tone =
        normalized.includes('active') || normalized.includes('aktif') || normalized.includes('paid') || normalized.includes('approved')
            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
            : normalized.includes('pending') || normalized.includes('submitted') || normalized.includes('draft') || normalized.includes('review')
              ? 'border-amber-200 bg-amber-50 text-amber-700'
              : isFailure
                ? 'border-red-200 bg-red-50 text-red-700'
                : 'border-slate-200 bg-slate-100 text-slate-700';

    return <span className={cn('inline-flex rounded-full border px-2.5 py-1 text-xs font-bold capitalize', tone)}>{label ?? status ?? '-'}</span>;
}

export function MobileActionMenu({
    label = 'Aksi',
    items,
}: {
    label?: string;
    items: Array<{
        label: string;
        href?: string;
        onClick?: () => void;
        destructive?: boolean;
        icon?: ReactNode;
    }>;
}) {
    const visibleItems = items.filter((item) => item.href || item.onClick);

    if (visibleItems.length === 0) return null;

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button type="button" variant="outline" size="sm" className="min-h-11">
                    <MoreVertical className="size-4" />
                    {label}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-white">
                <DropdownMenuLabel>Aksi data</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {visibleItems.map((item) => (
                    <DropdownMenuItem
                        key={item.label}
                        asChild={Boolean(item.href)}
                        onSelect={(event) => {
                            if (item.href) return;

                            event.preventDefault();
                            item.onClick?.();
                        }}
                        className={cn('cursor-pointer', item.destructive && 'text-red-700 focus:text-red-700')}
                    >
                        {item.href ? (
                            <Link href={item.href}>
                                {item.icon}
                                {item.label}
                            </Link>
                        ) : (
                            <>
                                {item.icon}
                                {item.label}
                            </>
                        )}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
