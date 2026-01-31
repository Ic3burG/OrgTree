import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import InlineEdit from './InlineEdit';

describe('InlineEdit', () => {
  const onSaveMock = vi.fn();

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('renders value and enters edit mode on click', () => {
    render(<InlineEdit value="Initial Value" onSave={onSaveMock} label="Test Label" />);

    const displayElement = screen.getByText('Initial Value');
    expect(displayElement).toBeInTheDocument();

    fireEvent.click(displayElement);

    expect(screen.getByRole('textbox')).toHaveValue('Initial Value');
    expect(screen.getByLabelText('Save')).toBeInTheDocument();
  });

  it('saves changes when save button clicked', async () => {
    onSaveMock.mockResolvedValue(undefined);

    render(<InlineEdit value="Old" onSave={onSaveMock} label="Test" />);

    fireEvent.click(screen.getByText('Old'));

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'New Value' } });

    fireEvent.click(screen.getByLabelText('Save'));

    expect(onSaveMock).toHaveBeenCalledWith('New Value');

    // Wait for async save to finish and edit mode to close
    await waitFor(() => {
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    });
  });

  it('cancels edits', () => {
    render(<InlineEdit value="Original" onSave={onSaveMock} label="Test" />);

    fireEvent.click(screen.getByText('Original'));

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'Changed' } });

    fireEvent.click(screen.getByLabelText('Cancel'));

    expect(onSaveMock).not.toHaveBeenCalled();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.getByText('Original')).toBeInTheDocument();
  });

  it('saves on Enter key', () => {
    onSaveMock.mockResolvedValue(undefined);
    render(<InlineEdit value="Test" onSave={onSaveMock} label="Test" />);

    fireEvent.click(screen.getByText('Test'));
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'TestNew' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    expect(onSaveMock).toHaveBeenCalledWith('TestNew');
  });

  it('cancels on Escape key', () => {
    render(<InlineEdit value="Test" onSave={onSaveMock} label="Test" />);

    fireEvent.click(screen.getByText('Test'));
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'New' } });
    fireEvent.keyDown(input, { key: 'Escape', code: 'Escape' });

    expect(onSaveMock).not.toHaveBeenCalled();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('renders textarea type', () => {
    render(<InlineEdit value="Multi\nLine" onSave={onSaveMock} label="Test" type="textarea" />);

    fireEvent.click(screen.getByText(/Multi/)); // match partial text

    const input = screen.getByRole('textbox');
    expect(input.tagName).toBe('TEXTAREA');
  });
});
