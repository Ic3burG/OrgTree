import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import OrganizationalHierarchy from './OrganizationalHierarchy';

describe('OrganizationalHierarchy', () => {
  const hierarchy = [
    { id: '1', name: 'CEO Office', depth: 0 },
    { id: '2', name: 'Operations', depth: 1 },
    { id: '3', name: 'Engineering', depth: 2 },
  ];

  it('should render all hierarchy levels', () => {
    render(<OrganizationalHierarchy hierarchy={hierarchy} currentDepartmentId="3" />);

    expect(screen.getByText('CEO Office')).toBeInTheDocument();
    expect(screen.getByText('Operations')).toBeInTheDocument();
    expect(screen.getByText('Engineering')).toBeInTheDocument();
  });

  it('should highlight current department', () => {
    render(<OrganizationalHierarchy hierarchy={hierarchy} currentDepartmentId="2" />);

    const current = screen.getByText('Operations').closest('div');
    expect(current).toHaveClass('bg-blue-100');
  });

  it('should call onNavigate when clicking non-current department', () => {
    const onNavigate = vi.fn();
    render(
      <OrganizationalHierarchy
        hierarchy={hierarchy}
        currentDepartmentId="3"
        onNavigate={onNavigate}
      />
    );

    fireEvent.click(screen.getByText('Operations'));
    expect(onNavigate).toHaveBeenCalledWith('2');
  });

  it('should not call onNavigate for current department', () => {
    const onNavigate = vi.fn();
    render(
      <OrganizationalHierarchy
        hierarchy={hierarchy}
        currentDepartmentId="2"
        onNavigate={onNavigate}
      />
    );

    fireEvent.click(screen.getByText('Operations'));
    expect(onNavigate).not.toHaveBeenCalled();
  });
});
