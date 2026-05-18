import { ChangeEvent, memo } from "react";
import { useTheme } from "../../hooks";
import { ThemeId } from "../../types";
import "./ThemeToggle.css";
import { ThemeOption } from "../../config/themes";

const ThemeToggle = () => {
  const { themes, themeId, activeTheme, isLight, toggleMode, setThemeId } =
    useTheme();

  const handleChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setThemeId(event.target.value as ThemeId);
  };

  const modeLabel = isLight ? "Switch to dark mode" : "Switch to light mode";
  const modeIcon = isLight ? (
    <svg aria-hidden="true" viewBox="0 0 24 24" focusable="false">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2.5M12 19.5V22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M2 12h2.5M19.5 12H22M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8" />
    </svg>
  ) : (
    <svg aria-hidden="true" viewBox="0 0 24 24" focusable="false">
      <path d="M20 15.4A8 8 0 0 1 8.6 4a8.7 8.7 0 1 0 11.4 11.4Z" />
    </svg>
  );

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
          aria-label={`Theme: ${activeTheme?.label ?? "Select a theme"}`}
          onChange={handleChange}
        >
          {themes.map((t: ThemeOption) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
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
          {modeIcon}
        </button>
      </div>
    </div>
  );
};

export default memo(ThemeToggle);
