import BrandLogo from '@/components/brand-logo';
import { Skeleton } from '@/components/ui/skeleton';
import { router } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';

export function usePageComponentLoading(delay = 120) {
    const [loading, setLoading] = useState(false);
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        const clearTimer = () => {
            if (timer.current) {
                clearTimeout(timer.current);
                timer.current = null;
            }
        };

        const removeStart = router.on('start', (event) => {
            const visit = event.detail.visit;

            if (visit.method !== 'get' || visit.prefetch) {
                return;
            }

            clearTimer();
            timer.current = setTimeout(() => setLoading(true), delay);
        });

        const stopLoading = () => {
            clearTimer();
            setLoading(false);
        };

        const removeFinish = router.on('finish', stopLoading);
        const removeCancel = router.on('cancel', stopLoading);
        const removeError = router.on('error', stopLoading);

        return () => {
            clearTimer();
            removeStart();
            removeFinish();
            removeCancel();
            removeError();
        };
    }, [delay]);

    return loading;
}

export function ShellPageSkeleton() {
    return (
        <div className="space-y-6">
            <div className="grid gap-5 md:grid-cols-4">
                {Array.from({ length: 4 }).map((_, index) => (
                    <StatCardSkeleton key={index} />
                ))}
            </div>
            <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
                <PanelSkeleton rows={7} />
                <div className="space-y-5">
                    <PanelSkeleton rows={3} />
                    <PanelSkeleton rows={5} />
                </div>
            </div>
        </div>
    );
}

export function PublicPageSkeleton({ variant = 'default' }: { variant?: 'default' | 'catalog' | 'detail' | 'centered' }) {
    if (variant === 'centered') {
        return (
            <main className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-5xl flex-col items-center justify-center px-4 pt-32 pb-16 md:px-10">
                <PanelSkeleton className="w-full max-w-2xl" rows={6} />
            </main>
        );
    }

    if (variant === 'catalog') {
        return (
            <main className="mx-auto max-w-7xl px-4 pt-28 pb-16 md:px-10">
                <Skeleton className="h-4 w-44 rounded-full" />
                <Skeleton className="mt-5 h-12 w-full max-w-xl" />
                <Skeleton className="mt-4 h-6 w-full max-w-3xl" />
                <div className="mt-10 grid gap-6 lg:grid-cols-[280px_1fr]">
                    <PanelSkeleton rows={6} />
                    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                        {Array.from({ length: 6 }).map((_, index) => (
                            <CourseCardSkeleton key={index} />
                        ))}
                    </div>
                </div>
            </main>
        );
    }

    if (variant === 'detail') {
        return (
            <main className="mx-auto max-w-7xl px-4 pt-28 pb-16 md:px-10">
                <Skeleton className="h-4 w-72" />
                <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_360px]">
                    <PanelSkeleton rows={8} />
                    <PanelSkeleton rows={5} />
                </div>
            </main>
        );
    }

    return (
        <main className="mx-auto max-w-7xl px-4 py-16 md:px-10">
            <div className="grid items-center gap-10 lg:grid-cols-2">
                <div className="space-y-5">
                    <Skeleton className="h-8 w-72 rounded-full" />
                    <Skeleton className="h-16 w-full max-w-xl" />
                    <Skeleton className="h-16 w-4/5 max-w-lg" />
                    <Skeleton className="h-24 w-full max-w-2xl" />
                    <div className="flex gap-4">
                        <Skeleton className="h-12 w-36 rounded-xl" />
                        <Skeleton className="h-12 w-36 rounded-xl" />
                    </div>
                </div>
                <Skeleton className="aspect-square rounded-[2rem] md:aspect-[4/3]" />
            </div>
            <div className="mt-16 grid gap-6 md:grid-cols-3">
                {Array.from({ length: 3 }).map((_, index) => (
                    <CourseCardSkeleton key={index} />
                ))}
            </div>
        </main>
    );
}

export function AuthPageSkeleton() {
    return (
        <div className="w-full max-w-sm">
            <div className="flex flex-col gap-8">
                <div className="flex flex-col items-center gap-4">
                    <BrandLogo className="h-12 opacity-70" />
                    <div className="w-full space-y-2 text-center">
                        <Skeleton className="mx-auto h-6 w-56" />
                        <Skeleton className="mx-auto h-4 w-72 max-w-full" />
                    </div>
                </div>
                <div className="space-y-5">
                    <Skeleton className="h-11 w-full rounded-lg" />
                    <Skeleton className="h-11 w-full rounded-lg" />
                    <Skeleton className="h-11 w-full rounded-lg" />
                    <Skeleton className="h-11 w-full rounded-lg" />
                </div>
            </div>
        </div>
    );
}

export function AuthLoginSkeleton() {
    return (
        <div className="min-h-screen bg-[#FAF8FF] text-slate-950">
            <header className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-10">
                <BrandLogo className="h-10 opacity-70" />
                <Skeleton className="h-10 w-28 rounded-lg" />
            </header>
            <main className="mx-auto flex max-w-7xl justify-center px-4 py-8 md:px-10 lg:min-h-[calc(100vh-4rem)] lg:items-center">
                <PanelSkeleton className="w-full max-w-md" rows={7} />
            </main>
        </div>
    );
}

export function PanelSkeleton({ rows = 5, className = '' }: { rows?: number; className?: string }) {
    return (
        <section className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}>
            <div className="mb-5 flex items-center justify-between">
                <Skeleton className="h-5 w-44" />
                <Skeleton className="h-9 w-24 rounded-lg" />
            </div>
            <div className="space-y-4">
                {Array.from({ length: rows }).map((_, index) => (
                    <div key={index} className="space-y-2">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-3/4" />
                    </div>
                ))}
            </div>
        </section>
    );
}

export function StatCardSkeleton() {
    return (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="size-5 rounded-md" />
            </div>
            <Skeleton className="mt-5 h-8 w-20" />
        </div>
    );
}

export function CourseCardSkeleton() {
    return (
        <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <Skeleton className="h-48 w-full rounded-none" />
            <div className="space-y-4 p-6">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <div className="flex items-center justify-between border-t border-slate-200 pt-4">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-16" />
                </div>
            </div>
        </article>
    );
}

export function TableSkeleton({ rows = 6, columns = 5 }: { rows?: number; columns?: number }) {
    return (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="grid gap-4 border-b border-slate-200 p-4" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
                {Array.from({ length: columns }).map((_, index) => (
                    <Skeleton key={index} className="h-4 w-20" />
                ))}
            </div>
            {Array.from({ length: rows }).map((_, rowIndex) => (
                <div
                    key={rowIndex}
                    className="grid gap-4 border-b border-slate-100 p-4 last:border-b-0"
                    style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
                >
                    {Array.from({ length: columns }).map((_, columnIndex) => (
                        <Skeleton key={columnIndex} className="h-4 w-full" />
                    ))}
                </div>
            ))}
        </div>
    );
}
