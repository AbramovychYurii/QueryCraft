import { describe, it, expect, afterEach } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useDirection, DIRECTION_MIRROR_KEY } from '@/hooks/useDirection';

afterEach(() => {
  document.documentElement.removeAttribute('dir');
  localStorage.clear();
});

describe('useDirection', () => {
  it('is left-to-right by default', () => {
    const { result } = renderHook(() => useDirection());

    expect(result.current.direction).toBe('ltr');
    expect(document.documentElement.dir).toBe('ltr');
  });

  it('applies the setting to <html>, persists it and mirrors it for the boot script', async () => {
    const { result } = renderHook(() => useDirection());

    act(() => result.current.setDirection('rtl'));

    expect(document.documentElement.dir).toBe('rtl');
    expect(localStorage.getItem(DIRECTION_MIRROR_KEY)).toBe('rtl');
    await waitFor(() =>
      expect(chrome.storage.local.set).toHaveBeenCalledWith({ 'qc.direction': 'rtl' }),
    );
  });

  it('starts from the mirror, so the first render already has the right direction', () => {
    localStorage.setItem(DIRECTION_MIRROR_KEY, 'rtl');
    const { result } = renderHook(() => useDirection());

    expect(result.current.direction).toBe('rtl');
  });
});
