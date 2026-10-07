/**
 * Shortcut labels follow the platform. useKeyboardShortcuts accepts Cmd or
 * Ctrl, so the label only has to name the key the user actually has.
 */
const isApple = typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.platform);

/** Visible label for a Cmd/Ctrl shortcut: "⌘↵" on Apple, "Ctrl+↵" elsewhere. */
export function shortcutLabel(key: string): string {
  return isApple ? `⌘${key}` : `Ctrl+${key}`;
}

/** Value for aria-keyshortcuts, which names the modifier "Meta" or "Control". */
export function ariaShortcut(key: string): string {
  return `${isApple ? 'Meta' : 'Control'}+${key}`;
}
