import { useCallback, useEffect, useState } from 'react';
import { storage } from '@/lib/storage';
import { isKnownAccent } from '@/lib/accents';
import { adjustForContrast, readableOn, withAlpha } from '@/lib/contrast';
import type { AccentColor } from '@/types';
import type { ResolvedTheme } from './useTheme';

/** The surface accent-coloured text sits on, per theme (coss background). */
const PANEL_BG: Record<ResolvedTheme, string> = {
  light: '#ffffff',
  dark: '#161616',
};

/** Exactly what the accent setting overrides (docs/redesign §4.4). --ring never follows it. */
const ACCENT_VARS = ['--primary', '--primary-foreground', '--key-foreground'] as const;

/**
 * Pre-redesign accent variables, still read by the CSS Modules components
 * until they move to coss; removed with tokens.css in Phase 7. Their text
 * variant keeps the old, lighter dark panel the old surfaces were tuned for.
 */
const LEGACY_VARS = [
  '--color-accent',
  '--color-accent-hover',
  '--color-on-accent',
  '--color-accent-text',
  '--color-accent-soft',
] as const;
const LEGACY_PANEL_BG: Record<ResolvedTheme, string> = { light: '#ffffff', dark: '#262626' };

/** Synchronous mirror read by public/theme-boot.js before first paint (§4.5). */
export const ACCENT_MIRROR_KEY = 'qc-accent';

/** The three variables for an accent swatch in a theme. */
export function accentVars(
  hex: string,
  theme: ResolvedTheme,
): Record<(typeof ACCENT_VARS)[number], string> {
  return {
    // The exact swatch, so the button and switch match what the user picked.
    '--primary': hex,
    '--primary-foreground': readableOn(hex),
    // Text on the panel is darkened or lightened just enough to keep 4.5:1.
    '--key-foreground': adjustForContrast(hex, PANEL_BG[theme]),
  };
}

function applyAccent(accent: AccentColor, theme: ResolvedTheme): void {
  const root = document.documentElement;
  if (!accent) {
    for (const v of [...ACCENT_VARS, ...LEGACY_VARS]) root.style.removeProperty(v);
    return;
  }
  for (const [name, value] of Object.entries(accentVars(accent, theme))) {
    root.style.setProperty(name, value);
  }
  root.style.setProperty('--color-accent', accent);
  root.style.setProperty(
    '--color-accent-hover',
    adjustForContrast(accent, LEGACY_PANEL_BG[theme], 3),
  );
  root.style.setProperty('--color-on-accent', readableOn(accent));
  root.style.setProperty('--color-accent-text', adjustForContrast(accent, LEGACY_PANEL_BG[theme]));
  root.style.setProperty('--color-accent-soft', withAlpha(accent, 0.15));
}

function readMirror(): AccentColor {
  try {
    const hex = JSON.parse(localStorage.getItem(ACCENT_MIRROR_KEY) ?? 'null')?.hex;
    return typeof hex === 'string' && isKnownAccent(hex) ? hex : null;
  } catch {
    return null;
  }
}

function writeMirror(accent: AccentColor): void {
  try {
    if (!accent) {
      localStorage.removeItem(ACCENT_MIRROR_KEY);
      return;
    }
    const light = accentVars(accent, 'light');
    localStorage.setItem(
      ACCENT_MIRROR_KEY,
      JSON.stringify({
        hex: accent,
        primary: light['--primary'],
        primaryForeground: light['--primary-foreground'],
        keyForeground: {
          light: light['--key-foreground'],
          dark: accentVars(accent, 'dark')['--key-foreground'],
        },
      }),
    );
  } catch {
    // Storage blocked: the boot script shows mono until the hook applies the accent.
  }
}

/**
 * Accent color state, persisted in chrome.storage and projected onto CSS
 * custom properties so components stay declarative — no component branches on
 * whether an accent is set.
 */
export function useAccent(theme: ResolvedTheme): {
  accent: AccentColor;
  setAccent: (next: AccentColor) => void;
} {
  // Start from the mirror, so the first render keeps what theme-boot.js already
  // applied instead of stripping it until chrome.storage answers (§4.5).
  const [accent, setAccentState] = useState<AccentColor>(readMirror);

  // Load once. On storage failure keep monochrome rather than surfacing an
  // unhandled rejection.
  useEffect(() => {
    let cancelled = false;
    storage.getAccent().then(
      (stored) => {
        if (cancelled) return;
        // Guard against a value left by an older build or hand-edited storage.
        const valid = typeof stored === 'string' && isKnownAccent(stored) ? stored : null;
        setAccentState(valid);
        writeMirror(valid);
      },
      () => undefined,
    );
    return () => {
      cancelled = true;
    };
  }, []);

  // Re-apply on accent *or* theme change: the readable text variant depends on
  // which panel background it will sit on.
  useEffect(() => {
    applyAccent(accent, theme);
  }, [accent, theme]);

  const setAccent = useCallback((next: AccentColor) => {
    setAccentState(next);
    writeMirror(next);
    void storage.setAccent(next);
  }, []);

  return { accent, setAccent };
}
