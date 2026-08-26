/**
 * Receipt Printing Utilities
 * Handles print functionality and PDF export for receipts
 * Supports reprinting with current transaction details (after edits)
 */

import { Receipt } from './receiptGenerator';
import jsPDF from 'jspdf';

/**
 * Configuration for receipt printing
 */
export interface PrintConfig {
  paperWidth?: number; // in mm, default 80 (thermal paper)
  paperHeight?: number; // in mm, auto-calculated
  margins?: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  fontSize?: number;
  fontFamily?: string;
}

/**
 * Open browser print dialog for receipt printing
 * Creates a print window with the receipt content
 * 
 * @param receipt - Receipt object to print
 * @param windowTitle - Title for the print window
 */
export function printReceipt(receipt: Receipt, windowTitle: string = 'Receipt'): void {
  // Create HTML content for printing
  const printContent = generatePrintHTML(receipt);

  // Create a new window for printing
  const printWindow = window.open('', '', 'width=800,height=600');
  
  if (!printWindow) {
    throw new Error('Failed to open print window. Please check your browser popup settings.');
  }

  // Write content to the window
  printWindow.document.write(printContent);
  printWindow.document.close();

  // Set up print event listeners
  printWindow.onload = () => {
    // Give the browser time to render before printing
    setTimeout(() => {
      printWindow.print();
      // Close the window after printing
      printWindow.close();
    }, 250);
  };
}

/**
 * Generate HTML content for printing
 * Optimized for thermal printers (80mm width)
 * 
 * @param receipt - Receipt object
 * @returns HTML string
 */
