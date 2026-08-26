/**
 * useReports hook
 * Provides report data fetching with React Query-like pattern
 */

import { useState, useCallback, useEffect } from 'react';
import { 
  DailySalesReportResponse, 
  WeeklySalesReportResponse, 
  MonthlySalesReportResponse,
  BOPReportResponse
} from '@/types/reports';

interface UseReportState {
  data: DailySalesReportResponse | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

interface UseWeeklyReportState {
  data: WeeklySalesReportResponse | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

interface UseMonthlyReportState {
  data: MonthlySalesReportResponse | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to fetch daily sales report
 * @param date - Date string in YYYY-MM-DD format
 * @returns Report data, loading state, error, and refetch function
 */
export function useDailySalesReport(date: string): UseReportState {
  const [data, setData] = useState<DailySalesReportResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReport = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Validate date format
      if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        throw new Error('Invalid date format. Use YYYY-MM-DD');
      }

      const response = await fetch(`/api/v1/reports/sales/daily?date=${date}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('No data available for this date');
        }
        throw new Error(`Failed to fetch report: ${response.statusText}`);
      }

      const result = await response.json();
      setData(result);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch daily sales report';
      setError(errorMsg);
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, [date]);

  // Fetch on mount and when date changes
  useEffect(() => {
    fetchReport();
  }, [date, fetchReport]);

  const refetch = useCallback(async () => {
    await fetchReport();
  }, [fetchReport]);

  return {
    data,
    isLoading,
    error,
    refetch,
  };
}

/**
 * Hook to fetch weekly sales report
 * @param week - ISO week number (1-53)
 * @param year - Year in YYYY format
 * @returns Report data, loading state, error, and refetch function
 */
export function useWeeklySalesReport(week: number, year: number): UseWeeklyReportState {
  const [data, setData] = useState<WeeklySalesReportResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReport = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Validate week and year
      if (!week || week < 1 || week > 53) {
        throw new Error('Invalid week number. Must be between 1 and 53');
      }
      if (!year || year < 2000 || year > 2100) {
        throw new Error('Invalid year');
      }

      const response = await fetch(
        `/api/v1/reports/sales/weekly?week=${week}&year=${year}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
          },
        }
      );

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('No data available for this week');
        }
        throw new Error(`Failed to fetch report: ${response.statusText}`);
      }

      const result = await response.json();
      setData(result);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch weekly sales report';
      setError(errorMsg);
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, [week, year]);

  // Fetch on mount and when week or year changes
  useEffect(() => {
    fetchReport();
  }, [week, year, fetchReport]);

  const refetch = useCallback(async () => {
    await fetchReport();
  }, [fetchReport]);

  return {
    data,
    isLoading,
    error,
    refetch,
  };
}

/**
 * Hook to fetch monthly sales report
 * @param month - Month number 1-12
 * @param year - Year in YYYY format
 * @returns Report data, loading state, error, and refetch function
 */
