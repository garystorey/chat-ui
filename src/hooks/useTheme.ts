import { useAtom } from 'jotai';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { themeAtom, THEME_STORAGE_KEY } from '../atoms';
import { ThemeId, ThemeMode } from '../types';
import { THEME_OPTIONS } from '../config/themes';
import useToggleBodyClass from './useToggleBodyClass';

const prefersDarkSchemeQuery = '(prefers-color-scheme: dark)';
const highlightThemeHref: Record<ThemeMode, string> = {
  light: 'https://cdn.jsdelivr.net/npm/highlight.js@11.9.0/styles/github.min.css',
  dark: 'https://cdn.jsdelivr.net/npm/highlight.js@11.9.0/styles/github-dark.min.css',
};

const getPreferredThemeMode = (mediaQuery: { matches: boolean }): ThemeMode =>
  mediaQuery.matches ? 'dark' : 'light';

const getNextThemeMode = (current: ThemeMode): ThemeMode =>
  (current === 'light' ? 'dark' : 'light');

const useTheme = () => {
  const [themePreference, setThemePreference] = useAtom(themeAtom);
  const hasUserPreference = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const mediaQueryList = window.matchMedia(prefersDarkSchemeQuery);
    const storedPreference = window.localStorage.getItem(THEME_STORAGE_KEY);

    if (!storedPreference) {
      const preferredMode = getPreferredThemeMode(mediaQueryList);
      setThemePreference((currentPreference) =>
        currentPreference.mode !== preferredMode
          ? { ...currentPreference, mode: preferredMode }
          : currentPreference,
      );
    } else {
      hasUserPreference.current = true;
    }

    const handleChange = (event: MediaQueryListEvent) => {
      if (hasUserPreference.current) {
        return;
      }

      const preferredMode = getPreferredThemeMode(event);
      setThemePreference((currentPreference) =>
        currentPreference.mode !== preferredMode
          ? { ...currentPreference, mode: preferredMode }
          : currentPreference,
      );
    };

    mediaQueryList.addEventListener('change', handleChange);

    return () => {
      mediaQueryList.removeEventListener('change', handleChange);
    };
  }, [setThemePreference]);

  useToggleBodyClass('light', themePreference.mode === 'light');
  useToggleBodyClass('dark', themePreference.mode === 'dark');

  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }

    document.body.dataset.theme = themePreference.id;
  }, [themePreference.id]);

  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }

    const highlightThemeLink = document.getElementById('hljs-theme');
    if (highlightThemeLink) {
      highlightThemeLink.setAttribute('href', highlightThemeHref[themePreference.mode]);
    }
  }, [themePreference.mode]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    hasUserPreference.current = true;
    window.localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(themePreference));
  }, [themePreference]);

  const toggleMode = useCallback(() => {
    setThemePreference((currentPreference) => ({
      ...currentPreference,
      mode: getNextThemeMode(currentPreference.mode),
    }));
  }, [setThemePreference]);

  const setThemeId = useCallback(
    (themeId: ThemeId) => {
      setThemePreference((currentPreference) =>
        currentPreference.id === themeId
          ? currentPreference
          : { ...currentPreference, id: themeId },
      );
    },
    [setThemePreference],
  );

  const setMode = useCallback(
    (mode: ThemeMode) => {
      setThemePreference((currentPreference) =>
        currentPreference.mode === mode
          ? currentPreference
          : { ...currentPreference, mode },
      );
    },
    [setThemePreference],
  );

  const isLight = useMemo(() => themePreference.mode === 'light', [themePreference.mode]);
  const activeTheme = useMemo(
    () => THEME_OPTIONS.find((option) => option.id === themePreference.id) ?? THEME_OPTIONS[0],
    [themePreference.id],
  );

  return {
    themeId: themePreference.id,
    mode: themePreference.mode,
    setThemeId,
    setMode,
    toggleMode,
    isLight,
    themes: THEME_OPTIONS,
    activeTheme,
  };
};

export default useTheme;
