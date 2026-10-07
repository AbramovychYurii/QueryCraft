import { useCallback, useEffect, useRef, useState } from 'react';
import type { ThemePreference } from '@/types';
import { storage } from '@/lib/storage';

export type ResolvedTheme = 'light' | 'dark';

/**
 * Synchronous mirror of the preference, read by public/theme-boot.js before
 * first paint. chrome.storage stays the source of truth (docs/redesign §4.5).
 */
export const THEME_MIRROR_KEY = 'qc-theme';

const DARK_QUERY = '(prefers-color-scheme: dark)';

function systemTheme(): ResolvedTheme {
  if (typeof window === 'undefined' || !window.matchMedia) return 'light';
  return window.matchMedia(DARK_QUERY).matches ? 'dark' : 'light';
}

function readMirror(): ThemePreference {
  try {
    const value = localStorage.getItem(THEME_MIRROR_KEY);
    return value === 'light' || value === 'dark' ? value : 'system';
  } catch {
    return 'system';
  }
}

function writeMirror(preference: ThemePreference): void {
  try {
    localStorage.setItem(THEME_MIRROR_KEY, preference);
  } catch {
    // Storage blocked: the boot script falls back to the OS, nothing else breaks.
  }
}

/**
 * Theme preference — follow the OS, or force light or dark for QueryCraft only —
 * and the scheme it resolves to, applied to <html> as coss's `.dark` class,
 * `color-scheme`, and the `data-theme` the pre-redesign tokens still read.
 */
export function useTheme(): {
  preference: ThemePreference;
  resolved: ResolvedTheme;
  setPreference: (next: ThemePreference) => void;
} {
  const [preference, setPreferenceState] = useState<ThemePreference>(readMirror);
  const [system, setSystem] = useState<ResolvedTheme>(systemTheme);

  useEffect(() => {
    let cancelled = false;
    storage.getThemePreference().then(
      (stored) => {
        if (cancelled) return;
        setPreferenceState(stored);
        writeMirror(stored);
      },
      () => undefined,
    );
    return () => {
      cancelled = true;
    };
  }, []);

  // Listen to the OS only while it decides the theme.
  useEffect(() => {
    if (preference !== 'system') return;
    const mql = window.matchMedia(DARK_QUERY);
    setSystem(mql.matches ? 'dark' : 'light');
    const handler = (e: MediaQueryListEvent) => setSystem(e.matches ? 'dark' : 'light');
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [preference]);

  const resolved: ResolvedTheme = preference === 'system' ? system : preference;

  // Apply to document root, suppressing transitions across the swap so the
  // two palettes don't cross-fade into muddy intermediate colors.
  const isFirstApply = useRef(true);
  useEffect(() => {
    const root = document.documentElement;
    const apply = () => {
      root.setAttribute('data-theme', resolved);
      root.classList.toggle('dark', resolved === 'dark');
      root.style.colorScheme = resolved;
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

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    writeMirror(next);
    void storage.setThemePreference(next);
  }, []);

  return { preference, resolved, setPreference };
}
