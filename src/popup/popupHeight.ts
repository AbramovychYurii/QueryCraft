import { createContext, useContext, useEffect } from 'react';

/** Chrome caps extension popups at 600px tall (docs/redesign §2). */
export const POPUP_MAX_HEIGHT = 600;

/**
 * Chrome sizes the popup from the document box, so html and body are pinned
 * from JS to the app's natural height, capped at the popup maximum (§5.1).
 */
export function syncPopupHeight(target: Element): () => void {
  const observer = new ResizeObserver(([entry]) => {
    if (!entry) return;
    const blockSize = entry.borderBoxSize[0]?.blockSize ?? entry.contentRect.height;
    const height = `${Math.min(POPUP_MAX_HEIGHT, Math.ceil(blockSize))}px`;
    document.documentElement.style.height = height;
    document.body.style.height = height;
  });
  observer.observe(target);
  return () => observer.disconnect();
}

/**
 * An open panel reports its natural height (capped at the popup maximum) so
 * the app holder grows to fit it, and reports null when it closes. Otherwise a
 * panel opened over a short view would be clipped (§5.1).
 */
export const PanelMinHeightContext = createContext<(height: number | null) => void>(() => {});

/**
 * While a sheet is open, report its natural height — every row of the sheet
 * at its own height, with the scrolling panel at its content's full height —
 * so the app holder grows to fit it (§5.1).
 *
 * The sheet is portaled into <body>, so it is found by the `data-qc-sheet`
 * attribute passed to SheetPopup rather than threaded through a ref.
 * `contentKey` re-measures when the sheet swaps its content (list ↔ form).
 */
export function useReportSheetHeight(open: boolean, sheetId: string, contentKey?: unknown): void {
  const setPanelMinHeight = useContext(PanelMinHeightContext);

  // Released only when the sheet closes: dropping it between a list ↔ form
  // swap would let the popup shrink for a frame and grow back.
  useEffect(() => {
    if (!open) return;
    return () => setPanelMinHeight(null);
  }, [open, setPanelMinHeight]);

  useEffect(() => {
    if (!open || typeof ResizeObserver === 'undefined') return;
    let observer: ResizeObserver | null = null;
    // The popup (or its new content) mounts after this render: wait a frame.
    const frame = requestAnimationFrame(() => {
      const popup = document.querySelector<HTMLElement>(`[data-qc-sheet="${sheetId}"]`);
      if (!popup) return;
      const rows = Array.from(popup.children) as HTMLElement[];
      const naturalHeight = (row: HTMLElement) =>
        row.querySelector<HTMLElement>('[data-slot=scroll-area-content]')?.offsetHeight ??
        row.offsetHeight;
      observer = new ResizeObserver(() => {
        const total = rows.reduce((sum, row) => sum + naturalHeight(row), 0);
        setPanelMinHeight(Math.min(POPUP_MAX_HEIGHT, Math.ceil(total)));
      });
      for (const row of rows) {
        observer.observe(row);
        const content = row.querySelector('[data-slot=scroll-area-content]');
        if (content) observer.observe(content);
      }
    });
    return () => {
      cancelAnimationFrame(frame);
      observer?.disconnect();
    };
  }, [open, sheetId, contentKey, setPanelMinHeight]);
}
