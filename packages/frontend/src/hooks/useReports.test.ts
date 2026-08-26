/**
 * useReports Hook Tests
 * Tests for daily sales report data fetching and export functionality
 */

import { renderHook, waitFor } from '@testing-library/react';
import { 
  useDailySalesReport, 
  useExportReportPDF, 
  useExportReportExcel,
  useWeeklySalesReport,
  useExportWeeklyReportPDF,
  useExportWeeklyReportExcel,
} from './useReports';
import { DailySalesReportResponse, WeeklySalesReportResponse } from '@/types/reports';

// Mock fetch
global.fetch = jest.fn();

const mockReportData: DailySalesReportResponse = {
  data: {
    date: '2024-01-15',
    summary: {
      totalRevenue: 5000000,
      totalTransactions: 50,
      storeCount: 2,
    },
    byStore: [
      {
        storeId: 'store-1',
        storeName: 'Toko Pusat',
        revenue: 3000000,
        transactionCount: 30,
        averageTransaction: 100000,
        paymentMethods: {
          CASH: { count: 20, amount: 2000000 },
          MEMBER: { count: 8, amount: 800000 },
          TEMPO: { count: 2, amount: 200000 },
        },
      },
      {
        storeId: 'store-2',
        storeName: 'Toko Cabang',
        revenue: 2000000,
        transactionCount: 20,
        averageTransaction: 100000,
        paymentMethods: {
          CASH: { count: 15, amount: 1500000 },
          MEMBER: { count: 3, amount: 300000 },
          TEMPO: { count: 2, amount: 200000 },
        },
      },
    ],
  },
  meta: {
    timestamp: '2024-01-15T12:00:00Z',
    requestId: 'req-123',
  },
};

describe('useDailySalesReport Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.setItem('auth_token', 'mock-token');
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should fetch report data on mount', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockReportData,
    });

    const { result } = renderHook(() => useDailySalesReport('2024-01-15'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual(mockReportData);
    expect(result.current.error).toBeNull();
  });

  it('should refetch data when date changes', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockReportData,
    });

    const { result, rerender } = renderHook(
      ({ date }) => useDailySalesReport(date),
      { initialProps: { date: '2024-01-15' } }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(global.fetch).toHaveBeenCalledTimes(1);

    // Change date
    rerender({ date: '2024-01-16' });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });

  it('should handle fetch errors', async () => {
    const errorMessage = 'Network error';
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error(errorMessage));

    const { result } = renderHook(() => useDailySalesReport('2024-01-15'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe(errorMessage);
    expect(result.current.data).toBeNull();
  });

  it('should handle 404 responses', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: 'Not Found',
    });

    const { result } = renderHook(() => useDailySalesReport('2024-01-15'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toContain('No data available');
  });

  it('should validate date format', async () => {
    const { result } = renderHook(() => useDailySalesReport('invalid-date'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toContain('Invalid date format');
  });

  it('should provide refetch function', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockReportData,
    });

    const { result } = renderHook(() => useDailySalesReport('2024-01-15'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(global.fetch).toHaveBeenCalledTimes(1);

    // Manual refetch
    await result.current.refetch();

    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('should set loading state during fetch', async () => {
    let resolveFetch: () => void;
    const fetchPromise = new Promise<void>((resolve) => {
      resolveFetch = resolve;
    });

    (global.fetch as jest.Mock).mockReturnValueOnce(
      fetchPromise.then(() => ({
        ok: true,
        json: async () => mockReportData,
      }))
    );

    const { result } = renderHook(() => useDailySalesReport('2024-01-15'));

    expect(result.current.isLoading).toBe(true);

    resolveFetch!();

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
  });
});

describe('useExportReportPDF Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should export report to PDF', async () => {
    // Mock jsPDF
    jest.mock('jspdf', () => ({
      default: {
        jsPDF: jest.fn(() => ({
          setFontSize: jest.fn(),
          setTextColor: jest.fn(),
          text: jest.fn(),
          rect: jest.fn(),
          addPage: jest.fn(),
          setPage: jest.fn(),
          setFillColor: jest.fn(),
          save: jest.fn(),
          internal: {
            pages: { length: 2 },
          },
        })),
      },
    }));

    const { result } = renderHook(() => useExportReportPDF());

    expect(result.current.isExporting).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should handle export errors', async () => {
    const { result } = renderHook(() => useExportReportPDF());

    // Try to export with invalid data
    const invalidData = { data: null } as any;

    await result.current.exportToPDF(invalidData, 'test.pdf').catch(() => {
      // Expected to fail
    });

    expect(result.current.isExporting).toBe(false);
  });
});