export function useMonthlySalesReport(month: number, year: number): UseMonthlyReportState {
  const [data, setData] = useState<MonthlySalesReportResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReport = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Validate month and year
      if (!month || month < 1 || month > 12) {
        throw new Error('Invalid month number. Must be between 1 and 12');
      }
      if (!year || year < 2000 || year > 2100) {
        throw new Error('Invalid year');
      }

      const response = await fetch(
        `/api/v1/reports/sales/monthly?month=${month}&year=${year}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
          },
        }
      );

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('No data available for this month');
        }
        throw new Error(`Failed to fetch report: ${response.statusText}`);
      }

      const result = await response.json();
      setData(result);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch monthly sales report';
      setError(errorMsg);
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, [month, year]);

  // Fetch on mount and when month or year changes
  useEffect(() => {
    fetchReport();
  }, [month, year, fetchReport]);

  const refetch = useCallback(async () => {
    await fetchReport();
  }, [fetchReport]);

  return {
    data,
    isLoading,
    error,
    refetch,
  };
}

/**
 * Hook to export sales report to PDF
 */
export function useExportReportPDF() {
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const exportToPDF = useCallback(
    async (report: DailySalesReportResponse, fileName: string = 'laporan-penjualan.pdf') => {
      try {
        setIsExporting(true);
        setError(null);

        // Dynamic import to avoid issues with SSR
        const jsPDF = (await import('jspdf')).default;

        const { jsPDF: PDF } = jsPDF;
        const doc = new PDF();

        // Set up colors and fonts
        const darkColor = [51, 65, 85]; // slate-800
        const lightColor = [100, 116, 139]; // slate-500

        // Title
        doc.setFontSize(18);
        doc.setTextColor(...darkColor);
        doc.text('Laporan Penjualan Harian', 20, 20);

        // Date
        doc.setFontSize(11);
        doc.setTextColor(...lightColor);
        doc.text(`Tanggal: ${report.data.date}`, 20, 30);
        doc.text(`Dibuat: ${new Date(report.meta.timestamp).toLocaleString('id-ID')}`, 20, 36);

        // Summary Section
        let yPos = 50;
        doc.setFontSize(12);
        doc.setTextColor(...darkColor);
        doc.text('Ringkasan Penjualan', 20, yPos);

        yPos += 8;
        doc.setFontSize(10);
        doc.setTextColor(...lightColor);

        const formatCurrency = (amount: number) => {
          return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
          }).format(amount);
        };

        doc.text(`Total Penjualan: ${formatCurrency(report.data.summary.totalRevenue)}`, 20, yPos);
        yPos += 6;
        doc.text(`Total Transaksi: ${report.data.summary.totalTransactions} transaksi`, 20, yPos);
        yPos += 6;
        doc.text(`Rata-rata Transaksi: ${formatCurrency(report.data.summary.totalRevenue / (report.data.summary.totalTransactions || 1))}`, 20, yPos);
        yPos += 6;
        doc.text(`Jumlah Toko: ${report.data.summary.storeCount} toko`, 20, yPos);

        // Store Breakdown Table
        yPos += 12;
        doc.setFontSize(12);
        doc.setTextColor(...darkColor);
        doc.text('Rincian Per Toko', 20, yPos);

        yPos += 8;
        doc.setFontSize(9);

        // Table headers
        const headers = ['No', 'Toko', 'Penjualan', 'Transaksi', 'Rata-rata', 'Metode Pembayaran'];
        const headerY = yPos;
        doc.setFillColor(248, 250, 252); // slate-50
        doc.rect(20, headerY, 170, 6, 'F');
        doc.setTextColor(...darkColor);

        let xPos = 22;
        doc.text('No', xPos, headerY + 5);
        xPos += 15;
        doc.text('Toko', xPos, headerY + 5);
        xPos += 50;
        doc.text('Penjualan', xPos, headerY + 5);
        xPos += 30;
        doc.text('Transaksi', xPos, headerY + 5);
        xPos += 25;
        doc.text('Rata-rata', xPos, headerY + 5);

        yPos = headerY + 8;

        // Table rows
        report.data.byStore.forEach((store, idx) => {
          if (yPos > 250) {
            doc.addPage();
            yPos = 20;
          }

          doc.setTextColor(...lightColor);
          doc.text((idx + 1).toString(), 22, yPos);
          doc.text(store.storeName, 37, yPos);
          doc.text(formatCurrency(store.revenue), 85, yPos);
          doc.text(store.transactionCount.toString(), 115, yPos);
          doc.text(formatCurrency(store.averageTransaction), 140, yPos);

          // Payment methods
          const paymentText = Object.entries(store.paymentMethods)
            .map(([method, stat]) => `${method}: ${stat.count}`)
            .join(', ');
          doc.setFontSize(7);
          doc.text(paymentText, 22, yPos + 4);
          doc.setFontSize(9);

          yPos += 10;
        });

        // Footer
        const pageCount = doc.internal.pages.length - 1;
        for (let i = 1; i <= pageCount; i++) {
          doc.setPage(i);
          doc.setFontSize(8);
          doc.setTextColor(...lightColor);
          doc.text(`Halaman ${i} dari ${pageCount}`, 105, 285, { align: 'center' });
        }

        // Save
        doc.save(fileName);
        setIsExporting(false);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to export PDF';
        setError(errorMsg);
        setIsExporting(false);
      }
    },
    []
  );

  return {
    exportToPDF,
    isExporting,
    error,
  };
}

/**
 * Hook to export sales report to Excel
 */
export function useExportReportExcel() {
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const exportToExcel = useCallback(
    async (report: DailySalesReportResponse, fileName: string = 'laporan-penjualan.csv') => {
      try {
        setIsExporting(true);
        setError(null);

        const formatCurrency = (amount: number) => {
          return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
          }).format(amount);
        };

        // Build CSV content
        let csv = 'Laporan Penjualan Harian\n';
        csv += `Tanggal: ${report.data.date}\n`;
        csv += `Dibuat: ${new Date(report.meta.timestamp).toLocaleString('id-ID')}\n\n`;

        csv += 'RINGKASAN PENJUALAN\n';
        csv += `Total Penjualan,${formatCurrency(report.data.summary.totalRevenue)}\n`;
        csv += `Total Transaksi,${report.data.summary.totalTransactions}\n`;
        csv += `Rata-rata Transaksi,${formatCurrency(report.data.summary.totalRevenue / (report.data.summary.totalTransactions || 1))}\n`;
        csv += `Jumlah Toko,${report.data.summary.storeCount}\n\n`;

        csv += 'RINCIAN PER TOKO\n';
        csv += 'No,Toko,Penjualan,Transaksi,Rata-rata,Cash Count,Cash Amount,Member Count,Member Amount,Tempo Count,Tempo Amount\n';

        report.data.byStore.forEach((store, idx) => {
          const cash = store.paymentMethods.CASH || { count: 0, amount: 0 };
          const member = store.paymentMethods.MEMBER || { count: 0, amount: 0 };
          const tempo = store.paymentMethods.TEMPO || { count: 0, amount: 0 };

          csv += `${idx + 1},"${store.storeName}",${formatCurrency(store.revenue)},${store.transactionCount},${formatCurrency(store.averageTransaction)},${cash.count},${formatCurrency(cash.amount)},${member.count},${formatCurrency(member.amount)},${tempo.count},${formatCurrency(tempo.amount)}\n`;
        });

        csv += `\nDibuat pada: ${new Date().toLocaleString('id-ID')}`;

        // Create blob and download
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);

        link.setAttribute('href', url);
        link.setAttribute('download', fileName);
        link.style.visibility = 'hidden';

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        setIsExporting(false);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to export Excel';
        setError(errorMsg);
        setIsExporting(false);
      }
    },
    []
  );

  return {
    exportToExcel,
    isExporting,
    error,
  };
}

/**
 * Hook to export weekly sales report to PDF
 */
export function useExportWeeklyReportPDF() {
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const exportToPDF = useCallback(
    async (report: WeeklySalesReportResponse, fileName: string = 'laporan-penjualan-mingguan.pdf') => {
      try {
        setIsExporting(true);
        setError(null);

        const jsPDF = (await import('jspdf')).default;
        const { jsPDF: PDF } = jsPDF;
        const doc = new PDF();

        const darkColor = [51, 65, 85];
        const lightColor = [100, 116, 139];

        // Title
        doc.setFontSize(18);
        doc.setTextColor(...darkColor);
        doc.text('Laporan Penjualan Mingguan', 20, 20);

        // Week info
        doc.setFontSize(11);
        doc.setTextColor(...lightColor);
        doc.text(`Minggu ${report.data.week}, Tahun ${report.data.year}`, 20, 30);
        doc.text(`Periode: ${report.data.weekStart} s/d ${report.data.weekEnd}`, 20, 36);
        doc.text(`Dibuat: ${new Date(report.meta.timestamp).toLocaleString('id-ID')}`, 20, 42);

        // Summary
        let yPos = 55;
        doc.setFontSize(12);
        doc.setTextColor(...darkColor);
        doc.text('Ringkasan Penjualan', 20, yPos);

        yPos += 8;
        doc.setFontSize(10);
        doc.setTextColor(...lightColor);

        const formatCurrency = (amount: number) => {
          return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
          }).format(amount);
        };

        doc.text(`Total Penjualan: ${formatCurrency(report.data.summary.totalRevenue)}`, 20, yPos);
        yPos += 6;
        doc.text(`Total Transaksi: ${report.data.summary.totalTransactions} transaksi`, 20, yPos);
        yPos += 6;
        doc.text(`Jumlah Toko: ${report.data.summary.storeCount} toko`, 20, yPos);

        // Store breakdown
        yPos += 12;
        doc.setFontSize(12);
        doc.setTextColor(...darkColor);
        doc.text('Rincian Per Toko', 20, yPos);

        yPos += 8;
        doc.setFontSize(8);

        report.data.byStore.forEach((store, storeIdx) => {
          if (yPos > 240) {
            doc.addPage();
            yPos = 20;
          }

          // Store header
          doc.setTextColor(...darkColor);
          doc.setFont(undefined, 'bold');
          doc.text(`${storeIdx + 1}. ${store.storeName}`, 20, yPos);
          yPos += 5;

          doc.setFont(undefined, 'normal');
          doc.setTextColor(...lightColor);
          doc.setFontSize(7);
          doc.text(
            `Penjualan: ${formatCurrency(store.revenue)} | Transaksi: ${store.transactionCount}`,
            20,
            yPos
          );
          yPos += 4;

          // Daily breakdown
          doc.text('Hari | Revenue | Transaksi', 20, yPos);
          yPos += 3;

          store.dailyBreakdown.forEach((day) => {
            if (yPos > 270) {
              doc.addPage();
              yPos = 20;
            }
            const dayText = `${day.dayOfWeek.substring(0, 3)} | ${formatCurrency(day.revenue)} | ${day.transactionCount}`;
            doc.text(dayText, 22, yPos);
            yPos += 3;
          });

          yPos += 2;
        });

        doc.save(fileName);
        setIsExporting(false);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to export PDF';
        setError(errorMsg);
        setIsExporting(false);
      }
    },
    []
  );

  return {
    exportToPDF,
    isExporting,
    error,
  };
}

/**
 * Hook to export weekly sales report to Excel
 */
export function useExportWeeklyReportExcel() {
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const exportToExcel = useCallback(
    async (report: WeeklySalesReportResponse, fileName: string = 'laporan-penjualan-mingguan.csv') => {
      try {
        setIsExporting(true);
        setError(null);

        const formatCurrency = (amount: number) => {
          return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
          }).format(amount);
        };

        let csv = 'Laporan Penjualan Mingguan\n';
        csv += `Minggu ${report.data.week}, Tahun ${report.data.year}\n`;
        csv += `Periode: ${report.data.weekStart} s/d ${report.data.weekEnd}\n`;
        csv += `Dibuat: ${new Date(report.meta.timestamp).toLocaleString('id-ID')}\n\n`;

        csv += 'RINGKASAN PENJUALAN\n';
        csv += `Total Penjualan,${formatCurrency(report.data.summary.totalRevenue)}\n`;
        csv += `Total Transaksi,${report.data.summary.totalTransactions}\n`;
        csv += `Jumlah Toko,${report.data.summary.storeCount}\n\n`;

        csv += 'RINCIAN PER TOKO\n';
        csv += 'No,Toko,Penjualan,Transaksi,Metode Pembayaran\n';

        report.data.byStore.forEach((store, idx) => {
          csv += `${idx + 1},"${store.storeName}",${formatCurrency(store.revenue)},${store.transactionCount},`;
          const paymentText = Object.entries(store.paymentMethods)
            .map(([method, stat]) => `${method}: ${stat.count} (${formatCurrency(stat.amount)})`)
            .join('; ');
          csv += `"${paymentText}"\n`;

          // Add daily breakdown
          csv += 'Hari,Revenue,Transaksi\n';
          store.dailyBreakdown.forEach((day) => {
            csv += `${day.dayOfWeek},${formatCurrency(day.revenue)},${day.transactionCount}\n`;
          });
          csv += '\n';
        });

        csv += `\nDibuat pada: ${new Date().toLocaleString('id-ID')}`;

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);

        link.setAttribute('href', url);
        link.setAttribute('download', fileName);
        link.style.visibility = 'hidden';

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        setIsExporting(false);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to export Excel';
        setError(errorMsg);
        setIsExporting(false);
      }
    },
    []
  );

  return {
    exportToExcel,
    isExporting,
    error,
  };
}

/**
 * Hook to export monthly sales report to PDF
 */
export function useExportMonthlyReportPDF() {
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const exportToPDF = useCallback(
    async (report: MonthlySalesReportResponse, fileName: string = 'laporan-penjualan-bulanan.pdf') => {
      try {
        setIsExporting(true);
        setError(null);

        const jsPDF = (await import('jspdf')).default;
        const { jsPDF: PDF } = jsPDF;
        const doc = new PDF();

        const darkColor = [51, 65, 85];
        const lightColor = [100, 116, 139];

        // Title
        doc.setFontSize(18);
        doc.setTextColor(...darkColor);
        doc.text('Laporan Penjualan Bulanan', 20, 20);

        // Month info
        const monthNames = [
          'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
          'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
        ];
        doc.setFontSize(11);
        doc.setTextColor(...lightColor);
        doc.text(`${monthNames[report.data.month - 1]} ${report.data.year}`, 20, 30);
        doc.text(`Periode: ${report.data.monthStart} s/d ${report.data.monthEnd}`, 20, 36);
        doc.text(`Dibuat: ${new Date(report.meta.timestamp).toLocaleString('id-ID')}`, 20, 42);

        // Summary
        let yPos = 55;
        doc.setFontSize(12);
        doc.setTextColor(...darkColor);
        doc.text('Ringkasan Penjualan', 20, yPos);

        yPos += 8;
        doc.setFontSize(10);
        doc.setTextColor(...lightColor);

        const formatCurrency = (amount: number) => {
          return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
          }).format(amount);
        };

        doc.text(`Total Penjualan: ${formatCurrency(report.data.summary.totalRevenue)}`, 20, yPos);
        yPos += 6;
        doc.text(`Total Transaksi: ${report.data.summary.totalTransactions} transaksi`, 20, yPos);
        yPos += 6;
        doc.text(`Rata-rata Transaksi: ${formatCurrency(report.data.summary.averageTransaction)}`, 20, yPos);
        yPos += 6;
        doc.text(`Jumlah Toko: ${report.data.summary.storeCount} toko`, 20, yPos);

        if (report.data.summary.topProduct) {
          yPos += 6;
          doc.text(`Produk Terlaris: ${report.data.summary.topProduct.productName}`, 20, yPos);
          yPos += 5;
          doc.setFontSize(9);
          doc.text(`  Terjual: ${report.data.summary.topProduct.quantitySold} unit | Revenue: ${formatCurrency(report.data.summary.topProduct.revenue)}`, 20, yPos);
          yPos += 3;
          doc.setFontSize(10);
        }

        // Top products
        if (report.data.topProducts.length > 0) {
          yPos += 8;
          doc.setFontSize(12);
          doc.setTextColor(...darkColor);
          doc.text('Top 10 Produk', 20, yPos);
          yPos += 6;
          doc.setFontSize(8);

          const headers = ['Rank', 'Produk', 'Qty', 'Revenue', 'Harga Rata-rata'];
          doc.setTextColor(...darkColor);
          doc.setFillColor(248, 250, 252);
          doc.rect(20, yPos - 2, 170, 5, 'F');

          let xPos = 22;
          doc.text('Rank', xPos, yPos);
          xPos += 12;
          doc.text('Produk', xPos, yPos);
          xPos += 70;
          doc.text('Qty', xPos, yPos);
          xPos += 25;
          doc.text('Revenue', xPos, yPos);
          xPos += 30;
          doc.text('Harga Rata-rata', xPos, yPos);

          yPos += 5;
          doc.setTextColor(...lightColor);

          report.data.topProducts.slice(0, 10).forEach((product, idx) => {
            if (yPos > 250) {
              doc.addPage();
              yPos = 20;
            }
            doc.text((idx + 1).toString(), 22, yPos);
            doc.text(product.productName.substring(0, 20), 34, yPos);
            doc.text(product.quantitySold.toString(), 104, yPos);
            doc.text(formatCurrency(product.revenue), 129, yPos);
            doc.text(formatCurrency(product.averagePrice || 0), 159, yPos);
            yPos += 5;
          });
        }

        // Store breakdown
        yPos += 10;
        doc.setFontSize(12);
        doc.setTextColor(...darkColor);
        doc.text('Rincian Per Toko', 20, yPos);

        yPos += 6;
        doc.setFontSize(8);

        report.data.byStore.forEach((store, storeIdx) => {
          if (yPos > 240) {
            doc.addPage();
            yPos = 20;
          }

          // Store header
          doc.setTextColor(...darkColor);
          doc.setFont(undefined, 'bold');
          doc.text(`${storeIdx + 1}. ${store.storeName}`, 20, yPos);
          yPos += 4;

          doc.setFont(undefined, 'normal');
          doc.setTextColor(...lightColor);
          doc.setFontSize(7);
          doc.text(
            `Penjualan: ${formatCurrency(store.revenue)} | Transaksi: ${store.transactionCount}`,
            20,
            yPos
          );
          yPos += 4;

          // Weekly breakdown
          doc.text('Minggu | Revenue | Transaksi', 20, yPos);
          yPos += 3;

          store.weeklyBreakdown.forEach((week) => {
            if (yPos > 270) {
              doc.addPage();
              yPos = 20;
            }
            const weekLabel = `${week.weekStart}`;
            const weekText = `${weekLabel} | ${formatCurrency(week.revenue)} | ${week.transactionCount}`;
            doc.text(weekText, 22, yPos);
            yPos += 3;
          });

          yPos += 3;
        });

        doc.save(fileName);
        setIsExporting(false);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to export PDF';
        setError(errorMsg);
        setIsExporting(false);
      }
    },
    []
  );

  return {
    exportToPDF,
    isExporting,
    error,
  };
}

/**
 * Hook to export monthly sales report to Excel
 */
export function useExportMonthlyReportExcel() {
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const exportToExcel = useCallback(
    async (report: MonthlySalesReportResponse, fileName: string = 'laporan-penjualan-bulanan.csv') => {
      try {
        setIsExporting(true);
        setError(null);

        const formatCurrency = (amount: number) => {
          return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
          }).format(amount);
        };

        const monthNames = [
          'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
          'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
        ];

        let csv = 'Laporan Penjualan Bulanan\n';
        csv += `${monthNames[report.data.month - 1]} ${report.data.year}\n`;
        csv += `Periode: ${report.data.monthStart} s/d ${report.data.monthEnd}\n`;
        csv += `Dibuat: ${new Date(report.meta.timestamp).toLocaleString('id-ID')}\n\n`;

        csv += 'RINGKASAN PENJUALAN\n';
        csv += `Total Penjualan,${formatCurrency(report.data.summary.totalRevenue)}\n`;
        csv += `Total Transaksi,${report.data.summary.totalTransactions}\n`;
        csv += `Rata-rata Transaksi,${formatCurrency(report.data.summary.averageTransaction)}\n`;
        csv += `Jumlah Toko,${report.data.summary.storeCount}\n`;

        if (report.data.summary.topProduct) {
          csv += `Produk Terlaris,"${report.data.summary.topProduct.productName}"\n`;
          csv += `Terjual,${report.data.summary.topProduct.quantitySold}\n`;
          csv += `Revenue,${formatCurrency(report.data.summary.topProduct.revenue)}\n`;
        }
        csv += '\n';

        // Top products
        if (report.data.topProducts.length > 0) {
          csv += 'TOP PRODUK\n';
          csv += 'Rank,Produk,Qty,Revenue,Harga Rata-rata\n';
          report.data.topProducts.forEach((product, idx) => {
            csv += `${idx + 1},"${product.productName}",${product.quantitySold},${formatCurrency(product.revenue)},${formatCurrency(product.averagePrice || 0)}\n`;
          });
          csv += '\n';
        }

        // Store breakdown
        csv += 'RINCIAN PER TOKO\n';
        csv += 'No,Toko,Penjualan,Transaksi,Metode Pembayaran\n';

        report.data.byStore.forEach((store, idx) => {
          csv += `${idx + 1},"${store.storeName}",${formatCurrency(store.revenue)},${store.transactionCount},`;
          const paymentText = Object.entries(store.paymentMethods)
            .map(([method, stat]) => `${method}: ${stat.count} (${formatCurrency(stat.amount)})`)
            .join('; ');
          csv += `"${paymentText}"\n`;

          // Add weekly breakdown
          csv += 'Minggu,Start,End,Revenue,Transaksi\n';
          store.weeklyBreakdown.forEach((week) => {
            csv += `${week.weekNumber},${week.weekStart},${week.weekEnd},${formatCurrency(week.revenue)},${week.transactionCount}\n`;
          });
          csv += '\n';
        });

        csv += `\nDibuat pada: ${new Date().toLocaleString('id-ID')}`;

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);

        link.setAttribute('href', url);
        link.setAttribute('download', fileName);
        link.style.visibility = 'hidden';

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        setIsExporting(false);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to export Excel';
        setError(errorMsg);
        setIsExporting(false);
      }
    },
    []
  );

  return {
    exportToExcel,
    isExporting,
    error,
  };
}


/**
 * ============= Financial Analysis Report Hooks =============
 * These hooks provide fetching for Profit & Loss, Inventory Valuation, and Cash Flow reports
 */

import { ProfitLossReportResponse, InventoryValuationReportResponse, CashFlowReportResponse } from '@/types/reports';

/**
 * Hook to fetch Profit & Loss report
 * @param month - Month number 1-12
 * @param year - Year in YYYY format
 * @returns Report data, loading state, error, and refetch function
 */
export function useProfitLossReport(month: number, year: number) {
  const [data, setData] = useState<ProfitLossReportResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReport = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Validate month and year
      if (!month || month < 1 || month > 12) {
        throw new Error('Invalid month number. Must be between 1 and 12');
      }
      if (!year || year < 2000 || year > 2100) {
        throw new Error('Invalid year');
      }

      const response = await fetch(
        `/api/v1/reports/financial/profit-loss?month=${month}&year=${year}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
          },
        }
      );

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('No data available for this month');
        }
        throw new Error(`Failed to fetch report: ${response.statusText}`);
      }

      const result = await response.json();
      setData(result);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch profit & loss report';
      setError(errorMsg);
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, [month, year]);

  useEffect(() => {
    fetchReport();
  }, [month, year, fetchReport]);

  const refetch = useCallback(async () => {
    await fetchReport();
  }, [fetchReport]);

  return {
    data,
    isLoading,
    error,
    refetch,
  };
}

