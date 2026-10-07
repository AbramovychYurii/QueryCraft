import { useMemo, useState, type KeyboardEvent } from 'react';
import {
  ChevronDownIcon,
  CopyIcon,
  CornerDownLeftIcon,
  EllipsisIcon,
  PencilIcon,
  SearchIcon,
  Trash2Icon,
} from 'lucide-react';
import type { Group, SavedLink } from '@/types';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsiblePanel, CollapsibleTrigger } from '@/components/ui/collapsible';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { Kbd } from '@/components/ui/kbd';
import {
  Menu,
  MenuItem,
  MenuPopup,
  MenuSeparator,
  MenuShortcut,
  MenuTrigger,
} from '@/components/ui/menu';

/** Read by the sheet to focus the filter (on open, and on `/`). */
export const SAVED_FILTER_ID = 'saved-urls-filter';

interface GroupedLinksListProps {
  groups: Group[];
  linksByGroup: Map<string, SavedLink[]>;
  onLoadLink: (url: string) => void;
  onCopyLink: (url: string) => void;
  onDeleteLink: (link: SavedLink) => void;
  onStartEdit: (link: SavedLink) => void;
}

/** "https://x.com/a" → "x.com/a": the list shows URLs without their protocol (§6.4). */
function withoutProtocol(url: string): string {
  return url.replace(/^[a-z][a-z0-9+.-]*:\/\//i, '');
}

/** Saved URLs, filtered, in one collapsible section per group (docs/redesign §6.4). */
export function GroupedLinksList({
  groups,
  linksByGroup,
  onLoadLink,
  onCopyLink,
  onDeleteLink,
  onStartEdit,
}: GroupedLinksListProps) {
  const [query, setQuery] = useState('');
  // Groups start expanded; only the ones the user closed are remembered.
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());

  const needle = query.trim().toLowerCase();
  const visibleGroups = useMemo(
    () =>
      groups
        .map((group) => {
          const links = linksByGroup.get(group.id) ?? [];
          const groupMatches = group.name.toLowerCase().includes(needle);
          const matching =
            !needle || groupMatches
              ? links
              : links.filter(
                  (l) =>
                    l.url.toLowerCase().includes(needle) ||
                    (l.label ?? '').toLowerCase().includes(needle),
                );
          return { group, links: matching };
        })
        // Empty groups are hidden, and so are groups with nothing matching.
        .filter(({ links }) => links.length > 0),
    [groups, linksByGroup, needle],
  );
  const total = Array.from(linksByGroup.values()).reduce((sum, l) => sum + l.length, 0);

  function setGroupOpen(id: string, open: boolean) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (open) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  /**
   * Delete, then focus the next row (else the previous, else the filter) so
   * focus is never left on a row that is gone. Deferred a tick: from the row
   * menu, the closing menu first restores focus to its own (removed) trigger.
   */
  function deleteAndRefocus(link: SavedLink) {
    const rows = Array.from(document.querySelectorAll<HTMLElement>('[data-qc-saved-row]'));
    const at = rows.findIndex((row) => row.dataset.qcSavedRow === link.id);
    const neighbour = rows[at + 1] ?? rows[at - 1];
    onDeleteLink(link);
    window.setTimeout(() => (neighbour ?? document.getElementById(SAVED_FILTER_ID))?.focus(), 0);
  }

  /** Backspace/Delete on a focused row deletes it (§7.1). */
  function handleRowKeyDown(e: KeyboardEvent<HTMLButtonElement>, link: SavedLink) {
    if (e.key !== 'Backspace' && e.key !== 'Delete') return;
    e.preventDefault();
    deleteAndRefocus(link);
  }

  return (
    <div className="flex flex-col gap-4">
      <InputGroup>
        <InputGroupAddon>
          <SearchIcon aria-hidden="true" />
        </InputGroupAddon>
        <InputGroupInput
          id={SAVED_FILTER_ID}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter saved URLs"
          aria-label="Filter saved URLs"
          aria-keyshortcuts="/"
        />
        <InputGroupAddon align="inline-end">
          <Kbd>/</Kbd>
        </InputGroupAddon>
      </InputGroup>

      {total === 0 && (
        <p className="py-6 text-center text-muted-foreground text-sm">No saved URLs yet</p>
      )}
      {/* TODO(design): the empty filter result is not designed; copy follows the param filter's. */}
      {total > 0 && visibleGroups.length === 0 && (
        <p className="py-6 text-center text-muted-foreground text-sm">
          No saved URLs match “{query.trim()}”
        </p>
      )}

      {visibleGroups.map(({ group, links }) => {
        // A filter shows every match, whatever was collapsed.
        const open = needle !== '' || !collapsed.has(group.id);
        return (
          <Collapsible
            key={group.id}
            open={open}
            onOpenChange={(next) => setGroupOpen(group.id, next)}
            render={<section aria-label={group.name} className="flex flex-col gap-1" />}
          >
            <CollapsibleTrigger
              render={
                <Button
                  variant="ghost"
                  size="sm"
                  className="-mx-1 justify-start gap-1.5 px-1 font-medium text-muted-foreground sm:text-xs"
                />
              }
            >
              <ChevronDownIcon
                aria-hidden="true"
                className={cn('transition-transform duration-150 ease-out', !open && '-rotate-90')}
              />
              {group.name}
              <Badge variant="secondary" aria-label={`${links.length} links`}>
                {links.length}
              </Badge>
            </CollapsibleTrigger>
            <CollapsiblePanel>
              <ul className="divide-y overflow-hidden rounded-xl border bg-popover">
                {links.map((link) => {
                  const name = link.label || withoutProtocol(link.url);
                  return (
                    <li key={link.id} className="flex items-center gap-1 pe-2">
                      {/* Click / Enter loads the link into the editor. */}
                      <button
                        type="button"
                        data-qc-saved-row={link.id}
                        onClick={() => onLoadLink(link.url)}
                        onKeyDown={(e) => handleRowKeyDown(e, link)}
                        className="flex min-w-0 flex-1 flex-col items-stretch rounded-lg py-2 ps-3 pe-1 text-start outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                      >
                        {link.label ? (
                          <>
                            <span className="truncate font-medium text-sm">{link.label}</span>
                            <span className="truncate font-mono text-muted-foreground text-xs">
                              {withoutProtocol(link.url)}
                            </span>
                          </>
                        ) : (
                          <span className="truncate font-mono text-foreground sm:text-code">
                            {withoutProtocol(link.url)}
                          </span>
                        )}
                      </button>
                      <Menu>
                        <MenuTrigger
                          render={
                            <Button
                              variant="ghost"
                              size="icon-xs"
                              aria-label={`Actions for ${name}`}
                              className="text-muted-foreground"
                            />
                          }
                        >
                          <EllipsisIcon />
                        </MenuTrigger>
                        <MenuPopup align="end" className="w-50">
                          <MenuItem onClick={() => onLoadLink(link.url)}>
                            <CornerDownLeftIcon />
                            Load into editor
                            <MenuShortcut>↵</MenuShortcut>
                          </MenuItem>
                          <MenuItem onClick={() => onCopyLink(link.url)}>
                            <CopyIcon />
                            Copy URL
                          </MenuItem>
                          <MenuItem onClick={() => onStartEdit(link)}>
                            <PencilIcon />
                            Edit…
                          </MenuItem>
                          <MenuSeparator />
                          <MenuItem variant="destructive" onClick={() => deleteAndRefocus(link)}>
                            <Trash2Icon />
                            Delete
                            <MenuShortcut>⌫</MenuShortcut>
                          </MenuItem>
                        </MenuPopup>
                      </Menu>
                    </li>
                  );
                })}
              </ul>
            </CollapsiblePanel>
          </Collapsible>
        );
      })}
    </div>
  );
}
