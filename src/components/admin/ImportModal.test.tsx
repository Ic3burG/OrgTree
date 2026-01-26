import { describe, it, expect, vi, beforeEach, afterEach, Mock } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ImportModal from './ImportModal';
import api from '../../api/client';
import * as csvImport from '../../utils/csvImport';

// Mock API
vi.mock('../../api/client', () => ({
  default: {
    importOrganization: vi.fn(),
  },
}));

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
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let mockReadAsText: any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let mockOnLoad: any;
let mockResult: string;

class MockFileReader {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readAsText = (...args: any[]) => mockReadAsText(...args);
  result = mockResult;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  set onload(callback: any) {
    mockOnLoad = callback;
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
    vi.resetAllMocks();
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

    // Setup mock result
    mockResult = 'test,content';

    // Trigger file selection
    fireEvent.change(input, { target: { files: [file] } });

    // Wait for readAsText to be called
    await waitFor(() => expect(mockReadAsText).toHaveBeenCalled());

    // Trigger onload
    if (mockOnLoad) {
      mockOnLoad({ target: { result: 'test,content' } });
    }

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

    if (mockOnLoad) {
      mockOnLoad({ target: { result: 'bad' } });
    }

    await waitFor(() => {
      expect(screen.getByText('Validation Errors')).toBeDefined();
      expect(screen.getByText('Invalid format')).toBeDefined();
    });
  });

  it('should execute import on button click', async () => {
    renderModal();

    // Setup preview state first
    const mockRows = [{ type: 'department', name: 'Dept 1' }];
    (csvImport.parseCSV as Mock).mockReturnValue(mockRows);
    (csvImport.validateCSVData as Mock).mockReturnValue([]);

    const file = new File(['content'], 'test.csv', { type: 'text/csv' });
    const input = screen.getByTestId('file-input');

    mockResult = 'content';

    fireEvent.change(input, { target: { files: [file] } });
    await waitFor(() => expect(mockReadAsText).toHaveBeenCalled());

    if (mockOnLoad) {
      mockOnLoad({ target: { result: 'content' } });
    }

    // Wait for Import button to be enabled
    const importBtn = await screen.findByText('Import', { selector: 'button' });
    expect(importBtn).not.toBeDisabled();

    // Mock API success
    (api.importOrganization as Mock).mockResolvedValue({
      departmentsCreated: 1,
      peopleCreated: 0,
      peopleSkipped: 0,
      errors: [],
    });

    fireEvent.click(importBtn);

    // Wait for the import to complete and success message to appear
    await waitFor(() => {
      expect(screen.getByText('Import Complete!')).toBeDefined();
    });

    // Verify the API was called with correct data
    expect(api.importOrganization).toHaveBeenCalledWith(mockOrgId, mockRows);
  });
});
