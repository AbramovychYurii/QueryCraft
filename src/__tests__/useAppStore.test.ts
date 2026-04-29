import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore, selectCurrentUrl, selectNavUrl } from '@/store/useAppStore';

// Reset the store before each test.
beforeEach(() => {
  useAppStore.setState({
    tabState: { status: 'loading' },
    initialParsed: null,
    currentParsed: null,
    announcement: '',
  });
});

describe('initial state', () => {
  it('starts in loading status', () => {
    expect(useAppStore.getState().tabState.status).toBe('loading');
  });

  it('has null parsed URL', () => {
    expect(useAppStore.getState().currentParsed).toBeNull();
  });
});

describe('setTabState', () => {
  it('updates tabState', () => {
    useAppStore.getState().setTabState({ status: 'error', message: 'oops' });
    expect(useAppStore.getState().tabState).toEqual({ status: 'error', message: 'oops' });
  });
});

describe('loadUrl', () => {
  it('transitions to ready and parses the URL', () => {
    useAppStore.getState().loadUrl('https://example.com/?foo=bar', 42);
    const state = useAppStore.getState();
    expect(state.tabState).toEqual({ status: 'ready', tabId: 42, url: 'https://example.com/?foo=bar' });
    expect(state.currentParsed?.params[0]).toMatchObject({ key: 'foo', value: 'bar' });
    expect(state.initialParsed?.params[0]).toMatchObject({ key: 'foo', value: 'bar' });
  });

  it('transitions to unsupported for non-editable URL (e.g. chrome://)', () => {
    useAppStore.getState().loadUrl('chrome://settings', 1);
    expect(useAppStore.getState().tabState.status).toBe('unsupported');
  });

  it('transitions to unsupported for an invalid URL (fails isEditableUrl)', () => {
    // 'not-a-url' is not http/https/file so isEditableUrl returns false → unsupported.
    useAppStore.getState().loadUrl('not-a-url', 1);
    expect(useAppStore.getState().tabState.status).toBe('unsupported');
  });

  it('clones params so currentParsed is independent from initialParsed', () => {
    useAppStore.getState().loadUrl('https://example.com/?a=1', 1);
    const { currentParsed, initialParsed } = useAppStore.getState();
    expect(currentParsed?.params).not.toBe(initialParsed?.params);
    expect(currentParsed?.params[0]).not.toBe(initialParsed?.params[0]);
  });
});

describe('loadUnsupported', () => {
  it('sets unsupported status with reason', () => {
    useAppStore.getState().loadUnsupported('No active tab.');
    const state = useAppStore.getState();
    expect(state.tabState).toEqual({ status: 'unsupported', reason: 'No active tab.' });
  });
});

describe('setCurrentUrl', () => {
  it('updates currentParsed from a new URL string', () => {
    useAppStore.getState().loadUrl('https://example.com/?a=1', 1);
    useAppStore.getState().setCurrentUrl('https://example.com/?x=99&y=hello');
    const params = useAppStore.getState().currentParsed?.params ?? [];
    expect(params).toHaveLength(2);
    expect(params[0]).toMatchObject({ key: 'x', value: '99' });
  });

  it('ignores invalid URLs silently', () => {
    useAppStore.getState().loadUrl('https://example.com/?a=1', 1);
    const before = useAppStore.getState().currentParsed;
    useAppStore.getState().setCurrentUrl('totally invalid');
    expect(useAppStore.getState().currentParsed).toEqual(before);
  });
});

describe('updateParamKey', () => {
  it('renames a parameter key by id', () => {
    useAppStore.getState().loadUrl('https://example.com/?foo=bar', 1);
    const id = useAppStore.getState().currentParsed!.params[0].id;
    useAppStore.getState().updateParamKey(id, 'newKey');
    expect(useAppStore.getState().currentParsed?.params[0].key).toBe('newKey');
  });

  it('does nothing when id does not match', () => {
    useAppStore.getState().loadUrl('https://example.com/?foo=bar', 1);
    useAppStore.getState().updateParamKey('nonexistent-id', 'x');
    expect(useAppStore.getState().currentParsed?.params[0].key).toBe('foo');
  });

  it('does nothing when currentParsed is null', () => {
    expect(() => useAppStore.getState().updateParamKey('x', 'y')).not.toThrow();
  });
});

describe('updateParamValue', () => {
  it('updates param value and re-detects type', () => {
    useAppStore.getState().loadUrl('https://example.com/?flag=hello', 1);
    const id = useAppStore.getState().currentParsed!.params[0].id;
    useAppStore.getState().updateParamValue(id, 'true');
    const p = useAppStore.getState().currentParsed!.params[0];
    expect(p.value).toBe('true');
    expect(p.type).toBe('boolean');
  });

  it('does nothing when id not found', () => {
    useAppStore.getState().loadUrl('https://example.com/?foo=bar', 1);
    useAppStore.getState().updateParamValue('bad-id', 'new');
    expect(useAppStore.getState().currentParsed?.params[0].value).toBe('bar');
  });
});