/**
 * Hook to fetch Inventory Valuation report
 * @param date - Date string in YYYY-MM-DD format
 * @returns Report data, loading state, error, and refetch function
 */
export function useInventoryValuationReport(date: string) {
  const [data, setData] = useState<InventoryValuationReportResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReport = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Validate date format
      if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        throw new Error('Invalid date format. Use YYYY-MM-DD');
      }

      const response = await fetch(`/api/v1/reports/financial/inventory-valuation?date=${date}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('No data available for this date');
        }
        throw new Error(`Failed to fetch report: ${response.statusText}`);
      }

      const result = await response.json();
      setData(result);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch inventory valuation report';
      setError(errorMsg);
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, [date]);

  useEffect(() => {
    fetchReport();
  }, [date, fetchReport]);

  const refetch = useCallback(async () => {
    await fetchReport();
  }, [fetchReport]);

  return {
    data,
    isLoading,
    error,
    refetch,
  };
}

/**
 * Hook to fetch Cash Flow report
 * @param month - Month number 1-12
 * @param year - Year in YYYY format
 * @returns Report data, loading state, error, and refetch function
 */
export function useCashFlowReport(month: number, year: number) {
  const [data, setData] = useState<CashFlowReportResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReport = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Validate month and year
      if (!month || month < 1 || month > 12) {
        throw new Error('Invalid month number. Must be between 1 and 12');
      }
      if (!year || year < 2000 || year > 2100) {
        throw new Error('Invalid year');
      }

      const response = await fetch(
        `/api/v1/reports/financial/cash-flow?month=${month}&year=${year}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
          },
        }
      );

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('No data available for this month');
        }
        throw new Error(`Failed to fetch report: ${response.statusText}`);
      }

      const result = await response.json();
      setData(result);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch cash flow report';
      setError(errorMsg);
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, [month, year]);

  useEffect(() => {
    fetchReport();
  }, [month, year, fetchReport]);

  const refetch = useCallback(async () => {
    await fetchReport();
  }, [fetchReport]);

  return {
    data,
    isLoading,
    error,
    refetch,
  };
}


