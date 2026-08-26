/**
 * Report Export Utilities (Tasks 98-99)
 * Provides PDF and Excel export functionality for all reports
 * 
 * Requirements: 16.7, 23.5, 24.5, 25.6
 */

import jsPDF from 'jspdf';

/**
 * Export configuration for reports
 */
export interface ExportConfig {
  title: string;
  filename: string;
  storeName?: string;
  logoUrl?: string;
  dateRange?: {
    start: string;
    end: string;
  };
  period?: string; // e.g., "January 2024" or "Week 1, 2024"
}

/**
 * Format currency for display
 */
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount);
};

/**
 * Format percentage
 */
export const formatPercentage = (value: number): string => {
  return `${value}%`;
};

/**
 * Generate PDF header with logo and store info
 * Task 98: Implement PDF export for reports
 */
export async function addPDFHeader(
  doc: jsPDF,
  config: ExportConfig
): Promise<void> {
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  let yPos = 15;

  // Load and add logo if provided
  if (config.logoUrl) {
    try {
      const logoSize = 15;
      const logoX = pageWidth - margin - logoSize;
      doc.addImage(config.logoUrl, 'PNG', logoX, yPos, logoSize, logoSize);
    } catch (error) {
      console.warn('Failed to load logo:', error);
    }
  }

  // Title
  doc.setFontSize(16);
  doc.setTextColor(51, 65, 85); // slate-800
  doc.text(config.title, margin, yPos + 5);

  yPos += 12;

  // Store name
  if (config.storeName) {
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text(`Toko: ${config.storeName}`, margin, yPos);
    yPos += 6;
  }

  // Date range or period
  if (config.dateRange) {
    doc.setFontSize(9);
    doc.text(
      `Periode: ${config.dateRange.start} s/d ${config.dateRange.end}`,
      margin,
      yPos
    );
    yPos += 5;
  } else if (config.period) {
    doc.setFontSize(9);
    doc.text(`Periode: ${config.period}`, margin, yPos);
    yPos += 5;
  }

  // Generation timestamp
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text(
    `Dibuat: ${new Date().toLocaleString('id-ID')}`,
    margin,
    yPos
  );

  // Add a horizontal line
  yPos += 3;
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, yPos, pageWidth - margin, yPos);

  return Promise.resolve();
}

/**
 * Add footer with page numbers
 */
export function addPDFFooter(doc: jsPDF): void {
  const pageCount = (doc as any).internal.pages.length - 1;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Halaman ${i} dari ${pageCount}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );
  }
}

/**
 * Export table data to PDF
 * Supports multiple table formats
 */
export interface PDFTableConfig {
  title: string;
  headers: string[];
  rows: (string | number)[][];
  columnWidths?: number[];
  startY?: number;
}

export function addPDFTable(
  doc: jsPDF,
  config: PDFTableConfig
): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const pageHeight = doc.internal.pageSize.getHeight();

  let yPos = config.startY || 40;
  const rowHeight = 6;
  const headerHeight = 8;

  // Table title
  doc.setFontSize(11);
  doc.setTextColor(51, 65, 85);
  doc.text(config.title, margin, yPos);
  yPos += 8;

  // Header
  const tableWidth = pageWidth - 2 * margin;
  const colWidth = config.columnWidths || 
    Array(config.headers.length).fill(tableWidth / config.headers.length);

  doc.setFillColor(243, 244, 246); // gray-100
  doc.rect(margin, yPos, tableWidth, headerHeight, 'F');
  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);
  doc.setFont(undefined, 'bold');

  let xPos = margin;
  config.headers.forEach((header, idx) => {
    doc.text(header, xPos + 2, yPos + 5);
    xPos += colWidth[idx];
  });

  yPos += headerHeight;
  doc.setFont(undefined, 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);

  // Rows
  config.rows.forEach((row) => {
    if (yPos > pageHeight - 30) {
      doc.addPage();
      yPos = 20;

      // Re-add header on new page
      doc.setFillColor(243, 244, 246);
      doc.rect(margin, yPos, tableWidth, headerHeight, 'F');
      doc.setFontSize(9);
      doc.setTextColor(51, 65, 85);
      doc.setFont(undefined, 'bold');

      let headerXPos = margin;
      config.headers.forEach((header, idx) => {
        doc.text(header, headerXPos + 2, yPos + 5);
        headerXPos += colWidth[idx];
      });

      yPos += headerHeight;
      doc.setFont(undefined, 'normal');
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
    }

    xPos = margin;
    row.forEach((cell, idx) => {
      const text = String(cell);
      doc.text(text, xPos + 2, yPos + 4);
      xPos += colWidth[idx];
    });

    yPos += rowHeight;
  });

  return yPos;
}

