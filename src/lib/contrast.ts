/**
 * WCAG contrast helpers.
 *
 * The accent palette is chosen for looks, not for legibility: every swatch
 * fails AA as light-on-color, and most fail as text on a white panel. Rather
 * than ship unreadable labels, derived colors are computed from the chosen
 * accent so both stay at or above the 4.5:1 normal-text threshold.
 */

const NEAR_WHITE = '#fafafa';
const NEAR_BLACK = '#0a0a0a'; // docs/redesign §4.4: every swatch's label resolves to this

type Rgb = [number, number, number];

function toRgb(hex: string): Rgb {
  const n = Number.parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function toHex([r, g, b]: Rgb): string {
  return `#${[r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`;
}

function channelLuminance(value: number): number {
  const c = value / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** Relative luminance per WCAG 2.x. */
export function luminance(hex: string): number {
  const [r, g, b] = toRgb(hex);
  return (
    0.2126 * channelLuminance(r) + 0.7152 * channelLuminance(g) + 0.0722 * channelLuminance(b)
  );
}

/** Contrast ratio between two colors, from 1 (identical) to 21 (black/white). */
export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

function mix(a: string, b: string, t: number): string {
  const [ar, ag, ab] = toRgb(a);
  const [br, bg, bb] = toRgb(b);
  return toHex([ar + (br - ar) * t, ag + (bg - ag) * t, ab + (bb - ab) * t]);
}

/**
 * Pick the label color — near-black or near-white — that reads best on `background`.
 * With this palette that is always near-black; the check is kept general so a
 * darker accent would correctly get a light label.
 */
export function readableOn(background: string): string {
  return contrastRatio(background, NEAR_WHITE) >= contrastRatio(background, NEAR_BLACK)
    ? NEAR_WHITE
    : NEAR_BLACK;
}

/**
 * Darken (on light backgrounds) or lighten (on dark ones) `color` just enough
 * to reach `target` contrast against `background`, preserving its hue.
 */
export function adjustForContrast(color: string, background: string, target = 4.5): string {
  const towards = luminance(background) > 0.5 ? '#000000' : '#ffffff';
  for (let t = 0; t <= 0.9; t += 0.05) {
    const candidate = mix(color, towards, t);
    if (contrastRatio(candidate, background) >= target) return candidate;
  }
  return mix(color, towards, 0.9);
}

/** `color` at the given alpha, as an 8-digit hex the CSS engine accepts. */
export function withAlpha(color: string, alpha: number): string {
  const a = Math.round(Math.max(0, Math.min(1, alpha)) * 255);
  return `${color}${a.toString(16).padStart(2, '0')}`;
}
