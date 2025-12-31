import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import ThemeToggle from '../../src/components/ThemeToggle';

// Mock the useTheme hook
const mockToggleMode = vi.fn();
const mockSetThemeId = vi.fn();

vi.mock('../../src/hooks', () => ({
  useTheme: () => ({
    themes: [
      { id: 'dark-pro', label: 'Dark Pro' },
      { id: 'monokai', label: 'Monokai' },
      { id: 'nord', label: 'Nord' },
    ],
    themeId: 'dark-pro',
    activeTheme: { id: 'dark-pro', label: 'Dark Pro' },
    isLight: false,
    toggleMode: mockToggleMode,
    setThemeId: mockSetThemeId,
  }),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('ThemeToggle', () => {
  it('renders the theme toggle group', () => {
    render(<ThemeToggle />);

    expect(screen.getByRole('group', { name: 'Appearance settings' })).toBeInTheDocument();
  });

  it('renders the theme selector', () => {
    const { container } = render(<ThemeToggle />);

    expect(container.querySelector('#theme-selector')).toBeInTheDocument();
  });

  it('renders mode toggle switch', () => {
    render(<ThemeToggle />);

    const modeSwitch = screen.getByRole('switch');
    expect(modeSwitch).toBeInTheDocument();
  });

  it('shows correct label for dark mode', () => {
    render(<ThemeToggle />);

    const modeSwitch = screen.getByRole('switch');
    expect(modeSwitch).toHaveAttribute('aria-label', 'Switch to light mode');
    expect(modeSwitch).toHaveAttribute('title', 'Switch to light mode');
  });

  it('calls toggleMode when mode switch is clicked', () => {
    render(<ThemeToggle />);

    fireEvent.click(screen.getByRole('switch'));

    expect(mockToggleMode).toHaveBeenCalledTimes(1);
  });

  it('has correct aria-checked based on isLight', () => {
    render(<ThemeToggle />);

    const modeSwitch = screen.getByRole('switch');
    expect(modeSwitch).toHaveAttribute('aria-checked', 'false');
  });

  it('displays sun icon in dark mode', () => {
    render(<ThemeToggle />);

    const modeSwitch = screen.getByRole('switch');
    // In dark mode (isLight: false), shows sun icon
    expect(modeSwitch).toHaveTextContent('☀️');
  });

  it('has screen reader label for theme selector', () => {
    render(<ThemeToggle />);

    expect(screen.getByText('Theme')).toHaveClass('sr-only');
  });
});
