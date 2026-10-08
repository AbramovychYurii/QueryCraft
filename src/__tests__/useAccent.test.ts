import { describe, it, expect, afterEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useAccent, ACCENT_MIRROR_KEY } from '@/hooks/useAccent';
import { adjustForContrast, contrastRatio } from '@/lib/contrast';

const VIOLET = '#9575e0';
const root = document.documentElement;

afterEach(() => {
  root.removeAttribute('style');
  localStorage.clear();
});

describe('useAccent', () => {
  it('writes --primary, --primary-foreground and --key-foreground', () => {
    const { result } = renderHook(() => useAccent('light'));

    act(() => result.current.setAccent(VIOLET));

    expect(root.style.getPropertyValue('--primary')).toBe(VIOLET);
    expect(root.style.getPropertyValue('--primary-foreground')).toBe('#0a0a0a');
    const key = root.style.getPropertyValue('--key-foreground');
    expect(contrastRatio(key, '#ffffff')).toBeGreaterThanOrEqual(4.5);
  });

  it('never drives the focus ring', () => {
    const { result } = renderHook(() => useAccent('light'));
    act(() => result.current.setAccent(VIOLET));
    expect(root.style.getPropertyValue('--ring')).toBe('');
  });

  it('computes --key-foreground against the dark panel #161616', () => {
    const { result } = renderHook(() => useAccent('dark'));

    act(() => result.current.setAccent(VIOLET));

    expect(root.style.getPropertyValue('--key-foreground')).toBe(
      adjustForContrast(VIOLET, '#161616'),
    );
  });

  it('removes all three for Mono and clears the mirror', () => {
    const { result } = renderHook(() => useAccent('light'));
    act(() => result.current.setAccent(VIOLET));
    expect(localStorage.getItem(ACCENT_MIRROR_KEY)).not.toBeNull();

    act(() => result.current.setAccent(null));

    for (const v of ['--primary', '--primary-foreground', '--key-foreground']) {
      expect(root.style.getPropertyValue(v)).toBe('');
    }
    expect(localStorage.getItem(ACCENT_MIRROR_KEY)).toBeNull();
  });

  it('starts from the mirror, keeping what the boot script applied before first paint', () => {
    localStorage.setItem(ACCENT_MIRROR_KEY, JSON.stringify({ hex: VIOLET }));
    root.style.setProperty('--primary', VIOLET);

    const { result } = renderHook(() => useAccent('light'));

    expect(result.current.accent).toBe(VIOLET);
    expect(root.style.getPropertyValue('--primary')).toBe(VIOLET);
  });

  it('mirrors both themes’ key colour for the boot script', () => {
    const { result } = renderHook(() => useAccent('light'));
    act(() => result.current.setAccent(VIOLET));

    const mirror = JSON.parse(localStorage.getItem(ACCENT_MIRROR_KEY)!);
    expect(mirror.primary).toBe(VIOLET);
    expect(mirror.keyForeground.dark).toBe(adjustForContrast(VIOLET, '#161616'));
    expect(mirror.keyForeground.light).toBe(adjustForContrast(VIOLET, '#ffffff'));
  });
});