describe('toggleBooleanParam', () => {
  it('toggles "true" to "false"', () => {
    useAppStore.getState().loadUrl('https://example.com/?flag=true', 1);
    const id = useAppStore.getState().currentParsed!.params[0].id;
    useAppStore.getState().toggleBooleanParam(id);
    expect(useAppStore.getState().currentParsed?.params[0].value).toBe('false');
  });

  it('toggles "false" to "true"', () => {
    useAppStore.getState().loadUrl('https://example.com/?flag=false', 1);
    const id = useAppStore.getState().currentParsed!.params[0].id;
    useAppStore.getState().toggleBooleanParam(id);
    expect(useAppStore.getState().currentParsed?.params[0].value).toBe('true');
  });

  it('does nothing when currentParsed is null', () => {
    expect(() => useAppStore.getState().toggleBooleanParam('x')).not.toThrow();
  });
});

describe('removeParam', () => {
  it('removes param by id', () => {
    useAppStore.getState().loadUrl('https://example.com/?a=1&b=2', 1);
    const id = useAppStore.getState().currentParsed!.params[0].id;
    useAppStore.getState().removeParam(id);
    const params = useAppStore.getState().currentParsed!.params;
    expect(params).toHaveLength(1);
    expect(params[0].key).toBe('b');
  });

  it('sets an announcement with the param key', () => {
    useAppStore.getState().loadUrl('https://example.com/?myParam=1', 1);
    const id = useAppStore.getState().currentParsed!.params[0].id;
    useAppStore.getState().removeParam(id);
    expect(useAppStore.getState().announcement).toContain('myParam');
  });

  it('sets fallback announcement for unknown id', () => {
    useAppStore.getState().loadUrl('https://example.com/?a=1', 1);
    useAppStore.getState().removeParam('nonexistent');
    expect(useAppStore.getState().announcement).toBeTruthy();
  });
});

describe('addParam', () => {
  it('appends a new param', () => {
    useAppStore.getState().loadUrl('https://example.com/?a=1', 1);
    useAppStore.getState().addParam('newKey', 'newVal');
    const params = useAppStore.getState().currentParsed!.params;
    expect(params).toHaveLength(2);
    expect(params[1]).toMatchObject({ key: 'newKey', value: 'newVal' });
  });

  it('detects the type of the new param', () => {
    useAppStore.getState().loadUrl('https://example.com/', 1);
    useAppStore.getState().addParam('count', '42');
    const p = useAppStore.getState().currentParsed!.params[0];
    expect(p.type).toBe('number');
  });

  it('sets an announcement', () => {
    useAppStore.getState().loadUrl('https://example.com/', 1);
    useAppStore.getState().addParam('q', 'search');
    expect(useAppStore.getState().announcement).toContain('q');
  });

  it('does nothing when currentParsed is null', () => {
    expect(() => useAppStore.getState().addParam('k', 'v')).not.toThrow();
  });
});

describe('reset', () => {
  it('restores params from initialParsed', () => {
    useAppStore.getState().loadUrl('https://example.com/?a=1', 1);
    const id = useAppStore.getState().currentParsed!.params[0].id;
    useAppStore.getState().updateParamValue(id, 'modified');
    useAppStore.getState().reset();
    expect(useAppStore.getState().currentParsed?.params[0].value).toBe('1');
  });

  it('clones params on reset (no shared references)', () => {
    useAppStore.getState().loadUrl('https://example.com/?a=1', 1);
    useAppStore.getState().reset();
    const { currentParsed, initialParsed } = useAppStore.getState();
    expect(currentParsed?.params[0]).not.toBe(initialParsed?.params[0]);
  });

  it('sets announcement', () => {
    useAppStore.getState().loadUrl('https://example.com/?a=1', 1);
    useAppStore.getState().reset();
    expect(useAppStore.getState().announcement).toBeTruthy();
  });

  it('does nothing when initialParsed is null', () => {
    expect(() => useAppStore.getState().reset()).not.toThrow();
  });
});

describe('announce', () => {
  it('sets the announcement string', () => {
    useAppStore.getState().announce('Hello world');
    expect(useAppStore.getState().announcement).toBe('Hello world');
  });
});

describe('selectCurrentUrl', () => {
  it('returns empty string when no URL is loaded', () => {
    expect(selectCurrentUrl(useAppStore.getState())).toBe('');
  });

  it('returns the human-readable URL', () => {
    useAppStore.getState().loadUrl('https://example.com/?a=1', 1);
    const url = selectCurrentUrl(useAppStore.getState());
    expect(url).toContain('https://example.com/');
    expect(url).toContain('a=1');
  });
});

describe('selectNavUrl', () => {
  it('returns empty string when no URL is loaded', () => {
    expect(selectNavUrl(useAppStore.getState())).toBe('');
  });

  it('returns fully encoded URL', () => {
    useAppStore.getState().loadUrl('https://example.com/?q=hello', 1);
    const url = selectNavUrl(useAppStore.getState());
    expect(url).toContain('https://example.com/?q=hello');
  });
});
