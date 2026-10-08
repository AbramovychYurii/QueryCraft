import { describe, it, expect } from 'vitest';
import {
  adjustForContrast,
  contrastRatio,
  luminance,
  readableOn,
  withAlpha,
} from '@/lib/contrast';
import { ACCENTS, isKnownAccent } from '@/lib/accents';

const WHITE_PANEL = '#ffffff';
const DARK_PANEL = '#262626';
const AA_NORMAL = 4.5;

describe('luminance', () => {
  it('is 0 for black and 1 for white', () => {
    expect(luminance('#000000')).toBeCloseTo(0, 5);
    expect(luminance('#ffffff')).toBeCloseTo(1, 5);
  });
});

describe('contrastRatio', () => {
  it('is 21 for black on white', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 1);
  });

  it('is 1 for identical colors', () => {
    expect(contrastRatio('#6690e0', '#6690e0')).toBeCloseTo(1, 5);
  });

  it('is symmetric', () => {
    expect(contrastRatio('#6690e0', '#ffffff')).toBeCloseTo(
      contrastRatio('#ffffff', '#6690e0'),
      5,
    );
  });
});

describe('readableOn', () => {
  it('picks a light label on a dark background', () => {
    expect(contrastRatio(readableOn('#141414'), '#141414')).toBeGreaterThanOrEqual(AA_NORMAL);
  });

  it('picks a dark label on a light background', () => {
    expect(contrastRatio(readableOn('#fafafa'), '#fafafa')).toBeGreaterThanOrEqual(AA_NORMAL);
  });

  it('gives every accent swatch an AA-readable label', () => {
    for (const { name, hex } of ACCENTS) {
      const ratio = contrastRatio(readableOn(hex), hex);
      expect(ratio, `${name} label contrast`).toBeGreaterThanOrEqual(AA_NORMAL);
    }
  });
});

describe('adjustForContrast', () => {
  it('leaves a color alone when it already passes', () => {
    // Black on white is already 21:1 — no adjustment needed.
    expect(adjustForContrast('#000000', WHITE_PANEL)).toBe('#000000');
  });

  it('brings every accent to AA as text on both panels', () => {
    for (const { name, hex } of ACCENTS) {
      const onLight = adjustForContrast(hex, WHITE_PANEL);
      const onDark = adjustForContrast(hex, DARK_PANEL);
      expect(contrastRatio(onLight, WHITE_PANEL), `${name} on light`).toBeGreaterThanOrEqual(
        AA_NORMAL,
      );
      expect(contrastRatio(onDark, DARK_PANEL), `${name} on dark`).toBeGreaterThanOrEqual(
        AA_NORMAL,
      );
    }
  });

  it('darkens toward black on a light background', () => {
    const adjusted = adjustForContrast('#8db84f', WHITE_PANEL);
    expect(luminance(adjusted)).toBeLessThan(luminance('#8db84f'));
  });

  it('lightens toward white on a dark background', () => {
    const adjusted = adjustForContrast('#3a3a3a', DARK_PANEL);
    expect(luminance(adjusted)).toBeGreaterThan(luminance('#3a3a3a'));
  });
});

describe('withAlpha', () => {
  it('appends an 8-digit hex alpha', () => {
    expect(withAlpha('#6690e0', 0.15)).toBe('#6690e026');
  });

  it('clamps out-of-range alpha', () => {
    expect(withAlpha('#6690e0', 2)).toBe('#6690e0ff');
    expect(withAlpha('#6690e0', -1)).toBe('#6690e000');
  });
});

describe('ACCENTS', () => {
  it('has the ten handoff swatches plus Fuchsia', () => {
    expect(ACCENTS).toHaveLength(11);
  });

  it('uses lowercase 6-digit hex so storage comparisons are stable', () => {
    for (const { hex } of ACCENTS) expect(hex).toMatch(/^#[0-9a-f]{6}$/);
  });

  it('has no duplicate colors', () => {
    expect(new Set(ACCENTS.map((a) => a.hex)).size).toBe(ACCENTS.length);
  });
});

describe('isKnownAccent', () => {
  it('accepts a palette color', () => {
    expect(isKnownAccent('#6690e0')).toBe(true);
  });

  it('is case-insensitive', () => {
    expect(isKnownAccent('#6690E0')).toBe(true);
  });

  it('rejects anything else', () => {
    expect(isKnownAccent('#123456')).toBe(false);
    expect(isKnownAccent('red')).toBe(false);
  });
});
