import { useEffect, useState } from 'react';
import { create } from 'zustand';

interface LiveMessage {
  text: string;
  /** Bumped on every announce, so the same text twice is announced twice. */
  id: number;
}

const useLiveMessage = create<LiveMessage>(() => ({ text: '', id: 0 }));

/**
 * Announce through the hidden region. For events with no visible toast only —
 * the toast viewport is a live region of its own (docs/redesign §7.3).
 */
export function announce(text: string): void {
  useLiveMessage.setState((s) => ({ text, id: s.id + 1 }));
}

/**
 * The single visually-hidden polite live region, ported from DSL-beta. Mount
 * it once, at the root.
 *
 * The text is cleared before each announcement so that announcing the same
 * message twice in a row still triggers screen reader output.
 */
export function LiveRegion() {
  const { text: message, id } = useLiveMessage();
  const [text, setText] = useState('');

  useEffect(() => {
    if (!message) return;
    setText('');
    const timer = window.setTimeout(() => setText(message), 50);
    return () => window.clearTimeout(timer);
  }, [message, id]);

  return (
    <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
      {text}
    </div>
  );
}
