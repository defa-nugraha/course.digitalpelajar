import { useEffect, useState } from 'react';

export type Appearance = 'light' | 'dark' | 'system';

const applyTheme = (appearance: Appearance) => {
    if (typeof document === 'undefined') return;

    const shouldUseDark = appearance === 'dark' || (appearance === 'system' && Boolean(mediaQuery?.matches));
    document.documentElement.classList.toggle('dark', shouldUseDark);
};

const mediaQuery = typeof window === 'undefined' ? null : window.matchMedia('(prefers-color-scheme: dark)');

const handleSystemThemeChange = () => {
    if (typeof window === 'undefined') return;

    const appearance = (localStorage.getItem('appearance') as Appearance | null) ?? 'system';
    applyTheme(appearance);
};

export function initializeTheme() {
    if (typeof window === 'undefined') return;

    const appearance = (localStorage.getItem('appearance') as Appearance | null) ?? 'system';
    applyTheme(appearance);

    // Add the event listener for system theme changes...
    mediaQuery?.addEventListener('change', handleSystemThemeChange);
}

export function useAppearance() {
    const [appearance, setAppearance] = useState<Appearance>(() =>
        typeof window === 'undefined' ? 'system' : ((localStorage.getItem('appearance') as Appearance | null) ?? 'system'),
    );

    const updateAppearance = (nextAppearance: Appearance) => {
        setAppearance(nextAppearance);
        if (typeof window !== 'undefined') {
            localStorage.setItem('appearance', nextAppearance);
        }
        applyTheme(nextAppearance);
    };

    useEffect(() => {
        applyTheme(appearance);

        return () => mediaQuery?.removeEventListener('change', handleSystemThemeChange);
    }, [appearance]);

    return { appearance, updateAppearance };
}
