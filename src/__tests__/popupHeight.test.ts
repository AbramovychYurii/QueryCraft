import { describe, it, expect, vi, afterEach } from 'vitest';
import { syncPopupHeight, POPUP_MAX_HEIGHT } from '@/popup/popupHeight';

// jsdom has no ResizeObserver: capture the callback and feed it entries by hand.
let resize: (blockSize: number) => void = () => {};
class FakeResizeObserver {
  constructor(cb: ResizeObserverCallback) {
    resize = (blockSize) =>
      cb(
        [{ borderBoxSize: [{ blockSize, inlineSize: 380 }] } as unknown as ResizeObserverEntry],
        this as never,
      );
  }
  observe() {}
  disconnect() {}
}

afterEach(() => {
  vi.unstubAllGlobals();
  document.documentElement.style.height = '';
  document.body.style.height = '';
});

describe('syncPopupHeight', () => {
  it('sizes html and body to the content, rounded up', () => {
    vi.stubGlobal('ResizeObserver', FakeResizeObserver);
    syncPopupHeight(document.createElement('div'));

    resize(357.2);

    expect(document.documentElement.style.height).toBe('358px');
    expect(document.body.style.height).toBe('358px');
  });

  it("caps the height at Chrome's popup maximum", () => {
    vi.stubGlobal('ResizeObserver', FakeResizeObserver);
    syncPopupHeight(document.createElement('div'));

    resize(912);

    expect(document.body.style.height).toBe(`${POPUP_MAX_HEIGHT}px`);
  });
});
