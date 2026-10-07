import { create } from 'zustand';
import type { ParsedUrl, QueryParam, TabLoadState } from '@/types';
import { createParam, isEditableUrl, parseUrl, serializeUrl, serializeUrlForNav } from '@/lib/urlParser';
import { detectParamType, flipBoolean } from '@/lib/paramTypes';

interface AppState {
  /** Current tab loading state. Drives which screen we render. */
  tabState: TabLoadState;

  /** The parsed URL snapshot used by Reset to return to the original. */
  initialParsed: ParsedUrl | null;

  /** Current editable parsed URL — what the user sees & edits. */
  currentParsed: ParsedUrl | null;

  /** Latest status message; the popup shows it as a toast, then clears it. */
  announcement: string;

  /** Actions */
  setTabState: (state: TabLoadState) => void;
  loadUrl: (url: string, tabId: number) => void;
  loadUnsupported: (reason: string) => void;
  /** Update currentParsed from a raw URL string (used by the editable URL field). */
  setCurrentUrl: (rawUrl: string) => void;
  updateParamKey: (id: string, key: string) => void;
  updateParamValue: (id: string, value: string) => void;
  toggleBooleanParam: (id: string) => void;
  removeParam: (id: string) => void;
  addParam: (key: string, value: string) => void;
  reset: () => void;
  announce: (message: string) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  tabState: { status: 'loading' },
  initialParsed: null,
  currentParsed: null,
  announcement: '',

  setTabState: (tabState) => set({ tabState }),

  loadUrl: (url, tabId) => {
    if (!isEditableUrl(url)) {
      set({
        tabState: { status: 'unsupported', reason: 'Browser-internal pages cannot be edited.', tabId },
      });
      return;
    }
    try {
      const parsed = parseUrl(url);
      set({
        tabState: { status: 'ready', tabId, url },
        initialParsed: parsed,
        // Clone so edits to currentParsed don't mutate the initial snapshot.
        currentParsed: { ...parsed, params: parsed.params.map((p) => ({ ...p })) },
      });
    } catch (err) {
      set({
        tabState: {
          status: 'error',
          message: err instanceof Error ? err.message : 'Invalid URL',
        },
      });
    }
  },

  loadUnsupported: (reason) => set({ tabState: { status: 'unsupported', reason } }),

  setCurrentUrl: (rawUrl) => {
    try {
      const parsed = parseUrl(rawUrl);
      // Re-parsing generates fresh ids; adopt the previous id where the row
      // (same position, same key) clearly survived the edit. Otherwise every
      // keystroke in the URL field would remount all param rows.
      const prev = get().currentParsed?.params ?? [];
      const params = parsed.params.map((p, i) =>
        prev[i] && prev[i].key === p.key ? { ...p, id: prev[i].id } : p,
      );
      set({ currentParsed: { ...parsed, params } });
    } catch {
      // Invalid URL while the user is still typing — ignore silently.
    }
  },

  updateParamKey: (id, key) => {
    const state = get();
    if (!state.currentParsed) return;
    set({
      currentParsed: {
        ...state.currentParsed,
        params: state.currentParsed.params.map((p) => (p.id === id ? { ...p, key } : p)),
      },
    });
  },

  updateParamValue: (id, value) => {
    const state = get();
    if (!state.currentParsed) return;
    set({
      currentParsed: {
        ...state.currentParsed,
        params: state.currentParsed.params.map((p) =>
          p.id === id ? { ...p, value, type: detectParamType(value) } : p,
        ),
      },
    });
  },

  toggleBooleanParam: (id) => {
    const state = get();
    if (!state.currentParsed) return;
    set({
      currentParsed: {
        ...state.currentParsed,
        params: state.currentParsed.params.map((p) =>
          p.id === id ? { ...p, value: flipBoolean(p.value) } : p,
        ),
      },
    });
  },

  removeParam: (id) => {
    const state = get();
    if (!state.currentParsed) return;
    const param = state.currentParsed.params.find((p) => p.id === id);
    set({
      currentParsed: {
        ...state.currentParsed,
        params: state.currentParsed.params.filter((p) => p.id !== id),
      },
      announcement: param ? `Removed parameter ${param.key || '(empty)'}.` : 'Parameter removed.',
    });
  },

  addParam: (key, value) => {
    const state = get();
    if (!state.currentParsed) return;
    const newParam: QueryParam = createParam(key, value, detectParamType(value));
    set({
      currentParsed: {
        ...state.currentParsed,
        params: [...state.currentParsed.params, newParam],
      },
      // No announcement: the new row is the visible feedback, and the UI
      // announces "Added {key}" through its hidden live region (docs/redesign §7.3).
    });
  },

  reset: () => {
    const { initialParsed } = get();
    if (!initialParsed) return;
    set({
      currentParsed: {
        ...initialParsed,
        params: initialParsed.params.map((p) => ({ ...p })),
      },
      announcement: 'Reset to the original URL.',
    });
  },

  announce: (message) => set({ announcement: message }),
}));

/** Selector: human-readable URL for display in the preview field. */
export function selectCurrentUrl(state: AppState): string {
  return state.currentParsed ? serializeUrl(state.currentParsed) : '';
}

/** Selector: fully percent-encoded URL for Apply / Copy actions. */
export function selectNavUrl(state: AppState): string {
  return state.currentParsed ? serializeUrlForNav(state.currentParsed) : '';
}
