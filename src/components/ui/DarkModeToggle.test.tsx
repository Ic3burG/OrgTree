/**
 * OrgTree — Organizational Directory & Hierarchy Visualization
 *
 * Copyright (c) 2025 OJD Technical Solutions (Omar Davis)
 * Toronto, Ontario, Canada
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 *
 * This file is part of OrgTree. OrgTree is free software: you can redistribute
 * it and/or modify it under the terms of the GNU Affero General Public License
 * as published by the Free Software Foundation, either version 3 of the License,
 * or (at your option) any later version.
 *
 * OrgTree is distributed in the hope that it will be useful, but WITHOUT ANY
 * WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 * A PARTICULAR PURPOSE. See the GNU Affero General Public License for details.
 *
 * You should have received a copy of the GNU Affero General Public License along
 * with OrgTree. If not, see <https://www.gnu.org/licenses/>.
 *
 * Commercial licensing is available. Contact OJD Technical Solutions for details.
 */

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
