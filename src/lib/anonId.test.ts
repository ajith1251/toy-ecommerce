import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ANON_ID_STORAGE_KEY } from '../constants/storage';
import { getClientId } from './anonId';

describe('getClientId', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('creates and persists an id on first use', () => {
    const id = getClientId();
    expect(id).toMatch(/^[A-Za-z0-9-]{8,128}$/);
    expect(JSON.parse(localStorage.getItem(ANON_ID_STORAGE_KEY) ?? 'null')).toBe(id);
  });

  it('returns the same id across calls', () => {
    const first = getClientId();
    expect(getClientId()).toBe(first);
  });

  it('rejects malformed persisted ids and replaces them', () => {
    localStorage.setItem(ANON_ID_STORAGE_KEY, JSON.stringify('bad!'));
    const id = getClientId();
    expect(id).not.toBe('bad!');
    expect(id).toMatch(/^[A-Za-z0-9-]{8,128}$/);
  });
});
