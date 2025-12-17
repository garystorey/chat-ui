import { ThemeId } from '../types';

export type ThemeOption = {
  id: ThemeId;
  label: string;
};

export const THEME_OPTIONS: ThemeOption[] = [
  { id: 'dava-orange', label: 'Dava Orange' },
  { id: 'dragula', label: 'Dragula' },
  { id: 'ayu', label: 'Ayu' },
  { id: 'one-dark-pro', label: 'One Dark' },
  { id: 'cappuccino', label: 'Cappuccino' },
  { id: 'owl', label: 'Night Owl' },
  { id: 'monokai-pro', label: 'Monokai' },
  { id: 'github', label: 'GitHub' },
  { id: 'solarized', label: 'Solarized' },
  { id: 'nord', label: 'Nord' },
  { id: 'tokyo-night', label: 'Tokyo Night' },
  { id: 'material-theme', label: 'Material' },
  { id: 'gruvbox', label: 'Gruvbox' },
  { id: 'high-contrast', label: 'High Contrast' },
];
