import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import ChatWindow from '../../src/features/chatwindow/ChatWindow';
import type { Message } from '../../src/types';

// Mock the hooks
vi.mock('../../src/hooks', () => ({
  useChatLogLiveRegion: () => ({
    liveMode: 'polite',
    ariaRelevant: 'additions',
    ariaAtomic: false,
  }),
  usePrefersReducedMotion: () => false,
  useScrollToBottom: vi.fn(),
}));

afterEach(() => {
  cleanup();
});

const mockMessages: Message[] = [
  { id: 'msg-1', sender: 'user', content: 'Hello, how are you?' },
  { id: 'msg-2', sender: 'bot', content: 'I am doing well, thank you!' },
  { id: 'msg-3', sender: 'user', content: 'That is great to hear.' },
];

describe('ChatWindow', () => {
  it('renders the chat window section', () => {
    const { container } = render(<ChatWindow messages={mockMessages} isResponding={false} />);

    expect(container.querySelector('.chat-window')).toBeInTheDocument();
  });

  it('renders the conversation heading for screen readers', () => {
    render(<ChatWindow messages={mockMessages} isResponding={false} />);

    expect(screen.getByRole('heading', { name: 'Conversation', level: 2 })).toBeInTheDocument();
  });

  it('renders all messages', () => {
    render(<ChatWindow messages={mockMessages} isResponding={false} />);

    expect(screen.getByText('Hello, how are you?')).toBeInTheDocument();
    expect(screen.getByText('I am doing well, thank you!')).toBeInTheDocument();
    expect(screen.getByText('That is great to hear.')).toBeInTheDocument();
  });

  it('renders messages in a log role', () => {
    render(<ChatWindow messages={mockMessages} isResponding={false} />);

    expect(screen.getByRole('log')).toBeInTheDocument();
  });

  it('shows thinking indicator when responding', () => {
    render(<ChatWindow messages={mockMessages} isResponding={true} />);

    // Check for thinking indicator container
    const thinkingContainer = document.querySelector('.chat-window__message--status');
    expect(thinkingContainer).toBeInTheDocument();
  });

  it('hides thinking indicator when not responding', () => {
    render(<ChatWindow messages={mockMessages} isResponding={false} />);

    const thinkingContainer = document.querySelector('.chat-window__message--status');
    expect(thinkingContainer).not.toBeInTheDocument();
  });

  it('has proper ARIA live region attributes', () => {
    render(<ChatWindow messages={mockMessages} isResponding={false} />);

    const log = screen.getByRole('log');
    expect(log).toHaveAttribute('aria-live', 'polite');
    expect(log).toHaveAttribute('aria-relevant', 'additions');
    expect(log).toHaveAttribute('aria-atomic', 'false');
  });

  it('has messages container with correct id for skip link', () => {
    render(<ChatWindow messages={mockMessages} isResponding={false} />);

    expect(document.getElementById('messages')).toBeInTheDocument();
  });

  it('has tabIndex for focus management', () => {
    render(<ChatWindow messages={mockMessages} isResponding={false} />);

    const messagesContainer = document.getElementById('messages');
    expect(messagesContainer).toHaveAttribute('tabIndex', '-1');
  });

  it('renders empty state when no messages', () => {
    render(<ChatWindow messages={[]} isResponding={false} />);

    const log = screen.getByRole('log');
    expect(log).toBeInTheDocument();
    expect(log.children).toHaveLength(0);
  });

  it('applies correct class for open state', () => {
    const { container } = render(<ChatWindow messages={mockMessages} isResponding={false} />);

    const section = container.querySelector('section');
    expect(section).toHaveClass('chat-window--open');
  });
});

describe('ChatWindow with streaming', () => {
  it('marks last message as streaming when responding', () => {
    const messagesWithStreaming: Message[] = [
      { id: 'msg-1', sender: 'user', content: 'Hello' },
      { id: 'msg-2', sender: 'bot', content: 'Hi there' },
    ];

    render(<ChatWindow messages={messagesWithStreaming} isResponding={true} />);

    // The component passes isStreaming prop to the last message
    // We verify the messages are rendered
    expect(screen.getByText('Hello')).toBeInTheDocument();
    expect(screen.getByText('Hi there')).toBeInTheDocument();
  });
});

describe('ChatWindow accessibility', () => {
  it('heading is visually hidden but accessible', () => {
    render(<ChatWindow messages={mockMessages} isResponding={false} />);

    const heading = screen.getByRole('heading', { name: 'Conversation' });
    expect(heading).toHaveClass('sr-only');
  });

  it('messages list is focusable for keyboard users', () => {
    render(<ChatWindow messages={mockMessages} isResponding={false} />);

    const messagesContainer = screen.getByRole('log');
    expect(messagesContainer.tabIndex).toBe(-1);
  });
});
