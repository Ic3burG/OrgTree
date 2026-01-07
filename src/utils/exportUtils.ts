import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';

interface ExportResult {
  success: boolean;
}

/**
 * Export organization chart as PNG image
 */
export async function exportToPng(
  element: HTMLElement,
  filename: string = 'org-chart.png'
): Promise<ExportResult> {
  try {
    const dataUrl = await toPng(element, {
      backgroundColor: '#f8fafc',
      quality: 1,
      pixelRatio: 2, // Higher resolution for better quality
      filter: (node: HTMLElement): boolean => {
        // Exclude UI controls from export
        const exclusionClasses = [
          'react-flow__controls',
          'react-flow__minimap',
          'react-flow__attribution',
        ];
        return !exclusionClasses.some(className => node.classList?.contains(className));
      },
    });

    // Download the image
    const link = document.createElement('a');
    link.download = filename;
    link.href = dataUrl;
    link.click();

    return { success: true };
  } catch (err) {
    console.error('Export to PNG failed:', err);
    throw new Error('Failed to export as PNG');
  }
}

/**
 * Export organization chart as PDF document
 */
export async function exportToPdf(
  element: HTMLElement,
  filename: string = 'org-chart.pdf',
  orgName: string = 'Organization Chart'
): Promise<ExportResult> {
  try {
    // Capture as image first
    const dataUrl = await toPng(element, {
      backgroundColor: '#f8fafc',
      quality: 1,
      pixelRatio: 2,
      filter: (node: HTMLElement): boolean => {
        const exclusionClasses = [
          'react-flow__controls',
          'react-flow__minimap',
          'react-flow__attribution',
        ];
        return !exclusionClasses.some(className => node.classList?.contains(className));
      },
    });

    // Get image dimensions
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = (): void => resolve();
      img.onerror = (): void => reject(new Error('Failed to load image'));
      img.src = dataUrl;
    });

    // Calculate PDF dimensions (A4 or fit to content)
    const imgWidth = img.width;
    const imgHeight = img.height;
    const ratio = imgWidth / imgHeight;

    // Use landscape if wider than tall
    const orientation = ratio > 1 ? 'landscape' : 'portrait';
    const pdf = new jsPDF({
      orientation,
      unit: 'px',
      format: 'a4',
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    // Add title
    pdf.setFontSize(20);
    pdf.setTextColor(51, 65, 85); // slate-700
    pdf.text(orgName, 40, 40);

    // Add timestamp
    pdf.setFontSize(10);
    pdf.setTextColor(100, 116, 139); // slate-500
    pdf.text(`Generated: ${new Date().toLocaleString()}`, 40, 60);

    // Calculate image placement
    const margin = 40;
    const availableWidth = pageWidth - margin * 2;
    const availableHeight = pageHeight - 80 - margin; // Account for header

    let finalWidth = availableWidth;
    let finalHeight = availableWidth / ratio;

    if (finalHeight > availableHeight) {
      finalHeight = availableHeight;
      finalWidth = availableHeight * ratio;
    }

    // Center the image
    const x = (pageWidth - finalWidth) / 2;
    const y = 80;

    pdf.addImage(dataUrl, 'PNG', x, y, finalWidth, finalHeight);

    // Save the PDF
    pdf.save(filename);

    return { success: true };
  } catch (err) {
    console.error('Export to PDF failed:', err);
    throw new Error('Failed to export as PDF');
  }
}
