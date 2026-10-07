import { useCallback, useEffect, useRef, useState } from 'react';
import { DEFAULT_GROUP_ID, storage } from '@/lib/storage';
import { generateId } from '@/lib/id';
import type { Group, SavedLink } from '@/types';

export function useSavedLinks(): {
  links: SavedLink[];
  groups: Group[];
  isLoading: boolean;
  saveLink: (input: { url: string; label?: string; groupId?: string }) => Promise<SavedLink>;
  updateLink: (id: string, label: string | undefined, groupId: string) => Promise<void>;
  deleteLink: (id: string) => Promise<void>;
  /** Put a deleted link back at its old position (Undo). */
  restoreLink: (link: SavedLink, index: number) => Promise<void>;
  createGroup: (name: string) => Promise<Group>;
  renameGroup: (id: string, name: string) => Promise<void>;
  deleteGroup: (id: string) => Promise<void>;
} {
  const [links, setLinks] = useState<SavedLink[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  // Undo runs from a toast created before the delete re-rendered: it must read
  // the current list, not the one its callback closed over.
  const linksRef = useRef(links);
  linksRef.current = links;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [l, g] = await Promise.all([storage.getSavedLinks(), storage.getGroups()]);
        if (cancelled) return;
        setLinks(l);
        setGroups(g);
      } catch {
        // Storage unavailable — keep empty defaults; saving will surface its own error.
      } finally {
        if (!cancelled) setIsLoading(false);
      }
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

  const restoreLink = useCallback(async (link: SavedLink, index: number) => {
    const current = linksRef.current;
    if (current.some((l) => l.id === link.id)) return;
    const next = [...current];
    next.splice(Math.min(index, next.length), 0, link);
    setLinks(next);
    await storage.setSavedLinks(next);
  }, []);

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
    restoreLink,
    createGroup,
    renameGroup,
    deleteGroup,
  };
}
