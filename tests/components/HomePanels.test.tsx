import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import HomePanels from '../../src/components/HomePanels';
import type { ChatSummary, Suggestion } from '../../src/types';

// Mock child components
vi.mock('../../src/components/ExportButton', () => ({
  default: () => <div data-testid="export-button">Export</div>,
}));

vi.mock('../../src/components/ImportButton', () => ({
  default: ({ onImportChats }: { onImportChats: (chats: ChatSummary[]) => void }) => (
    <button data-testid="import-button" onClick={() => onImportChats([])}>
      Import
    </button>
  ),
}));

afterEach(() => {
  cleanup();
});

const mockSuggestions: Suggestion[] = [
  {
    title: 'Suggestion 1',
    description: 'Description 1',
    prompt: 'prompt 1',
    label: 'Use',
    icon: '1',
    handleSelect: vi.fn(),
  },
  {
    title: 'Suggestion 2',
    description: 'Description 2',
    prompt: 'prompt 2',
    label: 'Use',
    icon: '2',
    handleSelect: vi.fn(),
  },
];

const mockChatHistory: ChatSummary[] = [
  {
    id: 'chat-1',
    title: 'Test Chat 1',
    preview: 'Preview 1',
    updatedAt: Date.now(),
    messages: [{ id: 'msg-1', sender: 'user', content: 'Hello' }],
  },
  {
    id: 'chat-2',
    title: 'Another Chat',
    preview: 'Another preview',
    updatedAt: Date.now() - 1000,
    messages: [{ id: 'msg-2', sender: 'user', content: 'Hi' }],
  },
];

const defaultProps = {
  suggestionItems: mockSuggestions,
  chatHistory: mockChatHistory,
  activeChatId: null,
  onSelectChat: vi.fn(),
  onRemoveChat: vi.fn(),
  onImportChats: vi.fn(),
  currentChat: null,
  allChats: mockChatHistory,
};

describe('HomePanels', () => {
  it('renders the home panels section', () => {
    render(<HomePanels {...defaultProps} />);

    expect(screen.getByRole('region', { name: /start and recent chats/i })).toBeInTheDocument();
  });

  it('renders tab list with Suggestions and Recent tabs', () => {
    render(<HomePanels {...defaultProps} />);

    expect(screen.getByRole('tablist')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Suggestions' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Recent' })).toBeInTheDocument();
  });

  it('shows Suggestions tab as active by default', () => {
    render(<HomePanels {...defaultProps} />);

    const suggestionsTab = screen.getByRole('tab', { name: 'Suggestions' });
    expect(suggestionsTab).toHaveAttribute('aria-selected', 'true');
  });

  it('switches to Recent tab when clicked', () => {
    render(<HomePanels {...defaultProps} />);

    const recentTab = screen.getByRole('tab', { name: 'Recent' });
    fireEvent.click(recentTab);

    expect(recentTab).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Suggestions' })).toHaveAttribute('aria-selected', 'false');
  });

  it('shows suggestions panel when Suggestions tab is active', () => {
    render(<HomePanels {...defaultProps} />);

    expect(screen.getByRole('tabpanel', { name: 'Suggestions' })).toBeInTheDocument();
  });

  it('shows recent panel when Recent tab is active', () => {
    render(<HomePanels {...defaultProps} />);

    fireEvent.click(screen.getByRole('tab', { name: 'Recent' }));

    expect(screen.getByRole('tabpanel', { name: 'Recent' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Recent chats' })).toBeInTheDocument();
  });

  it('renders search input in Recent tab', () => {
    render(<HomePanels {...defaultProps} />);

    fireEvent.click(screen.getByRole('tab', { name: 'Recent' }));

    expect(screen.getByRole('searchbox')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search chats')).toBeInTheDocument();
  });

  it('filters chats based on search term', () => {
    render(<HomePanels {...defaultProps} />);

    fireEvent.click(screen.getByRole('tab', { name: 'Recent' }));

    const searchInput = screen.getByRole('searchbox');
    fireEvent.change(searchInput, { target: { value: 'Test Chat 1' } });

    // Should show matching chat
    expect(screen.getByText('Test Chat 1')).toBeInTheDocument();
  });

  it('filters chats by preview content', () => {
    render(<HomePanels {...defaultProps} />);

    fireEvent.click(screen.getByRole('tab', { name: 'Recent' }));

    const searchInput = screen.getByRole('searchbox');
    fireEvent.change(searchInput, { target: { value: 'Another preview' } });

    expect(screen.getByText('Another Chat')).toBeInTheDocument();
  });

  it('shows all chats when search is cleared', () => {
    render(<HomePanels {...defaultProps} />);

    fireEvent.click(screen.getByRole('tab', { name: 'Recent' }));

    const searchInput = screen.getByRole('searchbox');
    fireEvent.change(searchInput, { target: { value: 'Test' } });
    fireEvent.change(searchInput, { target: { value: '' } });

    expect(screen.getByText('Test Chat 1')).toBeInTheDocument();
    expect(screen.getByText('Another Chat')).toBeInTheDocument();
  });

  it('renders import button in Recent tab', () => {
    render(<HomePanels {...defaultProps} />);

    fireEvent.click(screen.getByRole('tab', { name: 'Recent' }));

    expect(screen.getByTestId('import-button')).toBeInTheDocument();
  });

  it('renders export button in Recent tab', () => {
    render(<HomePanels {...defaultProps} />);

    fireEvent.click(screen.getByRole('tab', { name: 'Recent' }));

    expect(screen.getByTestId('export-button')).toBeInTheDocument();
  });

  it('has proper aria-controls attributes on tabs', () => {
    render(<HomePanels {...defaultProps} />);

    const suggestionsTab = screen.getByRole('tab', { name: 'Suggestions' });
    const recentTab = screen.getByRole('tab', { name: 'Recent' });

    expect(suggestionsTab).toHaveAttribute('aria-controls', 'panel-start');
    expect(recentTab).toHaveAttribute('aria-controls', 'panel-recent');
  });

  it('has proper id and aria-labelledby on tab panels', () => {
    render(<HomePanels {...defaultProps} />);

    const suggestionsPanel = screen.getByRole('tabpanel', { name: 'Suggestions' });
    expect(suggestionsPanel).toHaveAttribute('id', 'panel-start');
    expect(suggestionsPanel).toHaveAttribute('aria-labelledby', 'tab-start');
  });

  it('case-insensitive search', () => {
    render(<HomePanels {...defaultProps} />);

    fireEvent.click(screen.getByRole('tab', { name: 'Recent' }));

    const searchInput = screen.getByRole('searchbox');
    fireEvent.change(searchInput, { target: { value: 'test chat' } });

    expect(screen.getByText('Test Chat 1')).toBeInTheDocument();
  });

  it('trims whitespace in search term', () => {
    render(<HomePanels {...defaultProps} />);

    fireEvent.click(screen.getByRole('tab', { name: 'Recent' }));

    const searchInput = screen.getByRole('searchbox');
    fireEvent.change(searchInput, { target: { value: '  Test  ' } });

    expect(screen.getByText('Test Chat 1')).toBeInTheDocument();
  });
});
