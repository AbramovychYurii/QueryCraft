import { describe, it, expect } from 'vitest';
import { parseUrl, serializeUrl, serializeUrlForNav, isEditableUrl, createParam } from '@/lib/urlParser';

describe('parseUrl', () => {
  it('parses a simple URL with query params', () => {
    const result = parseUrl('https://example.com/?foo=bar&baz=qux');
    expect(result.base).toBe('https://example.com/');
    expect(result.params).toHaveLength(2);
    expect(result.params[0]).toMatchObject({ key: 'foo', value: 'bar', type: 'string' });
    expect(result.params[1]).toMatchObject({ key: 'baz', value: 'qux', type: 'string' });
    expect(result.fragment).toBe('');
    expect(result.hashQuery).toBe(false);
  });

  it('assigns unique ids to each param', () => {
    const result = parseUrl('https://example.com/?a=1&b=2');
    expect(result.params[0].id).toBeTruthy();
    expect(result.params[1].id).toBeTruthy();
    expect(result.params[0].id).not.toBe(result.params[1].id);
  });

  it('parses URL with no query params', () => {
    const result = parseUrl('https://example.com/path');
    expect(result.base).toBe('https://example.com/path');
    expect(result.params).toHaveLength(0);
    expect(result.fragment).toBe('');
  });

  it('preserves fragment (#hash)', () => {
    const result = parseUrl('https://example.com/page?q=1#section');
    expect(result.fragment).toBe('#section');
    expect(result.hashQuery).toBe(false);
    expect(result.params[0]).toMatchObject({ key: 'q', value: '1' });
  });

  it('detects hash-router pattern (query inside hash)', () => {
    const result = parseUrl('https://app.com/#/route?foo=bar&page=2');
    expect(result.hashQuery).toBe(true);
    expect(result.fragment).toBe('#/route');
    expect(result.params).toHaveLength(2);
    expect(result.params[0]).toMatchObject({ key: 'foo', value: 'bar' });
    expect(result.params[1]).toMatchObject({ key: 'page', value: '2', type: 'number' });
  });

  it('normalizes JSON object values (strips whitespace)', () => {
    const json = encodeURIComponent('{"a": 1, "b": 2}');
    const result = parseUrl(`https://example.com/?data=${json}`);
    expect(result.params[0].value).toBe('{"a":1,"b":2}');
    expect(result.params[0].type).toBe('structured');
  });

  it('normalizes JSON array values', () => {
    const json = encodeURIComponent('[ 1 , 2 ]');
    const result = parseUrl(`https://example.com/?arr=${json}`);
    expect(result.params[0].value).toBe('[1,2]');
  });

  it('leaves non-JSON values unchanged', () => {
    const result = parseUrl('https://example.com/?name=John+Doe');
    expect(result.params[0].value).toBe('John Doe');
  });

  it('detects boolean param type', () => {
    const result = parseUrl('https://example.com/?flag=true');
    expect(result.params[0].type).toBe('boolean');
  });

  it('detects number param type', () => {
    const result = parseUrl('https://example.com/?count=42');
    expect(result.params[0].type).toBe('number');
  });

  it('throws on invalid URL', () => {
    expect(() => parseUrl('not-a-url')).toThrow();
    expect(() => parseUrl('')).toThrow();
  });

  it('preserves param order', () => {
    const result = parseUrl('https://example.com/?z=last&a=first&m=mid');
    expect(result.params.map((p) => p.key)).toEqual(['z', 'a', 'm']);
  });

  it('handles duplicate keys', () => {
    const result = parseUrl('https://example.com/?tag=a&tag=b');
    expect(result.params).toHaveLength(2);
    expect(result.params[0]).toMatchObject({ key: 'tag', value: 'a' });
    expect(result.params[1]).toMatchObject({ key: 'tag', value: 'b' });
  });

  it('handles percent-encoded values', () => {
    const result = parseUrl('https://example.com/?q=hello%20world');
    expect(result.params[0].value).toBe('hello world');
  });
});

