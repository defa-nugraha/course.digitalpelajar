import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import {
    CoachStep,
    ONBOARDING_AUTO_INTERVAL_MS,
    ONBOARDING_VERSION,
    WalkthroughSlide,
    resolveAppRole,
    walkthroughConfigForRole,
} from '@/lib/walkthrough-data';
import { Award, BookOpen, CalendarDays, ClipboardCheck, GraduationCap, LayoutDashboard, LucideIcon, Package, PanelLeft, School } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type HelpMode = 'menu' | 'slides' | 'coach' | 'both';
type AutoMode = 'auto' | 'manual';

interface UserIdentity {
    id?: number;
    role?: string | null;
}

interface WalkthroughManagerProps {
    user?: UserIdentity | null;
    currentPath: string;
    enabled?: boolean;
}

interface TargetRect {
    top: number;
    left: number;
    width: number;
    height: number;
}

const iconMap: Record<WalkthroughSlide['icon'], LucideIcon> = {
    dashboard: LayoutDashboard,
    learning: GraduationCap,
    builder: PanelLeft,
    calendar: CalendarDays,
    review: ClipboardCheck,
    store: Package,
    certificate: Award,
    profile: BookOpen,
    school: School,
};

export function openWalkthroughGuide(mode: HelpMode = 'menu') {
    window.dispatchEvent(new CustomEvent('walkthrough:open', { detail: { mode } }));
}

