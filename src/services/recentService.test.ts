import { beforeEach, describe, expect, it } from 'vitest';
import { RECENT_STORAGE_KEY } from '../constants/storage';
import { addRecentId, loadRecentIds, MAX_RECENT_IDS } from './recentService';

describe('recentService — persistence', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns an empty list when nothing was persisted', () => {
    expect(loadRecentIds()).toEqual([]);
  });

  it('returns an empty list for malformed JSON', () => {
    localStorage.setItem(RECENT_STORAGE_KEY, '{oops');
    expect(loadRecentIds()).toEqual([]);
  });

  it('drops non-numeric entries from persisted data', () => {
    localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify([1, 'two', null, 3, { id: 4 }]));
    expect(loadRecentIds()).toEqual([1, 3]);
  });

  it('returns an empty list when persisted data is not an array', () => {
    localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify({ id: 1 }));
    expect(loadRecentIds()).toEqual([]);
  });
});

describe('recentService — addRecentId', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('records a view newest first', () => {
    expect(addRecentId(1)).toEqual([1]);
    expect(addRecentId(2)).toEqual([2, 1]);
    expect(addRecentId(3)).toEqual([3, 2, 1]);
  });

  it('moves an existing id to the front instead of duplicating it', () => {
    addRecentId(1);
    addRecentId(2);
    const updated = addRecentId(1);
    expect(updated).toEqual([1, 2]);
  });

  it('caps the list at MAX_RECENT_IDS and drops the oldest', () => {
    const ids = [1, 2, 3, 4, 5];
    ids.forEach(id => addRecentId(id));
    expect(loadRecentIds()).toEqual([5, 4, 3, 2, 1]);

    const over = addRecentId(6);
    expect(over).toHaveLength(MAX_RECENT_IDS);
    expect(over).toEqual([6, 5, 4, 3, 2]);
    expect(over).not.toContain(1);
  });

  it('persists the updated list', () => {
    addRecentId(7);
    expect(loadRecentIds()).toEqual([7]);
  });

  it('is deterministic — the same view sequence always produces the same list', () => {
    const sequence = [3, 1, 2, 3, 4, 5, 1];
    sequence.forEach(id => addRecentId(id));
    const first = loadRecentIds();

    localStorage.clear();
    sequence.forEach(id => addRecentId(id));
    expect(loadRecentIds()).toEqual(first);
    expect(first).toEqual([1, 5, 4, 3, 2]);
  });
});