/**
 * ============= Report Export Hooks =============
 * Export functionality for financial analysis reports (Tasks 98-99)
 */

import { useCallback, useState } from 'react';
import { exportReportToPDF, exportReportToExcel, ExportConfig, PDFTableConfig, formatCurrency, formatPercentage } from '@/utils/reportExport';

/**
 * Hook for exporting Profit & Loss report to PDF
 */
export function useExportProfitLossPDF() {
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const exportToPDF = useCallback(async (report: ProfitLossReportResponse, fileName: string = 'laporan-laba-rugi.pdf') => {
    try {
      setIsExporting(true);
      setError(null);

      const config: ExportConfig = {
        title: 'Laporan Laba Rugi',
        filename: fileName,
        period: `${monthNames[report.data.month - 1]} ${report.data.year}`,
        dateRange: {
          start: report.data.monthStart,
          end: report.data.monthEnd,
        },
      };

      const tableConfig: PDFTableConfig = {
        title: 'Rincian Laba Rugi Per Toko',
        headers: ['Toko', 'Pendapatan', 'HPP', 'Laba Kotor', 'Margin %', 'Biaya Op', 'Laba Bersih'],
        rows: report.data.byStore.map((store) => [
          store.storeName,
          formatCurrency(store.revenue),
          formatCurrency(store.cogs),
          formatCurrency(store.grossProfit),
          formatPercentage(store.grossProfitMargin),
          formatCurrency(store.operatingExpenses),
          formatCurrency(store.netProfit),
        ]),
      };

      await exportReportToPDF(report.data, config, tableConfig);
      setIsExporting(false);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Gagal mengekspor PDF';
      setError(errorMsg);
      setIsExporting(false);
    }
  }, []);

  return { exportToPDF, isExporting, error };
}

