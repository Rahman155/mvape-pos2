/**
 * BOP (Biaya Operasional Penjualan) Expense Report Page (Task 92)
 * Displays business operational expenses aggregated by store and period
 *
 * Requirements: 17.1, 17.2, 17.3
 */

'use client';

import { useState } from 'react';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useBOPReport } from '@/hooks/useReports';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

type PeriodType = 'daily' | 'weekly' | 'monthly';

export default function BOPReportPage() {
  const today = new Date();
  const [periodType, setPeriodType] = useState<PeriodType>('monthly');
  const [selectedDate, setSelectedDate] = useState(today.toISOString().split('T')[0]);
  const [selectedWeek, setSelectedWeek] = useState(
    Math.ceil((today.getDate() + new Date(today.getFullYear(), today.getMonth(), 1).getDay()) / 7)
  );
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());
  const [selectedStore, setSelectedStore] = useState<string>('all');

  // Build query params based on period type
  const getQueryParams = () => {
    const base = { period: periodType, storeId: selectedStore !== 'all' ? selectedStore : undefined };
    
    switch (periodType) {
      case 'daily':
        return { ...base, date: selectedDate };
      case 'weekly':
        return { ...base, week: selectedWeek, year: selectedYear };
      case 'monthly':
        return { ...base, month: selectedMonth, year: selectedYear };
      default:
        return base;
    }
  };

  const { data: reportData, isLoading, error, refetch } = useBOPReport(getQueryParams());

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

  const handlePeriodChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setPeriodType(e.target.value as PeriodType);
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedDate(e.target.value);
  };

  const handleWeekChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedWeek(parseInt(e.target.value));
  };

  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedMonth(parseInt(e.target.value));
  };

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedYear(parseInt(e.target.value));
  };

  const handleStoreChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedStore(e.target.value);
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
  }: {
    title: string;
    value: string | React.ReactNode;
    subtext?: string;
  }) => {
    return (
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
  };

  // Get unique stores from data
  const stores = Array.from(
    new Set(reportData?.data.byStore.map((s) => ({ id: s.storeId, name: s.storeName })) || [])
  ).sort((a, b) => a.name.localeCompare(b.name));

  // Prepare chart data
  const chartData = reportData?.data.byStore.map((store) => ({
    name: store.storeName,
    totalBOP: store.totalBOP,
  })) || [];

  return (
    <div className="container mx-auto space-y-6 p-4">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Laporan BOP
        </h1>
        <p className="mt-1 text-gray-500 dark:text-gray-400">
          Biaya Operasional Penjualan - Perincian pengeluaran operasional per toko
        </p>
      </div>

      {/* Controls */}
      <div className="space-y-4 rounded-lg bg-white p-4 shadow-sm dark:bg-gray-900">
        {/* Period Type Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Jenis Periode
          </label>
          <select
            value={periodType}
            onChange={handlePeriodChange}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          >
            <option value="daily">Harian</option>
            <option value="weekly">Mingguan</option>
            <option value="monthly">Bulanan</option>
          </select>
        </div>

        {/* Period-Specific Controls */}
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-1 gap-4">
            {periodType === 'daily' && (
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Tanggal
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={handleDateChange}
                  max={today.toISOString().split('T')[0]}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                />
              </div>
            )}

            {periodType === 'weekly' && (
              <>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Minggu
                  </label>
                  <select
                    value={selectedWeek}
                    onChange={handleWeekChange}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                  >
                    {Array.from({ length: 53 }, (_, i) => i + 1).map((week) => (
                      <option key={week} value={week}>
                        Minggu {week}
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
              </>
            )}

            {periodType === 'monthly' && (
              <>
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
              </>
            )}
          </div>

          <div className="flex gap-2">
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

        {/* Store Filter */}
        {stores.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Filter Toko
            </label>
            <select
              value={selectedStore}
              onChange={handleStoreChange}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            >
              <option value="all">Semua Toko</option>
              {stores.map((store) => (
                <option key={store.id} value={store.id}>
                  {store.name}
                </option>
              ))}
            </select>
          </div>
        )}
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
          <div className="grid gap-4 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
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
                Tidak ada data BOP untuk periode yang dipilih
              </p>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Content - Data Available */}
      {!isLoading && reportData && (
        <>
          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-3">
            <SummaryCard
              title="Total BOP"
              value={formatCurrency(reportData.data.summary.totalBOP)}
              subtext={`${reportData.data.summary.storeCount} toko`}
            />
            <SummaryCard
              title="Rata-rata BOP per Toko"
              value={formatCurrency(reportData.data.summary.averageBOP)}
              subtext="Pengeluaran operasional rata-rata"
            />
            <SummaryCard
              title="Jumlah Toko"
              value={reportData.data.summary.storeCount.toString()}
              subtext="Toko dengan data BOP"
            />
          </div>

          {/* BOP Distribution Chart */}
          {chartData.length > 0 && (
            <Card>
              <CardHeader
                title="Perbandingan Total BOP Per Toko"
                description="Visualisasi pengeluaran operasional untuk setiap toko"
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
                    <Bar dataKey="totalBOP" fill="#f59e0b" name="Total BOP" />
                  </BarChart>
                </ResponsiveContainer>
              </CardBody>
            </Card>
          )}

          {/* Detailed Table */}
          <Card>
            <CardHeader
              title="Rincian BOP Per Toko"
              description="Detail lengkap biaya operasional dengan perincian kategori"
            />
            <CardBody>
              <div className="space-y-6">
                {reportData.data.byStore.map((store) => (
                  <div key={store.storeId} className="border-b last:border-b-0 pb-6 last:pb-0">
                    {/* Store Header */}
                    <div className="mb-4 flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {store.storeName}
                        </h3>
                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                          Total BOP: <span className="font-bold">{formatCurrency(store.totalBOP)}</span>
                        </p>
                      </div>
                    </div>

                    {/* BOP Items Table */}
                    {store.bopItems.length > 0 ? (
                      <div className="overflow-x-auto rounded border dark:border-gray-700">
                        <table className="w-full text-sm">
                          <thead className="border-b bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
                            <tr>
                              <th className="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300">
                                Kategori
                              </th>
                              <th className="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300">
                                Deskripsi
                              </th>
                              <th className="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300">
                                Periode Efektif
                              </th>
                              <th className="px-4 py-3 text-right font-medium text-gray-700 dark:text-gray-300">
                                Jumlah
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y dark:divide-gray-700">
                            {store.bopItems.map((item) => (
                              <tr
                                key={item.id}
                                className="hover:bg-gray-50 dark:hover:bg-gray-900"
                              >
                                <td className="px-4 py-3">
                                  <p className="font-medium text-gray-900 dark:text-white">
                                    {item.name}
                                  </p>
                                </td>
                                <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                                  {item.description || '-'}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                                  {item.effectiveFrom}
                                  {item.effectiveTo ? ` s/d ${item.effectiveTo}` : ' (Berlaku)'}
                                </td>
                                <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-white">
                                  {formatCurrency(item.amount)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-center text-sm text-gray-500 dark:text-gray-400">
                        Tidak ada item BOP untuk toko ini pada periode dipilih
                      </p>
                    )}
                  </div>
                ))}
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
