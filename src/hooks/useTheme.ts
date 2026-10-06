import { useEffect, useRef, useState } from 'react';

export type ResolvedTheme = 'light' | 'dark';

function resolveSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined' || !window.matchMedia) return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/**
 * Mirrors the OS color scheme onto `data-theme` on <html>.
 *
 * There is deliberately no user-facing theme setting: the popup is a companion
 * to whatever the browser is already doing, so it follows the system and
 * updates live when that changes.
 */
export function useTheme(): ResolvedTheme {
  const [resolved, setResolved] = useState<ResolvedTheme>(resolveSystemTheme);

  useEffect(() => {
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => setResolved(e.matches ? 'dark' : 'light');
    setResolved(mql.matches ? 'dark' : 'light');
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  // Apply to document root, suppressing transitions across the swap so the
  // two palettes don't cross-fade into muddy intermediate colors.
  const isFirstApply = useRef(true);
  useEffect(() => {
    const root = document.documentElement;
    // `data-theme` drives tokens.css (the CSS Modules components), the `dark`
    // class drives coss's dark variant; both stay in step until Phase 7.
    const apply = () => {
      root.setAttribute('data-theme', resolved);
      root.classList.toggle('dark', resolved === 'dark');
    };
    if (isFirstApply.current) {
      isFirstApply.current = false;
      apply();
      return;
    }
    root.setAttribute('data-theme-switching', '');
    apply();
    // Two frames: one for the attribute to take effect, one for the repaint.
    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(() => root.removeAttribute('data-theme-switching'));
    });
    return () => cancelAnimationFrame(raf);
  }, [resolved]);

  return resolved;
}
