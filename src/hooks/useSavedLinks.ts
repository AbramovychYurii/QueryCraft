import { useCallback, useEffect, useState } from 'react';
import { DEFAULT_GROUP_ID, storage } from '@/lib/storage';
import type { Group, SavedLink } from '@/types';

function generateId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `id_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

export function useSavedLinks(): {
  links: SavedLink[];
  groups: Group[];
  isLoading: boolean;
  saveLink: (input: { url: string; label?: string; groupId?: string }) => Promise<SavedLink>;
  updateLink: (id: string, label: string | undefined, groupId: string) => Promise<void>;
  deleteLink: (id: string) => Promise<void>;
  createGroup: (name: string) => Promise<Group>;
  renameGroup: (id: string, name: string) => Promise<void>;
  deleteGroup: (id: string) => Promise<void>;
} {
  const [links, setLinks] = useState<SavedLink[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [l, g] = await Promise.all([storage.getSavedLinks(), storage.getGroups()]);
      if (cancelled) return;
      setLinks(l);
      setGroups(g);
      setIsLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const saveLink = useCallback(
    async ({ url, label, groupId }: { url: string; label?: string; groupId?: string }) => {
      const link: SavedLink = {
        id: generateId(),
        url,
        label,
        createdAt: Date.now(),
        groupId: groupId ?? DEFAULT_GROUP_ID,
      };
      const next = [link, ...links];
      setLinks(next);
      await storage.setSavedLinks(next);
      return link;
    },
    [links],
  );

  const deleteLink = useCallback(
    async (id: string) => {
      const next = links.filter((l) => l.id !== id);
      setLinks(next);
      await storage.setSavedLinks(next);
    },
    [links],
  );

  const createGroup = useCallback(
    async (name: string) => {
      const group: Group = { id: generateId(), name, createdAt: Date.now() };
      const next = [...groups, group];
      setGroups(next);
      await storage.setGroups(next);
      return group;
    },
    [groups],
  );

  const renameGroup = useCallback(
    async (id: string, name: string) => {
      const next = groups.map((g) => (g.id === id ? { ...g, name } : g));
      setGroups(next);
      await storage.setGroups(next);
    },
    [groups],
  );

  const deleteGroup = useCallback(
    async (id: string) => {
      // The default group is protected — it's where orphaned links go.
      if (id === DEFAULT_GROUP_ID) return;
      const next = groups.filter((g) => g.id !== id);
      // Move orphaned links to the default group so nothing gets silently deleted.
      const reassignedLinks = links.map((l) =>
        l.groupId === id ? { ...l, groupId: DEFAULT_GROUP_ID } : l,
      );
      setGroups(next);
      setLinks(reassignedLinks);
      await Promise.all([storage.setGroups(next), storage.setSavedLinks(reassignedLinks)]);
    },
    [groups, links],
  );

  const updateLink = useCallback(
    async (id: string, label: string | undefined, groupId: string) => {
      const next = links.map((l) =>
        l.id === id ? { ...l, label: label || undefined, groupId } : l,
      );
      setLinks(next);
      await storage.setSavedLinks(next);
    },
    [links],
  );

  return {
    links,
    groups,
    isLoading,
    saveLink,
    updateLink,
    deleteLink,
    createGroup,
    renameGroup,
    deleteGroup,
  };
}
