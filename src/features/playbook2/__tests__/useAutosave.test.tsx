import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fullLibrary } from '../../../football-core';
import { useAutosave } from '../editor/useAutosave';
import { newBlankPlay, type PlayV2 } from '../playModel';

const doubles = fullLibrary().formations.find(f => f.id === 'doubles')!;
const KEY = 'pb2:draft:t1';

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe('useAutosave', () => {
  it('writes while dirty (debounced) and offers the draft back after remount', () => {
    const play = { ...newBlankPlay('t1', doubles), name: 'Half-done' };
    const first = renderHook(({ p, d }: { p: PlayV2; d: boolean }) => useAutosave(KEY, p, d), {
      initialProps: { p: play, d: true },
    });
    expect(localStorage.getItem(KEY)).toBeNull();
    act(() => vi.advanceTimersByTime(500));
    const stored = JSON.parse(localStorage.getItem(KEY)!);
    expect(stored.name).toBe('Half-done');
    expect(stored).not.toHaveProperty('past');
    expect(stored).not.toHaveProperty('future');
    first.unmount();

    const second = renderHook(() => useAutosave(KEY, newBlankPlay('t1', doubles), false));
    expect(second.result.current.restorable?.name).toBe('Half-done');
  });

  it('switching views before the debounce fires still keeps the draft', () => {
    const play = { ...newBlankPlay('t1', doubles), name: 'Quick edit' };
    const h = renderHook(() => useAutosave(KEY, play, true));
    act(() => vi.advanceTimersByTime(100));
    h.unmount();
    expect(JSON.parse(localStorage.getItem(KEY)!).name).toBe('Quick edit');
  });

  it('closing the tab (pagehide) writes the draft at once', () => {
    const play = { ...newBlankPlay('t1', doubles), name: 'Closing' };
    renderHook(() => useAutosave(KEY, play, true));
    window.dispatchEvent(new Event('pagehide'));
    expect(JSON.parse(localStorage.getItem(KEY)!).name).toBe('Closing');
  });

  it('does not write while clean', () => {
    renderHook(() => useAutosave(KEY, newBlankPlay('t1', doubles), false));
    act(() => vi.advanceTimersByTime(1000));
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it('discard clears the stored draft', () => {
    localStorage.setItem(KEY, JSON.stringify({ ...newBlankPlay('t1', doubles), name: 'Old' }));
    const { result } = renderHook(() => useAutosave(KEY, newBlankPlay('t1', doubles), false));
    expect(result.current.restorable?.name).toBe('Old');
    act(() => result.current.discard());
    expect(result.current.restorable).toBeNull();
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it('loading another play (dirty goes back to false) keeps the draft; clear() removes it after a save', () => {
    const play = newBlankPlay('t1', doubles);
    const h = renderHook(({ d }: { d: boolean }) => useAutosave(KEY, play, d), { initialProps: { d: true } });
    act(() => vi.advanceTimersByTime(500));
    h.rerender({ d: false });
    expect(localStorage.getItem(KEY)).not.toBeNull();
    act(() => h.result.current.clear());
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it('offer() stores a play at once and offers it back without a remount', () => {
    const { result } = renderHook(() => useAutosave(KEY, newBlankPlay('t1', doubles), false));
    expect(result.current.restorable).toBeNull();
    act(() => result.current.offer({ ...newBlankPlay('t1', doubles), name: 'Left behind' }));
    expect(result.current.restorable?.name).toBe('Left behind');
    expect(JSON.parse(localStorage.getItem(KEY)!).name).toBe('Left behind');
  });

  it('ignores a stored value that is not a version-2 play', () => {
    localStorage.setItem(KEY, '{"name":"junk"}');
    const { result } = renderHook(() => useAutosave(KEY, newBlankPlay('t1', doubles), false));
    expect(result.current.restorable).toBeNull();
  });
});
