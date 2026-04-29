import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useClipboard } from '@/hooks/useClipboard';

describe('useClipboard', () => {
  it('starts with copied=false', () => {
    const { result } = renderHook(() => useClipboard());
    expect(result.current.copied).toBe(false);
  });

  it('returns true and sets copied=true on successful copy', async () => {
    const { result } = renderHook(() => useClipboard(100_000));
    let success: boolean;
    await act(async () => {
      success = await result.current.copy('hello');
    });
    expect(success!).toBe(true);
    expect(result.current.copied).toBe(true);
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('hello');
  });

  it('resets copied to false after the timeout', async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useClipboard(500));
    await act(async () => {
      await result.current.copy('text');
    });
    expect(result.current.copied).toBe(true);
    await act(async () => {
      vi.advanceTimersByTime(500);
    });
    expect(result.current.copied).toBe(false);
    vi.useRealTimers();
  });

  it('returns false and keeps copied=false when clipboard write fails', async () => {
    vi.mocked(navigator.clipboard.writeText).mockRejectedValueOnce(new Error('denied'));
    const { result } = renderHook(() => useClipboard());
    let success: boolean;
    await act(async () => {
      success = await result.current.copy('anything');
    });
    expect(success!).toBe(false);
    expect(result.current.copied).toBe(false);
  });

  it('resets the timer if copy is called twice quickly', async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useClipboard(500));
    await act(async () => {
      await result.current.copy('first');
    });
    await act(async () => {
      vi.advanceTimersByTime(400);
    });
    // Second copy before timeout fires — should restart timer.
    await act(async () => {
      await result.current.copy('second');
    });
    expect(result.current.copied).toBe(true);
    await act(async () => {
      vi.advanceTimersByTime(400);
    });
    // Only 400 ms into the new 500 ms window — still copied.
    expect(result.current.copied).toBe(true);
    await act(async () => {
      vi.advanceTimersByTime(100);
    });
    expect(result.current.copied).toBe(false);
    vi.useRealTimers();
  });
});
