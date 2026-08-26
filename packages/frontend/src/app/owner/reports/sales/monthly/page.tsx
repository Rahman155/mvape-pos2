/**
 * Monthly Sales Report Page (Task 83)
 * Displays monthly sales reports with month/year selection, store breakdown, and top products
 *
 * Requirements: 25.1, 25.2, 25.3, 25.5, 25.6
 */

'use client';

import { useState, useMemo } from 'react';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import {
  useMonthlySalesReport,
  useExportMonthlyReportPDF,
  useExportMonthlyReportExcel,
} from '@/hooks/useReports';
import { MonthlySalesReportResponse } from '@/types/reports';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';

export default function MonthlySalesReportPage() {
  const today = new Date();
  const currentMonth = today.getMonth() + 1;
  const currentYear = today.getFullYear();

  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [expandedStore, setExpandedStore] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'quantity' | 'revenue'>('quantity');

  const { data: reportData, isLoading, error, refetch } = useMonthlySalesReport(
    selectedMonth,
    selectedYear
  );
  const { exportToPDF, isExporting: isExportingPDF } = useExportMonthlyReportPDF();
  const { exportToExcel, isExporting: isExportingExcel } = useExportMonthlyReportExcel();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const monthNames = [
    'Januari',
    'Februari',
    'Maret',
    'April',
    'Mei',
    'Juni',
    'Juli',
    'Agustus',
    'September',
    'Oktober',
    'November',
    'Desember',
  ];

  // Prepare data for store comparison chart
  const storeChartData = useMemo(() => {
    if (!reportData) return [];
    return reportData.data.byStore.map((store) => ({
      name: store.storeName.substring(0, 15),
      revenue: store.revenue,
      transactions: store.transactionCount,
    }));
  }, [reportData]);

  // Prepare data for top products chart
  const productChartData = useMemo(() => {
    if (!reportData) return [];
    const sorted = [...reportData.data.topProducts].sort((a, b) =>
      sortBy === 'quantity'
        ? b.quantitySold - a.quantitySold
        : b.revenue - a.revenue
    );
    return sorted.slice(0, 10).map((product) => ({
      name: product.productName.substring(0, 12),
      quantity: product.quantitySold,
      revenue: product.revenue,
      averagePrice: product.averagePrice || 0,
    }));
  }, [reportData, sortBy]);

  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedMonth(parseInt(e.target.value, 10));
  };

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedYear(parseInt(e.target.value, 10));
  };

  const handleExportPDF = async () => {
    if (reportData) {
      await exportToPDF(
        reportData,
        `laporan-penjualan-${monthNames[selectedMonth - 1]}-${selectedYear}.pdf`
      );
    }
  };

  const handleExportExcel = async () => {
    if (reportData) {
      await exportToExcel(
        reportData,
        `laporan-penjualan-${monthNames[selectedMonth - 1]}-${selectedYear}.csv`
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
          Laporan Penjualan Bulanan
        </h1>
        <p className="mt-1 text-gray-500 dark:text-gray-400">
          Ringkasan penjualan bulanan dengan analisis toko, produk terlaris, dan tren mingguan
        </p>
      </div>

      {/* Controls */}
      <div className="flex flex-col gap-4 rounded-lg bg-white p-4 shadow-sm dark:bg-gray-900 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-4 md:flex-row md:gap-4">
          <div className="flex-1 md:flex-initial">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Pilih Bulan
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

          <div className="flex-1 md:flex-initial">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Pilih Tahun
            </label>
            <select
              value={selectedYear}
              onChange={handleYearChange}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            >
              {[currentYear - 2, currentYear - 1, currentYear].map((year) => (
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
          <Button onClick={() => refetch()} size="sm" className="mt-2">
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
                Tidak ada data penjualan untuk {monthNames[selectedMonth - 1]} {selectedYear}
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
              subtext={`${reportData.data.monthStart} s/d ${reportData.data.monthEnd}`}
            />
            <SummaryCard
              title="Total Transaksi"
              value={reportData.data.summary.totalTransactions}
              subtext="Jumlah transaksi"
            />
            <SummaryCard
              title="Rata-rata Transaksi"
              value={formatCurrency(reportData.data.summary.averageTransaction)}
              subtext="Per transaksi"
            />
            <SummaryCard
              title="Jumlah Toko"
              value={reportData.data.summary.storeCount}
              subtext="Toko yang aktif"
            />
          </div>

          {/* Top Product */}
          {reportData.data.summary.topProduct && (
            <Card className="border-l-4 border-blue-500 bg-white dark:bg-gray-900">
              <CardBody>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      Produk Terlaris
                    </p>
                    <p className="mt-2 text-xl font-bold text-gray-900 dark:text-white">
                      {reportData.data.summary.topProduct.productName}
                    </p>
                    <div className="mt-3 grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600 dark:text-gray-400">Terjual</p>
                        <p className="font-semibold text-gray-900 dark:text-white">
                          {reportData.data.summary.topProduct.quantitySold} unit
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600 dark:text-gray-400">Revenue</p>
                        <p className="font-semibold text-gray-900 dark:text-white">
                          {formatCurrency(reportData.data.summary.topProduct.revenue)}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600 dark:text-gray-400">Harga Rata-rata</p>
                        <p className="font-semibold text-gray-900 dark:text-white">
                          {formatCurrency(
                            reportData.data.summary.topProduct.revenue /
                              reportData.data.summary.topProduct.quantitySold
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="ml-4 rounded-full bg-blue-100 p-3 dark:bg-blue-900/30">
                    <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">🏆</span>
                  </div>
                </div>
              </CardBody>
            </Card>
          )}

          {/* Store Comparison Chart */}
          <Card>
            <CardHeader
              title="Perbandingan Revenue Per Toko"
              description="Grafik perbandingan penjualan antar toko"
            />
            <CardBody>
              {storeChartData.length > 0 ? (
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={storeChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip
                        formatter={(value: number) => formatCurrency(value)}
                        contentStyle={{
                          backgroundColor: '#1f2937',
                          border: 'none',
                          borderRadius: '0.5rem',
                        }}
                        labelStyle={{ color: '#fff' }}
                      />
                      <Legend />
                      <Bar dataKey="revenue" fill="#3b82f6" name="Revenue" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="py-8 text-center text-gray-500 dark:text-gray-400">
                  Tidak ada data toko
                </div>
              )}
            </CardBody>
          </Card>

          {/* Top Products Table and Chart */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Top Products Chart */}
            <Card>
              <CardHeader
                title="Top 10 Produk Terlaris"
                description={`Diurutkan berdasarkan ${sortBy === 'quantity' ? 'jumlah terjual' : 'revenue'}`}
              />
              <CardBody className="space-y-4">
                <div className="flex gap-2">
                  <Button
                    onClick={() => setSortBy('quantity')}
                    variant={sortBy === 'quantity' ? 'primary' : 'secondary'}
                    size="sm"
                  >
                    Sortir: Jumlah
                  </Button>
                  <Button
                    onClick={() => setSortBy('revenue')}
                    variant={sortBy === 'revenue' ? 'primary' : 'secondary'}
                    size="sm"
                  >
                    Sortir: Revenue
                  </Button>
                </div>

                {productChartData.length > 0 ? (
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={productChartData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis dataKey="name" type="category" width={100} />
                        <Tooltip
                          formatter={(value: number) =>
                            sortBy === 'quantity' ? value : formatCurrency(value)
                          }
                          contentStyle={{
                            backgroundColor: '#1f2937',
                            border: 'none',
                            borderRadius: '0.5rem',
                          }}
                          labelStyle={{ color: '#fff' }}
                        />
                        <Bar
                          dataKey={sortBy === 'quantity' ? 'quantity' : 'revenue'}
                          fill="#8b5cf6"
                          name={sortBy === 'quantity' ? 'Jumlah Terjual' : 'Revenue'}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="py-8 text-center text-gray-500 dark:text-gray-400">
                    Tidak ada data produk
                  </div>
                )}
              </CardBody>
            </Card>

            {/* Top Products Table */}
            <Card>
              <CardHeader
                title="Daftar Produk Terlaris"
                description="Top 10 produk berdasarkan jumlah terjual"
              />
              <CardBody>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b bg-gray-50 dark:bg-gray-800">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300">
                          Rank
                        </th>
                        <th className="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300">
                          Produk
                        </th>
                        <th className="px-4 py-3 text-right font-medium text-gray-700 dark:text-gray-300">
                          Qty
                        </th>
                        <th className="px-4 py-3 text-right font-medium text-gray-700 dark:text-gray-300">
                          Revenue
                        </th>
                        <th className="px-4 py-3 text-right font-medium text-gray-700 dark:text-gray-300">
                          Harga Rata-rata
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y dark:divide-gray-700">
                      {reportData.data.topProducts.slice(0, 10).map((product, idx) => (
                        <tr
                          key={product.productId}
                          className="hover:bg-gray-50 dark:hover:bg-gray-800"
                        >
                          <td className="px-4 py-3">
                            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold dark:bg-gray-800">
                              {idx + 1}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-medium text-gray-900 dark:text-white">
                              {product.productName}
                            </p>
                          </td>
                          <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">
                            {product.quantitySold}
                          </td>
                          <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-white">
                            {formatCurrency(product.revenue)}
                          </td>
                          <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">
                            {formatCurrency(product.averagePrice || 0)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {reportData.data.topProducts.length === 0 && (
                    <div className="py-8 text-center text-gray-500 dark:text-gray-400">
                      Tidak ada data produk
                    </div>
                  )}
                </div>
              </CardBody>
            </Card>
          </div>

          {/* Store Breakdown */}
          <Card>
            <CardHeader
              title="Rincian Per Toko"
              description="Penjualan dan tren mingguan dikelompokkan berdasarkan toko"
            />
            <CardBody className="space-y-6">
              {reportData.data.byStore.map((store) => (
                <div
                  key={store.storeId}
                  className="border rounded-lg dark:border-gray-700"
                >
                  {/* Store Header */}
                  <button
                    onClick={() =>
                      setExpandedStore(
                        expandedStore === store.storeId ? null : store.storeId
                      )
                    }
                    className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className="flex-1 text-left">
                        <p className="font-semibold text-gray-900 dark:text-white">
                          {store.storeName}
                        </p>
                        <div className="mt-1 flex gap-4 text-sm text-gray-600 dark:text-gray-400">
                          <span>Revenue: {formatCurrency(store.revenue)}</span>
                          <span>Transaksi: {store.transactionCount}</span>
                        </div>
                      </div>
                    </div>
                    <span
                      className={`transform transition-transform ${
                        expandedStore === store.storeId ? 'rotate-180' : ''
                      }`}
                    >
                      ▼
                    </span>
                  </button>

                  {/* Store Details */}
                  {expandedStore === store.storeId && (
                    <div className="border-t bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900">
                      {/* Payment Methods */}
                      <div className="mb-4">
                        <p className="mb-2 font-medium text-gray-700 dark:text-gray-300">
                          Metode Pembayaran
                        </p>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {Object.entries(store.paymentMethods).map(
                            ([method, stat]) => (
                              <div
                                key={method}
                                className="rounded bg-white p-3 dark:bg-gray-800"
                              >
                                <div className="flex justify-between text-sm">
                                  <span className="font-medium text-gray-700 dark:text-gray-300">
                                    {getPaymentMethodLabel(method)}
                                  </span>
                                  <span className="text-gray-600 dark:text-gray-400">
                                    {stat.count}x
                                  </span>
                                </div>
                                <div className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">
                                  {formatCurrency(stat.amount)}
                                </div>
                              </div>
                            )
                          )}
                        </div>
                      </div>

                      {/* Weekly Breakdown Table */}
                      <div>
                        <p className="mb-2 font-medium text-gray-700 dark:text-gray-300">
                          Tren Mingguan
                        </p>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead className="border-b bg-gray-200 dark:bg-gray-700">
                              <tr>
                                <th className="px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-300">
                                  Minggu
                                </th>
                                <th className="px-3 py-2 text-right font-medium text-gray-700 dark:text-gray-300">
                                  Periode
                                </th>
                                <th className="px-3 py-2 text-right font-medium text-gray-700 dark:text-gray-300">
                                  Revenue
                                </th>
                                <th className="px-3 py-2 text-right font-medium text-gray-700 dark:text-gray-300">
                                  Transaksi
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y dark:divide-gray-700">
                              {store.weeklyBreakdown.map((week) => (
                                <tr
                                  key={week.weekNumber}
                                  className="hover:bg-gray-100 dark:hover:bg-gray-800"
                                >
                                  <td className="px-3 py-2 font-medium text-gray-900 dark:text-white">
                                    W{week.weekNumber}
                                  </td>
                                  <td className="px-3 py-2 text-right text-sm text-gray-600 dark:text-gray-400">
                                    {week.weekStart} - {week.weekEnd}
                                  </td>
                                  <td className="px-3 py-2 text-right font-semibold text-gray-900 dark:text-white">
                                    {formatCurrency(week.revenue)}
                                  </td>
                                  <td className="px-3 py-2 text-right text-gray-700 dark:text-gray-300">
                                    {week.transactionCount}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {reportData.data.byStore.length === 0 && (
                <div className="py-8 text-center text-gray-500 dark:text-gray-400">
                  Tidak ada data toko
                </div>
              )}
            </CardBody>
          </Card>

          {/* Metadata */}
          <div className="text-xs text-gray-500 dark:text-gray-400">
            <p>
              Data diperbarui: {new Date(reportData.meta.timestamp).toLocaleString('id-ID')}
            </p>
            <p>ID Permintaan: {reportData.meta.requestId}</p>
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Payment method label helper
 */
function getPaymentMethodLabel(method: string): string {
  const labels: Record<string, string> = {
    CASH: 'Tunai',
    MEMBER: 'Kredit Member',
    MEMBER_CREDIT: 'Kredit Member',
    TEMPO: 'Tempo',
  };
  return labels[method] || method;
}
