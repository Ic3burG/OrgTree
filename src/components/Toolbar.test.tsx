import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Toolbar from './Toolbar';
import { ThemeProvider } from '../contexts/ThemeContext';

describe('Toolbar', () => {
  const defaultProps = {
    onZoomIn: vi.fn(),
    onZoomOut: vi.fn(),
    onFitView: vi.fn(),
    onExpandAll: vi.fn(),
    onCollapseAll: vi.fn(),
    onToggleLayout: vi.fn(),
    layoutDirection: 'TB' as const,
    currentTheme: 'slate',
    onThemeChange: vi.fn(),
    onResetLayout: vi.fn(),
  };

  const renderComponent = (props = defaultProps) => {
    return render(
      <ThemeProvider>
        <Toolbar {...props} />
      </ThemeProvider>
    );
  };

  it('renders all main action buttons', () => {
    renderComponent();

    expect(screen.getByLabelText('Zoom in')).toBeDefined();
    expect(screen.getByLabelText('Zoom out')).toBeDefined();
    expect(screen.getByLabelText('Fit view')).toBeDefined();
    expect(screen.getByLabelText('Expand all departments')).toBeDefined();
    expect(screen.getByLabelText('Collapse all departments')).toBeDefined();
    expect(screen.getByLabelText(/Switch to horizontal layout/i)).toBeDefined();
    expect(screen.getByLabelText('Change theme')).toBeDefined();
    expect(screen.getByLabelText('Reset layout')).toBeDefined();
  });

  it('calls interaction handlers', () => {
    renderComponent();

    fireEvent.click(screen.getByLabelText('Zoom in'));
    expect(defaultProps.onZoomIn).toHaveBeenCalled();

    fireEvent.click(screen.getByLabelText('Zoom out'));
    expect(defaultProps.onZoomOut).toHaveBeenCalled();

    fireEvent.click(screen.getByLabelText('Fit view'));
    expect(defaultProps.onFitView).toHaveBeenCalled();

    fireEvent.click(screen.getByLabelText('Expand all departments'));
    expect(defaultProps.onExpandAll).toHaveBeenCalled();

    fireEvent.click(screen.getByLabelText('Collapse all departments'));
    expect(defaultProps.onCollapseAll).toHaveBeenCalled();

    fireEvent.click(screen.getByLabelText(/Switch to horizontal layout/i));
    expect(defaultProps.onToggleLayout).toHaveBeenCalled();

    fireEvent.click(screen.getByLabelText('Reset layout'));
    expect(defaultProps.onResetLayout).toHaveBeenCalled();
  });

  it('toggles theme picker', () => {
    renderComponent();

    const themeBtn = screen.getByLabelText('Change theme');
    fireEvent.click(themeBtn);

    // ThemePicker should be visible
    expect(screen.getByText(/Theme:/i)).toBeDefined();

    fireEvent.click(themeBtn);
    expect(screen.queryByText(/Theme:/i)).toBeNull();
  });

  it('shows correct layout icon/label based on direction', () => {
    const { rerender } = renderComponent({ ...defaultProps, layoutDirection: 'TB' });
    expect(screen.getByLabelText(/Switch to horizontal layout/i)).toBeDefined();

    rerender(
      <ThemeProvider>
        <Toolbar {...defaultProps} layoutDirection="LR" />
      </ThemeProvider>
    );
    expect(screen.getByLabelText(/Switch to vertical layout/i)).toBeDefined();
  });
});
