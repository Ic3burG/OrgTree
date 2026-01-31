import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import PreferencesPage from './PreferencesPage';
import { useWorkspacePresets } from '../../hooks/useWorkspacePresets';
import { useSidebar } from '../../hooks/useSidebar';

// Mock hooks
vi.mock('../../hooks/useWorkspacePresets', () => ({
  useWorkspacePresets: vi.fn(),
}));

vi.mock('../../hooks/useSidebar', () => ({
  useSidebar: vi.fn(),
}));

describe('PreferencesPage', () => {
  const mockSavePreset = vi.fn();
  const mockDeletePreset = vi.fn();
  const mockApplyPreset = vi.fn();
  const mockSetState = vi.fn();
  const mockSetWidth = vi.fn();
  const mockSetPinned = vi.fn();

  beforeEach(() => {
    vi.resetAllMocks();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (useWorkspacePresets as any).mockReturnValue({
      presets: [
        {
          id: 'default',
          name: 'Default',
          isDefault: true,
          config: { sidebarState: 'expanded', sidebarWidth: 256, sidebarPinned: true },
        },
        {
          id: 'custom-1',
          name: 'My Custom View',
          isDefault: false,
          config: { sidebarState: 'minimized', sidebarWidth: 64, sidebarPinned: false },
        },
      ],
      activePresetId: 'default',
      savePreset: mockSavePreset,
      deletePreset: mockDeletePreset,
      applyPreset: mockApplyPreset,
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (useSidebar as any).mockReturnValue({
      state: 'expanded',
      width: 256,
      pinned: true,
      setState: mockSetState,
      setWidth: mockSetWidth,
      setPinned: mockSetPinned,
    });
  });

  it('renders presets list', () => {
    render(<PreferencesPage />);
    expect(screen.getAllByText('Default').length).toBeGreaterThan(0);
    expect(screen.getByText('My Custom View')).toBeInTheDocument();
  });

  it('saves a new preset', () => {
    render(<PreferencesPage />);
    const input = screen.getByPlaceholderText(/e.g., Wide Screen Analysis/i);
    fireEvent.change(input, { target: { value: 'New Preset' } });
    fireEvent.click(screen.getByText('Save'));

    expect(mockSavePreset).toHaveBeenCalledWith(
      'New Preset',
      expect.objectContaining({
        sidebarState: 'expanded',
        sidebarWidth: 256,
        sidebarPinned: true,
      })
    );
  });

  it('applies a preset', () => {
    mockApplyPreset.mockReturnValue({
      sidebarState: 'minimized',
      sidebarWidth: 64,
      sidebarPinned: false,
    });

    render(<PreferencesPage />);
    const applyButtons = screen.getAllByTitle('Apply this layout');
    fireEvent.click(applyButtons[1]); // Click the second one (Custom)

    expect(mockApplyPreset).toHaveBeenCalledWith('custom-1');
    expect(mockSetState).toHaveBeenCalledWith('minimized');
    expect(mockSetWidth).toHaveBeenCalledWith(64);
    expect(mockSetPinned).toHaveBeenCalledWith(false);
  });

  it('deletes a custom preset', () => {
    render(<PreferencesPage />);
    const deleteBtn = screen.getByTitle('Delete preset');
    fireEvent.click(deleteBtn);

    expect(mockDeletePreset).toHaveBeenCalledWith('custom-1');
  });
});