/**
 * Export report to PDF
 * Task 98: Implement PDF export for reports
 */
export async function exportReportToPDF(
  data: any,
  config: ExportConfig,
  tableConfig: PDFTableConfig
): Promise<void> {
  try {
    const doc = new jsPDF();

    // Add header
    await addPDFHeader(doc, config);

    // Add table
    addPDFTable(doc, {
      ...tableConfig,
      startY: 35,
    });

    // Add footer
    addPDFFooter(doc);

    // Save PDF
    doc.save(config.filename);
  } catch (error) {
    console.error('Failed to export PDF:', error);
    throw new Error('Gagal mengekspor PDF. Silakan coba lagi.');
  }
}

/**
 * Export report to Excel (CSV format for broad compatibility)
 * Task 99: Implement Excel export for reports
 */
export function exportReportToExcel(
  data: any[],
  config: ExportConfig,
  columns: {
    key: string;
    label: string;
    format?: (value: any) => string;
  }[]
): void {
  try {
    // Build CSV header
    let csv = `${config.title}\n`;
    if (config.period) {
      csv += `Periode: ${config.period}\n`;
    } else if (config.dateRange) {
      csv += `Periode: ${config.dateRange.start} s/d ${config.dateRange.end}\n`;
    }
    if (config.storeName) {
      csv += `Toko: ${config.storeName}\n`;
    }
    csv += `Dibuat: ${new Date().toLocaleString('id-ID')}\n\n`;

    // Add column headers
    csv += columns.map((col) => `"${col.label}"`).join(',') + '\n';

    // Add data rows
    data.forEach((row) => {
      const values = columns.map((col) => {
        const value = row[col.key];
        const formatted = col.format ? col.format(value) : String(value || '');
        // Escape quotes and wrap in quotes if contains comma or quote
        const escaped = formatted
          .replace(/"/g, '""')
          .replace(/\n/g, ' ');
        return `"${escaped}"`;
      });
      csv += values.join(',') + '\n';
    });

    csv += `\n\nDibuat pada: ${new Date().toLocaleString('id-ID')}`;

    // Create and download file
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', config.filename.replace('.pdf', '.csv'));
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error('Failed to export Excel:', error);
    throw new Error('Gagal mengekspor Excel. Silakan coba lagi.');
  }
}

/**
 * Multi-sheet Excel export (if using a more advanced library in future)
 * Currently uses CSV as fallback
 */
export interface ExcelSheetConfig {
  sheetName: string;
  data: any[];
  columns: {
    key: string;
    label: string;
    format?: (value: any) => string;
  }[];
}

export function exportMultiSheetExcel(
  sheets: ExcelSheetConfig[],
  filename: string
): void {
  // For now, export first sheet only (CSV limitation)
  // Future enhancement: use xlsx library for true multi-sheet support
  if (sheets.length === 0) return;

  const firstSheet = sheets[0];
  let csv = `Sheet: ${firstSheet.sheetName}\n\n`;

  // Add column headers
  csv += firstSheet.columns.map((col) => `"${col.label}"`).join(',') + '\n';

  // Add data rows
  firstSheet.data.forEach((row) => {
    const values = firstSheet.columns.map((col) => {
      const value = row[col.key];
      const formatted = col.format ? col.format(value) : String(value || '');
      const escaped = formatted
        .replace(/"/g, '""')
        .replace(/\n/g, ' ');
      return `"${escaped}"`;
    });
    csv += values.join(',') + '\n';
  });

  // Create and download file
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename.replace('.xlsx', '.csv'));
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Hook for using report export in components
 */
export function useReportExport() {
  const exportToPDF = async (
    data: any,
    config: ExportConfig,
    tableConfig: PDFTableConfig
  ) => {
    try {
      await exportReportToPDF(data, config, tableConfig);
      return { success: true, error: null };
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : 'Export gagal';
      return { success: false, error: errorMsg };
    }
  };

  const exportToExcel = (
    data: any[],
    config: ExportConfig,
    columns: any[]
  ) => {
    try {
      exportReportToExcel(data, config, columns);
      return { success: true, error: null };
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : 'Export gagal';
      return { success: false, error: errorMsg };
    }
  };

  return {
    exportToPDF,
    exportToExcel,
  };
}
