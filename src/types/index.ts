/**
 * Core domain types for QueryCraft.
 */

/** Detected/assigned type of a parameter value — drives which editor control is rendered. */
export type ParamType = 'string' | 'boolean' | 'number' | 'structured';

/**
 * A single query parameter. We keep the `id` stable across edits so React reconciliation
 * and focus management don't trip over reordering (e.g., two params with the same key).
 */
export interface QueryParam {
  id: string;
  key: string;
  value: string;
  type: ParamType;
}

/**
 * A parsed URL split into the static base and editable parameters.
 * Fragment (`#hash`) is preserved verbatim and re-appended on serialization.
 *
 * When `hashQuery` is true the params come from the hash's query string
 * (hash-router pattern: https://app.com/#/route?param=value).
 * In that case `fragment` holds only the hash path (e.g. "#/route"),
 * serialization appends params after a `?` inside the fragment, and any real
 * (pre-`#`) query string is kept verbatim as part of `base` so it isn't lost.
 */
export interface ParsedUrl {
  base: string; // URL without query/fragment, e.g. "https://example.com/api/v1/search"
  params: QueryParam[];
  fragment: string; // includes leading "#" or empty string
  hashQuery: boolean; // true when params live inside the hash fragment
}

export interface SavedLink {
  id: string;
  url: string;
  label?: string;
  createdAt: number;
  groupId: string;
}

export interface Group {
  id: string;
  name: string;
  createdAt: number;
}

/**
 * Chosen accent color as a hex string, or `null` for the monochrome default.
 */
export type AccentColor = string | null;

/** Theme setting: follow the OS, or force one scheme for QueryCraft only. */
export type ThemePreference = 'system' | 'light' | 'dark';

/** Special state when the active tab's URL is a browser-internal page we can't edit. */
export type TabLoadState =
  | { status: 'loading' }
  | { status: 'ready'; tabId: number; url: string }
  | { status: 'unsupported'; reason: string; tabId?: number }
  | { status: 'error'; message: string };
