import { beforeEach, describe, expect, it } from 'vitest';
import { storage } from './storage';

const KEY = 'test-key';

describe('storage wrapper', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns the fallback when the key is missing', () => {
    expect(storage.get(KEY, 'default')).toBe('default');
    expect(storage.getRaw(KEY, 'raw-default')).toBe('raw-default');
  });

  it('round-trips JSON values', () => {
    const value = { a: 1, b: ['x', 'y'] };
    storage.set(KEY, value);
    expect(storage.get(KEY, null)).toEqual(value);
  });

  it('persists across separate reads', () => {
    storage.set(KEY, [1, 2, 3]);
    expect(storage.get<number[]>(KEY, [])).toEqual([1, 2, 3]);
  });

  it('returns the fallback for malformed JSON', () => {
    localStorage.setItem(KEY, '{not json');
    expect(storage.get(KEY, 'default')).toBe('default');
  });

  it('rejects values that fail the type guard', () => {
    localStorage.setItem(KEY, JSON.stringify('not-an-array'));
    const isArray = (v: unknown): v is string[] => Array.isArray(v);
    expect(storage.get<string[]>(KEY, [], isArray)).toEqual([]);

    localStorage.setItem(KEY, JSON.stringify([1, 'two']));
    const isNumberArray = (v: unknown): v is number[] =>
      Array.isArray(v) && v.every(n => typeof n === 'number');
    expect(storage.get<number[]>(KEY, [1], isNumberArray)).toEqual([1]);
  });

  it('stores and reads raw strings', () => {
    storage.setRaw(KEY, 'dark');
    expect(storage.getRaw(KEY, 'light')).toBe('dark');
    expect(storage.getRaw('missing', 'light')).toBe('light');
  });

  it('removes keys', () => {
    storage.set(KEY, { x: 1 });
    storage.remove(KEY);
    expect(storage.get(KEY, null)).toBeNull();
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it('does not throw when storage is unavailable', () => {
    const original = window.localStorage;
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: undefined,
    });
    expect(() => {
      storage.set(KEY, { x: 1 });
      storage.remove(KEY);
      expect(storage.get(KEY, 'fallback')).toBe('fallback');
    }).not.toThrow();
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: original,
    });
  });
});