/**
 * Hook for exporting Profit & Loss report to Excel
 */
export function useExportProfitLossExcel() {
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const exportToExcel = useCallback((report: ProfitLossReportResponse, fileName: string = 'laporan-laba-rugi.csv') => {
    try {
      setIsExporting(true);
      setError(null);

      const config: ExportConfig = {
        title: 'Laporan Laba Rugi',
        filename: fileName,
        period: `${monthNames[report.data.month - 1]} ${report.data.year}`,
      };

      const columns = [
        { key: 'storeName', label: 'Toko' },
        { key: 'revenue', label: 'Pendapatan (IDR)', format: formatCurrency },
        { key: 'cogs', label: 'HPP (IDR)', format: formatCurrency },
        { key: 'grossProfit', label: 'Laba Kotor (IDR)', format: formatCurrency },
        { key: 'grossProfitMargin', label: 'Margin Kotor (%)', format: formatPercentage },
        { key: 'operatingExpenses', label: 'Biaya Operasional (IDR)', format: formatCurrency },
        { key: 'netProfit', label: 'Laba Bersih (IDR)', format: formatCurrency },
        { key: 'netProfitMargin', label: 'Margin Bersih (%)', format: formatPercentage },
      ];

      exportReportToExcel(report.data.byStore, config, columns);
      setIsExporting(false);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Gagal mengekspor Excel';
      setError(errorMsg);
      setIsExporting(false);
    }
  }, []);

  return { exportToExcel, isExporting, error };
}

