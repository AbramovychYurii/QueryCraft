import { useCallback, useEffect, useMemo, useState } from 'react';
import { DirectionProvider } from '@base-ui/react/direction-provider';
import type { SavedLink } from '@/types';
import { useAppStore, selectCurrentUrl, selectNavUrl } from '@/store/useAppStore';
import { useActiveTabUrl } from '@/hooks/useActiveTabUrl';
import { useClipboard } from '@/hooks/useClipboard';
import { useTheme } from '@/hooks/useTheme';
import { useAccent } from '@/hooks/useAccent';
import { useDirection } from '@/hooks/useDirection';
import { useSavedLinks } from '@/hooks/useSavedLinks';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { tabs } from '@/lib/tabs';
import { parseUrl } from '@/lib/urlParser';
import { Header } from '@/components/Header';
import { UrlPreview } from '@/components/UrlPreview';
import { ParamList } from '@/components/ParamList';
import { ActionBar } from '@/components/ActionBar';
import { LiveRegion, announce as announceLive } from '@/components/LiveRegion';
import { ToastProvider, toastManager } from '@/components/ui/toast';
import { SavedLinksDrawer } from '@/components/SavedLinksDrawer';
import { SettingsDrawer } from '@/components/SettingsDrawer';
import { EmptyState } from '@/components/EmptyState';
import { PanelMinHeightContext } from './popupHeight';

/*
 * Toasts sit bottom-centre, 8px above the action bar, at most 348px wide
 * (docs/redesign §5.3): a 16px inset gives 380 - 2×16. `sm:` because coss sets
 * its inset under `sm:`, which is always on in the popup (§4.1).
 */
const TOAST_VIEWPORT_CLASS =
  'sm:[--toast-inset:--spacing(4)] data-[position*=bottom]:bottom-[calc(var(--action-bar-height,0px)+--spacing(2))]';

