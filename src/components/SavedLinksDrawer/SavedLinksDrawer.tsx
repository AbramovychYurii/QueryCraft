import { useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { ChevronLeftIcon, XIcon } from 'lucide-react';
import type { Group, SavedLink } from '@/types';
import { DEFAULT_GROUP_ID } from '@/lib/storage';
import { isEditableTarget } from '@/lib/dom';
import { ariaShortcut, shortcutLabel } from '@/lib/platform';
import { useReportSheetHeight } from '@/popup/popupHeight';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Kbd } from '@/components/ui/kbd';
import {
  Sheet,
  SheetClose,
  SheetFooter,
  SheetHeader,
  SheetPanel,
  SheetPopup,
  SheetTitle,
} from '@/components/ui/sheet';
import { SaveForm, SAVE_NAME_ID } from './SaveForm';
import { GroupedLinksList, SAVED_FILTER_ID } from './GroupedLinksList';

type DrawerMode = 'list' | 'save' | 'edit';

const SHEET_ID = 'saved';

interface SavedLinksDrawerProps {
  open: boolean;
  /** Mode to show when the drawer opens (e.g. jump straight to the save form). */
  initialMode?: 'list' | 'save';
  onClose: () => void;
  currentUrl: string;
  links: SavedLink[];
  groups: Group[];
  onSave: (input: { url: string; label?: string; groupId: string }) => void;
  onUpdateLink: (id: string, label: string | undefined, groupId: string) => void;
  onDeleteLink: (link: SavedLink) => void;
  onCreateGroup: (name: string) => Promise<Group>;
  onLoadLink: (url: string) => void;
  onCopyLink: (url: string) => void;
}

/**
 * Saved URLs sheet (docs/redesign §6.4). Two modes in one sheet:
 *   - list: filter, groups, rows with an actions menu, "Save current URL";
 *   - form: save the current URL, or edit a saved one (Cancel / Save ⌘↵).
 */
export function SavedLinksDrawer({
  open,
  initialMode = 'list',
  onClose,
  currentUrl,
  links,
  groups,
  onSave,
  onUpdateLink,
  onDeleteLink,
  onCreateGroup,
  onLoadLink,
  onCopyLink,
}: SavedLinksDrawerProps) {
  const [mode, setMode] = useState<DrawerMode>('list');
  const [label, setLabel] = useState('');
  const [groupId, setGroupId] = useState(DEFAULT_GROUP_ID);
  const [editingLink, setEditingLink] = useState<SavedLink | null>(null);
  // Set when a link is loaded, so closing focuses the URL editor (§7.2).
  const loadedRef = useRef(false);

  useReportSheetHeight(open, SHEET_ID, mode);

  // Apply initialMode only on the closed → open transition, so re-renders
  // (or pressing Cmd+S while already open) don't yank the user out of a form.
  // A layout effect, so a sheet opened on the form never paints the list first.
  const wasOpen = useRef(false);
  useLayoutEffect(() => {
    if (open && !wasOpen.current) {
      setMode(initialMode);
      setEditingLink(null);
      setLabel('');
      setGroupId(DEFAULT_GROUP_ID);
    }
    wasOpen.current = open;
  }, [open, initialMode]);

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

  function handleCreateNewGroup(name: string) {
    // Reuse an existing group instead of creating a same-named duplicate.
    const existing = groups.find((g) => g.name.trim().toLowerCase() === name.toLowerCase());
    if (existing) {
      setGroupId(existing.id);
      return;
    }
    void onCreateGroup(name).then((g) => setGroupId(g.id));
  }

  function backToList() {
    setEditingLink(null);
    setLabel('');
    setMode('list');
    // Focus would otherwise be left on the form that just unmounted.
    window.setTimeout(() => document.getElementById(SAVED_FILTER_ID)?.focus(), 0);
  }

  function handleSave() {
    onSave({ url: currentUrl, label: label.trim() || undefined, groupId });
    backToList();
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
    backToList();
  }

  function handleLoad(url: string) {
    loadedRef.current = true;
    onLoadLink(url);
  }

  const showingForm = mode === 'save' || (mode === 'edit' && editingLink !== null);
  const submit = mode === 'edit' ? handleUpdate : handleSave;

  function handleKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    // ⌘↵ is the primary action in every view: here, Save / Update (§7.1).
    if (showingForm && e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      submit();
      return;
    }
    if (!showingForm && e.key === '/' && !isEditableTarget(e.target)) {
      e.preventDefault();
      document.getElementById(SAVED_FILTER_ID)?.focus();
    }
  }

  return (
    <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
      <SheetPopup
        side="right"
        density="compact"
        showCloseButton={false}
        data-qc-sheet={SHEET_ID}
        onKeyDown={handleKeyDown}
        initialFocus={() => document.getElementById(showingForm ? SAVE_NAME_ID : SAVED_FILTER_ID)}
        finalFocus={() => {
          if (!loadedRef.current) return true;
          loadedRef.current = false;
          return document.querySelector<HTMLElement>('textarea[aria-label="Current URL"]') ?? true;
        }}
      >
        {showingForm ? (
          <>
            <SheetHeader className="flex-row items-center gap-1 px-2">
              <Button
                variant="ghost"
                size="icon"
                aria-label="Back to saved URLs"
                onClick={backToList}
              >
                <ChevronLeftIcon />
              </Button>
              <SheetTitle className="flex-1">
                {mode === 'edit' ? 'Edit saved URL' : 'Save current URL'}
              </SheetTitle>
              <SheetClose
                render={<Button variant="ghost" size="icon" aria-label="Close saved URLs" />}
              >
                <XIcon />
              </SheetClose>
            </SheetHeader>
            <SheetPanel>
              <SaveForm
                label={label}
                onLabelChange={setLabel}
                groupId={groupId}
                onGroupChange={setGroupId}
                groups={groups}
                onCreateNewGroup={handleCreateNewGroup}
                previewUrl={mode === 'edit' && editingLink ? editingLink.url : currentUrl}
              />
            </SheetPanel>
            <SheetFooter>
              <Button variant="ghost" onClick={backToList}>
                Cancel
              </Button>
              <Button onClick={submit} aria-keyshortcuts={ariaShortcut('Enter')}>
                {mode === 'edit' ? 'Update' : 'Save'}
                <Kbd
                  aria-hidden="true"
                  className="bg-primary-foreground/12 text-primary-foreground"
                >
                  {shortcutLabel('↵')}
                </Kbd>
              </Button>
            </SheetFooter>
          </>
        ) : (
          <>
            <SheetHeader className="flex-row items-center gap-2 ps-4 pe-2">
              <SheetTitle>Saved URLs</SheetTitle>
              <Badge variant="secondary" aria-label={`${links.length} saved`}>
                {links.length}
              </Badge>
              <span aria-hidden="true" className="flex-1" />
              <SheetClose
                render={<Button variant="ghost" size="icon" aria-label="Close saved URLs" />}
              >
                <XIcon />
              </SheetClose>
            </SheetHeader>
            <SheetPanel>
              <GroupedLinksList
                groups={groups}
                linksByGroup={linksByGroup}
                onLoadLink={handleLoad}
                onCopyLink={onCopyLink}
                onDeleteLink={onDeleteLink}
                onStartEdit={handleStartEdit}
              />
            </SheetPanel>
            <SheetFooter>
              <Button onClick={() => setMode('save')} disabled={!currentUrl}>
                Save current URL
              </Button>
            </SheetFooter>
          </>
        )}
      </SheetPopup>
    </Sheet>
  );
}
