import { useMemo, useState } from 'react';
import type { Group, SavedLink } from '@/types';
import { DEFAULT_GROUP_ID } from '@/lib/storage';
import { Button } from '../Button';
import { IconButton } from '../IconButton';
import { GroupSelector } from '../GroupSelector';
import { IconChevronLeft, IconClose, IconEdit } from '../icons';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import styles from './SavedLinksDrawer.module.css';

interface SavedLinksDrawerProps {
  open: boolean;
  onClose: () => void;
  currentUrl: string;
  links: SavedLink[];
  groups: Group[];
  onSave: (input: { url: string; label?: string; groupId: string }) => void;
  onUpdateLink: (id: string, label: string | undefined, groupId: string) => void;
  onDeleteLink: (id: string) => void;
  onCreateGroup: (name: string) => Promise<Group>;
  onLoadLink: (url: string) => void;
}

/**
 * Slide-in drawer from the right. Role dialog with a focus trap.
 *
 * Two modes:
 *   - "list" (default): browse existing saved links, grouped.
 *   - "save": form to save the current URL with a label + group.
 */
export function SavedLinksDrawer({
  open,
  onClose,
  currentUrl,
  links,
  groups,
  onSave,
  onUpdateLink,
  onDeleteLink,
  onCreateGroup,
  onLoadLink,
}: SavedLinksDrawerProps) {
  const [mode, setMode] = useState<'list' | 'save' | 'edit'>('list');
  const [label, setLabel] = useState('');
  const [groupId, setGroupId] = useState(DEFAULT_GROUP_ID);
  const [editingLink, setEditingLink] = useState<SavedLink | null>(null);

  const trapRef = useFocusTrap<HTMLDivElement>(open, onClose);

  // Group links by groupId for display. Preserve group order from the groups array.
  const linksByGroup = useMemo(() => {
    const map = new Map<string, SavedLink[]>();
    for (const g of groups) map.set(g.id, []);
    for (const l of links) {
      const target = map.get(l.groupId) ?? map.get(DEFAULT_GROUP_ID);
      target?.push(l);
    }
    return map;
  }, [links, groups]);

  async function handleCreateNewGroup() {
    const name = window.prompt('Name for the new group:');
    if (!name || !name.trim()) return;
    const g = await onCreateGroup(name.trim());
    setGroupId(g.id);
  }

  function handleSave() {
    onSave({ url: currentUrl, label: label.trim() || undefined, groupId });
    setLabel('');
    setMode('list');
  }

  function handleStartEdit(link: SavedLink) {
    setEditingLink(link);
    setLabel(link.label ?? '');
    setGroupId(link.groupId);
    setMode('edit');
  }

  function handleUpdate() {
    if (!editingLink) return;
    onUpdateLink(editingLink.id, label.trim() || undefined, groupId);
    setEditingLink(null);
    setLabel('');
    setMode('list');
  }

  function handleCancelEdit() {
    setEditingLink(null);
    setLabel('');
    setMode('list');
  }

  if (!open) return null;

  return (
    <>
      <div className={styles.backdrop} onClick={onClose} aria-hidden="true" />
      <div
        ref={trapRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="saved-links-title"
        className={styles.drawer}
      >
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            {(mode === 'save' || mode === 'edit') && (
              <IconButton
                aria-label="Back to saved list"
                icon={<IconChevronLeft />}
                onClick={mode === 'edit' ? handleCancelEdit : () => setMode('list')}
                size="sm"
              />
            )}
            <h2 id="saved-links-title" className={styles.title}>
              {mode === 'save'
                ? 'Save current URL'
                : mode === 'edit'
                  ? 'Edit saved URL'
                  : 'Saved URLs'}
            </h2>
          </div>
          <IconButton aria-label="Close saved URLs" icon={<IconClose />} onClick={onClose} />
        </header>

        <div className={styles.body}>
          {mode === 'save' ? (
            <SaveForm
              label={label}
              onLabelChange={setLabel}
              groupId={groupId}
              onGroupChange={setGroupId}
              groups={groups}
              onCreateNewGroup={handleCreateNewGroup}
              onSubmit={handleSave}
              onCancel={() => setMode('list')}
              previewUrl={currentUrl}
            />
          ) : mode === 'edit' && editingLink ? (
            <SaveForm
              label={label}
              onLabelChange={setLabel}
              groupId={groupId}
              onGroupChange={setGroupId}
              groups={groups}
              onCreateNewGroup={handleCreateNewGroup}
              onSubmit={handleUpdate}
              onCancel={handleCancelEdit}
              previewUrl={editingLink.url}
              submitLabel="Update"
            />
          ) : (
            <GroupedLinksList
              groups={groups}
              linksByGroup={linksByGroup}
              onLoadLink={onLoadLink}
              onDeleteLink={onDeleteLink}
              onStartEdit={handleStartEdit}
              onStartSave={() => setMode('save')}
              canSave={!!currentUrl}
            />
          )}
        </div>
      </div>
    </>
  );
}

/* ----------------- internal sub-components ----------------- */

interface SaveFormProps {
  label: string;
  onLabelChange: (v: string) => void;
  groupId: string;
  onGroupChange: (id: string) => void;
  groups: Group[];
  onCreateNewGroup: () => void;
  onSubmit: () => void;
  onCancel: () => void;
  previewUrl: string;
  submitLabel?: string;
}

function SaveForm({
  label,
  onLabelChange,
  groupId,
  onGroupChange,
  groups,
  onCreateNewGroup,
  onSubmit,
  onCancel,
  previewUrl,
  submitLabel = 'Save',
}: SaveFormProps) {
  const labelId = 'sl-label';
  return (
    <div className={styles.form}>
      <div className={styles.field}>
        <label htmlFor={labelId} className={styles.fieldLabel}>
          Label (optional)
        </label>
        <input
          id={labelId}
          type="text"
          className={styles.textInput}
          value={label}
          onChange={(e) => onLabelChange(e.target.value)}
          placeholder="e.g. Staging with debug flag"
          maxLength={80}
        />
      </div>

      <GroupSelector
        groups={groups}
        value={groupId}
        onChange={onGroupChange}
        onCreateNew={onCreateNewGroup}
      />

      <div className={styles.field}>
        <span className={styles.fieldLabel}>URL</span>
        <div className={styles.urlPreview} title={previewUrl}>
          {previewUrl}
        </div>
      </div>

      <div className={styles.formActions}>
        <Button variant="primary" onClick={onSubmit}>
          {submitLabel}
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

interface GroupedLinksListProps {
  groups: Group[];
  linksByGroup: Map<string, SavedLink[]>;
  onLoadLink: (url: string) => void;
  onDeleteLink: (id: string) => void;
  onStartEdit: (link: SavedLink) => void;
  onStartSave: () => void;
  canSave: boolean;
}

function GroupedLinksList({
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
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    () => new Set(groups.map((g) => g.id)),
  );

  function toggleGroup(id: string) {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className={styles.list}>
      <div className={styles.listTop}>
        <Button variant="primary" size="sm" onClick={onStartSave} block disabled={!canSave}>
          Save current URL
        </Button>
      </div>

      {totalCount === 0 ? (
        <p className={styles.empty}>No saved URLs yet. Save the current URL to get started.</p>
      ) : (
        groups.map((g) => {
          const groupLinks = linksByGroup.get(g.id) ?? [];
          if (groupLinks.length === 0) return null;
          const isExpanded = expandedGroups.has(g.id);
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
                  <IconChevronLeft />
                </span>
              </button>
              {isExpanded && (
                <ul className={styles.linkList} role="list">
                  {groupLinks.map((link) => (
                    <li key={link.id} className={styles.linkRow}>
                      <button
                        type="button"
                        className={styles.linkButton}
                        onClick={() => onLoadLink(link.url)}
                        title={link.url}
                      >
                        <span className={styles.linkLabel}>{link.label || link.url}</span>
                        {link.label && <span className={styles.linkUrl}>{link.url}</span>}
                      </button>
                      <div className={styles.linkActions}>
                        <IconButton
                          aria-label={`Edit ${link.label || link.url}`}
                          icon={<IconEdit />}
                          size="sm"
                          onClick={() => onStartEdit(link)}
                        />
                        <IconButton
                          aria-label={`Delete ${link.label || link.url}`}
                          icon={<IconClose />}
                          size="sm"
                          tone="danger"
                          onClick={() => onDeleteLink(link.id)}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })
      )}
    </div>
  );
}
