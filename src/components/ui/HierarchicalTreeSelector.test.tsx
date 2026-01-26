import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import HierarchicalTreeSelector from './HierarchicalTreeSelector';
import { TreeNode } from '../../utils/departmentUtils';

const mockItems: TreeNode[] = [
  {
    id: '1',
    name: 'Engineering',
    parentId: null,
    children: [
      { id: '1-1', name: 'Frontend', parentId: '1', children: [] },
      { id: '1-2', name: 'Backend', parentId: '1', children: [] },
    ],
  },
  {
    id: '2',
    name: 'HR',
    parentId: null,
    children: [],
  },
];

describe('HierarchicalTreeSelector', () => {
  it('renders correctly', () => {
    render(<HierarchicalTreeSelector items={mockItems} value={null} onChange={vi.fn()} />);
    expect(screen.getByText('Select...')).toBeDefined();
  });

  it('opens on click', () => {
    render(<HierarchicalTreeSelector items={mockItems} value={null} onChange={vi.fn()} />);
    fireEvent.click(screen.getByText('Select...'));
    expect(screen.getByPlaceholderText('Search departments...')).toBeDefined();
  });

  it('navigates with keyboard ArrowDown and ArrowUp', () => {
    const onChange = vi.fn();
    render(<HierarchicalTreeSelector items={mockItems} value={null} onChange={onChange} />);

    const selector = screen.getByText('Select...');
    // Open with keyboard
    fireEvent.keyDown(selector, { key: 'Enter' });
    expect(screen.getByPlaceholderText('Search departments...')).toBeDefined();

    // Engineering should be visible
    expect(screen.getByText('Engineering')).toBeDefined();

    // Engineering is first, ArrowDown should focus it
    fireEvent.keyDown(selector, { key: 'ArrowDown' });

    // Select Engineering with Enter
    fireEvent.keyDown(selector, { key: 'Enter' });

    expect(onChange).toHaveBeenCalledWith('1');
  });

  it('expands and collapses with ArrowRight and ArrowLeft', () => {
    const onChange = vi.fn();
    render(<HierarchicalTreeSelector items={mockItems} value={null} onChange={onChange} />);
    const selector = screen.getByText('Select...');

    fireEvent.keyDown(selector, { key: 'Enter' });

    // Focus Engineering
    fireEvent.keyDown(selector, { key: 'ArrowDown' });

    // Expand Engineering
    fireEvent.keyDown(selector, { key: 'ArrowRight' });

    // Now Frontend should be visible
    expect(screen.getByText('Frontend')).toBeDefined();

    // Collapse Engineering
    fireEvent.keyDown(selector, { key: 'ArrowLeft' });

    // Frontend should be gone (or at least Engineering should be collapsed)
    expect(screen.queryByText('Frontend')).toBeNull();
  });
  it('filters items based on search query', () => {
    render(<HierarchicalTreeSelector items={mockItems} value={null} onChange={vi.fn()} />);
    fireEvent.click(screen.getByText('Select...'));

    const searchInput = screen.getByPlaceholderText('Search departments...');
    fireEvent.change(searchInput, { target: { value: 'Front' } });

    expect(screen.getByText('Frontend')).toBeDefined();
    expect(screen.queryByText('HR')).toBeNull();
  });

  it('closes on Escape', () => {
    render(<HierarchicalTreeSelector items={mockItems} value={null} onChange={vi.fn()} />);
    fireEvent.click(screen.getByText('Select...'));
    expect(screen.getByPlaceholderText('Search departments...')).toBeDefined();

    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Escape' });
    expect(screen.queryByPlaceholderText('Search departments...')).toBeNull();
  });
});
