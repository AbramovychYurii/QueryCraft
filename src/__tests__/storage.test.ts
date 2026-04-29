import { describe, it, expect } from 'vitest';
import { storage, DEFAULT_GROUP_ID } from '@/lib/storage';
import type { SavedLink, Group } from '@/types';

// The chrome mock is set up globally in src/test/setup.ts

describe('storage.getSavedLinks', () => {
  it('returns empty array when nothing is stored', async () => {
    const links = await storage.getSavedLinks();
    expect(links).toEqual([]);
  });

  it('returns stored links', async () => {
    const link: SavedLink = {
      id: '1',
      url: 'https://example.com',
      createdAt: 0,
      groupId: DEFAULT_GROUP_ID,
    };
    await storage.setSavedLinks([link]);
    const links = await storage.getSavedLinks();
    expect(links).toEqual([link]);
  });
});

describe('storage.setSavedLinks', () => {
  it('persists and retrieves links', async () => {
    const links: SavedLink[] = [
      { id: 'a', url: 'https://a.com', createdAt: 100, groupId: DEFAULT_GROUP_ID },
      { id: 'b', url: 'https://b.com', label: 'B', createdAt: 200, groupId: 'custom' },
    ];
    await storage.setSavedLinks(links);
    expect(await storage.getSavedLinks()).toEqual(links);
  });

  it('overwrites existing links', async () => {
    await storage.setSavedLinks([
      { id: 'old', url: 'https://old.com', createdAt: 0, groupId: DEFAULT_GROUP_ID },
    ]);
    const newLinks: SavedLink[] = [
      { id: 'new', url: 'https://new.com', createdAt: 1, groupId: DEFAULT_GROUP_ID },
    ];
    await storage.setSavedLinks(newLinks);
    expect(await storage.getSavedLinks()).toEqual(newLinks);
  });
});

describe('storage.getGroups', () => {
  it('returns default group when nothing is stored', async () => {
    const groups = await storage.getGroups();
    expect(groups.some((g) => g.id === DEFAULT_GROUP_ID)).toBe(true);
  });

  it('injects default group if missing from stored data', async () => {
    await storage.setGroups([{ id: 'custom', name: 'Custom', createdAt: 0 }]);
    const groups = await storage.getGroups();
    expect(groups.some((g) => g.id === DEFAULT_GROUP_ID)).toBe(true);
    expect(groups.some((g) => g.id === 'custom')).toBe(true);
  });

  it('does not duplicate default group when already present', async () => {
    const defaultGroup: Group = { id: DEFAULT_GROUP_ID, name: 'Unsorted', createdAt: 0 };
    await storage.setGroups([defaultGroup]);
    const groups = await storage.getGroups();
    const defaults = groups.filter((g) => g.id === DEFAULT_GROUP_ID);
    expect(defaults).toHaveLength(1);
  });

  it('returns custom groups alongside default', async () => {
    const custom: Group = { id: 'my-group', name: 'My Group', createdAt: 999 };
    await storage.setGroups([{ id: DEFAULT_GROUP_ID, name: 'Unsorted', createdAt: 0 }, custom]);
    const groups = await storage.getGroups();
    expect(groups).toHaveLength(2);
    expect(groups.some((g) => g.id === 'my-group')).toBe(true);
  });
});

describe('storage.setGroups', () => {
  it('persists and retrieves groups', async () => {
    const groups: Group[] = [
      { id: DEFAULT_GROUP_ID, name: 'Unsorted', createdAt: 0 },
      { id: 'g1', name: 'Work', createdAt: 100 },
    ];
    await storage.setGroups(groups);
    const result = await storage.getGroups();
    expect(result.some((g) => g.id === 'g1')).toBe(true);
  });
});

describe('storage.getTheme', () => {
  it('returns "system" as the default theme', async () => {
    const theme = await storage.getTheme();
    expect(theme).toBe('system');
  });

  it('returns stored theme', async () => {
    await storage.setTheme('dark');
    expect(await storage.getTheme()).toBe('dark');
  });
});

describe('storage.setTheme', () => {
  it('persists light theme', async () => {
    await storage.setTheme('light');
    expect(await storage.getTheme()).toBe('light');
  });

  it('persists dark theme', async () => {
    await storage.setTheme('dark');
    expect(await storage.getTheme()).toBe('dark');
  });

  it('persists system theme', async () => {
    await storage.setTheme('system');
    expect(await storage.getTheme()).toBe('system');
  });
});
