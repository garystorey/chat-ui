import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import ChatHeader from '../../src/components/ChatHeader';

// Mock the hooks module for ThemeToggle
vi.mock('../../src/hooks', () => ({
  useTheme: () => ({
    themes: [{ id: 'dark-pro', label: 'Dark Pro' }],
    themeId: 'dark-pro',
    activeTheme: { id: 'dark-pro', label: 'Dark Pro' },
    isLight: false,
    toggleMode: vi.fn(),
    setThemeId: vi.fn(),
  }),
}));

afterEach(() => {
  cleanup();
});

const defaultProps = {
  handleNewChat: vi.fn(),
  connectionStatus: 'online' as const,
  statusLabel: 'Online',
  retryConnection: vi.fn(),
  availableModels: ['model-1', 'model-2', 'model-3'],
  selectedModel: 'model-1',
  setSelectedModel: vi.fn(),
  isResponding: false,
  isLoadingModels: false,
  hasHeaderModelOptions: true,
};

describe('ChatHeader', () => {
  it('renders the header with controls', () => {
    render(<ChatHeader {...defaultProps} />);

    expect(screen.getByRole('banner', { name: 'Chat controls' })).toBeInTheDocument();
  });

  it('renders the New Chat button', () => {
    render(<ChatHeader {...defaultProps} />);

    const newChatButton = screen.getByRole('button', { name: 'New Chat' });
    expect(newChatButton).toBeInTheDocument();
  });

  it('calls handleNewChat when New Chat button is clicked', () => {
    const handleNewChat = vi.fn();
    render(<ChatHeader {...defaultProps} handleNewChat={handleNewChat} />);

    fireEvent.click(screen.getByRole('button', { name: 'New Chat' }));

    expect(handleNewChat).toHaveBeenCalledTimes(1);
  });

  it('displays connection status', () => {
    render(<ChatHeader {...defaultProps} connectionStatus="offline" statusLabel="Offline" />);

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText('Offline')).toBeInTheDocument();
  });

  it('calls retryConnection when status button is clicked', () => {
    const retryConnection = vi.fn();
    render(<ChatHeader {...defaultProps} retryConnection={retryConnection} />);

    fireEvent.click(screen.getByRole('status'));

    expect(retryConnection).toHaveBeenCalledTimes(1);
  });

  it('renders model selector when models are available', () => {
    const { container } = render(<ChatHeader {...defaultProps} />);

    const modelSelect = container.querySelector('#headerModelSelect');
    expect(modelSelect).toBeInTheDocument();
  });

  it('displays model select with aria label', () => {
    render(<ChatHeader {...defaultProps} />);

    const modelSelect = screen.getByRole('combobox', { name: 'Select model' });
    expect(modelSelect).toBeInTheDocument();
  });

  it('calls setSelectedModel when model selection changes', () => {
    const setSelectedModel = vi.fn();
    const { container } = render(<ChatHeader {...defaultProps} setSelectedModel={setSelectedModel} />);

    const select = container.querySelector('#headerModelSelect') as HTMLSelectElement;
    fireEvent.change(select, { target: { value: 'model-2' } });

    expect(setSelectedModel).toHaveBeenCalled();
  });

  it('disables model selector when responding', () => {
    render(<ChatHeader {...defaultProps} isResponding={true} />);

    expect(screen.getByRole('combobox', { name: 'Select model' })).toBeDisabled();
  });

  it('disables model selector when loading models', () => {
    render(<ChatHeader {...defaultProps} isLoadingModels={true} />);

    expect(screen.getByRole('combobox', { name: 'Select model' })).toBeDisabled();
  });

  it('shows loading message when loading models and no options', () => {
    render(<ChatHeader {...defaultProps} hasHeaderModelOptions={false} isLoadingModels={true} />);

    expect(screen.getByText('Loading…')).toBeInTheDocument();
  });

  it('shows unavailable message when no models and not loading', () => {
    render(<ChatHeader {...defaultProps} hasHeaderModelOptions={false} isLoadingModels={false} />);

    expect(screen.getByText('Models unavailable')).toBeInTheDocument();
  });

  it('displays status dot with correct class based on connection status', () => {
    const { container } = render(<ChatHeader {...defaultProps} connectionStatus="connecting" />);

    const statusDot = container.querySelector('.app__status-dot--connecting');
    expect(statusDot).toBeInTheDocument();
  });

  it('renders the ThemeToggle component', () => {
    render(<ChatHeader {...defaultProps} />);

    expect(screen.getByRole('group', { name: 'Appearance settings' })).toBeInTheDocument();
  });
});
