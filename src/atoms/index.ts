import { atom } from 'jotai';
import { Message, ThemePreference } from '../types';

export const THEME_STORAGE_KEY = 'chat-ui-theme-preference';

const getInitialThemePreference = (): ThemePreference => {
  if (typeof window === 'undefined') {
    return { id: 'dava-orange', mode: 'dark' };
  }

  const storedPreference = window.localStorage.getItem(THEME_STORAGE_KEY);

  if (storedPreference) {
    try {
      const parsedPreference = JSON.parse(storedPreference) as ThemePreference;

      if (parsedPreference?.id && parsedPreference?.mode) {
        return parsedPreference;
      }
    } catch (error) {
      console.warn('Invalid theme preference found in storage', error);
    }
  }

  return { id: 'dava-orange', mode: 'dark' };
};

export const messagesAtom = atom<Message[]>([]);
export const respondingAtom = atom<boolean>(false);
export const themeAtom = atom<ThemePreference>(getInitialThemePreference());
