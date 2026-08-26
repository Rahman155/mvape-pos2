import React from 'react';
import { Card } from '@/components/ui/Card';
import BarChart from './BarChart';
import LineChart from './LineChart';
import PieChart from './PieChart';
import { currencyFormatter, compactNumberFormatter } from './chartConfig';

export interface SalesReportData {
  storePerformance: Array<{
    storeName: string;
    totalSales: number;
    transactionCount: number;
    averageTransaction: number;
  }>;
  dailyBreakdown: Array<{
    date: string;
    sales: number;
    transactions: number;
  }>;
  paymentMethodDistribution: Array<{
    name: string;
    value: number;
  }>;
  topProducts: Array<{
    productName: string;
    quantity: number;
    revenue: number;
  }>;
  summary: {
    totalRevenue: number;
    totalTransactions: number;
    averageTransactionValue: number;
    topStore: string;
  };
}

export interface SalesReportTemplateProps {
  data: SalesReportData;
  period?: 'daily' | 'weekly' | 'monthly';
  title?: string;
  subtitle?: string;
  showSummary?: boolean;
  showStorePerformance?: boolean;
  showDailyTrend?: boolean;
  showPaymentMethods?: boolean;
  showTopProducts?: boolean;
}

/**
 * Sales Report Template Component
 * Displays comprehensive sales metrics with store performance, trends, and breakdowns
 */
export const SalesReportTemplate: React.FC<SalesReportTemplateProps> = ({
  data,
  period = 'daily',
  title = 'Sales Report',
  subtitle = 'Daily Sales Performance and Analysis',
  showSummary = true,
  showStorePerformance = true,
  showDailyTrend = true,
  showPaymentMethods = true,
  showTopProducts = true,
}) => {
  const getPeriodLabel = () => {
    switch (period) {
      case 'weekly':
        return 'Weekly';
      case 'monthly':
        return 'Monthly';
      default:
        return 'Daily';
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      {(title || subtitle) && (
        <div>
          {title && (
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {title}
            </h2>
          )}
          {subtitle && (
            <p className="text-gray-600 dark:text-gray-400 mt-1">{subtitle}</p>
          )}
        </div>
      )}

      {/* Summary Cards */}
      {showSummary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <SalesMetricCard
            label="Total Revenue"
            value={data.summary.totalRevenue}
            type="currency"
          />
          <SalesMetricCard
            label="Total Transactions"
            value={data.summary.totalTransactions}
            type="number"
          />
          <SalesMetricCard
            label="Average Transaction"
            value={data.summary.averageTransactionValue}
            type="currency"
          />
          <SalesMetricCard
            label="Top Store"
            value={data.summary.topStore}
            type="text"
          />
        </div>
      )}

      {/* Store Performance Chart */}
      {showStorePerformance && data.storePerformance.length > 0 && (
        <Card>
          <Card.Body>
            <BarChart
              data={data.storePerformance}
              dataKey={['totalSales', 'transactionCount']}
              xAxisKey="storeName"
              title="Store Performance Comparison"
              subtitle="Sales Revenue vs Transaction Count by Store"
              colors={['#3B82F6', '#10B981']}
              tooltipFormatter={(value) => {
                if (typeof value === 'number' && value > 100) {
                  return currencyFormatter(value);
                }
                return value.toString();
              }}
              yAxisFormatter={compactNumberFormatter}
              height={350}
            />
          </Card.Body>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Sales Trend */}
        {showDailyTrend && data.dailyBreakdown.length > 0 && (
          <Card>
            <Card.Body>
              <LineChart
                data={data.dailyBreakdown}
                dataKey="sales"
                xAxisKey="date"
                title={`${getPeriodLabel()} Sales Trend`}
                subtitle="Revenue Movement Over Time"
                colors={['#3B82F6']}
                tooltipFormatter={currencyFormatter}
                yAxisFormatter={(value) => {
                  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
                  if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
                  return value.toString();
                }}
                height={300}
                strokeWidth={3}
              />
            </Card.Body>
          </Card>
        )}

        {/* Payment Method Distribution */}
        {showPaymentMethods && data.paymentMethodDistribution.length > 0 && (
          <Card>
            <Card.Body>
              <PieChart
                data={data.paymentMethodDistribution}
                nameKey="name"
                dataKey="value"
                title="Payment Method Distribution"
                subtitle="Sales by Payment Type"
                colors={['#3B82F6', '#10B981', '#F59E0B', '#EF4444']}
                height={300}
                outerRadius={100}
                tooltipFormatter={currencyFormatter}
              />
            </Card.Body>
          </Card>
        )}
      </div>

      {/* Transaction Count Trend */}
      {showDailyTrend && data.dailyBreakdown.length > 0 && (
        <Card>
          <Card.Body>
            <LineChart
              data={data.dailyBreakdown}
              dataKey="transactions"
              xAxisKey="date"
              title="Transaction Frequency"
              subtitle="Number of Transactions Over Time"
              colors={['#10B981']}
              tooltipFormatter={(value) => value.toString()}
              yAxisFormatter={(value) => value.toString()}
              height={300}
              strokeWidth={2}
            />
          </Card.Body>
        </Card>
      )}

      {/* Top Products */}
      {showTopProducts && data.topProducts.length > 0 && (
        <Card>
          <Card.Body>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Top Products
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-400">
                        Product
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-600 dark:text-gray-400">
                        Quantity Sold
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-600 dark:text-gray-400">
                        Revenue
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.topProducts.map((product, index) => (
                      <tr
                        key={index}
                        className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                      >
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                          {product.productName}
                        </td>
                        <td className="px-4 py-3 text-right text-sm text-gray-600 dark:text-gray-400">
                          {product.quantity}
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-medium text-gray-900 dark:text-white">
                          {currencyFormatter(product.revenue)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </Card.Body>
        </Card>
      )}
    </div>
  );
};

interface SalesMetricCardProps {
  label: string;
  value: string | number;
  type: 'currency' | 'number' | 'text';
}

const SalesMetricCard: React.FC<SalesMetricCardProps> = ({ label, value, type }) => {
  const formatValue = () => {
    if (type === 'currency' && typeof value === 'number') {
      return currencyFormatter(value);
    }
    if (type === 'number' && typeof value === 'number') {
      return compactNumberFormatter(value);
    }
    return value.toString();
  };

  return (
    <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 transition-all hover:shadow-md">
      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{label}</p>
      <p className="text-2xl font-bold mt-2 text-blue-600 dark:text-blue-400">
        {formatValue()}
      </p>
    </div>
  );
};

export default SalesReportTemplate;