/**
 * Hook for exporting Inventory Valuation report to PDF
 */
export function useExportInventoryValuationPDF() {
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const exportToPDF = useCallback(async (report: InventoryValuationReportResponse, fileName: string = 'laporan-valuasi-inventori.pdf') => {
    try {
      setIsExporting(true);
      setError(null);

      const config: ExportConfig = {
        title: 'Laporan Valuasi Inventori',
        filename: fileName,
        dateRange: {
          start: report.data.date,
          end: report.data.date,
        },
      };

      const tableConfig: PDFTableConfig = {
        title: 'Nilai Inventori Per Toko',
        headers: ['Toko', 'Nilai Inventori (IDR)', 'Jumlah Item'],
        rows: report.data.byStore.map((store) => [
          store.storeName,
          formatCurrency(store.inventoryValue),
          store.itemCount,
        ]),
      };

      await exportReportToPDF(report.data, config, tableConfig);
      setIsExporting(false);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Gagal mengekspor PDF';
      setError(errorMsg);
      setIsExporting(false);
    }
  }, []);

  return { exportToPDF, isExporting, error };
}

/**
 * Hook for exporting Inventory Valuation report to Excel
 */
export function useExportInventoryValuationExcel() {
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const exportToExcel = useCallback((report: InventoryValuationReportResponse, fileName: string = 'laporan-valuasi-inventori.csv') => {
    try {
      setIsExporting(true);
      setError(null);

      const config: ExportConfig = {
        title: 'Laporan Valuasi Inventori',
        filename: fileName,
        dateRange: {
          start: report.data.date,
          end: report.data.date,
        },
      };

      const columns = [
        { key: 'storeName', label: 'Toko' },
        { key: 'inventoryValue', label: 'Nilai Inventori (IDR)', format: formatCurrency },
        { key: 'itemCount', label: 'Jumlah Item' },
      ];

      exportReportToExcel(report.data.byStore, config, columns);
      setIsExporting(false);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Gagal mengekspor Excel';
      setError(errorMsg);
      setIsExporting(false);
    }
  }, []);

  return { exportToExcel, isExporting, error };
}

