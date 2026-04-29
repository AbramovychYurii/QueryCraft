import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useActiveTabUrl } from '@/hooks/useActiveTabUrl';
import { useAppStore } from '@/store/useAppStore';

// Reset store before each test.
beforeEach(() => {
  useAppStore.setState({
    tabState: { status: 'loading' },
    initialParsed: null,
    currentParsed: null,
    announcement: '',
  });
});

describe('useActiveTabUrl', () => {
  it('loads the active tab URL into the store on mount', async () => {
    vi.mocked(chrome.tabs.query).mockResolvedValueOnce([
      { id: 7, url: 'https://example.com/?foo=bar', active: true } as chrome.tabs.Tab,
    ]);

    renderHook(() => useActiveTabUrl());

    await waitFor(() => {
      expect(useAppStore.getState().tabState.status).toBe('ready');
    });

    const state = useAppStore.getState();
    expect(state.tabState).toMatchObject({ status: 'ready', tabId: 7, url: 'https://example.com/?foo=bar' });
    expect(state.currentParsed?.params[0]).toMatchObject({ key: 'foo', value: 'bar' });
  });

  it('sets unsupported when no active tab is found', async () => {
    vi.mocked(chrome.tabs.query).mockResolvedValueOnce([]);

    renderHook(() => useActiveTabUrl());

    await waitFor(() => {
      expect(useAppStore.getState().tabState.status).toBe('unsupported');
    });
  });

  it('sets unsupported for a browser-internal URL', async () => {
    vi.mocked(chrome.tabs.query).mockResolvedValueOnce([
      { id: 1, url: 'chrome://settings', active: true } as chrome.tabs.Tab,
    ]);

    renderHook(() => useActiveTabUrl());

    await waitFor(() => {
      expect(useAppStore.getState().tabState.status).toBe('unsupported');
    });
  });

  it('sets error status when chrome.tabs.query rejects', async () => {
    vi.mocked(chrome.tabs.query).mockRejectedValueOnce(new Error('Permission denied'));

    renderHook(() => useActiveTabUrl());

    await waitFor(() => {
      expect(useAppStore.getState().tabState.status).toBe('error');
    });

    expect(useAppStore.getState().tabState).toMatchObject({
      status: 'error',
      message: 'Permission denied',
    });
  });

  it('ignores result after unmount (no state update if cancelled)', async () => {
    let resolveQuery!: (tabs: chrome.tabs.Tab[]) => void;
    vi.mocked(chrome.tabs.query).mockReturnValueOnce(
      new Promise((res) => { resolveQuery = res; }) as Promise<chrome.tabs.Tab[]>
    );

    const { unmount } = renderHook(() => useActiveTabUrl());

    // Unmount before the query resolves.
    unmount();

    resolveQuery([{ id: 5, url: 'https://example.com/', active: true } as chrome.tabs.Tab]);

    // Give microtasks time to run.
    await new Promise((r) => setTimeout(r, 10));

    // State should still be 'loading' since the effect was cancelled.
    expect(useAppStore.getState().tabState.status).toBe('loading');
  });
});
