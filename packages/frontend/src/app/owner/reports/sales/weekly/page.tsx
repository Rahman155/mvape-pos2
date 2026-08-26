/**
 * Weekly Sales Report Page (Task 81)
 * Displays weekly sales reports with week selection, store breakdown, and daily trends
 *
 * Requirements: 24.1, 24.2, 24.3, 24.4, 24.5
 */

'use client';

import { useState, useMemo } from 'react';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import {
  useWeeklySalesReport,
  useExportWeeklyReportPDF,
  useExportWeeklyReportExcel,
} from '@/hooks/useReports';
import { WeeklySalesReportResponse } from '@/types/reports';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function WeeklySalesReportPage() {
  const today = new Date();
  const currentYear = today.getFullYear();
  
  // Calculate current ISO week
  const getISOWeek = (date: Date) => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  };

  const currentWeek = getISOWeek(today);
  const [selectedWeek, setSelectedWeek] = useState(currentWeek);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [expandedStore, setExpandedStore] = useState<string | null>(null);

  const { data: reportData, isLoading, error, refetch } = useWeeklySalesReport(
    selectedWeek,
    selectedYear
  );
  const { exportToPDF, isExporting: isExportingPDF } = useExportWeeklyReportPDF();
  const { exportToExcel, isExporting: isExportingExcel } = useExportWeeklyReportExcel();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Prepare data for chart
  const chartData = useMemo(() => {
    if (!reportData) return [];
    
    const aggregated = new Map<string, any>();
    
    reportData.data.byStore.forEach((store) => {
      store.dailyBreakdown.forEach((day) => {
        if (!aggregated.has(day.date)) {
          aggregated.set(day.date, {
            date: day.date,
            dayOfWeek: day.dayOfWeek,
            revenue: 0,
            transactionCount: 0,
          });
        }
        const entry = aggregated.get(day.date);
        entry.revenue += day.revenue;
        entry.transactionCount += day.transactionCount;
      });
    });

    return Array.from(aggregated.values()).sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }, [reportData]);

  const handleWeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const week = parseInt(e.target.value, 10);
    if (week >= 1 && week <= 53) {
      setSelectedWeek(week);
    }
  };

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedYear(parseInt(e.target.value, 10));
  };

  const handleExportPDF = async () => {
    if (reportData) {
      await exportToPDF(
        reportData,
        `laporan-penjualan-mingguan-W${String(selectedWeek).padStart(2, '0')}-${selectedYear}.pdf`
      );
    }
  };

  const handleExportExcel = async () => {
    if (reportData) {
      await exportToExcel(
        reportData,
        `laporan-penjualan-mingguan-W${String(selectedWeek).padStart(2, '0')}-${selectedYear}.csv`
      );
    }
  };

  const SkeletonCard = () => (
    <Card className="animate-pulse">
      <CardBody>
        <div className="h-8 w-1/3 rounded bg-gray-200 dark:bg-gray-700" />
        <div className="mt-2 h-6 w-1/2 rounded bg-gray-200 dark:bg-gray-700" />
      </CardBody>
    </Card>
  );

  const SummaryCard = ({
    title,
    value,
    subtext,
  }: {
    title: string;
    value: string | React.ReactNode;
    subtext?: string;
  }) => (
    <Card className="bg-white dark:bg-gray-900">
      <CardBody>
        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</p>
        <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
        {subtext && (
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{subtext}</p>
        )}
      </CardBody>
    </Card>
  );

  return (
    <div className="container mx-auto space-y-6 p-4">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Laporan Penjualan Mingguan
        </h1>
        <p className="mt-1 text-gray-500 dark:text-gray-400">
          Ringkasan penjualan mingguan dengan trend harian dan rincian per toko
        </p>
      </div>

      {/* Controls */}
      <div className="flex flex-col gap-4 rounded-lg bg-white p-4 shadow-sm dark:bg-gray-900 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-1 gap-4">
          <div className="flex-1 md:flex-initial">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Minggu
            </label>
            <input
              type="number"
              min="1"
              max="53"
              value={selectedWeek}
              onChange={handleWeekChange}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            />
          </div>

          <div className="flex-1 md:flex-initial">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Tahun
            </label>
            <select
              value={selectedYear}
              onChange={handleYearChange}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            >
              {Array.from({ length: 5 }, (_, i) => currentYear - 2 + i).map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={handleExportPDF}
            disabled={isLoading || !reportData || isExportingPDF}
            className="whitespace-nowrap"
          >
            {isExportingPDF ? 'Mengekspor...' : 'Ekspor PDF'}
          </Button>
          <Button
            onClick={handleExportExcel}
            disabled={isLoading || !reportData || isExportingExcel}
            variant="secondary"
            className="whitespace-nowrap"
          >
            {isExportingExcel ? 'Mengekspor...' : 'Ekspor Excel'}
          </Button>
          <Button
            onClick={() => refetch()}
            disabled={isLoading}
            variant="secondary"
            className="whitespace-nowrap"
          >
            Perbarui
          </Button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
          <p className="text-sm font-medium text-red-800 dark:text-red-200">{error}</p>
          <Button
            onClick={() => refetch()}
            size="sm"
            className="mt-2"
          >
            Coba Lagi
          </Button>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
          <Card>
            <CardBody>
              <div className="h-64 rounded bg-gray-100 dark:bg-gray-800" />
            </CardBody>
          </Card>
        </>
      )}

      {/* Content - No Data */}
      {!isLoading && !reportData && (
        <Card>
          <CardBody>
            <div className="py-12 text-center">
              <p className="text-gray-500 dark:text-gray-400">
                Tidak ada data penjualan untuk minggu {selectedWeek} tahun {selectedYear}
              </p>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Content - Data Available */}
      {!isLoading && reportData && (
        <>
          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <SummaryCard
              title="Total Penjualan"
              value={formatCurrency(reportData.data.summary.totalRevenue)}
              subtext={`${reportData.data.weekStart} s/d ${reportData.data.weekEnd}`}
            />
            <SummaryCard
              title="Total Transaksi"
              value={reportData.data.summary.totalTransactions}
              subtext="Semua toko"
            />
            <SummaryCard
              title="Rata-rata per Hari"
              value={formatCurrency(
                reportData.data.summary.totalRevenue / 7
              )}
              subtext="Per hari dalam minggu"
            />
            <SummaryCard
              title="Jumlah Toko"
              value={reportData.data.summary.storeCount}
              subtext="Toko yang aktif"
            />
          </div>

          {/* Weekly Trend Chart */}
          <Card>
            <CardHeader
              title="Trend Penjualan Mingguan"
              description="Pergerakan penjualan harian selama minggu"
            />
            <CardBody>
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="dayOfWeek"
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => `${(value / 1000000).toFixed(0)}M`}
                    />
                    <Tooltip
                      formatter={(value: number) => formatCurrency(value)}
                      labelFormatter={(label) => `${label}`}
                    />
                    <Legend />
                    <Bar
                      dataKey="revenue"
                      fill="#3b82f6"
                      name="Penjualan (IDR)"
                      radius={[8, 8, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardBody>
          </Card>

          {/* Store Breakdown Table */}
          <Card>
            <CardHeader
              title="Rincian Per Toko"
              description="Penjualan mingguan dengan breakdown harian"
            />
            <CardBody>
              <div className="space-y-4">
                {reportData.data.byStore.map((store) => (
                  <div
                    key={store.storeId}
                    className="rounded-lg border border-gray-200 dark:border-gray-700"
                  >
                    {/* Store header - clickable to expand */}
                    <button
                      onClick={() =>
                        setExpandedStore(
                          expandedStore === store.storeId ? null : store.storeId
                        )
                      }
                      className="flex w-full items-center justify-between bg-gray-50 px-4 py-3 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-750"
                    >
                      <div className="flex-1 text-left">
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {store.storeName}
                        </h3>
                        <div className="mt-1 grid grid-cols-3 gap-4 text-sm text-gray-600 dark:text-gray-400">
                          <div>
                            Penjualan:{' '}
                            <span className="font-medium text-gray-900 dark:text-white">
                              {formatCurrency(store.revenue)}
                            </span>
                          </div>
                          <div>
                            Transaksi:{' '}
                            <span className="font-medium text-gray-900 dark:text-white">
                              {store.transactionCount}
                            </span>
                          </div>
                          <div>
                            Metode Pembayaran:{' '}
                            <span className="font-medium text-gray-900 dark:text-white">
                              {Object.keys(store.paymentMethods).length}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="ml-4 text-gray-400">
                        {expandedStore === store.storeId ? '▼' : '▶'}
                      </div>
                    </button>

                    {/* Expanded section */}
                    {expandedStore === store.storeId && (
                      <div className="border-t border-gray-200 p-4 dark:border-gray-700">
                        {/* Daily breakdown */}
                        <div className="mb-4">
                          <h4 className="mb-3 font-semibold text-gray-900 dark:text-white">
                            Breakdown Harian
                          </h4>
                          <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-4">
                            {store.dailyBreakdown.map((day) => (
                              <div
                                key={day.date}
                                className="rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900"
                              >
                                <div className="text-sm font-medium text-gray-600 dark:text-gray-400">
                                  {day.dayOfWeek}
                                </div>
                                <div className="mt-1 text-lg font-bold text-gray-900 dark:text-white">
                                  {formatCurrency(day.revenue)}
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                  {day.transactionCount} transaksi
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Payment methods breakdown */}
                        <div>
                          <h4 className="mb-3 font-semibold text-gray-900 dark:text-white">
                            Metode Pembayaran
                          </h4>
                          <div className="grid gap-2 md:grid-cols-3">
                            {Object.entries(store.paymentMethods).map(
                              ([method, stat]) => (
                                <div
                                  key={method}
                                  className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800"
                                >
                                  <div className="flex items-center justify-between">
                                    <PaymentMethodBadge method={method} />
                                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                                      {stat.count}x
                                    </span>
                                  </div>
                                  <div className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">
                                    {formatCurrency(stat.amount)}
                                  </div>
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {reportData.data.byStore.length === 0 && (
                <div className="py-12 text-center">
                  <p className="text-gray-500 dark:text-gray-400">
                    Tidak ada data toko untuk minggu ini
                  </p>
                </div>
              )}
            </CardBody>
          </Card>

          {/* Metadata */}
          <div className="text-xs text-gray-500 dark:text-gray-400">
            <p>Data diperbarui: {new Date(reportData.meta.timestamp).toLocaleString('id-ID')}</p>
            <p>ID Permintaan: {reportData.meta.requestId}</p>
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Payment method badge component
 */
function PaymentMethodBadge({ method }: { method: string }) {
  const badgeConfig: Record<
    string,
    { bg: string; text: string; label: string }
  > = {
    CASH: {
      bg: 'bg-green-100 dark:bg-green-900/30',
      text: 'text-green-700 dark:text-green-300',
      label: 'Tunai',
    },
    MEMBER: {
      bg: 'bg-blue-100 dark:bg-blue-900/30',
      text: 'text-blue-700 dark:text-blue-300',
      label: 'Kredit Member',
    },
    MEMBER_CREDIT: {
      bg: 'bg-blue-100 dark:bg-blue-900/30',
      text: 'text-blue-700 dark:text-blue-300',
      label: 'Kredit Member',
    },
    TEMPO: {
      bg: 'bg-yellow-100 dark:bg-yellow-900/30',
      text: 'text-yellow-700 dark:text-yellow-300',
      label: 'Tempo',
    },
  };

  const config = badgeConfig[method] || badgeConfig.CASH;

  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  );
}
