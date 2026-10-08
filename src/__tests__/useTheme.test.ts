import { describe, it, expect, vi, afterEach } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useTheme, THEME_MIRROR_KEY } from '@/hooks/useTheme';

function mockSystemDark(matches: boolean) {
  const addEventListener = vi.fn();
  vi.mocked(window.matchMedia).mockImplementation((query: string) => ({
    matches,
    media: query,
    onchange: null,
    addEventListener,
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
  return addEventListener;
}

afterEach(() => {
  const root = document.documentElement;
  root.removeAttribute('data-theme');
  root.classList.remove('dark');
  root.style.colorScheme = '';
  localStorage.clear();
});

describe('useTheme', () => {
  it("follows the OS while the preference is 'system'", () => {
    const listen = mockSystemDark(true);
    const { result } = renderHook(() => useTheme());

    expect(result.current.preference).toBe('system');
    expect(result.current.resolved).toBe('dark');
    expect(listen).toHaveBeenCalledWith('change', expect.any(Function));
  });

  it('applies the coss .dark class, color-scheme and the legacy data-theme', () => {
    mockSystemDark(true);
    renderHook(() => useTheme());

    const root = document.documentElement;
    expect(root).toHaveClass('dark');
    expect(root.style.colorScheme).toBe('dark');
    expect(root).toHaveAttribute('data-theme', 'dark');
  });

  it('ignores the OS once a scheme is chosen, and stops listening to it', async () => {
    mockSystemDark(true);
    const { result } = renderHook(() => useTheme());

    const listen = mockSystemDark(true);
    act(() => result.current.setPreference('light'));

    expect(result.current.resolved).toBe('light');
    expect(document.documentElement).not.toHaveClass('dark');
    expect(listen).not.toHaveBeenCalled();
  });

  it('persists the preference and mirrors it for the boot script', async () => {
    mockSystemDark(false);
    const { result } = renderHook(() => useTheme());

    act(() => result.current.setPreference('dark'));

    expect(localStorage.getItem(THEME_MIRROR_KEY)).toBe('dark');
    await waitFor(() =>
      expect(chrome.storage.local.set).toHaveBeenCalledWith({ themePreference: 'dark' }),
    );
  });

  it('starts from the mirror, so the first render already has the right scheme', () => {
    mockSystemDark(false);
    localStorage.setItem(THEME_MIRROR_KEY, 'dark');
    const { result } = renderHook(() => useTheme());

    expect(result.current.resolved).toBe('dark');
  });
});
