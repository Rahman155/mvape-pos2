/**
 * Daily Sales Report Page (Task 79)
 * Displays daily sales reports with date selection, store breakdown, and export options
 *
 * Requirements: 23.2, 23.3, 23.4, 16.7
 */

'use client';

import { useState } from 'react';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useDailySalesReport, useExportReportPDF, useExportReportExcel } from '@/hooks/useReports';
import { DailySalesReportResponse } from '@/types/reports';

export default function DailySalesReportPage() {
  const today = new Date();
  const todayString = today.toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(todayString);

  const { data: reportData, isLoading, error, refetch } = useDailySalesReport(selectedDate);
  const { exportToPDF, isExporting: isExportingPDF } = useExportReportPDF();
  const { exportToExcel, isExporting: isExportingExcel } = useExportReportExcel();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedDate(e.target.value);
  };

  const handleExportPDF = async () => {
    if (reportData) {
      await exportToPDF(
        reportData,
        `laporan-penjualan-${selectedDate}.pdf`
      );
    }
  };

  const handleExportExcel = async () => {
    if (reportData) {
      await exportToExcel(
        reportData,
        `laporan-penjualan-${selectedDate}.csv`
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

  // Summary cards
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
          Laporan Penjualan Harian
        </h1>
        <p className="mt-1 text-gray-500 dark:text-gray-400">
          Ringkasan penjualan harian dengan rincian per toko
        </p>
      </div>

      {/* Controls */}
      <div className="flex flex-col gap-4 rounded-lg bg-white p-4 shadow-sm dark:bg-gray-900 md:flex-row md:items-end md:justify-between">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Pilih Tanggal
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={handleDateChange}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          />
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
                Tidak ada data penjualan untuk tanggal {formatDate(selectedDate)}
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
              subtext="Semua metode pembayaran"
            />
            <SummaryCard
              title="Total Transaksi"
              value={reportData.data.summary.totalTransactions}
              subtext="Jumlah transaksi"
            />
            <SummaryCard
              title="Rata-rata Transaksi"
              value={formatCurrency(
                reportData.data.summary.totalRevenue /
                  (reportData.data.summary.totalTransactions || 1)
              )}
              subtext="Per transaksi"
            />
            <SummaryCard
              title="Jumlah Toko"
              value={reportData.data.summary.storeCount}
              subtext="Toko yang aktif"
            />
          </div>

          {/* Store Breakdown Table */}
          <Card>
            <CardHeader
              title="Rincian Per Toko"
              description="Penjualan dikelompokkan berdasarkan toko"
            />
            <CardBody>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300">
                        No
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300">
                        Nama Toko
                      </th>
                      <th className="px-4 py-3 text-right font-medium text-gray-700 dark:text-gray-300">
                        Penjualan (IDR)
                      </th>
                      <th className="px-4 py-3 text-right font-medium text-gray-700 dark:text-gray-300">
                        Transaksi
                      </th>
                      <th className="px-4 py-3 text-right font-medium text-gray-700 dark:text-gray-300">
                        Rata-rata (IDR)
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300">
                        Metode Pembayaran
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y dark:divide-gray-700">
                    {reportData.data.byStore.map((store, idx) => (
                      <tr
                        key={store.storeId}
                        className="hover:bg-gray-50 dark:hover:bg-gray-800"
                      >
                        <td className="px-4 py-3 text-gray-900 dark:text-white">
                          {idx + 1}
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-900 dark:text-white">
                            {store.storeName}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-white">
                          {formatCurrency(store.revenue)}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">
                          {store.transactionCount}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">
                          {formatCurrency(store.averageTransaction)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                          <div className="space-y-1">
                            {Object.entries(store.paymentMethods).map(
                              ([method, stat]) => (
                                <div key={method} className="flex items-center gap-2">
                                  <PaymentMethodBadge method={method} />
                                  <span>{stat.count}</span>
                                  <span className="text-xs text-gray-500 dark:text-gray-400">
                                    ({formatCurrency(stat.amount)})
                                  </span>
                                </div>
                              )
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {reportData.data.byStore.length === 0 && (
                <div className="py-12 text-center">
                  <p className="text-gray-500 dark:text-gray-400">
                    Tidak ada data toko untuk tanggal ini
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
