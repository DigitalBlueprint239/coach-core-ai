import { renderHook, act } from '@testing-library/react';
import { useHistory } from './useHistory';

describe('useHistory', () => {
  it('initializes with the provided state', () => {
    const { result } = renderHook(() => useHistory({ count: 0 }));
    expect(result.current.state).toEqual({ count: 0 });
  });

  it('updates state with setState', () => {
    const { result } = renderHook(() => useHistory({ count: 0 }));
    act(() => {
      result.current.setState({ count: 1 });
    });
    expect(result.current.state).toEqual({ count: 1 });
  });

  it('supports undo after state change', () => {
    const { result } = renderHook(() => useHistory({ count: 0 }));
    act(() => {
      result.current.setState({ count: 1 });
    });
    expect(result.current.canUndo).toBe(true);
    act(() => {
      result.current.undo();
    });
    expect(result.current.state).toEqual({ count: 0 });
  });

  it('supports redo after undo', () => {
    const { result } = renderHook(() => useHistory({ count: 0 }));
    act(() => {
      result.current.setState({ count: 1 });
    });
    act(() => {
      result.current.undo();
    });
    expect(result.current.canRedo).toBe(true);
    act(() => {
      result.current.redo();
    });
    expect(result.current.state).toEqual({ count: 1 });
  });

  it('does not commit when { commit: false }', () => {
    const { result } = renderHook(() => useHistory({ count: 0 }));
    act(() => {
      result.current.setState({ count: 1 }, { commit: false });
    });
    expect(result.current.state).toEqual({ count: 1 });
    expect(result.current.canUndo).toBe(false);
  });

  it('clears redo stack on new state change', () => {
    const { result } = renderHook(() => useHistory({ count: 0 }));
    act(() => {
      result.current.setState({ count: 1 });
    });
    act(() => {
      result.current.undo();
    });
    expect(result.current.canRedo).toBe(true);
    act(() => {
      result.current.setState({ count: 2 });
    });
    expect(result.current.canRedo).toBe(false);
  });

  it('reset clears history stacks', () => {
    const { result } = renderHook(() => useHistory({ count: 0 }));
    act(() => {
      result.current.setState({ count: 1 });
      result.current.setState({ count: 2 });
    });
    act(() => {
      result.current.reset({ count: 99 });
    });
    expect(result.current.state).toEqual({ count: 99 });
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
  });

  it('accepts a function updater', () => {
    const { result } = renderHook(() => useHistory({ count: 0 }));
    act(() => {
      result.current.setState((prev) => ({ count: prev.count + 5 }));
    });
    expect(result.current.state).toEqual({ count: 5 });
  });
});
