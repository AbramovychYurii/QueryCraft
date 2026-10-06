/**
 * Thin adapter over chrome.tabs. Centralizing this makes the rest of the app
 * testable without needing to mock the global `chrome` namespace everywhere.
 */

export interface ActiveTab {
  id: number;
  /** Empty when Chrome hides it (e.g. a new tab page — we have no "tabs" permission). */
  url: string;
}

export const tabs = {
  async getActive(): Promise<ActiveTab | null> {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || tab.id === undefined) return null;
    // Keep the id even without a URL so a saved link can still be loaded into this tab.
    return { id: tab.id, url: tab.url ?? '' };
  },

  async updateUrl(tabId: number, url: string): Promise<void> {
    await chrome.tabs.update(tabId, { url });
  },
};
