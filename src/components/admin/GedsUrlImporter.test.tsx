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

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import GedsUrlImporter from './GedsUrlImporter';
import { api } from '../../api/client';
import type { GedsImportResponse } from '../../types';
import * as Toast from '../ui/Toast';

// Mock the API and Toast
vi.mock('../../api/client', () => ({
  api: {
    importGedsUrls: vi.fn(),
  },
}));
vi.mock('../ui/Toast');

describe('GedsUrlImporter', () => {
  const mockOnImportComplete = vi.fn();
  const orgId = 'test-org-123';
  const mockToast = {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(Toast.useToast).mockReturnValue(mockToast);
  });

  it('should render the textarea and import button', () => {
    render(<GedsUrlImporter organizationId={orgId} onImportComplete={mockOnImportComplete} />);

    expect(screen.getByLabelText(/GEDS XML URLs/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Import from 0 GEDS URLs/i })).toBeInTheDocument();
  });

  it('should validate URLs and show counts', () => {
    render(<GedsUrlImporter organizationId={orgId} onImportComplete={mockOnImportComplete} />);

    const textarea = screen.getByLabelText(/GEDS XML URLs/i);

    // Add valid and invalid URLs
    fireEvent.change(textarea, {
      target: {
        value: `https://geds-sage.gc.ca/en/GEDS?pgid=026&dn=test1
https://evil.com/fake-geds
https://canada.ca/some/path`,
      },
    });

    expect(screen.getByText(/2 valid URL/i)).toBeInTheDocument();
    expect(screen.getByText(/1 invalid URL/i)).toBeInTheDocument();
  });

  it('should disable import button when no valid URLs', () => {
    render(<GedsUrlImporter organizationId={orgId} onImportComplete={mockOnImportComplete} />);

    const button = screen.getByRole('button', { name: /Import from 0 GEDS URLs/i });
    expect(button).toBeDisabled();
  });

  it('should enable import button with valid URLs', () => {
    render(<GedsUrlImporter organizationId={orgId} onImportComplete={mockOnImportComplete} />);

    const textarea = screen.getByLabelText(/GEDS XML URLs/i);
    fireEvent.change(textarea, {
      target: { value: 'https://geds-sage.gc.ca/en/GEDS?pgid=026&dn=test' },
    });

    const button = screen.getByRole('button', { name: /Import from 1 GEDS URL/i });
    expect(button).not.toBeDisabled();
  });

  it('should show warning for too many URLs', () => {
    render(<GedsUrlImporter organizationId={orgId} onImportComplete={mockOnImportComplete} />);

    const textarea = screen.getByLabelText(/GEDS XML URLs/i);

    // Add 11 valid URLs (exceeds max of 10)
    const urls = Array.from(
      { length: 11 },
      (_, i) => `https://geds-sage.gc.ca/en/GEDS?pgid=026&dn=test${i}`
    ).join('\n');

    fireEvent.change(textarea, { target: { value: urls } });

    expect(screen.getByText(/Maximum 10 URLs allowed/i)).toBeInTheDocument();
  });

  it('should call importGedsUrls on button click', async () => {
    const mockResponse: GedsImportResponse = {
      results: [
        {
          url: 'https://example.com/geds.xml',
          status: 'success',
          message: 'Imported successfully',
          stats: {
            departments: 5,
            people: 10,
            departmentsCreated: 5,
            departmentsReused: 0,
            peopleCreated: 10,
            peopleSkipped: 0,
          },
        },
      ],
    };

    vi.mocked(api.importGedsUrls).mockResolvedValue(mockResponse);

    render(<GedsUrlImporter organizationId={orgId} onImportComplete={mockOnImportComplete} />);

    const textarea = screen.getByLabelText(/GEDS XML URLs/i);
    fireEvent.change(textarea, {
      target: { value: 'https://geds-sage.gc.ca/en/GEDS?pgid=026&dn=test' },
    });

    const button = screen.getByRole('button', { name: /Import from 1 GEDS URL/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(api.importGedsUrls).toHaveBeenCalledWith(orgId, [
        'https://geds-sage.gc.ca/en/GEDS?pgid=026&dn=test',
      ]);
    });

    await waitFor(() => {
      expect(mockToast.success).toHaveBeenCalledWith('Successfully imported 1 GEDS file');
      expect(mockOnImportComplete).toHaveBeenCalled();
    });
  });

  it('should handle import errors gracefully', async () => {
    vi.mocked(api.importGedsUrls).mockRejectedValue(new Error('Network error'));

    render(<GedsUrlImporter organizationId={orgId} onImportComplete={mockOnImportComplete} />);

    const textarea = screen.getByLabelText(/GEDS XML URLs/i);
    fireEvent.change(textarea, {
      target: { value: 'https://geds-sage.gc.ca/en/GEDS?pgid=026&dn=test' },
    });

    const button = screen.getByRole('button', { name: /Import from 1 GEDS URL/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith('Network error');
    });

    expect(mockOnImportComplete).not.toHaveBeenCalled();
  });

  it('should show mixed success/failure results', async () => {
    const mockResponse: GedsImportResponse = {
      results: [
        {
          url: 'https://example.com/geds1.xml',
          status: 'success',
          message: 'Imported successfully',
          stats: {
            departments: 5,
            people: 10,
            departmentsCreated: 5,
            departmentsReused: 0,
            peopleCreated: 10,
            peopleSkipped: 0,
          },
        },
        {
          url: 'https://example.com/geds2.xml',
          status: 'failed',
          message: 'Import failed',
          error: 'Download failed',
        },
      ],
    };

    vi.mocked(api.importGedsUrls).mockResolvedValue(mockResponse);

    render(<GedsUrlImporter organizationId={orgId} onImportComplete={mockOnImportComplete} />);

    const textarea = screen.getByLabelText(/GEDS XML URLs/i);
    fireEvent.change(textarea, {
      target: {
        value: `https://geds-sage.gc.ca/en/GEDS?pgid=026&dn=test1
https://geds-sage.gc.ca/en/GEDS?pgid=026&dn=test2`,
      },
    });

    const button = screen.getByRole('button', { name: /Import from 2 GEDS URLs/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockToast.success).toHaveBeenCalledWith('Successfully imported 1 GEDS file');
      expect(mockToast.error).toHaveBeenCalledWith('1 import failed');
    });
  });
});
