import { afterEach, describe, expect, it, vi, beforeEach } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import ImportButton from '../../src/components/ImportButton';
import type { ChatSummary } from '../../src/types';
import * as utils from '../../src/utils';

// Mock the import utility
vi.mock('../../src/utils', () => ({
  importChatsFromFile: vi.fn(),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const mockChats: ChatSummary[] = [
  {
    id: 'imported-1',
    title: 'Imported Chat',
    preview: 'Test preview',
    updatedAt: Date.now(),
    messages: [{ id: 'msg-1', sender: 'user', content: 'Hello' }],
  },
];

describe('ImportButton', () => {
  it('renders the import button', () => {
    render(<ImportButton onImportChats={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'Import chats from file' })).toBeInTheDocument();
  });

  it('renders hidden file input', () => {
    render(<ImportButton onImportChats={vi.fn()} />);

    const fileInput = document.querySelector('input[type="file"]');
    expect(fileInput).toBeInTheDocument();
    expect(fileInput).toHaveStyle({ display: 'none' });
  });

  it('accepts only JSON files', () => {
    render(<ImportButton onImportChats={vi.fn()} />);

    const fileInput = document.querySelector('input[type="file"]');
    expect(fileInput).toHaveAttribute('accept', '.json');
  });

  it('triggers file input when button is clicked', () => {
    render(<ImportButton onImportChats={vi.fn()} />);

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const clickSpy = vi.spyOn(fileInput, 'click');

    fireEvent.click(screen.getByRole('button', { name: 'Import chats from file' }));

    expect(clickSpy).toHaveBeenCalled();
  });

  it('calls onImportChats with imported chats on successful import', async () => {
    vi.mocked(utils.importChatsFromFile).mockResolvedValue({
      success: true,
      chats: mockChats,
      errors: [],
    });

    const onImportChats = vi.fn();
    render(<ImportButton onImportChats={onImportChats} />);

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['{}'], 'test.json', { type: 'application/json' });

    Object.defineProperty(fileInput, 'files', {
      value: [file],
      writable: false,
    });

    fireEvent.change(fileInput);

    await waitFor(() => {
      expect(onImportChats).toHaveBeenCalledWith(mockChats);
    });
  });

  it('shows success toast after successful import', async () => {
    vi.mocked(utils.importChatsFromFile).mockResolvedValue({
      success: true,
      chats: mockChats,
      errors: [],
    });

    render(<ImportButton onImportChats={vi.fn()} />);

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['{}'], 'test.json', { type: 'application/json' });

    Object.defineProperty(fileInput, 'files', {
      value: [file],
      writable: false,
    });

    fireEvent.change(fileInput);

    await waitFor(() => {
      expect(screen.getByText(/imported 1 chat/i)).toBeInTheDocument();
    });
  });

  it('shows error toast on import failure', async () => {
    vi.mocked(utils.importChatsFromFile).mockResolvedValue({
      success: false,
      chats: [],
      errors: ['Invalid file format'],
    });

    render(<ImportButton onImportChats={vi.fn()} />);

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['invalid'], 'test.json', { type: 'application/json' });

    Object.defineProperty(fileInput, 'files', {
      value: [file],
      writable: false,
    });

    fireEvent.change(fileInput);

    await waitFor(() => {
      expect(screen.getByText('Invalid file format')).toBeInTheDocument();
    });
  });

  it('shows error toast when import throws exception', async () => {
    vi.mocked(utils.importChatsFromFile).mockRejectedValue(new Error('File read error'));

    render(<ImportButton onImportChats={vi.fn()} />);

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['{}'], 'test.json', { type: 'application/json' });

    Object.defineProperty(fileInput, 'files', {
      value: [file],
      writable: false,
    });

    fireEvent.change(fileInput);

    await waitFor(() => {
      expect(screen.getByText(/import failed: file read error/i)).toBeInTheDocument();
    });
  });

  it('does nothing when no file is selected', async () => {
    const onImportChats = vi.fn();
    render(<ImportButton onImportChats={onImportChats} />);

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

    Object.defineProperty(fileInput, 'files', {
      value: [],
      writable: false,
    });

    fireEvent.change(fileInput);

    expect(onImportChats).not.toHaveBeenCalled();
  });

  it('clears file input after import', async () => {
    vi.mocked(utils.importChatsFromFile).mockResolvedValue({
      success: true,
      chats: mockChats,
      errors: [],
    });

    render(<ImportButton onImportChats={vi.fn()} />);

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['{}'], 'test.json', { type: 'application/json' });

    Object.defineProperty(fileInput, 'files', {
      value: [file],
      writable: false,
    });

    fireEvent.change(fileInput);

    await waitFor(() => {
      expect(fileInput.value).toBe('');
    });
  });

  it('shows plural chats message for multiple imports', async () => {
    vi.mocked(utils.importChatsFromFile).mockResolvedValue({
      success: true,
      chats: [...mockChats, { ...mockChats[0], id: 'imported-2' }],
      errors: [],
    });

    render(<ImportButton onImportChats={vi.fn()} />);

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['{}'], 'test.json', { type: 'application/json' });

    Object.defineProperty(fileInput, 'files', {
      value: [file],
      writable: false,
    });

    fireEvent.change(fileInput);

    await waitFor(() => {
      expect(screen.getByText(/imported 2 chats/i)).toBeInTheDocument();
    });
  });
});
