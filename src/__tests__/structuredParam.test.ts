import { describe, it, expect } from 'vitest';
import {
  isStructured,
  parseStructuredValue,
  serializeStructuredValue,
  shortPreview,
  setAtPath,
  getAtPath,
  coerceLeaf,
  isContainer,
  renameKeyAtPath,
} from '@/lib/structuredParam';

describe('isStructured', () => {
  it('returns true for JSON object', () => expect(isStructured('{"a":1}')).toBe(true));
  it('returns true for JSON array', () => expect(isStructured('[1,2,3]')).toBe(true));
  it('returns true for whitespace-padded object', () => expect(isStructured('  {"x":1}  ')).toBe(true));
  it('returns false for plain string', () => expect(isStructured('hello')).toBe(false));
  it('returns false for number string', () => expect(isStructured('42')).toBe(false));
  it('returns false for "null"', () => expect(isStructured('null')).toBe(false));
  it('returns false for boolean "true"', () => expect(isStructured('true')).toBe(false));
  it('returns false for malformed JSON starting with {', () => expect(isStructured('{bad json}')).toBe(false));
  it('returns false for empty string', () => expect(isStructured('')).toBe(false));
});

describe('parseStructuredValue', () => {
  it('parses JSON object', () => {
    expect(parseStructuredValue('{"a":1}')).toEqual({ a: 1 });
  });

  it('parses JSON array', () => {
    expect(parseStructuredValue('[1,"two",true]')).toEqual([1, 'two', true]);
  });

  it('parses nested structures', () => {
    expect(parseStructuredValue('{"nested":{"x":42}}')).toEqual({ nested: { x: 42 } });
  });
});

describe('serializeStructuredValue', () => {
  it('serializes object to JSON string', () => {
    expect(serializeStructuredValue({ a: 1 })).toBe('{"a":1}');
  });

  it('serializes array to JSON string', () => {
    expect(serializeStructuredValue([1, 2, 3])).toBe('[1,2,3]');
  });

  it('serializes null', () => {
    expect(serializeStructuredValue(null)).toBe('null');
  });
});

describe('shortPreview', () => {
  it('previews empty array as "[ ]"', () => expect(shortPreview([])).toBe('[ ]'));

  it('previews array with items', () => {
    expect(shortPreview([1, 2, 3])).toBe('[1, 2, 3]');
  });

  it('previews array with more than 3 items, shows ellipsis', () => {
    expect(shortPreview([1, 2, 3, 4])).toBe('[1, 2, 3, …]');
  });

  it('previews empty object as "{ }"', () => expect(shortPreview({})).toBe('{ }'));

  it('previews object with up to 2 entries', () => {
    expect(shortPreview({ a: 1, b: 2 })).toBe('{"a":1,"b":2}');
  });

  it('previews object with more than 2 entries, shows ellipsis', () => {
    expect(shortPreview({ a: 1, b: 2, c: 3 })).toBe('{"a":1,"b":2,…}');
  });

  it('previews non-object/non-array value with JSON.stringify', () => {
    expect(shortPreview('hello')).toBe('"hello"');
    expect(shortPreview(42)).toBe('42');
    expect(shortPreview(true)).toBe('true');
  });
});

describe('setAtPath', () => {
  it('sets value at a string key', () => {
    expect(setAtPath({ a: 1 }, ['a'], 99)).toEqual({ a: 99 });
  });

  it('sets value at a numeric index in array', () => {
    expect(setAtPath([1, 2, 3], [1], 'x')).toEqual([1, 'x', 3]);
  });

  it('creates nested path that does not exist', () => {
    expect(setAtPath({}, ['a', 'b'], 42)).toEqual({ a: { b: 42 } });
  });

  it('returns newValue when path is empty', () => {
    expect(setAtPath({ a: 1 }, [], 'new')).toBe('new');
  });

  it('does not mutate the original object', () => {
    const root = { a: 1 };
    setAtPath(root, ['a'], 99);
    expect(root.a).toBe(1);
  });

  it('handles number key creating array', () => {
    expect(setAtPath(null, [0], 'first')).toEqual(['first']);
  });

  it('handles mixed path (object then array index)', () => {
    const root = { items: [10, 20, 30] };
    expect(setAtPath(root, ['items', 1], 'changed')).toEqual({ items: [10, 'changed', 30] });
  });
});

