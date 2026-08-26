import React from 'react';
import { Card } from '@/components/ui/Card';
import BarChart from './BarChart';
import LineChart from './LineChart';
import { ChartTypeConfigs, currencyFormatter } from './chartConfig';

export interface FinancialReportData {
  monthlyRevenue: Array<{ month: string; revenue: number; profit: number }>;
  expenseBreakdown: Array<{ category: string; amount: number }>;
  dailyTrend: Array<{ date: string; revenue: number; expenses: number; profit: number }>;
  summary: {
    totalRevenue: number;
    totalExpenses: number;
    totalProfit: number;
    profitMargin: number;
  };
}

export interface FinancialReportTemplateProps {
  data: FinancialReportData;
  title?: string;
  subtitle?: string;
  showSummary?: boolean;
  showMonthlyChart?: boolean;
  showExpenseBreakdown?: boolean;
  showDailyTrend?: boolean;
}

/**
 * Financial Report Template Component
 * Displays comprehensive financial metrics with multiple chart views
 * Includes summary cards and trend analysis
 */
export const FinancialReportTemplate: React.FC<FinancialReportTemplateProps> = ({
  data,
  title = 'Financial Report',
  subtitle = 'Revenue, Expenses, and Profit Analysis',
  showSummary = true,
  showMonthlyChart = true,
  showExpenseBreakdown = true,
  showDailyTrend = true,
}) => {
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
          <SummaryCard
            label="Total Revenue"
            value={data.summary.totalRevenue}
            color="blue"
          />
          <SummaryCard
            label="Total Expenses"
            value={data.summary.totalExpenses}
            color="red"
          />
          <SummaryCard
            label="Total Profit"
            value={data.summary.totalProfit}
            color="green"
          />
          <SummaryCard
            label="Profit Margin"
            value={data.summary.profitMargin}
            isTrend
            color="purple"
          />
        </div>
      )}

      {/* Monthly Revenue and Profit Chart */}
      {showMonthlyChart && data.monthlyRevenue.length > 0 && (
        <Card>
          <Card.Body>
            <BarChart
              data={data.monthlyRevenue}
              dataKey={['revenue', 'profit']}
              xAxisKey="month"
              title="Monthly Revenue & Profit"
              subtitle="Revenue vs Profit by Month"
              colors={['#3B82F6', '#10B981']}
              tooltipFormatter={currencyFormatter}
              yAxisFormatter={(value) => {
                if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
                if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
                return value.toString();
              }}
              height={350}
            />
          </Card.Body>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Expense Breakdown */}
        {showExpenseBreakdown && data.expenseBreakdown.length > 0 && (
          <Card>
            <Card.Body>
              <BarChart
                data={data.expenseBreakdown}
                dataKey="amount"
                xAxisKey="category"
                title="Expense Breakdown"
                subtitle="Expenses by Category"
                colors={['#EF4444']}
                tooltipFormatter={currencyFormatter}
                yAxisFormatter={(value) => {
                  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
                  if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
                  return value.toString();
                }}
                height={300}
              />
            </Card.Body>
          </Card>
        )}

        {/* Daily Profit Trend */}
        {showDailyTrend && data.dailyTrend.length > 0 && (
          <Card>
            <Card.Body>
              <LineChart
                data={data.dailyTrend}
                dataKey="profit"
                xAxisKey="date"
                title="Daily Profit Trend"
                subtitle="Profit Movement Over Time"
                colors={['#10B981']}
                tooltipFormatter={currencyFormatter}
                yAxisFormatter={(value) => {
                  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
                  if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
                  return value.toString();
                }}
                height={300}
              />
            </Card.Body>
          </Card>
        )}
      </div>

      {/* Daily Trend Chart */}
      {showDailyTrend && data.dailyTrend.length > 0 && (
        <Card>
          <Card.Body>
            <LineChart
              data={data.dailyTrend}
              dataKey={['revenue', 'expenses', 'profit']}
              xAxisKey="date"
              title="Daily Financial Trend"
              subtitle="Revenue, Expenses, and Profit Movement"
              colors={['#3B82F6', '#EF4444', '#10B981']}
              tooltipFormatter={currencyFormatter}
              yAxisFormatter={(value) => {
                if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
                if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
                return value.toString();
              }}
              height={350}
            />
          </Card.Body>
        </Card>
      )}
    </div>
  );
};

interface SummaryCardProps {
  label: string;
  value: number;
  color: 'blue' | 'red' | 'green' | 'purple';
  isTrend?: boolean;
}

const SummaryCard: React.FC<SummaryCardProps> = ({
  label,
  value,
  color,
  isTrend = false,
}) => {
  const colorClasses = {
    blue: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
    red: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
    green: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
    purple: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800',
  };

  const textClasses = {
    blue: 'text-blue-600 dark:text-blue-400',
    red: 'text-red-600 dark:text-red-400',
    green: 'text-green-600 dark:text-green-400',
    purple: 'text-purple-600 dark:text-purple-400',
  };

  return (
    <div
      className={`p-4 rounded-lg border ${colorClasses[color]} transition-all hover:shadow-md`}
    >
      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{label}</p>
      <p className={`text-2xl font-bold mt-2 ${textClasses[color]}`}>
        {isTrend ? (
          <>
            {value.toFixed(1)}
            <span className="text-lg ml-1">%</span>
          </>
        ) : (
          currencyFormatter(value)
        )}
      </p>
    </div>
  );
};

export default FinancialReportTemplate;
