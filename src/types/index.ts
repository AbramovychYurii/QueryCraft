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
 * In that case `fragment` holds only the hash path (e.g. "#/route") and
 * serialization appends params after a `?` inside the fragment.
 */
export interface ParsedUrl {
  base: string; // origin + pathname, e.g. "https://example.com/api/v1/search"
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

export type ThemePreference = 'light' | 'dark' | 'system';

/** A single filter predicate token: (field-operator-value) */
export interface DslPredicate {
  kind: 'predicate';
  field: string;
  operator: string;
  value: string;
}

/** A logical junction between predicates: AND | OR */
export interface DslLogic {
  kind: 'logic';
  op: 'AND' | 'OR';
}

export type DslToken = DslPredicate | DslLogic;

/** A user-defined (or built-in) preset that maps param key patterns to a DSL editor. */
export interface DslPreset {
  id: string;
  name: string;
  /** Glob-style patterns: "*-filters", "events-filters", "q" */
  paramMatchers: string[];
  isBuiltIn?: boolean;
}

/** Special state when the active tab's URL is a browser-internal page we can't edit. */
export type TabLoadState =
  | { status: 'loading' }
  | { status: 'ready'; tabId: number; url: string }
  | { status: 'unsupported'; reason: string; tabId?: number }
  | { status: 'error'; message: string };