describe('getAtPath', () => {
  it('gets value at a string key', () => {
    expect(getAtPath({ a: 42 }, ['a'])).toBe(42);
  });

  it('gets nested value', () => {
    expect(getAtPath({ a: { b: 'hello' } }, ['a', 'b'])).toBe('hello');
  });

  it('gets array element by index', () => {
    expect(getAtPath([10, 20, 30], [2])).toBe(30);
  });

  it('returns undefined for missing key', () => {
    expect(getAtPath({ a: 1 }, ['b'])).toBeUndefined();
  });

  it('returns undefined when traversing non-object', () => {
    expect(getAtPath({ a: 'string' }, ['a', 'nested'])).toBeUndefined();
  });

  it('returns root for empty path', () => {
    const root = { x: 1 };
    expect(getAtPath(root, [])).toBe(root);
  });
});

describe('coerceLeaf', () => {
  it('returns null when original is null', () => {
    expect(coerceLeaf('anything', null)).toBeNull();
  });

  it('coerces to true when original is boolean and draft is "true"', () => {
    expect(coerceLeaf('true', false)).toBe(true);
  });

  it('coerces to false when original is boolean and draft is "false"', () => {
    expect(coerceLeaf('false', true)).toBe(false);
  });

  it('coerces string to number when original is number', () => {
    expect(coerceLeaf('3.14', 0)).toBe(3.14);
  });

  it('returns string as-is when coercion to number fails (NaN)', () => {
    expect(coerceLeaf('abc', 0)).toBe('abc');
  });

  it('returns draft string when original is a string', () => {
    expect(coerceLeaf('newValue', 'old')).toBe('newValue');
  });
});

describe('isContainer', () => {
  it('returns true for plain object', () => expect(isContainer({ a: 1 })).toBe(true));
  it('returns true for array', () => expect(isContainer([1, 2])).toBe(true));
  it('returns false for null', () => expect(isContainer(null)).toBe(false));
  it('returns false for string', () => expect(isContainer('hello')).toBe(false));
  it('returns false for number', () => expect(isContainer(42)).toBe(false));
  it('returns false for boolean', () => expect(isContainer(true)).toBe(false));
  it('returns false for undefined', () => expect(isContainer(undefined)).toBe(false));
});

describe('renameKeyAtPath', () => {
  it('renames a key in an object', () => {
    const root = { a: 1, b: 2 };
    expect(renameKeyAtPath(root, [], 'a', 'x')).toEqual({ x: 1, b: 2 });
  });

  it('preserves key order when renaming', () => {
    const root = { a: 1, b: 2, c: 3 };
    const result = renameKeyAtPath(root, [], 'b', 'z') as Record<string, unknown>;
    expect(Object.keys(result)).toEqual(['a', 'z', 'c']);
  });

  it('returns root unchanged when newKey === oldKey', () => {
    const root = { a: 1 };
    expect(renameKeyAtPath(root, [], 'a', 'a')).toBe(root);
  });

  it('returns root unchanged when newKey is empty', () => {
    const root = { a: 1 };
    expect(renameKeyAtPath(root, [], 'a', '')).toBe(root);
  });

  it('returns root unchanged when target is not a plain object', () => {
    const root = { arr: [1, 2, 3] };
    expect(renameKeyAtPath(root, ['arr'], '0', 'x')).toBe(root);
  });

  it('renames at a nested path', () => {
    const root = { nested: { x: 10, y: 20 } };
    expect(renameKeyAtPath(root, ['nested'], 'x', 'renamed')).toEqual({
      nested: { renamed: 10, y: 20 },
    });
  });

  it('does not mutate original object', () => {
    const root = { a: 1 };
    renameKeyAtPath(root, [], 'a', 'b');
    expect(root).toEqual({ a: 1 });
  });
});