export function App() {
  // Load URL on mount, hydrate theme, bind storage-backed saved links.
  useActiveTabUrl();
  const { preference, resolved, setPreference } = useTheme();
  const { accent, setAccent } = useAccent(resolved);
  const { direction, setDirection } = useDirection();

  // Zustand store — individual selectors keep re-renders narrow.
  const tabState = useAppStore((s) => s.tabState);
  const currentParsed = useAppStore((s) => s.currentParsed);
  const announcement = useAppStore((s) => s.announcement);
  const setCurrentUrl = useAppStore((s) => s.setCurrentUrl);
  const updateKey = useAppStore((s) => s.updateParamKey);
  const updateValue = useAppStore((s) => s.updateParamValue);
  const toggleBool = useAppStore((s) => s.toggleBooleanParam);
  const removeParam = useAppStore((s) => s.removeParam);
  const addParam = useAppStore((s) => s.addParam);
  const resetStore = useAppStore((s) => s.reset);
  const announce = useAppStore((s) => s.announce);

  const currentUrl = useAppStore(selectCurrentUrl); // human-readable, for display
  const navUrl = useAppStore(selectNavUrl); // encoded, for Apply / Copy

  const { copied, copy } = useClipboard(1600);
  const { links, groups, saveLink, updateLink, deleteLink, restoreLink, createGroup } =
    useSavedLinks();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<'list' | 'save'>('list');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [panelMinHeight, setPanelMinHeight] = useState<number | null>(null);

  // Every announcement is shown as a toast, as the old status pill did. The
  // toast viewport is the live region for it; Phase 4 moves the events with no
  // visible feedback to <LiveRegion> (docs/redesign §7.3).
  // Cleared once shown: the effect fires only on a changed value, so the same
  // message twice in a row (remove "a", add "a", remove "a") still toasts twice.
  useEffect(() => {
    if (!announcement) return;
    toastManager.add({ title: announcement });
    useAppStore.setState({ announcement: '' });
  }, [announcement]);

  /* ---------- Action handlers ---------- */

  const handleApply = useCallback(async () => {
    // Read fresh state at call time to avoid stale-closure issues: the user
    // may click Apply immediately after adding a param, before React has
    // re-rendered and updated the closure-captured navUrl / tabState.
    const snap = useAppStore.getState();
    const currentTabState = snap.tabState;
    const currentNavUrl = selectNavUrl(snap);
    if (currentTabState.status !== 'ready' || !currentNavUrl) return;
    try {
      await tabs.updateUrl(currentTabState.tabId, currentNavUrl);
      announce('URL applied to the current tab');
    } catch (err) {
      announce(`Failed to apply: ${err instanceof Error ? err.message : 'unknown error'}`);
    }
  }, [announce]);

  // The new row is the visible feedback; screen readers hear it through the
  // hidden live region, never a toast (docs/redesign §7.3).
  const handleAddParam = useCallback(
    (key: string, value: string) => {
      addParam(key, value);
      announceLive(`Added ${key}`);
    },
    [addParam],
  );

  const handleReset = useCallback(() => {
    resetStore();
  }, [resetStore]);

  const handleCopy = useCallback(async () => {
    if (!navUrl) return;
    const ok = await copy(navUrl);
    announce(ok ? 'URL copied to clipboard' : 'Failed to copy URL');
  }, [navUrl, copy, announce]);

  const handleOpenDrawer = useCallback(() => {
    setDrawerMode('list');
    setDrawerOpen(true);
  }, []);

  /** The action bar's "Save" button jumps straight to the save form. */
  const handleOpenSaveDrawer = useCallback(() => {
    setDrawerMode('save');
    setDrawerOpen(true);
  }, []);

  const handleCloseDrawer = useCallback(() => {
    setDrawerOpen(false);
  }, []);

  const handleOpenSettings = useCallback(() => {
    setSettingsOpen(true);
  }, []);

  const handleCloseSettings = useCallback(() => {
    setSettingsOpen(false);
  }, []);

  const handleUpdateLink = useCallback(
    (id: string, label: string | undefined, groupId: string) => {
      void updateLink(id, label, groupId).then(
        () => announce('Saved URL updated'),
        () => announce('Failed to update saved URL'),
      );
    },
    [updateLink, announce],
  );

  const handleSaveLink = useCallback(
    ({ url, label, groupId }: { url: string; label?: string; groupId: string }) => {
      void saveLink({ url, label, groupId }).then(
        () => announce('URL saved'),
        () => announce('Failed to save URL'),
      );
    },
    [saveLink, announce],
  );

  // Delete at once, with Undo in the toast for 6s (docs/redesign §7.3). Undo
  // puts the link back where it was. ⌘Z for it arrives with Phase 4.
  const handleDeleteLink = useCallback(
    (link: SavedLink) => {
      const index = links.findIndex((l) => l.id === link.id);
      void deleteLink(link.id).then(
        () => {
          const toastId = toastManager.add({
            title: 'Saved URL deleted',
            timeout: 6000,
            actionProps: {
              children: 'Undo',
              onClick: () => {
                toastManager.close(toastId);
                void restoreLink(link, index).then(
                  () => announceLive('Saved URL restored'),
                  () => announce('Failed to restore saved URL'),
                );
              },
            },
          });
        },
        () => announce('Failed to delete saved URL'),
      );
    },
    [links, deleteLink, restoreLink, announce],
  );

  // Copies a saved URL — not the editor's, so the footer's "Copied" stays put.
  const handleCopySavedLink = useCallback(
    (url: string) => {
      navigator.clipboard.writeText(url).then(
        () => announce('URL copied to clipboard'),
        () => announce('Failed to copy URL'),
      );
    },
    [announce],
  );

  const handleLoadSavedLink = useCallback(
    (url: string) => {
      const snap = useAppStore.getState().tabState;
      const tabId =
        snap.status === 'ready' || snap.status === 'unsupported' ? snap.tabId : undefined;
      if (tabId === undefined) {
        announce('Cannot load the saved URL: no editable tab');
        return;
      }
      try {
        // Replace the editor state with the saved URL without touching the
        // actual tab — the user can hit Apply to navigate.
        const parsed = parseUrl(url);
        const snapshot = () => ({ ...parsed, params: parsed.params.map((p) => ({ ...p })) });
        useAppStore.setState({
          tabState: { status: 'ready', tabId, url },
          initialParsed: snapshot(),
          currentParsed: snapshot(),
          announcement: 'Loaded saved URL',
        });
      } catch {
        announce('Failed to load saved URL');
      }
      setDrawerOpen(false);
    },
    [announce],
  );

  /* ---------- Keyboard shortcuts ---------- */

  const shortcuts = useMemo(
    () => [
      { key: 'Enter', mod: true, preventDefault: true, handler: () => void handleApply() },
      { key: 's', mod: true, preventDefault: true, handler: handleOpenDrawer },
      // No Escape here: the sheets close on Esc themselves (Base UI), after any
      // menu or list open inside them — a global handler closed both at once.
    ],
    [handleApply, handleOpenDrawer],
  );
  useKeyboardShortcuts(shortcuts);

  /* ---------- Render ---------- */

  return (
    <PanelMinHeightContext.Provider value={setPanelMinHeight}>
      {/* Base UI reads the direction from here for arrow keys and popup sides. */}
      <DirectionProvider direction={direction}>
        <ToastProvider
          position="bottom-center"
          timeout={3000}
          viewportClassName={TOAST_VIEWPORT_CLASS}
        >
          {/*
           * Natural height, capped at Chrome's 600px popup limit; main.tsx sizes
           * the popup from it (docs/redesign §5.1). An open panel raises the
           * minimum so it is not clipped over a short view. `overflow-clip`, not
           * hidden: the closed panel waits off to the right, and a clip is not a
           * scroll container, so nothing can scroll the holder sideways to it.
           */}
          <div
            className="relative flex max-h-[600px] min-w-0 flex-col overflow-clip bg-background text-foreground"
            style={panelMinHeight === null ? undefined : { minHeight: panelMinHeight }}
          >
            <Header onOpenSaved={handleOpenDrawer} onOpenSettings={handleOpenSettings} />

            {tabState.status === 'loading' && (
              <main className="flex min-h-0 flex-1 flex-col">
                <EmptyState title="Loading…" message="Reading the active tab's URL." />
              </main>
            )}

            {tabState.status === 'unsupported' && (
              <main className="flex min-h-0 flex-1 flex-col">
                <EmptyState
                  title="This page can't be edited"
                  message="QueryCraft works on http, https, and file URLs. Browser-internal pages are not supported."
                />
              </main>
            )}

            {tabState.status === 'error' && (
              <main className="flex min-h-0 flex-1 flex-col">
                <EmptyState title="Something went wrong" message={tabState.message} />
              </main>
            )}

            {tabState.status === 'ready' && currentParsed && (
              <>
                {/* Interim: main scrolls as a whole until Phase 2 moves scrolling into the list (§5.2). */}
                <main className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overflow-x-hidden px-4 py-3">
                  <UrlPreview parsed={currentParsed} onUrlChange={setCurrentUrl} />
                  <ParamList
                    params={currentParsed.params}
                    onKeyChange={updateKey}
                    onValueChange={updateValue}
                    onToggleBoolean={toggleBool}
                    onRemove={removeParam}
                    onAdd={handleAddParam}
                  />
                </main>
                <ActionBar
                  onApply={() => void handleApply()}
                  onReset={handleReset}
                  onCopy={() => void handleCopy()}
                  onSave={handleOpenSaveDrawer}
                  copied={copied}
                  applyDisabled={!navUrl}
                />
              </>
            )}

            <SavedLinksDrawer
              open={drawerOpen}
              initialMode={drawerMode}
              onClose={handleCloseDrawer}
              currentUrl={currentUrl}
              links={links}
              groups={groups}
              onSave={handleSaveLink}
              onUpdateLink={handleUpdateLink}
              onDeleteLink={handleDeleteLink}
              onCopyLink={handleCopySavedLink}
              onCreateGroup={createGroup}
              onLoadLink={handleLoadSavedLink}
            />

            <SettingsDrawer
              open={settingsOpen}
              onClose={handleCloseSettings}
              accent={accent}
              onAccentChange={setAccent}
              preference={preference}
              resolved={resolved}
              onPreferenceChange={setPreference}
              direction={direction}
              onDirectionChange={setDirection}
            />
          </div>

          <LiveRegion />
        </ToastProvider>
      </DirectionProvider>
    </PanelMinHeightContext.Provider>
  );
}
