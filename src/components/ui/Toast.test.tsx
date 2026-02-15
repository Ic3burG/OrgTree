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

import { render, screen, act, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ToastProvider, useToast } from './Toast';

// Helper component
const TestComponent = () => {
  const { success, error, info } = useToast();
  return (
    <div>
      <button onClick={() => success('Success message')}>Show Success</button>
      <button onClick={() => error('Error message')}>Show Error</button>
      <button onClick={() => info('Info message')}>Show Info</button>
    </div>
  );
};

describe('Toast', () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.restoreAllMocks();
  });

  it('shows toasts when hook methods are called', async () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    const btn = screen.getByText('Show Success');

    // Explicit act (though fireEvent wraps it)
    await act(async () => {
      btn.click();
    });

    expect(screen.getByText('Success message')).toBeInTheDocument();

    const errBtn = screen.getByText('Show Error');
    await act(async () => {
      errBtn.click();
    });

    expect(screen.getByText('Error message')).toBeInTheDocument();
  });

  it('auto-dismisses toasts after duration', async () => {
    vi.useFakeTimers();

    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    await act(async () => {
      screen.getByText('Show Info').click();
    });

    expect(screen.getByText('Info message')).toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(4000);
    });

    expect(screen.queryByText('Info message')).not.toBeInTheDocument();

    vi.useRealTimers();
  });

  it('removes toast when close button clicked', async () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    await act(async () => {
      screen.getByText('Show Success').click();
    });

    const message = screen.getByText('Success message');
    // Find the close button (SVG X)
    // The button has ml-2 class.
    // Let's use closest button to the message
    const button = message.parentElement?.querySelector('button');
    expect(button).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(button!);
    });

    expect(screen.queryByText('Success message')).not.toBeInTheDocument();
  });

  it('listens for realtime-notification events', async () => {
    render(
      <ToastProvider>
        <div>Child</div>
      </ToastProvider>
    );

    await act(async () => {
      window.dispatchEvent(
        new CustomEvent('realtime-notification', {
          detail: { message: 'Realtime Alert', type: 'info' },
        })
      );
    });

    expect(screen.getByText('Realtime Alert')).toBeInTheDocument();
  });
});
