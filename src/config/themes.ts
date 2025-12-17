import { ThemeId } from '../types';

export type ThemeOption = {
  id: ThemeId;
  label: string;
};

export const THEME_OPTIONS: ThemeOption[] = [
  { id: 'ayu', label: 'Ayu' },
  { id: 'cappuccino', label: 'Cappuccino' },
  { id: 'dava-orange', label: 'Dava Orange' },
  { id: 'dragula', label: 'Dragula' },
  { id: 'github', label: 'GitHub' },
  { id: 'gruvbox', label: 'Gruvbox' },
  { id: 'high-contrast', label: 'High Contrast' },
  { id: 'material-theme', label: 'Material' },
  { id: 'monokai-pro', label: 'Monokai' },
  { id: 'owl', label: 'Night Owl' },
  { id: 'nord', label: 'Nord' },
  { id: 'one-dark-pro', label: 'One Dark' },
  { id: 'solarized', label: 'Solarized' },
  { id: 'tokyo-night', label: 'Tokyo Night' },
];
