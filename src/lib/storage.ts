import type { SavedLink, Group, AccentColor, ThemePreference } from '@/types';

/**
 * Adapter over chrome.storage.local.
 *
 * All chrome.* access is centralized here so tests can mock a single module
 * instead of the global `chrome` object. In the popup context, we use `local`
 * (not `sync`) because saved links + groups may exceed the 100KB sync quota.
 */

const KEYS = {
  savedLinks: 'qc.savedLinks',
  groups: 'qc.groups',
  accent: 'qc.accent',
  themePreference: 'themePreference',
} as const;

const THEME_PREFERENCES: readonly ThemePreference[] = ['system', 'light', 'dark'];

export const DEFAULT_GROUP_ID = 'default';

async function get<T>(key: string, fallback: T): Promise<T> {
  const result = await chrome.storage.local.get(key);
  return (result[key] as T) ?? fallback;
}

async function set<T>(key: string, value: T): Promise<void> {
  await chrome.storage.local.set({ [key]: value });
}

export const storage = {
  async getSavedLinks(): Promise<SavedLink[]> {
    return get<SavedLink[]>(KEYS.savedLinks, []);
  },

  async setSavedLinks(links: SavedLink[]): Promise<void> {
    await set(KEYS.savedLinks, links);
  },

  async getGroups(): Promise<Group[]> {
    const groups = await get<Group[]>(KEYS.groups, []);
    // Guarantee a default group always exists so new saves have somewhere to land.
    if (!groups.some((g) => g.id === DEFAULT_GROUP_ID)) {
      const withDefault: Group[] = [
        { id: DEFAULT_GROUP_ID, name: 'Unsorted', createdAt: Date.now() },
        ...groups,
      ];
      await set(KEYS.groups, withDefault);
      return withDefault;
    }
    return groups;
  },

  async setGroups(groups: Group[]): Promise<void> {
    await set(KEYS.groups, groups);
  },

  async getAccent(): Promise<AccentColor> {
    return get<AccentColor>(KEYS.accent, null);
  },

  async setAccent(accent: AccentColor): Promise<void> {
    await set(KEYS.accent, accent);
  },

  /** 'system' unless a valid preference was stored. */
  async getThemePreference(): Promise<ThemePreference> {
    const stored = await get<unknown>(KEYS.themePreference, 'system');
    return THEME_PREFERENCES.includes(stored as ThemePreference)
      ? (stored as ThemePreference)
      : 'system';
  },

  async setThemePreference(preference: ThemePreference): Promise<void> {
    await set(KEYS.themePreference, preference);
  },
};
