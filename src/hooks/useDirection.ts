import { useCallback, useEffect, useState } from 'react';
import type { TextDirection } from '@/types';
import { storage } from '@/lib/storage';

/** Synchronous mirror read by public/theme-boot.js before first paint (§4.5). */
export const DIRECTION_MIRROR_KEY = 'qc-dir';

function readMirror(): TextDirection {
  try {
    return localStorage.getItem(DIRECTION_MIRROR_KEY) === 'rtl' ? 'rtl' : 'ltr';
  } catch {
    return 'ltr';
  }
}

function writeMirror(direction: TextDirection): void {
  try {
    localStorage.setItem(DIRECTION_MIRROR_KEY, direction);
  } catch {
    // Storage blocked: the boot script falls back to LTR, nothing else breaks.
  }
}

/** Layout direction setting, applied to <html> as `dir`. */
export function useDirection(): {
  direction: TextDirection;
  setDirection: (next: TextDirection) => void;
} {
  const [direction, setDirectionState] = useState<TextDirection>(readMirror);

  useEffect(() => {
    let cancelled = false;
    storage.getDirection().then(
      (stored) => {
        if (cancelled) return;
        setDirectionState(stored);
        writeMirror(stored);
      },
      () => undefined,
    );
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    document.documentElement.dir = direction;
  }, [direction]);

  const setDirection = useCallback((next: TextDirection) => {
    setDirectionState(next);
    writeMirror(next);
    void storage.setDirection(next);
  }, []);

  return { direction, setDirection };
}
