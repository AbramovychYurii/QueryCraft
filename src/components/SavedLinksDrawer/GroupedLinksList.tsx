import { useState } from 'react';
import type { Group, SavedLink } from '@/types';
import { Button } from '../Button';
import { IconButton } from '../IconButton';
import { IconChevronDown, IconClose, IconEdit, IconLoad } from '../icons';
import styles from './SavedLinksDrawer.module.css';

interface GroupedLinksListProps {
  groups: Group[];
  linksByGroup: Map<string, SavedLink[]>;
  onLoadLink: (url: string) => void;
  onDeleteLink: (id: string) => void;
  onStartEdit: (link: SavedLink) => void;
  onStartSave: () => void;
  canSave: boolean;
}

/** The default drawer view: saved links grouped into collapsible sections. */
export function GroupedLinksList({
  groups,
  linksByGroup,
  onLoadLink,
  onDeleteLink,
  onStartEdit,
  onStartSave,
  canSave,
}: GroupedLinksListProps) {
  const totalCount = Array.from(linksByGroup.values()).reduce((sum, l) => sum + l.length, 0);

  // All groups expanded by default.
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(() => new Set());

  function toggleGroup(id: string) {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className={styles.list}>
      <div className={styles.saveCurrent}>
        <Button variant="primary" onClick={onStartSave} block disabled={!canSave}>
          Save current URL
        </Button>
      </div>

      {totalCount === 0 ? (
        <p className={styles.empty}>No saved URLs yet</p>
      ) : (
        groups.map((g) => {
          const groupLinks = linksByGroup.get(g.id) ?? [];
          if (groupLinks.length === 0) return null;
          const isExpanded = !collapsedGroups.has(g.id);
          return (
            <section key={g.id} className={styles.groupSection} aria-labelledby={`g-${g.id}`}>
              <button
                type="button"
                id={`g-${g.id}`}
                className={styles.groupToggle}
                onClick={() => toggleGroup(g.id)}
                aria-expanded={isExpanded}
              >
                <span className={styles.groupName}>
                  {g.name}
                  <span className={styles.groupCount} aria-label={`${groupLinks.length} links`}>
                    {groupLinks.length}
                  </span>
                </span>
                <span
                  className={`${styles.chevron} ${isExpanded ? '' : styles.chevronCollapsed}`}
                  aria-hidden="true"
                >
                  <IconChevronDown />
                </span>
              </button>

              {isExpanded && (
                <ul className={styles.linkList}>
                  {groupLinks.map((link) => {
                    const name = link.label || link.url;
                    return (
                      <li key={link.id} className={styles.linkRow}>
                        <button
                          type="button"
                          className={styles.linkText}
                          title="Load into editor"
                          onClick={() => onLoadLink(link.url)}
                        >
                          <span className={styles.linkLabel}>{name}</span>
                          {link.label && <span className={styles.linkUrl}>{link.url}</span>}
                        </button>
                        <span className={styles.linkActions}>
                          <IconButton
                            aria-label={`Load ${name}`}
                            title="Load into editor"
                            icon={<IconLoad />}
                            size="md"
                            onClick={() => onLoadLink(link.url)}
                          />
                          <IconButton
                            aria-label={`Edit ${name}`}
                            title="Edit"
                            icon={<IconEdit />}
                            size="md"
                            onClick={() => onStartEdit(link)}
                          />
                          <IconButton
                            aria-label={`Delete ${name}`}
                            title="Delete"
                            icon={<IconClose />}
                            size="md"
                            tone="danger"
                            onClick={() => onDeleteLink(link.id)}
                          />
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          );
        })
      )}
    </div>
  );
}
