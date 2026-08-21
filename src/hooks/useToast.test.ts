import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useToast } from './useToast';

describe('useToast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('adds toasts with unique ids and types', () => {
    vi.setSystemTime(new Date(1000));
    const { result } = renderHook(() => useToast());
    act(() => result.current.addToast('Added!'));
    vi.setSystemTime(new Date(2000));
    act(() => result.current.addToast('Heads up', 'info'));
    expect(result.current.toasts).toHaveLength(2);
    expect(result.current.toasts[0].message).toBe('Added!');
    expect(result.current.toasts[0].type).toBe('success');
    expect(result.current.toasts[1].type).toBe('info');
    expect(new Set(result.current.toasts.map(t => t.id)).size).toBe(2);
  });

  it('removes a specific toast by id', () => {
    vi.setSystemTime(new Date(1000));
    const { result } = renderHook(() => useToast());
    act(() => result.current.addToast('A'));
    vi.setSystemTime(new Date(2000));
    act(() => result.current.addToast('B'));
    act(() => result.current.removeToast(result.current.toasts[0].id));
    expect(result.current.toasts.map(t => t.message)).toEqual(['B']);
  });

  it('auto-dismisses the oldest toast after the timeout', () => {
    const { result } = renderHook(() => useToast());
    act(() => result.current.addToast('A'));
    act(() => result.current.addToast('B'));
    expect(result.current.toasts).toHaveLength(2);

    act(() => vi.advanceTimersByTime(3000));
    expect(result.current.toasts.map(t => t.message)).toEqual(['B']);

    act(() => vi.advanceTimersByTime(3000));
    expect(result.current.toasts).toEqual([]);
  });

  it('does not schedule a timer while the queue is empty', () => {
    const { result } = renderHook(() => useToast());
    expect(result.current.toasts).toEqual([]);
    act(() => vi.advanceTimersByTime(10000));
    expect(result.current.toasts).toEqual([]);
  });
});
