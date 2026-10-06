import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useTheme } from '@/hooks/useTheme';

function mockSystemDark(matches: boolean) {
  vi.mocked(window.matchMedia).mockImplementation((query: string) => ({
    matches,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

afterEach(() => {
  const root = document.documentElement;
  root.removeAttribute('data-theme');
  root.classList.remove('dark');
});

describe('useTheme', () => {
  it('sets data-theme and the coss .dark class for a dark system theme', () => {
    mockSystemDark(true);
    const { result } = renderHook(() => useTheme());

    expect(result.current).toBe('dark');
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    expect(document.documentElement).toHaveClass('dark');
  });

  it('leaves the .dark class off for a light system theme', () => {
    mockSystemDark(false);
    const { result } = renderHook(() => useTheme());

    expect(result.current).toBe('light');
    expect(document.documentElement).toHaveAttribute('data-theme', 'light');
    expect(document.documentElement).not.toHaveClass('dark');
  });
});
