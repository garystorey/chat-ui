import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import type React from 'react';
import useLatestRef from '../../src/hooks/useLatestRef';
import useToggleBodyClass from '../../src/hooks/useToggleBodyClass';
import usePrefersReducedMotion from '../../src/hooks/usePrefersReducedMotion';
import useScrollToBottom from '../../src/hooks/useScrollToBottom';
import useAutoResizeTextarea from '../../src/hooks/useAutoResizeTextarea';

type MutableMediaQueryList = Omit<MediaQueryList, 'matches'> & { matches: boolean };

const setMockMatchMedia = (matches: boolean) => {
  const listeners = new Set<(event: MediaQueryListEvent) => void>();
  const addChangeListener: MediaQueryList['addEventListener'] = (
    _event: keyof MediaQueryListEventMap | string,
    listener: EventListenerOrEventListenerObject,
  ) => {
    if (typeof listener === 'function') {
      listeners.add(listener as (event: MediaQueryListEvent) => void);
    } else if ('handleEvent' in listener && typeof listener.handleEvent === 'function') {
      listeners.add(listener.handleEvent as (event: MediaQueryListEvent) => void);
    }
  };

  const removeChangeListener: MediaQueryList['removeEventListener'] = (
    _event: keyof MediaQueryListEventMap | string,
    listener: EventListenerOrEventListenerObject,
  ) => {
    if (typeof listener === 'function') {
      listeners.delete(listener as (event: MediaQueryListEvent) => void);
    } else if ('handleEvent' in listener && typeof listener.handleEvent === 'function') {
      listeners.delete(listener.handleEvent as (event: MediaQueryListEvent) => void);
    }
  };

  const addLegacyListener: MediaQueryList['addListener'] = (listener) => {
    listeners.add(listener as (event: MediaQueryListEvent) => void);
  };

  const removeLegacyListener: MediaQueryList['removeListener'] = (listener) => {
    listeners.delete(listener as (event: MediaQueryListEvent) => void);
  };

  const mediaQueryList: MutableMediaQueryList = {
    matches,
    media: '(prefers-reduced-motion: reduce)',
    addEventListener: addChangeListener,
    removeEventListener: removeChangeListener,
    addListener: addLegacyListener,
    removeListener: removeLegacyListener,
    dispatchEvent: () => true,
    onchange: null,
  };

  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation(() => mediaQueryList),
  });

  return (nextMatches: boolean) => {
    mediaQueryList.matches = nextMatches;
    listeners.forEach((listener) => listener({ matches: nextMatches } as MediaQueryListEvent));
  };
};

afterEach(() => {
  document.body.className = '';
  vi.restoreAllMocks();
  Reflect.deleteProperty(window, 'matchMedia');
});

describe('useLatestRef', () => {
  it('keeps ref current value in sync with the latest value', () => {
    const { result, rerender } = renderHook(({ value }) => useLatestRef(value), {
      initialProps: { value: 'initial' },
    });

    expect(result.current.current).toBe('initial');

    rerender({ value: 'updated' });

    expect(result.current.current).toBe('updated');
  });
});

describe('useToggleBodyClass', () => {
  it('adds and removes body classes as the flag changes', () => {
    const { rerender, unmount } = renderHook(({ active }) => useToggleBodyClass('toggle-class', active), {
      initialProps: { active: true },
    });

    expect(document.body.classList.contains('toggle-class')).toBe(true);

    rerender({ active: false });

    expect(document.body.classList.contains('toggle-class')).toBe(false);

    rerender({ active: true });
    unmount();

    expect(document.body.classList.contains('toggle-class')).toBe(false);
  });
});

describe('usePrefersReducedMotion', () => {
  it('reflects the current media query value and responds to changes', async () => {
    const triggerChange = setMockMatchMedia(true);

    const { result } = renderHook(() => usePrefersReducedMotion());

    expect(result.current).toBe(true);

    act(() => triggerChange(false));

    await waitFor(() => {
      expect(result.current).toBe(false);
    });
  });
});

describe('useScrollToBottom', () => {
  it('scrolls to the bottom of the referenced element when dependencies change', async () => {
    const element = document.createElement('div');
    Object.defineProperty(element, 'scrollHeight', { value: 500, configurable: true });
    const scrollTo = vi.fn();
    element.scrollTo = scrollTo;
    const ref = { current: element } as React.RefObject<HTMLDivElement>;

    const { rerender } = renderHook(({ deps, behavior }) => useScrollToBottom(ref, deps, { behavior }), {
      initialProps: { deps: [1], behavior: 'smooth' as ScrollBehavior },
    });

    await waitFor(() => {
      expect(scrollTo).toHaveBeenCalledWith({ top: 500, behavior: 'smooth' });
    });

    rerender({ deps: [1, 2], behavior: 'auto' });

    await waitFor(() => {
      expect(scrollTo).toHaveBeenLastCalledWith({ top: 500, behavior: 'auto' });
    });
  });
});

describe('useAutoResizeTextarea', () => {
  it('sets the textarea height to its scroll height when the value changes', async () => {
    const textarea = document.createElement('textarea');
    textarea.style.height = '10px';
    Object.defineProperty(textarea, 'scrollHeight', { value: 120, configurable: true });
    const ref = { current: textarea } as React.RefObject<HTMLTextAreaElement>;

    const { rerender } = renderHook(({ value }) => useAutoResizeTextarea(ref, value), {
      initialProps: { value: 'first' },
    });

    await waitFor(() => {
      expect(textarea.style.height).toBe('120px');
    });

    Object.defineProperty(textarea, 'scrollHeight', { value: 80, configurable: true });
    rerender({ value: 'second' });

    await waitFor(() => {
      expect(textarea.style.height).toBe('80px');
    });
  });
});