export function generatePrintHTML(receipt: Receipt): string {
  const receiptLines = receipt.text.split('\n');

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Receipt Print</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          font-family: 'Courier New', monospace;
          font-size: 12px;
          line-height: 1.4;
          width: 80mm;
          margin: 0 auto;
          padding: 10mm;
          background-color: #fff;
          color: #000;
        }

        .receipt {
          width: 100%;
          page-break-inside: avoid;
        }

        .receipt-line {
          white-space: pre;
          word-wrap: break-word;
          overflow-wrap: break-word;
        }

        @media print {
          body {
            width: 80mm;
            margin: 0;
            padding: 5mm;
          }

          .receipt {
            page-break-inside: avoid;
          }

          .no-print {
            display: none;
          }
        }

        .print-header {
          text-align: center;
          margin-bottom: 20px;
        }

        .print-header button {
          margin: 0 10px;
          padding: 10px 20px;
          background-color: #2563eb;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
        }

        .print-header button:hover {
          background-color: #1d4ed8;
        }
      </style>
    </head>
    <body>
      <div class="print-header no-print">
        <button onclick="window.print()">Print</button>
        <button onclick="window.close()">Close</button>
      </div>

      <div class="receipt">
        ${receiptLines.map((line) => `<div class="receipt-line">${escapeHtml(line)}</div>`).join('\n')}
      </div>
    </body>
    </html>
  `;

  return html;
}

/**
 * Export receipt as PDF using jsPDF library
 * Optimized for thermal printer dimensions (80mm x variable height)
 * 
 * @param receipt - Receipt object
 * @param fileName - Name for the downloaded file (without extension)
 */
export function exportReceiptAsPDF(receipt: Receipt, fileName: string = 'receipt'): void {
  const receiptLines = receipt.text.split('\n');
  const pageWidth = 80; // mm (thermal paper width)
  const pageHeight = 297; // A4 height, will be cropped by content
  const margins = { top: 5, left: 5, right: 5, bottom: 5 };
  const fontSize = 8; // smaller font for monospace on thermal paper
  const lineHeight = 3.5; // mm per line

  // Create PDF with thermal paper dimensions
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [pageWidth, pageHeight],
  });

  // Set font
  pdf.setFont('courier', 'normal');
  pdf.setFontSize(fontSize);

  // Add receipt content
  let yPosition = margins.top;
  const textWidth = pageWidth - margins.left - margins.right;
  const availableWidth = pdf.internal.pageSize.getWidth() - margins.left - margins.right;

  receiptLines.forEach((line) => {
    // Handle very long lines
    if (line.length > 40) {
      // Split long lines
      const wrappedLines = pdf.splitTextToSize(line, availableWidth);
      wrappedLines.forEach((wrappedLine: string) => {
        if (yPosition > pageHeight - margins.bottom - 10) {
          // Add new page if needed
          pdf.addPage();
          yPosition = margins.top;
        }
        pdf.text(wrappedLine, margins.left, yPosition);
        yPosition += lineHeight;
      });
    } else {
      if (yPosition > pageHeight - margins.bottom - 10) {
        // Add new page if needed
        pdf.addPage();
        yPosition = margins.top;
      }
      pdf.text(line, margins.left, yPosition);
      yPosition += lineHeight;
    }
  });

  // Set PDF page height to content (for better thermal printer compatibility)
  const finalHeight = yPosition + margins.bottom;
  pdf.setPage(pdf.getNumberOfPages());
  pdf.internal.pageSize.setHeight(finalHeight);

  // Download PDF
  pdf.save(`${fileName}.pdf`);
}

/**
 * Open receipt in a new tab for preview before printing
 * Useful for reviewing receipt before committing to print
 * 
 * @param receipt - Receipt object
 * @param windowTitle - Title for the preview window
 */
export function previewReceipt(receipt: Receipt, windowTitle: string = 'Receipt Preview'): void {
  const printContent = generatePrintHTML(receipt);

  const previewWindow = window.open('', '', 'width=900,height=800');
  
  if (!previewWindow) {
    throw new Error('Failed to open preview window. Please check your browser popup settings.');
  }

  previewWindow.document.write(printContent);
  previewWindow.document.title = windowTitle;
}

/**
 * Copy receipt text to clipboard for manual pasting/sharing
 * 
 * @param receipt - Receipt object
 * @returns Promise that resolves when copy is successful
 */
export async function copyReceiptToClipboard(receipt: Receipt): Promise<void> {
  try {
    await navigator.clipboard.writeText(receipt.text);
  } catch (err) {
    console.error('Failed to copy receipt to clipboard:', err);
    throw new Error('Failed to copy receipt to clipboard');
  }
}

/**
 * Send receipt via email (preparation only - requires backend)
 * Generates a data URL that can be sent to backend for email delivery
 * 
 * @param receipt - Receipt object
 * @returns Object containing PDF data for transmission
 */
export async function prepareReceiptForEmail(receipt: Receipt): Promise<{
  htmlContent: string;
  textContent: string;
  fileName: string;
}> {
  return {
    htmlContent: generatePrintHTML(receipt),
    textContent: receipt.text,
    fileName: `receipt-${Date.now()}.pdf`,
  };
}

/**
 * Helper: Escape HTML special characters
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (char) => map[char]);
}

/**
 * Check if print dialog is supported
 */
export function isPrintSupported(): boolean {
  return typeof window !== 'undefined' && window.print !== undefined;
}

/**
 * Check if PDF export is supported
 */
export function isPDFExportSupported(): boolean {
  try {
    // Try to detect jsPDF availability
    if (typeof window !== 'undefined') {
      return true; // jsPDF is imported at module level
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Determine optimal print action based on browser capabilities
 * Returns recommended action and supporting capabilities
 */
export function getPrintCapabilities(): {
  canPrint: boolean;
  canExportPDF: boolean;
  canPreview: boolean;
  canCopy: boolean;
  recommendedAction: 'print' | 'pdf' | 'preview' | 'copy';
} {
  const canPrint = isPrintSupported();
  const canExportPDF = isPDFExportSupported();
  const canPreview = typeof window !== 'undefined' && window.open !== undefined;
  const canCopy = typeof navigator !== 'undefined' && navigator.clipboard !== undefined;

  let recommendedAction: 'print' | 'pdf' | 'preview' | 'copy' = 'copy';
  
  if (canPrint) {
    recommendedAction = 'print';
  } else if (canExportPDF) {
    recommendedAction = 'pdf';
  } else if (canPreview) {
    recommendedAction = 'preview';
  }

  return {
    canPrint,
    canExportPDF,
    canPreview,
    canCopy,
    recommendedAction,
  };
}