/**
 * Hook for exporting Cash Flow report to PDF
 */
export function useExportCashFlowPDF() {
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const exportToPDF = useCallback(async (report: CashFlowReportResponse, fileName: string = 'laporan-arus-kas.pdf') => {
    try {
      setIsExporting(true);
      setError(null);

      const config: ExportConfig = {
        title: 'Laporan Arus Kas',
        filename: fileName,
        period: `${monthNames[report.data.month - 1]} ${report.data.year}`,
        dateRange: {
          start: report.data.monthStart,
          end: report.data.monthEnd,
        },
      };

      const tableConfig: PDFTableConfig = {
        title: 'Rincian Arus Kas Per Toko',
        headers: ['Toko', 'Kas Masuk', 'Kas Keluar', 'Arus Op', 'Arus Inv', 'Arus Kas Bersih'],
        rows: report.data.byStore.map((store) => [
          store.storeName,
          formatCurrency(store.operatingCashIn),
          formatCurrency(store.operatingCashOut),
          formatCurrency(store.operatingCashFlow),
          formatCurrency(store.investingCashFlow),
          formatCurrency(store.netCashFlow),
        ]),
      };

      await exportReportToPDF(report.data, config, tableConfig);
      setIsExporting(false);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Gagal mengekspor PDF';
      setError(errorMsg);
      setIsExporting(false);
    }
  }, []);

  return { exportToPDF, isExporting, error };
}

