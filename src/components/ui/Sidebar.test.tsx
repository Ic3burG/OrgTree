import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Sidebar from './Sidebar';

// Mock dependencies
vi.mock('../../hooks/useResizable', () => ({
  useResizable: ({ initialWidth }: { initialWidth: number }) => ({
    width: initialWidth,
    isResizing: false,
    handleMouseDown: vi.fn(),
  }),
}));

describe('Sidebar', () => {
  const defaultProps = {
    state: 'expanded' as const,
    width: 256,
    pinned: true,
    onStateChange: vi.fn(),
    onWidthChange: vi.fn(),
    onPinnedChange: vi.fn(),
    navigation: <nav>Navigation</nav>,
    header: <div>Header</div>,
    footer: <div>Footer</div>,
  };

  it('renders correctly in expanded state', () => {
    render(<Sidebar {...defaultProps} />);
    expect(screen.getByText('Navigation')).toBeInTheDocument();
    expect(screen.getByText('Header')).toBeVisible(); // Header visible in expanded
    expect(screen.getByRole('separator')).toBeInTheDocument(); // Resize handle
  });

  it('renders correctly in minimized state', () => {
    render(<Sidebar {...defaultProps} state="minimized" />);
    // In minimized, header is still in DOM (layout handles visibility)
    // We check that resize handle is NOT present
    expect(screen.queryByRole('separator')).not.toBeInTheDocument();
  });

  it('toggles state when collapse button is clicked', () => {
    render(<Sidebar {...defaultProps} />);
    const toggleBtn = screen.getByTitle('Minimize sidebar');
    fireEvent.click(toggleBtn);
    expect(defaultProps.onStateChange).toHaveBeenCalledWith('minimized');
  });

  it('toggles pin state', () => {
    render(<Sidebar {...defaultProps} />);
    const pinBtn = screen.getByTitle('Unpin sidebar (auto-collapse on navigate)');
    fireEvent.click(pinBtn);
    expect(defaultProps.onPinnedChange).toHaveBeenCalledWith(false);
  });

  it('shows FAB when hidden', () => {
    render(<Sidebar {...defaultProps} state="hidden" />);
    const fab = screen.getByLabelText('Open sidebar');
    expect(fab).toBeInTheDocument();

    fireEvent.click(fab);
    expect(defaultProps.onStateChange).toHaveBeenCalledWith('expanded');
  });
});
