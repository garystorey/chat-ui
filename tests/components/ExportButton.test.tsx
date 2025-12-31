import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import ExportButton from '../../src/components/ExportButton';
import type { ChatSummary } from '../../src/types';
import * as utils from '../../src/utils';

// Mock the export utilities
vi.mock('../../src/utils', () => ({
  exportChat: vi.fn(),
  exportAllChats: vi.fn(),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const mockChat: ChatSummary = {
  id: 'chat-1',
  title: 'Test Chat',
  preview: 'This is a test chat',
  updatedAt: Date.now(),
  messages: [
    { id: 'msg-1', sender: 'user', content: 'Hello' },
    { id: 'msg-2', sender: 'bot', content: 'Hi there!' },
  ],
};

const mockAllChats: ChatSummary[] = [
  mockChat,
  {
    id: 'chat-2',
    title: 'Another Chat',
    preview: 'Another preview',
    updatedAt: Date.now() - 1000,
    messages: [{ id: 'msg-3', sender: 'user', content: 'Test' }],
  },
];

describe('ExportButton', () => {
  it('renders the export button', () => {
    render(<ExportButton currentChat={null} allChats={[]} />);

    expect(screen.getByRole('button', { name: 'Export chats' })).toBeInTheDocument();
  });

  it('shows dropdown when button is clicked', () => {
    render(<ExportButton currentChat={mockChat} allChats={mockAllChats} />);

    fireEvent.click(screen.getByRole('button', { name: 'Export chats' }));

    expect(screen.getByRole('menu')).toBeInTheDocument();
  });

  it('hides dropdown when button is clicked again', () => {
    render(<ExportButton currentChat={mockChat} allChats={mockAllChats} />);

    const button = screen.getByRole('button', { name: 'Export chats' });
    fireEvent.click(button);
    expect(screen.getByRole('menu')).toBeInTheDocument();

    fireEvent.click(button);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('shows current chat export options when current chat exists', () => {
    render(<ExportButton currentChat={mockChat} allChats={mockAllChats} />);

    fireEvent.click(screen.getByRole('button', { name: 'Export chats' }));

    expect(screen.getByText('Current Chat')).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /export as markdown/i })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /export as json/i })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /export as text/i })).toBeInTheDocument();
  });

  it('shows all chats export option when chats exist', () => {
    render(<ExportButton currentChat={mockChat} allChats={mockAllChats} />);

    fireEvent.click(screen.getByRole('button', { name: 'Export chats' }));

    expect(screen.getByText('All Chats')).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /export all as json/i })).toBeInTheDocument();
  });

  it('shows empty message when no chats exist', () => {
    render(<ExportButton currentChat={null} allChats={[]} />);

    fireEvent.click(screen.getByRole('button', { name: 'Export chats' }));

    expect(screen.getByText('No chats to export')).toBeInTheDocument();
  });

  it('calls exportChat with markdown format', () => {
    render(<ExportButton currentChat={mockChat} allChats={mockAllChats} />);

    fireEvent.click(screen.getByRole('button', { name: 'Export chats' }));
    fireEvent.click(screen.getByRole('menuitem', { name: /export as markdown/i }));

    expect(utils.exportChat).toHaveBeenCalledWith(mockChat, 'markdown');
  });

  it('calls exportChat with json format', () => {
    render(<ExportButton currentChat={mockChat} allChats={mockAllChats} />);

    fireEvent.click(screen.getByRole('button', { name: 'Export chats' }));
    fireEvent.click(screen.getByRole('menuitem', { name: /export as json/i }));

    expect(utils.exportChat).toHaveBeenCalledWith(mockChat, 'json');
  });

  it('calls exportChat with text format', () => {
    render(<ExportButton currentChat={mockChat} allChats={mockAllChats} />);

    fireEvent.click(screen.getByRole('button', { name: 'Export chats' }));
    fireEvent.click(screen.getByRole('menuitem', { name: /export as text/i }));

    expect(utils.exportChat).toHaveBeenCalledWith(mockChat, 'text');
  });

  it('calls exportAllChats when export all is clicked', () => {
    render(<ExportButton currentChat={mockChat} allChats={mockAllChats} />);

    fireEvent.click(screen.getByRole('button', { name: 'Export chats' }));
    fireEvent.click(screen.getByRole('menuitem', { name: /export all as json/i }));

    expect(utils.exportAllChats).toHaveBeenCalledWith(mockAllChats, 'json');
  });

  it('closes dropdown after export action', () => {
    render(<ExportButton currentChat={mockChat} allChats={mockAllChats} />);

    fireEvent.click(screen.getByRole('button', { name: 'Export chats' }));
    fireEvent.click(screen.getByRole('menuitem', { name: /export as markdown/i }));

    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('has correct aria-expanded state', () => {
    render(<ExportButton currentChat={mockChat} allChats={mockAllChats} />);

    const button = screen.getByRole('button', { name: 'Export chats' });
    expect(button).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'true');
  });

  it('hides current chat section when current chat has no messages', () => {
    const emptyChat: ChatSummary = {
      ...mockChat,
      messages: [],
    };

    render(<ExportButton currentChat={emptyChat} allChats={mockAllChats} />);

    fireEvent.click(screen.getByRole('button', { name: 'Export chats' }));

    expect(screen.queryByText('Current Chat')).not.toBeInTheDocument();
  });
});
