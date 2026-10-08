/**
 * Accent palette from the design handoff. `null` accent means monochrome —
 * the base look, where nothing is tinted.
 */
export interface Accent {
  name: string;
  hex: string;
}

export const ACCENTS: readonly Accent[] = [
  { name: 'Blue', hex: '#6690e0' },
  { name: 'Cyan', hex: '#4fa8c9' },
  { name: 'Teal', hex: '#4fa98e' },
  { name: 'Green', hex: '#4f9d6e' },
  { name: 'Lime', hex: '#8db84f' },
  { name: 'Amber', hex: '#c99a3d' },
  { name: 'Orange', hex: '#d9824f' },
  { name: 'Red', hex: '#d9636b' },
  { name: 'Pink', hex: '#d9709c' },
  // Between Pink and Violet on the hue wheel, at their lightness and chroma.
  // With Mono first, 12 swatches fill the Settings grid's two rows of six.
  { name: 'Fuchsia', hex: '#bf6fc3' },
  { name: 'Violet', hex: '#9575e0' },
] as const;

/** True when `hex` is one of the known accents — guards values read from storage. */
export function isKnownAccent(hex: string): boolean {
  return ACCENTS.some((a) => a.hex === hex.toLowerCase());
}
