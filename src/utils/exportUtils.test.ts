import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { exportToPng, exportToPdf } from './exportUtils';
import * as htmlToImage from 'html-to-image';
import { jsPDF } from 'jspdf';

// Mock dependnecies
vi.mock('html-to-image', () => ({
  toPng: vi.fn(),
}));

vi.mock('jspdf', () => {
  const jsPDFMock = {
    save: vi.fn(),
    text: vi.fn(),
    setFontSize: vi.fn(),
    setTextColor: vi.fn(),
    addImage: vi.fn(),
    internal: {
      pageSize: {
        getWidth: () => 595,
        getHeight: () => 842,
      },
    },
  };
  return {
    jsPDF: vi.fn().mockImplementation(function () {
      return jsPDFMock;
    }),
  };
});

describe('exportUtils', () => {
  let element: HTMLElement;

  beforeEach(() => {
    vi.clearAllMocks();
    element = document.createElement('div');
    global.URL.createObjectURL = vi.fn();
    global.URL.revokeObjectURL = vi.fn();

    // Mock Image loading
    global.Image = class {
      onload: () => void = () => {};
      onerror: () => void = () => {};
      src = '';
      width = 100;
      height = 100;
      constructor() {
        setTimeout(() => this.onload(), 0);
      }
    } as unknown as typeof Image;
  });

  describe('exportToPng', () => {
    it('exports element to PNG successfully', async () => {
      const dataUrl = 'data:image/png;base64,test';
      vi.mocked(htmlToImage.toPng).mockResolvedValue(dataUrl);

      const linkClickSpy = vi.fn();
      vi.spyOn(document, 'createElement').mockReturnValue({
        click: linkClickSpy,
        download: '',
        href: '',
      } as unknown as HTMLAnchorElement);

      const result = await exportToPng(element, 'chart.png');

      expect(result.success).toBe(true);
      expect(htmlToImage.toPng).toHaveBeenCalledWith(element, expect.any(Object));
      expect(linkClickSpy).toHaveBeenCalled();
    });

    it('handles errors during PNG export', async () => {
      vi.mocked(htmlToImage.toPng).mockRejectedValue(new Error('Failed'));

      await expect(exportToPng(element)).rejects.toThrow('Failed to export as PNG');
    });
  });

  describe('exportToPdf', () => {
    it('exports element to PDF successfully', async () => {
      const dataUrl = 'data:image/png;base64,test';
      vi.mocked(htmlToImage.toPng).mockResolvedValue(dataUrl);

      const result = await exportToPdf(element, 'chart.pdf');

      expect(result.success).toBe(true);
      expect(jsPDF).toHaveBeenCalled();
      // Get the mock instance to check calls
      const mockPdf = (jsPDF as unknown as Mock).mock.results[0]?.value;
      expect(mockPdf.save).toHaveBeenCalledWith('chart.pdf');
    });

    it('handles errors during PDF export', async () => {
      vi.mocked(htmlToImage.toPng).mockRejectedValue(new Error('Failed'));
      await expect(exportToPdf(element)).rejects.toThrow('Failed to export as PDF');
    });
  });
});
