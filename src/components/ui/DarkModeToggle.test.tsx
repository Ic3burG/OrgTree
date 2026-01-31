import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import DarkModeToggle from './DarkModeToggle';
import * as ThemeContext from '../../contexts/ThemeContext';

// Mock ThemeContext
vi.mock('../../contexts/ThemeContext', () => ({
  useTheme: vi.fn(),
  ThemeProvider: ({ children }: { children: React.ReactNode }) => children,
}));

describe('DarkModeToggle', () => {
  const toggleDarkModeMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders dark mode state (shows Sun icon)', () => {
    const mockValue: ReturnType<typeof ThemeContext.useTheme> = {
      isDarkMode: true,
      toggleDarkMode: toggleDarkModeMock,
    };
    vi.spyOn(ThemeContext, 'useTheme').mockReturnValue(mockValue);

    render(<DarkModeToggle />);

    const button = screen.getByRole('button', { name: /switch to light mode/i });
    expect(button).toBeInTheDocument();
  });

  it('renders light mode state (shows Moon icon)', () => {
    const mockValue: ReturnType<typeof ThemeContext.useTheme> = {
      isDarkMode: false,
      toggleDarkMode: toggleDarkModeMock,
    };
    vi.spyOn(ThemeContext, 'useTheme').mockReturnValue(mockValue);

    render(<DarkModeToggle />);

    const button = screen.getByRole('button', { name: /switch to dark mode/i });
    expect(button).toBeInTheDocument();
  });

  it('toggles theme on click', () => {
    const mockValue: ReturnType<typeof ThemeContext.useTheme> = {
      isDarkMode: false,
      toggleDarkMode: toggleDarkModeMock,
    };
    vi.spyOn(ThemeContext, 'useTheme').mockReturnValue(mockValue);

    render(<DarkModeToggle />);

    const button = screen.getByRole('button', { name: /switch to dark mode/i });
    fireEvent.click(button);

    expect(toggleDarkModeMock).toHaveBeenCalledTimes(1);
  });

  it('applies custom className', () => {
    const mockValue: ReturnType<typeof ThemeContext.useTheme> = {
      isDarkMode: false,
      toggleDarkMode: toggleDarkModeMock,
    };
    vi.spyOn(ThemeContext, 'useTheme').mockReturnValue(mockValue);

    render(<DarkModeToggle className="custom-class" />);

    const button = screen.getByRole('button');
    expect(button).toHaveClass('custom-class');
  });
});
