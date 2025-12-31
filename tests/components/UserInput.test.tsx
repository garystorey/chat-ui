import { afterEach, describe, expect, it, vi, beforeEach } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import UserInput from '../../src/components/UserInput';

// Mock the hooks module
vi.mock('../../src/hooks', () => ({
  useSpeechRecognition: () => ({
    supported: true,
    start: vi.fn(),
    stop: vi.fn(),
    isRecording: false,
    transcript: '',
    error: null,
  }),
  useAutoResizeTextarea: vi.fn(),
}));

afterEach(() => {
  cleanup();
});

const defaultProps = {
  value: '',
  onChange: vi.fn(),
  onSend: vi.fn().mockResolvedValue(true),
  onStop: vi.fn(),
  isResponding: false,
  availableModels: ['model-1', 'model-2'],
  selectedModel: 'model-1',
  onSelectModel: vi.fn(),
  isLoadingModels: false,
  showModelSelect: true,
};

describe('UserInput', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the input form', () => {
    render(<UserInput {...defaultProps} />);

    expect(screen.getByRole('textbox', { name: /enter your request/i })).toBeInTheDocument();
  });

  it('renders the send button when not responding', () => {
    render(<UserInput {...defaultProps} isResponding={false} />);

    expect(screen.getByRole('button', { name: 'Send message' })).toBeInTheDocument();
  });

  it('renders the stop button when responding', () => {
    render(<UserInput {...defaultProps} isResponding={true} />);

    expect(screen.getByRole('button', { name: 'Stop response' })).toBeInTheDocument();
  });

  it('displays the current value in the textarea', () => {
    render(<UserInput {...defaultProps} value="Hello world" />);

    expect(screen.getByRole('textbox')).toHaveValue('Hello world');
  });

  it('calls onChange when typing in textarea', () => {
    const onChange = vi.fn();
    render(<UserInput {...defaultProps} onChange={onChange} />);

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Test' } });

    expect(onChange).toHaveBeenCalledWith('Test');
  });

  it('calls onSend when form is submitted', () => {
    const onSend = vi.fn().mockResolvedValue(true);
    render(<UserInput {...defaultProps} value="Test message" onSend={onSend} />);

    fireEvent.submit(screen.getByRole('textbox').closest('form')!);

    expect(onSend).toHaveBeenCalledWith({ text: 'Test message' });
  });

  it('does not call onSend with empty message', () => {
    const onSend = vi.fn();
    render(<UserInput {...defaultProps} value="" onSend={onSend} />);

    fireEvent.submit(screen.getByRole('textbox').closest('form')!);

    expect(onSend).not.toHaveBeenCalled();
  });

  it('does not call onSend with whitespace-only message', () => {
    const onSend = vi.fn();
    render(<UserInput {...defaultProps} value="   " onSend={onSend} />);

    fireEvent.submit(screen.getByRole('textbox').closest('form')!);

    expect(onSend).not.toHaveBeenCalled();
  });

  it('calls onStop when stop button is clicked', () => {
    const onStop = vi.fn();
    render(<UserInput {...defaultProps} isResponding={true} onStop={onStop} />);

    fireEvent.click(screen.getByRole('button', { name: 'Stop response' }));

    expect(onStop).toHaveBeenCalledTimes(1);
  });

  it('shows model select when showModelSelect is true and models available', () => {
    render(<UserInput {...defaultProps} showModelSelect={true} />);

    expect(screen.getByRole('combobox', { name: 'Model' })).toBeInTheDocument();
  });

  it('hides model select when showModelSelect is false', () => {
    render(<UserInput {...defaultProps} showModelSelect={false} />);

    expect(screen.queryByRole('combobox', { name: 'Model' })).not.toBeInTheDocument();
  });

  it('calls onSelectModel when model is changed', () => {
    const onSelectModel = vi.fn();
    render(<UserInput {...defaultProps} onSelectModel={onSelectModel} />);

    fireEvent.change(screen.getByRole('combobox', { name: 'Model' }), {
      target: { value: 'model-2' },
    });

    expect(onSelectModel).toHaveBeenCalledWith('model-2');
  });

  it('disables model select when responding', () => {
    render(<UserInput {...defaultProps} isResponding={true} />);

    expect(screen.getByRole('combobox', { name: 'Model' })).toBeDisabled();
  });

  it('shows loading message when loading models and showModelSelect is false', () => {
    render(<UserInput {...defaultProps} showModelSelect={false} isLoadingModels={true} />);

    expect(screen.getByText('Loading models…')).toBeInTheDocument();
  });

  it('shows unavailable message when no models and not loading', () => {
    render(<UserInput {...defaultProps} availableModels={[]} showModelSelect={true} isLoadingModels={false} />);

    expect(screen.getByText('Model list unavailable')).toBeInTheDocument();
  });

  it('has accessible hint for keyboard shortcuts', () => {
    render(<UserInput {...defaultProps} />);

    expect(screen.getByText(/press enter to send/i)).toBeInTheDocument();
  });

  it('renders mic button for voice input', () => {
    render(<UserInput {...defaultProps} />);

    expect(screen.getByRole('button', { name: /voice input/i })).toBeInTheDocument();
  });
});

describe('UserInput keyboard navigation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sends message on Enter key', () => {
    const onSend = vi.fn().mockResolvedValue(true);
    render(<UserInput {...defaultProps} value="Test message" onSend={onSend} />);

    const textarea = screen.getByRole('textbox');
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });

    expect(onSend).toHaveBeenCalledWith({ text: 'Test message' });
  });

  it('does not send message on Shift+Enter', () => {
    const onSend = vi.fn();
    render(<UserInput {...defaultProps} value="Test message" onSend={onSend} />);

    const textarea = screen.getByRole('textbox');
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true });

    expect(onSend).not.toHaveBeenCalled();
  });
});