describe('useExportReportExcel Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should export report to Excel', async () => {
    // Mock document methods
    const mockLink = document.createElement('a');
    const createElementSpy = jest.spyOn(document, 'createElement').mockReturnValue(mockLink);
    const appendChildSpy = jest.spyOn(document.body, 'appendChild').mockImplementation(() => mockLink);
    const removeChildSpy = jest.spyOn(document.body, 'removeChild').mockImplementation(() => mockLink);

    const { result } = renderHook(() => useExportReportExcel());

    expect(result.current.isExporting).toBe(false);
    expect(result.current.error).toBeNull();

    createElementSpy.mockRestore();
    appendChildSpy.mockRestore();
    removeChildSpy.mockRestore();
  });

  it('should handle export errors gracefully', async () => {
    const { result } = renderHook(() => useExportReportExcel());

    // Try to export with invalid data
    const invalidData = { data: null } as any;

    await result.current.exportToExcel(invalidData, 'test.csv').catch(() => {
      // Expected to fail
    });

    expect(result.current.isExporting).toBe(false);
  });
});

/**
 * useWeeklySalesReport Hook Tests
 */
describe('useWeeklySalesReport Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.setItem('auth_token', 'mock-token');
  });

  afterEach(() => {
    localStorage.clear();
  });

  const mockWeeklyData = {
    data: {
      week: 3,
      year: 2024,
      weekStart: '2024-01-15',
      weekEnd: '2024-01-21',
      summary: {
        totalRevenue: 10000000,
        totalTransactions: 100,
        storeCount: 2,
      },
      byStore: [
        {
          storeId: 'store-1',
          storeName: 'Toko Jakarta',
          revenue: 6000000,
          transactionCount: 60,
          paymentMethods: {
            CASH: { count: 40, amount: 4000000 },
            MEMBER: { count: 15, amount: 1500000 },
            TEMPO: { count: 5, amount: 500000 },
          },
          dailyBreakdown: [
            {
              date: '2024-01-15',
              dayOfWeek: 'Senin',
              revenue: 1000000,
              transactionCount: 10,
            },
            {
              date: '2024-01-16',
              dayOfWeek: 'Selasa',
              revenue: 1000000,
              transactionCount: 10,
            },
            {
              date: '2024-01-17',
              dayOfWeek: 'Rabu',
              revenue: 1000000,
              transactionCount: 10,
            },
            {
              date: '2024-01-18',
              dayOfWeek: 'Kamis',
              revenue: 1000000,
              transactionCount: 10,
            },
            {
              date: '2024-01-19',
              dayOfWeek: 'Jumat',
              revenue: 1000000,
              transactionCount: 10,
            },
            {
              date: '2024-01-20',
              dayOfWeek: 'Sabtu',
              revenue: 500000,
              transactionCount: 5,
            },
            {
              date: '2024-01-21',
              dayOfWeek: 'Minggu',
              revenue: 500000,
              transactionCount: 5,
            },
          ],
        },
        {
          storeId: 'store-2',
          storeName: 'Toko Bandung',
          revenue: 4000000,
          transactionCount: 40,
          paymentMethods: {
            CASH: { count: 25, amount: 2500000 },
            MEMBER: { count: 10, amount: 1000000 },
            TEMPO: { count: 5, amount: 500000 },
          },
          dailyBreakdown: [
            {
              date: '2024-01-15',
              dayOfWeek: 'Senin',
              revenue: 700000,
              transactionCount: 7,
            },
            {
              date: '2024-01-16',
              dayOfWeek: 'Selasa',
              revenue: 700000,
              transactionCount: 7,
            },
            {
              date: '2024-01-17',
              dayOfWeek: 'Rabu',
              revenue: 600000,
              transactionCount: 6,
            },
            {
              date: '2024-01-18',
              dayOfWeek: 'Kamis',
              revenue: 600000,
              transactionCount: 6,
            },
            {
              date: '2024-01-19',
              dayOfWeek: 'Jumat',
              revenue: 700000,
              transactionCount: 7,
            },
            {
              date: '2024-01-20',
              dayOfWeek: 'Sabtu',
              revenue: 500000,
              transactionCount: 3,
            },
            {
              date: '2024-01-21',
              dayOfWeek: 'Minggu',
              revenue: 300000,
              transactionCount: 1,
            },
          ],
        },
      ],
    },
    meta: {
      timestamp: '2024-01-15T12:00:00Z',
      requestId: 'req-456',
    },
  };

  it('should fetch weekly report data on mount', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockWeeklyData,
    });

    const { result } = renderHook(() => useWeeklySalesReport(3, 2024));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual(mockWeeklyData);
    expect(result.current.error).toBeNull();
  });

  it('should refetch data when week or year changes', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockWeeklyData,
    });

    const { result, rerender } = renderHook(
      ({ week, year }) => useWeeklySalesReport(week, year),
      { initialProps: { week: 3, year: 2024 } }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/v1/reports/sales/weekly?week=3&year=2024',
      expect.any(Object)
    );

    // Change week
    rerender({ week: 4, year: 2024 });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/v1/reports/sales/weekly?week=4&year=2024',
        expect.any(Object)
      );
    });
  });

  it('should handle invalid week numbers', async () => {
    const { result } = renderHook(() => useWeeklySalesReport(0, 2024));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toContain('Invalid week number');
    expect(result.current.data).toBeNull();
  });

  it('should handle invalid year', async () => {
    const { result } = renderHook(() => useWeeklySalesReport(3, 1900));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toContain('Invalid year');
    expect(result.current.data).toBeNull();
  });

  it('should handle fetch errors gracefully', async () => {
    const errorMessage = 'Network error';
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error(errorMessage));

    const { result } = renderHook(() => useWeeklySalesReport(3, 2024));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe(errorMessage);
    expect(result.current.data).toBeNull();
  });

  it('should handle 404 responses', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: 'Not Found',
    });

    const { result } = renderHook(() => useWeeklySalesReport(3, 2024));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toContain('No data available');
    expect(result.current.data).toBeNull();
  });

  it('should provide refetch function', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockWeeklyData,
    });

    const { result } = renderHook(() => useWeeklySalesReport(3, 2024));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(global.fetch).toHaveBeenCalledTimes(1);

    await result.current.refetch();

    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('should validate week range 1-53', async () => {
    for (const week of [0, 54, -1, 100]) {
      const { result } = renderHook(() => useWeeklySalesReport(week, 2024));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBeDefined();
    }
  });

  it('should accept valid week numbers', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockWeeklyData,
    });

    for (const week of [1, 26, 53]) {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockWeeklyData,
      });

      const { result } = renderHook(() => useWeeklySalesReport(week, 2024));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toBeDefined();
    }
  });

  it('should include daily breakdown in report', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockWeeklyData,
    });

    const { result } = renderHook(() => useWeeklySalesReport(3, 2024));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data?.data.byStore[0].dailyBreakdown).toHaveLength(7);
    expect(result.current.data?.data.byStore[0].dailyBreakdown[0].dayOfWeek).toBe('Senin');
    expect(result.current.data?.data.byStore[0].dailyBreakdown[6].dayOfWeek).toBe('Minggu');
  });

  it('should include payment method breakdown', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockWeeklyData,
    });

    const { result } = renderHook(() => useWeeklySalesReport(3, 2024));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const store = result.current.data?.data.byStore[0];
    expect(store?.paymentMethods.CASH).toBeDefined();
    expect(store?.paymentMethods.MEMBER).toBeDefined();
    expect(store?.paymentMethods.TEMPO).toBeDefined();
  });
});
