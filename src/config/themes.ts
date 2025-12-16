import { ThemeId } from '../types';

export type ThemeOption = {
  id: ThemeId;
  label: string;
};

export const THEME_OPTIONS: ThemeOption[] = [
  { id: 'dava-orange', label: 'Dava Orange' },
  { id: 'dragula', label: 'Dragula' },
  { id: 'ayu', label: 'Ayu' },
  { id: 'one-dark-pro', label: 'One Dark Pro' },
  { id: 'cappuccino', label: 'Cappuccino' },
  { id: 'owl', label: 'Night Owl / Light Owl' },
  { id: 'monokai-pro', label: 'Monokai Pro' },
  { id: 'github', label: 'GitHub' },
];