/**
 * Hook for exporting Cash Flow report to Excel
 */
export function useExportCashFlowExcel() {
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const exportToExcel = useCallback((report: CashFlowReportResponse, fileName: string = 'laporan-arus-kas.csv') => {
    try {
      setIsExporting(true);
      setError(null);

      const config: ExportConfig = {
        title: 'Laporan Arus Kas',
        filename: fileName,
        period: `${monthNames[report.data.month - 1]} ${report.data.year}`,
      };

      const columns = [
        { key: 'storeName', label: 'Toko' },
        { key: 'operatingCashIn', label: 'Kas Masuk (IDR)', format: formatCurrency },
        { key: 'operatingCashOut', label: 'Kas Keluar (IDR)', format: formatCurrency },
        { key: 'operatingCashFlow', label: 'Arus Operasional (IDR)', format: formatCurrency },
        { key: 'investingCashFlow', label: 'Arus Investasi (IDR)', format: formatCurrency },
        { key: 'financingCashFlow', label: 'Arus Pembiayaan (IDR)', format: formatCurrency },
        { key: 'netCashFlow', label: 'Arus Kas Bersih (IDR)', format: formatCurrency },
      ];

      exportReportToExcel(report.data.byStore, config, columns);
      setIsExporting(false);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Gagal mengekspor Excel';
      setError(errorMsg);
      setIsExporting(false);
    }
  }, []);

  return { exportToExcel, isExporting, error };
}

// Month names for localization
const monthNames = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];


/**
 * ============= BOP Expense Report Hook =============
 * Hook to fetch BOP (Biaya Operasional Penjualan) reports (Task 92)
 */

/**
 * Hook to fetch BOP expense report
 * Supports daily, weekly, and monthly periods with optional store filtering
 * 
 * @param params - Query parameters (period, date/week/month, year, storeId)
 * @returns Report data, loading state, error, and refetch function
 */
export function useBOPReport(params: {
  period: 'daily' | 'weekly' | 'monthly';
  date?: string;
  week?: number;
  year?: number;
  month?: number;
  storeId?: string;
}) {
  const [data, setData] = useState<BOPReportResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReport = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Build query string
      const queryParams = new URLSearchParams();
      queryParams.append('period', params.period);

      switch (params.period) {
        case 'daily':
          if (!params.date) {
            throw new Error('Date parameter is required for daily report');
          }
          if (!/^\d{4}-\d{2}-\d{2}$/.test(params.date)) {
            throw new Error('Invalid date format. Use YYYY-MM-DD');
          }
          queryParams.append('date', params.date);
          break;

        case 'weekly':
          if (!params.week) {
            throw new Error('Week parameter is required for weekly report');
          }
          if (params.week < 1 || params.week > 53) {
            throw new Error('Invalid week number. Must be between 1 and 53');
          }
          if (!params.year) {
            throw new Error('Year parameter is required for weekly report');
          }
          queryParams.append('week', params.week.toString());
          queryParams.append('year', params.year.toString());
          break;

        case 'monthly':
          if (!params.month) {
            throw new Error('Month parameter is required for monthly report');
          }
          if (params.month < 1 || params.month > 12) {
            throw new Error('Invalid month number. Must be between 1 and 12');
          }
          if (!params.year) {
            throw new Error('Year parameter is required for monthly report');
          }
          queryParams.append('month', params.month.toString());
          queryParams.append('year', params.year.toString());
          break;

        default:
          throw new Error('Invalid period type');
      }

      // Add optional store filter
      if (params.storeId && params.storeId !== 'all') {
        queryParams.append('storeId', params.storeId);
      }

      const response = await fetch(
        `/api/v1/reports/bop?${queryParams.toString()}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
          },
        }
      );

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('No data available for this period');
        }
        if (response.status === 403) {
          throw new Error('Insufficient permissions to view this report');
        }
        throw new Error(`Failed to fetch report: ${response.statusText}`);
      }

      const result = await response.json();
      setData(result);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch BOP report';
      setError(errorMsg);
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, [params]);

  useEffect(() => {
    fetchReport();
  }, [params, fetchReport]);

  const refetch = useCallback(async () => {
    await fetchReport();
  }, [fetchReport]);

  return {
    data,
    isLoading,
    error,
    refetch,
  };
}