export function WalkthroughManager({ user, currentPath, enabled = true }: WalkthroughManagerProps) {
    const role = resolveAppRole(user?.role);
    const config = useMemo(() => walkthroughConfigForRole(role), [role]);
    const storageKey = useMemo(() => `walkthrough:v${ONBOARDING_VERSION}:last-seen:${user?.id ?? 'guest'}:${role}`, [role, user?.id]);
    const coachKey = useMemo(() => `coach:v${ONBOARDING_VERSION}:status:${user?.id ?? 'guest'}:${role}`, [role, user?.id]);
    const [helpOpen, setHelpOpen] = useState(false);
    const [slidesOpen, setSlidesOpen] = useState(false);
    const [slideIndex, setSlideIndex] = useState(0);
    const [coachOpen, setCoachOpen] = useState(false);
    const [coachIndex, setCoachIndex] = useState(0);
    const [coachMode, setCoachMode] = useState<AutoMode>('manual');
    const [slideMode, setSlideMode] = useState<AutoMode>('manual');
    const [startCoachAfterSlides, setStartCoachAfterSlides] = useState(false);
    const [targetRect, setTargetRect] = useState<TargetRect | null>(null);
    const touchStartX = useRef<number | null>(null);
    const autoCheckedKey = useRef<string | null>(null);

    const openSlides = useCallback((mode: AutoMode, continueToCoach = false) => {
        setHelpOpen(false);
        setCoachOpen(false);
        setSlideMode(mode);
        setStartCoachAfterSlides(continueToCoach);
        setSlideIndex(0);
        setSlidesOpen(true);
    }, []);

    const openCoach = useCallback((mode: AutoMode) => {
        setHelpOpen(false);
        setSlidesOpen(false);
        setCoachMode(mode);
        setCoachIndex(0);
        setCoachOpen(true);
    }, []);

    const markWalkthroughSeen = useCallback(() => {
        writeStorage(storageKey, String(Date.now()));
    }, [storageKey]);

    const markCoachStatus = useCallback(
        (status: 'completed' | 'skipped') => {
            writeStorage(coachKey, JSON.stringify({ status, at: Date.now(), version: ONBOARDING_VERSION }));
        },
        [coachKey],
    );

    useEffect(() => {
        const handler = (event: Event) => {
            const detail = (event as CustomEvent<{ mode?: HelpMode }>).detail;
            const mode = detail?.mode ?? 'menu';

            if (mode === 'slides') {
                openSlides('manual');
                return;
            }

            if (mode === 'coach') {
                openCoach('manual');
                return;
            }

            if (mode === 'both') {
                openSlides('manual', true);
                return;
            }

            setHelpOpen(true);
        };

        window.addEventListener('walkthrough:open', handler);

        return () => window.removeEventListener('walkthrough:open', handler);
    }, [openCoach, openSlides]);

    useEffect(() => {
        if (!enabled || !user?.id || !isAutoSafePath(currentPath, role)) return;

        const autoKey = `${storageKey}:${currentPath}`;
        if (autoCheckedKey.current === autoKey) return;

        autoCheckedKey.current = autoKey;
        const lastSeen = Number(readStorage(storageKey) ?? 0);

        if (!lastSeen || Date.now() - lastSeen >= ONBOARDING_AUTO_INTERVAL_MS) {
            const timer = window.setTimeout(() => openSlides('auto', true), 700);

            return () => window.clearTimeout(timer);
        }
    }, [currentPath, enabled, openSlides, role, storageKey, user?.id]);

    useEffect(() => {
        if (!coachOpen) return;

        const step = findAvailableCoachStep(config.coachSteps, coachIndex);
        if (!step) {
            setCoachOpen(false);
            markCoachStatus('completed');
            return;
        }

        if (config.coachSteps[coachIndex]?.id !== step.id) {
            setCoachIndex(config.coachSteps.findIndex((item) => item.id === step.id));
            return;
        }

        const element = document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`);
        if (!element) return;

        element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
        const updateRect = () => {
            const rect = element.getBoundingClientRect();
            setTargetRect({
                top: rect.top,
                left: rect.left,
                width: rect.width,
                height: rect.height,
            });
        };
        const timer = window.setTimeout(updateRect, 280);
        window.addEventListener('resize', updateRect);
        window.addEventListener('scroll', updateRect, true);

        return () => {
            window.clearTimeout(timer);
            window.removeEventListener('resize', updateRect);
            window.removeEventListener('scroll', updateRect, true);
        };
    }, [coachIndex, coachOpen, config.coachSteps, markCoachStatus]);

    useEffect(() => {
        const handler = (event: KeyboardEvent) => {
            if (isTypingTarget(event.target)) return;

            if (slidesOpen) {
                if (event.key === 'ArrowRight') nextSlide();
                if (event.key === 'ArrowLeft') previousSlide();
                if (event.key === 'Escape') skipSlides();
            }

            if (coachOpen) {
                if (event.key === 'ArrowRight') nextCoach();
                if (event.key === 'ArrowLeft') previousCoach();
                if (event.key === 'Escape') skipCoach();
            }
        };

        window.addEventListener('keydown', handler);

        return () => window.removeEventListener('keydown', handler);
    });

    const currentSlide = config.slides[slideIndex];
    const currentCoachStep = coachOpen ? findAvailableCoachStep(config.coachSteps, coachIndex) : null;

    const skipSlides = () => {
        setSlidesOpen(false);
        if (slideMode === 'auto') {
            markWalkthroughSeen();
        }
    };

    const finishSlides = () => {
        setSlidesOpen(false);
        if (slideMode === 'auto') {
            markWalkthroughSeen();
            openCoach('auto');
            return;
        }

        if (startCoachAfterSlides) {
            openCoach('manual');
        }
    };

    const nextSlide = () => {
        if (slideIndex >= config.slides.length - 1) {
            finishSlides();
            return;
        }

        setSlideIndex((value) => Math.min(value + 1, config.slides.length - 1));
    };

    const previousSlide = () => setSlideIndex((value) => Math.max(value - 1, 0));

    const skipCoach = () => {
        setCoachOpen(false);
        markCoachStatus('skipped');
    };

    const finishCoach = () => {
        setCoachOpen(false);
        markCoachStatus('completed');
    };

    const nextCoach = () => {
        const nextAvailable = findAvailableCoachStep(config.coachSteps, coachIndex + 1);

        if (!nextAvailable) {
            finishCoach();
            return;
        }

        setCoachIndex(config.coachSteps.findIndex((item) => item.id === nextAvailable.id));
    };

    const previousCoach = () => {
        const previousAvailable = findPreviousAvailableCoachStep(config.coachSteps, coachIndex - 1);
        if (!previousAvailable) return;

        setCoachIndex(config.coachSteps.findIndex((item) => item.id === previousAvailable.id));
    };

    return (
        <>
            <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
                <DialogContent className="sm:max-w-xl">
                    <DialogHeader>
                        <DialogTitle>Panduan Menggunakan</DialogTitle>
                        <DialogDescription>Pilih jenis panduan yang ingin dijalankan ulang untuk role akun Anda.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-3">
                        <GuideOption
                            title="Ulangi Walkthrough"
                            description="Lihat rangkuman fungsi utama aplikasi dalam beberapa slide singkat."
                            onClick={() => openSlides('manual')}
                        />
                        <GuideOption
                            title="Ulangi Tour Interaktif"
                            description="Tampilkan coach marks yang menunjuk langsung menu dan area penting pada UI."
                            onClick={() => openCoach('manual')}
                        />
                        <GuideOption
                            title="Mulai dari Awal"
                            description="Jalankan walkthrough slide, lalu lanjutkan ke tour interaktif."
                            onClick={() => openSlides('manual', true)}
                        />
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={slidesOpen} onOpenChange={(open) => (open ? setSlidesOpen(true) : skipSlides())}>
                <DialogContent
                    className="flex max-h-[calc(100dvh-1rem)] min-h-[min(680px,calc(100dvh-1rem))] grid-rows-none flex-col overflow-hidden p-0 sm:max-w-2xl"
                    onTouchStart={(event) => {
                        touchStartX.current = event.touches[0]?.clientX ?? null;
                    }}
                    onTouchEnd={(event) => {
                        if (touchStartX.current === null) return;

                        const delta = (event.changedTouches[0]?.clientX ?? touchStartX.current) - touchStartX.current;
                        touchStartX.current = null;

                        if (Math.abs(delta) < 48) return;
                        if (delta < 0) nextSlide();
                        if (delta > 0) previousSlide();
                    }}
                >
                    {currentSlide && (
                        <>
                            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                                <div>
                                    <p className="text-xs font-bold tracking-wider text-blue-700 uppercase">Panduan {roleLabel(role)}</p>
                                    <p className="text-sm text-slate-500">
                                        {slideIndex + 1} / {config.slides.length}
                                    </p>
                                </div>
                                {slideIndex < config.slides.length - 1 && (
                                    <Button type="button" variant="ghost" onClick={skipSlides}>
                                        Lewati
                                    </Button>
                                )}
                            </div>
                            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-8 text-center sm:px-10">
                                <SlideVisual slide={currentSlide} />
                                <h2 className="mt-8 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">{currentSlide.title}</h2>
                                <p className="mx-auto mt-4 max-w-lg text-base leading-7 text-slate-600">{currentSlide.description}</p>
                                <div className="mt-8 flex justify-center gap-2" aria-label="Progress walkthrough">
                                    {config.slides.map((slide, index) => (
                                        <button
                                            key={slide.id}
                                            type="button"
                                            aria-label={`Buka slide ${index + 1}`}
                                            onClick={() => setSlideIndex(index)}
                                            className={cn(
                                                'h-2.5 rounded-full transition-all',
                                                index === slideIndex ? 'w-8 bg-blue-600' : 'w-2.5 bg-slate-300',
                                            )}
                                        />
                                    ))}
                                </div>
                            </div>
                            <DialogFooter className="border-t border-slate-200 p-4 sm:p-5">
                                <Button type="button" variant="outline" onClick={previousSlide} disabled={slideIndex === 0}>
                                    Kembali
                                </Button>
                                <Button type="button" onClick={nextSlide}>
                                    {slideIndex === config.slides.length - 1 ? 'Mulai Menggunakan' : 'Selanjutnya'}
                                </Button>
                            </DialogFooter>
                        </>
                    )}
                </DialogContent>
            </Dialog>

            {coachOpen && currentCoachStep && targetRect && (
                <CoachOverlay
                    step={currentCoachStep}
                    stepNumber={coachIndex + 1}
                    totalSteps={config.coachSteps.length}
                    rect={targetRect}
                    mode={coachMode}
                    onPrevious={previousCoach}
                    onNext={nextCoach}
                    onSkip={skipCoach}
                    hasPrevious={Boolean(findPreviousAvailableCoachStep(config.coachSteps, coachIndex - 1))}
                    isLast={!findAvailableCoachStep(config.coachSteps, coachIndex + 1)}
                />
            )}
        </>
    );
}

function GuideOption({ title, description, onClick }: { title: string; description: string; onClick: () => void }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="rounded-2xl border border-slate-200 p-4 text-left transition hover:border-blue-200 hover:bg-blue-50 focus:ring-2 focus:ring-blue-500 focus:outline-none"
        >
            <span className="block font-extrabold text-slate-950">{title}</span>
            <span className="mt-1 block text-sm leading-6 text-slate-600">{description}</span>
        </button>
    );
}

function SlideVisual({ slide }: { slide: WalkthroughSlide }) {
    const Icon = iconMap[slide.icon];

    return (
        <div className="mx-auto flex size-36 items-center justify-center rounded-[2rem] bg-gradient-to-br from-blue-600 to-violet-600 text-white shadow-xl shadow-blue-600/20 sm:size-44">
            <Icon className="size-16 sm:size-20" />
        </div>
    );
}

function CoachOverlay({
    step,
    stepNumber,
    totalSteps,
    rect,
    onPrevious,
    onNext,
    onSkip,
    hasPrevious,
    isLast,
}: {
    step: CoachStep;
    stepNumber: number;
    totalSteps: number;
    rect: TargetRect;
    mode: AutoMode;
    onPrevious: () => void;
    onNext: () => void;
    onSkip: () => void;
    hasPrevious: boolean;
    isLast: boolean;
}) {
    const tooltip = tooltipPosition(rect, step.placement);

    return (
        <div className="pointer-events-none fixed inset-0 z-[70]">
            <div
                className="absolute rounded-2xl border-2 border-blue-400 shadow-[0_0_0_9999px_rgba(15,23,42,0.58),0_0_0_6px_rgba(59,130,246,0.25)] transition-all duration-200"
                style={{
                    top: Math.max(rect.top - 8, 8),
                    left: Math.max(rect.left - 8, 8),
                    width: rect.width + 16,
                    height: rect.height + 16,
                }}
            />
            <section
                role="dialog"
                aria-label={step.title}
                className="pointer-events-auto fixed rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl shadow-slate-950/20 sm:max-w-sm"
                style={tooltip.style}
            >
                <div className="mb-2 flex items-center justify-between gap-3">
                    <p className="text-xs font-bold tracking-wide text-blue-700 uppercase">
                        {stepNumber} / {totalSteps}
                    </p>
                    <button type="button" onClick={onSkip} className="text-xs font-bold text-slate-500 hover:text-slate-950">
                        Lewati
                    </button>
                </div>
                <h3 className="text-base font-extrabold text-slate-950">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{step.description}</p>
                <div className="mt-4 flex items-center justify-between gap-3">
                    <Button type="button" variant="outline" size="sm" onClick={onPrevious} disabled={!hasPrevious}>
                        Kembali
                    </Button>
                    <Button type="button" size="sm" onClick={onNext}>
                        {isLast ? 'Selesai' : 'Lanjut'}
                    </Button>
                </div>
            </section>
        </div>
    );
}

function tooltipPosition(rect: TargetRect, placement: CoachStep['placement']) {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const isMobile = viewportWidth < 640;

    if (isMobile) {
        return {
            style: {
                right: 12,
                bottom: 92,
                left: 12,
            },
        };
    }

    const width = 360;
    const gap = 18;
    const safePlacement = placement ?? 'bottom';
    const centeredLeft = clamp(rect.left + rect.width / 2 - width / 2, 16, viewportWidth - width - 16);
    const belowTop = rect.top + rect.height + gap;
    const aboveTop = rect.top - 220 - gap;
    const rightLeft = rect.left + rect.width + gap;
    const leftLeft = rect.left - width - gap;

    if (safePlacement === 'right' && rightLeft + width < viewportWidth - 16) {
        return { style: { top: clamp(rect.top, 16, viewportHeight - 240), left: rightLeft, width } };
    }

    if (safePlacement === 'left' && leftLeft > 16) {
        return { style: { top: clamp(rect.top, 16, viewportHeight - 240), left: leftLeft, width } };
    }

    if (safePlacement === 'top' && aboveTop > 16) {
        return { style: { top: aboveTop, left: centeredLeft, width } };
    }

    if (belowTop + 220 < viewportHeight - 16) {
        return { style: { top: belowTop, left: centeredLeft, width } };
    }

    return { style: { top: clamp(aboveTop, 16, viewportHeight - 240), left: centeredLeft, width } };
}

function findAvailableCoachStep(steps: CoachStep[], startIndex: number) {
    for (let index = Math.max(0, startIndex); index < steps.length; index += 1) {
        if (document.querySelector(`[data-tour="${steps[index].target}"]`)) {
            return steps[index];
        }
    }

    return null;
}

function findPreviousAvailableCoachStep(steps: CoachStep[], startIndex: number) {
    for (let index = Math.min(startIndex, steps.length - 1); index >= 0; index -= 1) {
        if (document.querySelector(`[data-tour="${steps[index].target}"]`)) {
            return steps[index];
        }
    }

    return null;
}

function isAutoSafePath(path: string, role: string) {
    const current = path.split('?')[0];

    if (role === 'admin') return current === '/admin/dashboard';

    return current === '/dashboard';
}

function readStorage(key: string) {
    try {
        return window.localStorage.getItem(key);
    } catch {
        return null;
    }
}

function writeStorage(key: string, value: string) {
    try {
        window.localStorage.setItem(key, value);
    } catch {
        // localStorage can be disabled in private/browser-restricted contexts.
    }
}

function roleLabel(role: string) {
    const labels: Record<string, string> = {
        admin: 'Admin',
        instructor: 'Pengajar',
        teacher: 'Guru',
        student: 'Siswa',
    };

    return labels[role] ?? 'Aplikasi';
}

function clamp(value: number, min: number, max: number) {
    return Math.max(min, Math.min(value, max));
}

function isTypingTarget(target: EventTarget | null) {
    if (!(target instanceof HTMLElement)) return false;

    return ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable;
}