describe('serializeUrl', () => {
  it('serializes a basic parsed URL', () => {
    const parsed = parseUrl('https://example.com/?foo=bar&baz=1');
    expect(serializeUrl(parsed)).toBe('https://example.com/?foo=bar&baz=1');
  });

  it('serializes URL with no params', () => {
    const parsed = parseUrl('https://example.com/path');
    expect(serializeUrl(parsed)).toBe('https://example.com/path');
  });

  it('appends fragment after params', () => {
    const parsed = parseUrl('https://example.com/?q=test#section');
    expect(serializeUrl(parsed)).toBe('https://example.com/?q=test#section');
  });

  it('serializes hash-router URL', () => {
    const parsed = parseUrl('https://app.com/#/route?foo=bar');
    expect(serializeUrl(parsed)).toBe('https://app.com/#/route?foo=bar');
  });

  it('skips params with empty key', () => {
    const parsed = parseUrl('https://example.com/?foo=bar');
    parsed.params.push({ id: 'x', key: '', value: 'orphan', type: 'string' });
    const url = serializeUrl(parsed);
    expect(url).not.toContain('orphan');
    expect(url).toContain('foo=bar');
  });

  it('encodes & in values', () => {
    const parsed = parseUrl('https://example.com/');
    parsed.params = [{ id: '1', key: 'q', value: 'a&b', type: 'string' }];
    expect(serializeUrl(parsed)).toBe('https://example.com/?q=a%26b');
  });

  it('encodes = in keys', () => {
    const parsed = parseUrl('https://example.com/');
    parsed.params = [{ id: '1', key: 'k=ey', value: 'val', type: 'string' }];
    expect(serializeUrl(parsed)).toBe('https://example.com/?k%3Dey=val');
  });

  it('keeps Unicode characters human-readable', () => {
    const parsed = parseUrl('https://example.com/');
    parsed.params = [{ id: '1', key: 'q', value: 'привет', type: 'string' }];
    expect(serializeUrl(parsed)).toContain('привет');
  });

  it('serializes hash-router with no params (no trailing ?)', () => {
    const parsed = parseUrl('https://app.com/#/route?foo=bar');
    parsed.params = [];
    expect(serializeUrl(parsed)).toBe('https://app.com/#/route');
  });
});

describe('serializeUrlForNav', () => {
  it('fully percent-encodes keys and values', () => {
    const parsed = parseUrl('https://example.com/');
    parsed.params = [{ id: '1', key: 'q', value: 'hello world', type: 'string' }];
    const url = serializeUrlForNav(parsed);
    expect(url).toBe('https://example.com/?q=hello%20world');
  });

  it('encodes Cyrillic characters', () => {
    const parsed = parseUrl('https://example.com/');
    parsed.params = [{ id: '1', key: 'q', value: 'привет', type: 'string' }];
    const url = serializeUrlForNav(parsed);
    expect(url).toContain('%D0%BF%D1%80%D0%B8%D0%B2%D0%B5%D1%82');
  });

  it('skips params with empty key', () => {
    const parsed = parseUrl('https://example.com/?foo=bar');
    parsed.params.push({ id: 'x', key: '', value: 'val', type: 'string' });
    expect(serializeUrlForNav(parsed)).not.toContain('val');
  });

  it('handles hash-router mode', () => {
    const parsed = parseUrl('https://app.com/#/route?foo=bar');
    const url = serializeUrlForNav(parsed);
    expect(url).toBe('https://app.com/#/route?foo=bar');
  });
});

describe('isEditableUrl', () => {
  it('accepts http', () => expect(isEditableUrl('http://example.com')).toBe(true));
  it('accepts https', () => expect(isEditableUrl('https://example.com')).toBe(true));
  it('accepts file', () => expect(isEditableUrl('file:///path/to/file.html')).toBe(true));
  it('rejects chrome://', () => expect(isEditableUrl('chrome://settings')).toBe(false));
  it('rejects about:blank', () => expect(isEditableUrl('about:blank')).toBe(false));
  it('rejects devtools://', () => expect(isEditableUrl('devtools://inspector')).toBe(false));
  it('rejects empty string', () => expect(isEditableUrl('')).toBe(false));
  it('rejects garbage input', () => expect(isEditableUrl('not a url')).toBe(false));
});

describe('createParam', () => {
  it('creates param with defaults', () => {
    const p = createParam();
    expect(p.key).toBe('');
    expect(p.value).toBe('');
    expect(p.type).toBe('string');
    expect(p.id).toBeTruthy();
  });

  it('creates param with custom values', () => {
    const p = createParam('myKey', 'myValue', 'number');
    expect(p.key).toBe('myKey');
    expect(p.value).toBe('myValue');
    expect(p.type).toBe('number');
  });

  it('each call generates a unique id', () => {
    const ids = new Set(Array.from({ length: 20 }, () => createParam().id));
    expect(ids.size).toBe(20);
  });
});
