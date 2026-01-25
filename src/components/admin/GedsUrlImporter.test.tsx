import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import GedsUrlImporter from './GedsUrlImporter';
import * as gedsApi from '../../api/geds';
import * as Toast from '../ui/Toast';

// Mock the API and Toast
vi.mock('../../api/geds');
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
    const mockResponse = {
      results: [
        {
          url: 'https://geds-sage.gc.ca/en/GEDS?pgid=026&dn=test',
          status: 'success' as const,
          message: 'Imported successfully',
          stats: { departments: 5, people: 10 },
        },
      ],
    };

    vi.mocked(gedsApi.importGedsUrls).mockResolvedValue(mockResponse);

    render(<GedsUrlImporter organizationId={orgId} onImportComplete={mockOnImportComplete} />);

    const textarea = screen.getByLabelText(/GEDS XML URLs/i);
    fireEvent.change(textarea, {
      target: { value: 'https://geds-sage.gc.ca/en/GEDS?pgid=026&dn=test' },
    });

    const button = screen.getByRole('button', { name: /Import from 1 GEDS URL/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(gedsApi.importGedsUrls).toHaveBeenCalledWith(orgId, [
        'https://geds-sage.gc.ca/en/GEDS?pgid=026&dn=test',
      ]);
    });

    await waitFor(() => {
      expect(mockToast.success).toHaveBeenCalledWith('Successfully imported 1 GEDS file');
      expect(mockOnImportComplete).toHaveBeenCalled();
    });
  });

  it('should handle import errors gracefully', async () => {
    vi.mocked(gedsApi.importGedsUrls).mockRejectedValue(new Error('Network error'));

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
    const mockResponse = {
      results: [
        {
          url: 'https://geds-sage.gc.ca/en/GEDS?pgid=026&dn=test1',
          status: 'success' as const,
          message: 'Imported successfully',
          stats: { departments: 5, people: 10 },
        },
        {
          url: 'https://geds-sage.gc.ca/en/GEDS?pgid=026&dn=test2',
          status: 'failed' as const,
          message: 'Import failed',
          error: 'Network timeout',
        },
      ],
    };

    vi.mocked(gedsApi.importGedsUrls).mockResolvedValue(mockResponse);

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
