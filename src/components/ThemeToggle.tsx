import { ChangeEvent, memo } from 'react';
import { useTheme } from '../hooks';
import { ThemeId } from '../types';
import './ThemeToggle.css';
import { ThemeOption } from '../config/themes';

const ThemeToggle = () => {
  const { themes, themeId, activeTheme, isLight, toggleMode, setThemeId } = useTheme();

  const handleChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setThemeId(event.target.value as ThemeId);
  };

  const modeLabel = isLight ? 'Switch to dark mode' : 'Switch to light mode';

  return (
    <div className="theme-toggle" role="group" aria-label="Appearance settings">
      <label className="sr-only theme-toggle__label" htmlFor="theme-selector">
        Theme
      </label>

      <div className="theme-toggle__controls">
        <select
          id="theme-selector"
          className="theme-toggle__select"
          value={themeId}
          aria-label={`Theme: ${activeTheme?.label ?? 'Select a theme'}`}
          onChange={handleChange}
        >
          {themes.map((t: ThemeOption) =>
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          )}
        </select>

        <button
          type="button"
          className="theme-toggle__mode"
          onClick={toggleMode}
          role="switch"
          aria-checked={isLight}
          aria-label={modeLabel}
          title={modeLabel}
        >
          <span aria-hidden="true">{isLight ? '☀️' : '🌙'}</span>
        </button>
      </div>
    </div>
  );
};

export default memo(ThemeToggle);
