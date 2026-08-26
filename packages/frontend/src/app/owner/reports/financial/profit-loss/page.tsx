/**
 * Profit & Loss Report Page (Task 84)
 * Displays profit & loss analysis with gross profit, operating expenses, and net profit
 *
 * Requirements: 17.1, 17.2, 17.3
 */

'use client';

import { useState } from 'react';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useProfitLossReport, useExportProfitLossPDF, useExportProfitLossExcel } from '@/hooks/useReports';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function ProfitLossReportPage() {
  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());

  const { data: reportData, isLoading, error, refetch } = useProfitLossReport(selectedMonth, selectedYear);

  const { exportToPDF, isExporting: isExportingPDF, error: pdfError } = useExportProfitLossPDF();
  const { exportToExcel, isExporting: isExportingExcel, error: excelError } = useExportProfitLossExcel();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value}%`;
  };

  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedMonth(parseInt(e.target.value));
  };

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedYear(parseInt(e.target.value));
  };

  const handleExportPDF = async () => {
    if (reportData) {
      await exportToPDF(
        reportData,
        `laporan-laba-rugi-${selectedMonth.toString().padStart(2, '0')}-${selectedYear}.pdf`
      );
    }
  };

  const handleExportExcel = async () => {
    if (reportData) {
      exportToExcel(
        reportData,
        `laporan-laba-rugi-${selectedMonth.toString().padStart(2, '0')}-${selectedYear}.csv`
      );
    }
  };

  // Summary card skeleton loader
  const SkeletonCard = () => (
    <Card className="animate-pulse">
      <CardBody>
        <div className="h-8 w-1/3 rounded bg-gray-200 dark:bg-gray-700" />
        <div className="mt-2 h-6 w-1/2 rounded bg-gray-200 dark:bg-gray-700" />
      </CardBody>
    </Card>
  );

  // Summary card component
  const SummaryCard = ({
    title,
    value,
    subtext,
    variant = 'default',
  }: {
    title: string;
    value: string | React.ReactNode;
    subtext?: string;
    variant?: 'default' | 'positive' | 'negative';
  }) => {
    const bgColor = variant === 'positive' ? 'bg-green-50 dark:bg-green-900/20' : 
                   variant === 'negative' ? 'bg-red-50 dark:bg-red-900/20' :
                   'bg-white dark:bg-gray-900';
    const textColor = variant === 'positive' ? 'text-green-700 dark:text-green-300' :
                     variant === 'negative' ? 'text-red-700 dark:text-red-300' :
                     'text-gray-900 dark:text-white';

    return (
      <Card className={bgColor}>
        <CardBody>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</p>
          <p className={`mt-2 text-2xl font-bold ${textColor}`}>{value}</p>
          {subtext && (
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{subtext}</p>
          )}
        </CardBody>
      </Card>
    );
  };

  // Prepare chart data
  const chartData = reportData?.data.byStore.map((store) => ({
    name: store.storeName,
    revenue: store.revenue,
    cogs: store.cogs,
    grossProfit: store.grossProfit,
    expenses: store.operatingExpenses,
    netProfit: store.netProfit,
  })) || [];

  return (
    <div className="container mx-auto space-y-6 p-4">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Laporan Laba Rugi
        </h1>
        <p className="mt-1 text-gray-500 dark:text-gray-400">
          Analisis pendapatan, biaya, dan keuntungan operasional
        </p>
      </div>

      {/* Controls */}
      <div className="flex flex-col gap-4 rounded-lg bg-white p-4 shadow-sm dark:bg-gray-900 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-1 gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Bulan
            </label>
            <select
              value={selectedMonth}
              onChange={handleMonthChange}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            >
              {monthNames.map((month, idx) => (
                <option key={idx} value={idx + 1}>
                  {month}
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Tahun
            </label>
            <select
              value={selectedYear}
              onChange={handleYearChange}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            >
              {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map((year) => (
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

      {pdfError && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-900/20">
          <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
            {pdfError}
          </p>
        </div>
      )}

      {excelError && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-900/20">
          <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
            {excelError}
          </p>
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
                Tidak ada data untuk {monthNames[selectedMonth - 1]} {selectedYear}
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
              title="Total Pendapatan"
              value={formatCurrency(reportData.data.summary.totalRevenue)}
              subtext="Penjualan kotor"
            />
            <SummaryCard
              title="Harga Pokok"
              value={formatCurrency(reportData.data.summary.totalCOGS)}
              subtext="Biaya barang terjual"
            />
            <SummaryCard
              title="Laba Kotor"
              value={formatCurrency(reportData.data.summary.grossProfit)}
              subtext={`Margin: ${formatPercentage(reportData.data.summary.grossProfitMargin)}`}
              variant="positive"
            />
            <SummaryCard
              title="Laba Bersih"
              value={formatCurrency(reportData.data.summary.netProfit)}
              subtext={`Margin: ${formatPercentage(reportData.data.summary.netProfitMargin)}`}
              variant={reportData.data.summary.netProfit >= 0 ? 'positive' : 'negative'}
            />
          </div>

          {/* Profit Breakdown Chart */}
          {chartData.length > 0 && (
            <Card>
              <CardHeader
                title="Perbandingan Laba Per Toko"
                description="Visualisasi pendapatan, harga pokok, dan laba"
              />
              <CardBody>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip
                      formatter={(value: number) => formatCurrency(value)}
                      labelStyle={{ color: '#000' }}
                    />
                    <Legend />
                    <Bar dataKey="revenue" fill="#8b5cf6" name="Pendapatan" />
                    <Bar dataKey="cogs" fill="#ec4899" name="Harga Pokok" />
                    <Bar dataKey="netProfit" fill="#10b981" name="Laba Bersih" />
                  </BarChart>
                </ResponsiveContainer>
              </CardBody>
            </Card>
          )}

          {/* Detailed Table */}
          <Card>
            <CardHeader
              title="Rincian Laba Rugi Per Toko"
              description="Detail lengkap pendapatan, biaya, dan keuntungan"
            />
            <CardBody>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300">
                        Toko
                      </th>
                      <th className="px-4 py-3 text-right font-medium text-gray-700 dark:text-gray-300">
                        Pendapatan
                      </th>
                      <th className="px-4 py-3 text-right font-medium text-gray-700 dark:text-gray-300">
                        HPP
                      </th>
                      <th className="px-4 py-3 text-right font-medium text-gray-700 dark:text-gray-300">
                        Laba Kotor
                      </th>
                      <th className="px-4 py-3 text-right font-medium text-gray-700 dark:text-gray-300">
                        Margin %
                      </th>
                      <th className="px-4 py-3 text-right font-medium text-gray-700 dark:text-gray-300">
                        Biaya Operasional
                      </th>
                      <th className="px-4 py-3 text-right font-medium text-gray-700 dark:text-gray-300">
                        Laba Bersih
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y dark:divide-gray-700">
                    {reportData.data.byStore.map((store) => (
                      <tr
                        key={store.storeId}
                        className="hover:bg-gray-50 dark:hover:bg-gray-800"
                      >
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-900 dark:text-white">
                            {store.storeName}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-white">
                          {formatCurrency(store.revenue)}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">
                          {formatCurrency(store.cogs)}
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-green-600 dark:text-green-400">
                          {formatCurrency(store.grossProfit)}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">
                          {formatPercentage(store.grossProfitMargin)}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">
                          {formatCurrency(store.operatingExpenses)}
                        </td>
                        <td className={`px-4 py-3 text-right font-medium ${
                          store.netProfit >= 0 
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-red-600 dark:text-red-400'
                        }`}>
                          {formatCurrency(store.netProfit)}
                        </td>
                      </tr>
                    ))}
                    {/* Summary row */}
                    <tr className="border-t-2 bg-gray-100 dark:bg-gray-800">
                      <td className="px-4 py-3 font-bold text-gray-900 dark:text-white">
                        Total
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-gray-900 dark:text-white">
                        {formatCurrency(reportData.data.summary.totalRevenue)}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-gray-900 dark:text-white">
                        {formatCurrency(reportData.data.summary.totalCOGS)}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-green-600 dark:text-green-400">
                        {formatCurrency(reportData.data.summary.grossProfit)}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-gray-900 dark:text-white">
                        {formatPercentage(reportData.data.summary.grossProfitMargin)}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-gray-900 dark:text-white">
                        {formatCurrency(reportData.data.summary.operatingExpenses)}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-green-600 dark:text-green-400">
                        {formatCurrency(reportData.data.summary.netProfit)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
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
