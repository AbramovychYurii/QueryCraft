import { useCallback, useMemo, useState } from 'react';
import { useAppStore, selectCurrentUrl, selectNavUrl } from '@/store/useAppStore';
import { useActiveTabUrl } from '@/hooks/useActiveTabUrl';
import { useClipboard } from '@/hooks/useClipboard';
import { useTheme } from '@/hooks/useTheme';
import { useSavedLinks } from '@/hooks/useSavedLinks';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { tabs } from '@/lib/tabs';
import { parseUrl } from '@/lib/urlParser';
import { Header } from '@/components/Header';
import { UrlPreview } from '@/components/UrlPreview';
import { ParamList } from '@/components/ParamList';
import { ActionBar } from '@/components/ActionBar';
import { ThemeToggle } from '@/components/ThemeToggle';
import { IconButton } from '@/components/IconButton';
import { IconBookmark } from '@/components/icons';
import { LiveRegion } from '@/components/LiveRegion';
import { SavedLinksDrawer } from '@/components/SavedLinksDrawer';
import { EmptyState } from '@/components/EmptyState';
import styles from './App.module.css';

export function App() {
  // Load URL on mount, hydrate theme, bind storage-backed saved links.
  useActiveTabUrl();
  const { preference, setPreference } = useTheme();

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
  const navUrl = useAppStore(selectNavUrl);          // encoded, for Apply / Copy

  const { copied, copy } = useClipboard();
  const { links, groups, saveLink, updateLink, deleteLink, createGroup } = useSavedLinks();

  const [drawerOpen, setDrawerOpen] = useState(false);

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
      announce('URL applied to the current tab.');
    } catch (err) {
      announce(
        `Failed to apply URL: ${err instanceof Error ? err.message : 'unknown error'}`,
      );
    }
  }, [announce]);

  const handleReset = useCallback(() => {
    resetStore();
  }, [resetStore]);

  const handleCopy = useCallback(async () => {
    if (!navUrl) return;
    const ok = await copy(navUrl);
    announce(ok ? 'URL copied to clipboard.' : 'Failed to copy URL.');
  }, [navUrl, copy, announce]);

  const handleOpenDrawer = useCallback(() => {
    setDrawerOpen(true);
  }, []);

  const handleUpdateLink = useCallback(
    (id: string, label: string | undefined, groupId: string) => {
      void updateLink(id, label, groupId).then(() => {
        announce('URL updated.');
      });
    },
    [updateLink, announce],
  );

  const handleSaveLink = useCallback(
    ({ url, label, groupId }: { url: string; label?: string; groupId: string }) => {
      void saveLink({ url, label, groupId }).then(() => {
        announce('URL saved.');
      });
    },
    [saveLink, announce],
  );

  const handleLoadSavedLink = useCallback(
    (url: string) => {
      const tabId =
        tabState.status === 'ready'
          ? tabState.tabId
          : tabState.status === 'unsupported'
            ? tabState.tabId
            : undefined;
      if (tabId === undefined) return;
      try {
        // Replace current editor state with the saved URL without touching the actual tab.
        // User can click Apply if they want to navigate.
        const parsed = parseUrl(url);
        useAppStore.setState({
          tabState: { status: 'ready', tabId, url },
          initialParsed: { ...parsed, params: parsed.params.map((p) => ({ ...p })) },
          currentParsed: { ...parsed, params: parsed.params.map((p) => ({ ...p })) },
          announcement: 'Loaded saved URL into editor.',
        });
      } catch {
        announce('Failed to load saved URL.');
      }
      setDrawerOpen(false);
    },
    [tabState, announce],
  );

  /* ---------- Keyboard shortcuts ---------- */

  const shortcuts = useMemo(
    () => [
      { key: 'Enter', mod: true, preventDefault: true, handler: () => void handleApply() },
      { key: 's', mod: true, preventDefault: true, handler: handleOpenDrawer },
      {
        key: 'Escape',
        handler: () => {
          if (drawerOpen) setDrawerOpen(false);
        },
      },
    ],
    [handleApply, handleOpenDrawer, drawerOpen],
  );
  useKeyboardShortcuts(shortcuts);

  /* ---------- Render ---------- */

  const headerActions = (
    <>
      <ThemeToggle preference={preference} onChange={setPreference} />
      <IconButton
        aria-label="Open saved URLs"
        icon={<IconBookmark />}
        onClick={handleOpenDrawer}
        className={styles.bookmarkBtn}
      />
    </>
  );

  return (
    <div className={styles.app}>
      <Header actions={headerActions} />

      {tabState.status === 'loading' && (
        <EmptyState title="Loading…" message="Reading the active tab's URL." />
      )}

      {tabState.status === 'unsupported' && (
        <EmptyState
          title="This page can't be edited"
          message="QueryCraft works on http, https, and file URLs. Browser-internal pages are not supported."
        />
      )}

      {tabState.status === 'error' && (
        <EmptyState title="Something went wrong" message={tabState.message} />
      )}

      {tabState.status === 'ready' && currentParsed && (
        <>
          <div className={styles.scrollArea}>
            <div className={styles.previewWrap}>
              <UrlPreview parsed={currentParsed} onUrlChange={setCurrentUrl} />
            </div>
            <ParamList
              params={currentParsed.params}
              onKeyChange={updateKey}
              onValueChange={updateValue}
              onToggleBoolean={toggleBool}
              onRemove={removeParam}
              onAdd={addParam}
            />
          </div>
          <ActionBar
            onApply={() => void handleApply()}
            onReset={handleReset}
            onCopy={() => void handleCopy()}
            onSave={handleOpenDrawer}
            copied={copied}
            applyDisabled={!navUrl}
          />
        </>
      )}

      <SavedLinksDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        currentUrl={currentUrl}
        links={links}
        groups={groups}
        onSave={handleSaveLink}
        onUpdateLink={handleUpdateLink}
        onDeleteLink={(id) => void deleteLink(id)}
        onCreateGroup={createGroup}
        onLoadLink={handleLoadSavedLink}
      />

      <LiveRegion message={announcement} />
    </div>
  );
}
