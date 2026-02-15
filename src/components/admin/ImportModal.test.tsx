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

import { describe, it, expect, vi, beforeEach, afterEach, Mock } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import ImportModal from './ImportModal';
import api from '../../api/client';
import * as csvImport from '../../utils/csvImport';

// Mock API
vi.mock('../../api/client', () => {
  const mockApi = {
    importOrganization: vi.fn(),
  };
  return {
    default: mockApi,
    api: mockApi,
  };
});

// Mock GedsUrlImporter
vi.mock('./GedsUrlImporter', () => ({
  default: ({ onImportComplete }: { onImportComplete: () => void }) => (
    <div data-testid="geds-url-importer">
      <button onClick={onImportComplete}>Simulate Import</button>
    </div>
  ),
}));

// Mock utility functions
vi.mock('../../utils/csvImport', () => ({
  parseCSV: vi.fn(),
  validateCSVData: vi.fn(),
}));

vi.mock('../../utils/xmlImport', () => ({
  processXmlFiles: vi.fn(),
}));

// Global mocks for FileReader interactions
let mockReadAsText: Mock;
let mockOnLoad: ((e: { target: { result: string } }) => void) | null;
let mockResult: string;

class MockFileReader {
  readAsText = (file: File) => mockReadAsText(file);
  result = mockResult;
  set onload(callback: (e: { target: { result: string } }) => void) {
    mockOnLoad = callback;
  }
  get onload() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return mockOnLoad as any;
  }
}

describe('ImportModal', () => {
  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();
  const mockOrgId = 'org-123';

  beforeEach(() => {
    vi.clearAllMocks();
    mockReadAsText = vi.fn();
    mockOnLoad = null;
    mockResult = '';
    vi.stubGlobal('FileReader', MockFileReader);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  const renderModal = (isOpen = true) => {
    return render(
      <ImportModal
        isOpen={isOpen}
        onClose={mockOnClose}
        orgId={mockOrgId}
        onSuccess={mockOnSuccess}
      />
    );
  };

  it('should not render when isOpen is false', () => {
    renderModal(false);
    expect(screen.queryByText('Import Data')).toBeNull();
  });

  it('should render correctly when open', () => {
    renderModal();
    expect(screen.getByText('Import Data')).toBeDefined();
    expect(screen.getByText('CSV File')).toBeDefined();
    expect(screen.getByText('GEDS XML')).toBeDefined();
    expect(screen.getByText('GEDS URLs')).toBeDefined();
  });

  it('should switch import types', () => {
    renderModal();

    // Default is CSV
    expect(screen.getByText(/Click to select a CSV file/i)).toBeDefined();

    // Switch to XML
    fireEvent.click(screen.getByText('GEDS XML'));
    expect(screen.getByText(/Click to select XML files/i)).toBeDefined();

    // Switch to URLs
    fireEvent.click(screen.getByText('GEDS URLs'));
    expect(screen.getByTestId('geds-url-importer')).toBeDefined();
  });

  it('should handle CSV file selection and preview', async () => {
    renderModal();

    const mockRows = [
      { type: 'department', name: 'Dept 1', path: '/Dept 1' },
      { type: 'person', name: 'Person 1', email: 'p1@example.com' },
    ];

    (csvImport.parseCSV as Mock).mockReturnValue(mockRows);
    (csvImport.validateCSVData as Mock).mockReturnValue([]);

    const file = new File(['test,content'], 'test.csv', { type: 'text/csv' });
    const input = screen.getByTestId('file-input');

    mockResult = 'test,content';
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => expect(mockReadAsText).toHaveBeenCalled());

    await act(async () => {
      if (mockOnLoad) {
        mockOnLoad({ target: { result: 'test,content' } });
      }
    });

    await waitFor(() => {
      expect(screen.getByText(/Preview/i)).toBeDefined();
      expect(screen.getByText(/1 department\(s\) and 1 person\(s\)/i)).toBeDefined();
    });
  });

  it('should handle CSV validation errors', async () => {
    renderModal();

    (csvImport.parseCSV as Mock).mockReturnValue([]);
    (csvImport.validateCSVData as Mock).mockReturnValue(['Invalid format']);

    const file = new File(['bad'], 'test.csv', { type: 'text/csv' });
    const input = screen.getByTestId('file-input');

    mockResult = 'bad';
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => expect(mockReadAsText).toHaveBeenCalled());

    await act(async () => {
      if (mockOnLoad) {
        mockOnLoad({ target: { result: 'bad' } });
      }
    });

    await waitFor(() => {
      expect(screen.getByText('Validation Errors')).toBeDefined();
      expect(screen.getByText('Invalid format')).toBeDefined();
    });
  });

  it('should execute import on button click', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    renderModal();

    const mockRows = [{ type: 'department', name: 'Dept 1' }];
    (csvImport.parseCSV as Mock).mockReturnValue(mockRows);
    (csvImport.validateCSVData as Mock).mockReturnValue([]);

    const file = new File(['content'], 'test.csv', { type: 'text/csv' });
    const input = screen.getByTestId('file-input');

    mockResult = 'content';
    fireEvent.change(input, { target: { files: [file] } });
    await waitFor(() => expect(mockReadAsText).toHaveBeenCalled());

    await act(async () => {
      if (mockOnLoad) {
        mockOnLoad({ target: { result: 'content' } });
      }
    });

    const importBtn = await screen.findByText('Import', { selector: 'button' });
    (api.importOrganization as Mock).mockResolvedValue({
      departmentsCreated: 1,
      peopleCreated: 0,
      peopleSkipped: 0,
      errors: [],
    });

    fireEvent.click(importBtn);

    await waitFor(() => {
      expect(screen.getByText('Import Complete!')).toBeDefined();
    });

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(mockOnSuccess).toHaveBeenCalled();
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should display duplicate warnings in summary', async () => {
    renderModal();

    const mockRows = [{ type: 'person', name: 'Duplicate' }];
    (csvImport.parseCSV as Mock).mockReturnValue(mockRows);
    (csvImport.validateCSVData as Mock).mockReturnValue([]);

    const file = new File(['content'], 'test.csv', { type: 'text/csv' });
    const input = screen.getByTestId('file-input');
    mockResult = 'content';
    fireEvent.change(input, { target: { files: [file] } });
    await waitFor(() => expect(mockReadAsText).toHaveBeenCalled());

    await act(async () => {
      if (mockOnLoad) mockOnLoad({ target: { result: 'content' } });
    });

    (api.importOrganization as Mock).mockResolvedValue({
      departmentsCreated: 0,
      peopleCreated: 0,
      peopleSkipped: 1,
      errors: [],
    });

    const importBtn = await screen.findByText('Import', { selector: 'button' });
    fireEvent.click(importBtn);

    await waitFor(() => {
      expect(screen.getByText(/1 skipped \(duplicates\)/i)).toBeDefined();
    });
  });
});
