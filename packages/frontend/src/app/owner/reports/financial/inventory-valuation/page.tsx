/**
 * Inventory Valuation Report Page (Task 86)
 * Displays inventory valuation by store with detailed product breakdown
 *
 * Requirements: 21.2, 21.3
 */

'use client';

import { useState } from 'react';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useInventoryValuationReport, useExportInventoryValuationPDF, useExportInventoryValuationExcel } from '@/hooks/useReports';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

export default function InventoryValuationReportPage() {
  const today = new Date();
  const todayString = today.toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(todayString);

  const { data: reportData, isLoading, error, refetch } = useInventoryValuationReport(selectedDate);

  const { exportToPDF, isExporting: isExportingPDF, error: pdfError } = useExportInventoryValuationPDF();
  const { exportToExcel, isExporting: isExportingExcel, error: excelError } = useExportInventoryValuationExcel();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedDate(e.target.value);
  };

  const handleExportPDF = async () => {
    if (reportData) {
      await exportToPDF(reportData, `laporan-valuasi-inventori-${selectedDate}.pdf`);
    }
  };

  const handleExportExcel = async () => {
    if (reportData) {
      exportToExcel(reportData, `laporan-valuasi-inventori-${selectedDate}.csv`);
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

  // Store card component
  const StoreCard = ({ store, idx }: { store: any; idx: number }) => (
    <Card>
      <CardHeader
        title={`${idx + 1}. ${store.storeName}`}
        description={`Nilai Inventori: ${formatCurrency(store.inventoryValue)}`}
      />
      <CardBody>
        <div className="space-y-4">
          <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
            <p className="text-sm text-gray-600 dark:text-gray-400">Jumlah Item</p>
            <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
              {store.itemCount}
            </p>
          </div>

          {store.topItems.length > 0 && (
            <div>
              <h4 className="mb-3 text-sm font-medium text-gray-700 dark:text-gray-300">
                Top 5 Produk
              </h4>
              <div className="space-y-2">
                {store.topItems.map((item: any, itemIdx: number) => (
                  <div
                    key={item.productId}
                    className="flex items-center justify-between rounded border border-gray-200 p-2 dark:border-gray-700"
                  >
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {item.productName}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Qty: {item.quantity} × {formatCurrency(item.costPrice)}
                      </p>
                    </div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {formatCurrency(item.value)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardBody>
    </Card>
  );

  // Prepare chart data
  const chartData =
    reportData?.data.byStore.map((store) => ({
      name: store.storeName,
      value: store.inventoryValue,
    })) || [];

  const COLORS = [
    '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6',
    '#06b6d4', '#f97316', '#14b8a6', '#6366f1', '#d946ef'
  ];

  return (
    <div className="container mx-auto space-y-6 p-4">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Laporan Valuasi Inventori
        </h1>
        <p className="mt-1 text-gray-500 dark:text-gray-400">
          Nilai stok barang per toko berdasarkan harga pokok
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
                Tidak ada data inventori untuk tanggal {new Date(selectedDate).toLocaleDateString('id-ID')}
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
              title="Total Nilai Inventori"
              value={formatCurrency(reportData.data.summary.totalInventoryValue)}
              subtext="Seluruh lokasi"
            />
            <SummaryCard
              title="Jumlah Toko"
              value={reportData.data.summary.storeCount}
              subtext="Toko dengan inventori"
            />
            <SummaryCard
              title="Total Item"
              value={reportData.data.summary.totalItemCount}
              subtext="Unit barang"
            />
            <SummaryCard
              title="Nilai Gudang"
              value={formatCurrency(reportData.data.summary.warehouseValue)}
              subtext="Stok pusat"
            />
          </div>

          {/* Store Distribution Chart */}
          {chartData.length > 0 && (
            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader
                  title="Distribusi Nilai Per Toko"
                  description="Pie chart persentase nilai inventori"
                />
                <CardBody>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => `${name}: ${formatCurrency(value)}`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {chartData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardBody>
              </Card>

              <Card>
                <CardHeader
                  title="Nilai Inventori Per Toko"
                  description="Bar chart perbandingan nilai"
                />
                <CardBody>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      <Bar dataKey="value" fill="#8b5cf6" name="Nilai Inventori" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardBody>
              </Card>
            </div>
          )}

          {/* Store Details */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Rincian Per Toko
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              {reportData.data.byStore.map((store, idx) => (
                <StoreCard key={store.storeId} store={store} idx={idx} />
              ))}
            </div>
          </div>

          {/* Warehouse Section */}
          {reportData.data.warehouse && reportData.data.warehouse.itemCount > 0 && (
            <Card>
              <CardHeader
                title="Gudang (Warehouse)"
                description={`Nilai: ${formatCurrency(reportData.data.warehouse.inventoryValue)}`}
              />
              <CardBody>
                <div className="space-y-4">
                  <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
                    <p className="text-sm text-gray-600 dark:text-gray-400">Jumlah Item</p>
                    <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
                      {reportData.data.warehouse.itemCount}
                    </p>
                  </div>

                  {reportData.data.warehouse.topItems.length > 0 && (
                    <div>
                      <h4 className="mb-3 text-sm font-medium text-gray-700 dark:text-gray-300">
                        Top 5 Produk Gudang
                      </h4>
                      <div className="space-y-2">
                        {reportData.data.warehouse.topItems.map((item: any) => (
                          <div
                            key={item.productId}
                            className="flex items-center justify-between rounded border border-gray-200 p-2 dark:border-gray-700"
                          >
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-900 dark:text-white">
                                {item.productName}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                Qty: {item.quantity} × {formatCurrency(item.costPrice)}
                              </p>
                            </div>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {formatCurrency(item.value)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardBody>
            </Card>
          )}

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
