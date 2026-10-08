import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Kbd } from '@/components/ui/kbd';
import { ariaShortcut, shortcutLabel } from '@/lib/platform';

interface ActionBarProps {
  onApply: () => void;
  onReset: () => void;
  onCopy: () => void;
  onSave: () => void;
  applyDisabled?: boolean;
  copied?: boolean;
}

/**
 * Footer action bar (docs/redesign §6.1):
 *   [Apply ⌘↵] [Reset] ................................. [Copy] [Save]
 *
 * It also publishes its height as --action-bar-height, so toasts can sit 8px
 * above it (§5.3).
 */
export function ActionBar({
  onApply,
  onReset,
  onCopy,
  onSave,
  applyDisabled = false,
  copied = false,
}: ActionBarProps) {
  const ref = useActionBarHeight();

  return (
    <footer ref={ref} className="flex flex-none items-center gap-2 border-t px-4 py-3">
      <Button onClick={onApply} disabled={applyDisabled} aria-keyshortcuts={ariaShortcut('Enter')}>
        Apply
        {/* Hidden from assistive tech: aria-keyshortcuts already names the shortcut. */}
        <Kbd aria-hidden="true" className="bg-primary-foreground/12 text-primary-foreground">
          {shortcutLabel('↵')}
        </Kbd>
      </Button>
      <Button variant="ghost" onClick={onReset}>
        Reset
      </Button>

      <span aria-hidden="true" className="flex-1" />

      <Button variant="outline" onClick={onCopy}>
        {copied ? 'Copied' : 'Copy'}
      </Button>
      <Button variant="outline" onClick={onSave}>
        Save
      </Button>
    </footer>
  );
}

function useActionBarHeight() {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const root = document.documentElement;
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return;
      const height = entry.borderBoxSize[0]?.blockSize ?? entry.contentRect.height;
      root.style.setProperty('--action-bar-height', `${Math.ceil(height)}px`);
    });
    observer.observe(el);
    return () => {
      observer.disconnect();
      root.style.removeProperty('--action-bar-height');
    };
  }, []);

  return ref;
}
