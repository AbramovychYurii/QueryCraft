import { describe, it, expect, vi, afterEach } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { LiveRegion, announce } from '@/components/LiveRegion';

afterEach(() => {
  vi.useRealTimers();
});

describe('LiveRegion', () => {
  it('announces a message in a polite, visually hidden status region', () => {
    vi.useFakeTimers();
    render(<LiveRegion />);

    act(() => announce('Added utm_source'));
    act(() => vi.advanceTimersByTime(50));

    const region = screen.getByRole('status');
    expect(region).toHaveAttribute('aria-live', 'polite');
    expect(region).toHaveClass('sr-only');
    expect(region).toHaveTextContent('Added utm_source');
  });

  it('re-announces the same message: cleared first, then set again', () => {
    vi.useFakeTimers();
    render(<LiveRegion />);
    act(() => announce('3 of 7 parameters'));
    act(() => vi.advanceTimersByTime(50));

    act(() => announce('3 of 7 parameters'));
    expect(screen.getByRole('status')).toHaveTextContent('');

    act(() => vi.advanceTimersByTime(50));
    expect(screen.getByRole('status')).toHaveTextContent('3 of 7 parameters');
  });
});
