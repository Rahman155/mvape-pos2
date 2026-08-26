/**
 * Chart Components Examples
 * Practical examples for common use cases in the POS system
 */

import React from 'react';
import { BarChart, LineChart, PieChart, FinancialReportTemplate, SalesReportTemplate } from './index';
import { currencyFormatter, compactNumberFormatter } from './chartConfig';

/**
 * Example 1: Daily Sales Overview
 * Simple bar chart showing sales by store for a specific day
 */
export const DailySalesOverviewExample = () => {
  const data = [
    { store: 'Store A', sales: 2500000, transactions: 42 },
    { store: 'Store B', sales: 3200000, transactions: 56 },
    { store: 'Store C', sales: 1800000, transactions: 31 },
    { store: 'Store D', sales: 2900000, transactions: 48 },
  ];

  return (
    <BarChart
      data={data}
      dataKey={['sales', 'transactions']}
      xAxisKey="store"
      title="Daily Sales Overview"
      subtitle="Sales and transactions by store"
      colors={['#3B82F6', '#10B981']}
      tooltipFormatter={(value) => {
        if (value > 100) return currencyFormatter(value);
        return value.toString();
      }}
      yAxisFormatter={compactNumberFormatter}
      height={400}
    />
  );
};

/**
 * Example 2: Revenue Trend
 * Line chart showing revenue trend over 30 days
 */
export const RevenueTrendExample = () => {
  const data = Array.from({ length: 30 }, (_, i) => {
    const day = i + 1;
    const baseRevenue = 3000000 + Math.random() * 2000000;
    const variation = Math.sin(day / 5) * 500000;
    return {
      date: `Jan ${day}`,
      revenue: Math.round(baseRevenue + variation),
      expenses: Math.round(1000000 + Math.random() * 500000),
    };
  });

  return (
    <LineChart
      data={data}
      dataKey={['revenue', 'expenses']}
      xAxisKey="date"
      title="30-Day Revenue Trend"
      subtitle="Daily revenue and expenses"
      colors={['#3B82F6', '#EF4444']}
      tooltipFormatter={currencyFormatter}
      yAxisFormatter={(value) => compactNumberFormatter(value)}
      height={400}
    />
  );
};

/**
 * Example 3: Payment Method Distribution
 * Pie chart showing how sales are distributed across payment methods
 */
export const PaymentMethodDistributionExample = () => {
  const data = [
    { name: 'Cash (Tunai)', value: 25000000 },
    { name: 'Member Credit', value: 15000000 },
    { name: 'Tempo', value: 10000000 },
  ];

  return (
    <PieChart
      data={data}
      title="Payment Method Distribution"
      subtitle="Sales breakdown by payment type"
      colors={['#3B82F6', '#10B981', '#F59E0B']}
      tooltipFormatter={currencyFormatter}
      height={350}
    />
  );
};

/**
 * Example 4: Inventory Status
 * Horizontal bar chart showing inventory levels by product category
 */
export const InventoryStatusExample = () => {
  const data = [
    { category: 'Pod Systems', stock: 245, reorderLevel: 50 },
    { category: 'E-Liquids', stock: 432, reorderLevel: 100 },
    { category: 'Coils & Accessories', stock: 156, reorderLevel: 30 },
    { category: 'Batteries', stock: 89, reorderLevel: 20 },
    { category: 'Mods', stock: 67, reorderLevel: 15 },
  ];

  return (
    <BarChart
      data={data}
      dataKey="stock"
      xAxisKey="category"
      title="Current Inventory Levels"
      subtitle="Stock quantity by product category"
      colors={['#10B981']}
      tooltipFormatter={(value) => `${value} units`}
      height={350}
    />
  );
};

/**
 * Example 5: Monthly Profit Comparison
 * Stacked bar chart comparing revenue and profit across months
 */
export const MonthlySalesComparisonExample = () => {
  const data = [
    { month: 'January', revenue: 50000000, profit: 15000000, bop: 5000000 },
    { month: 'February', revenue: 52000000, profit: 16000000, bop: 5000000 },
    { month: 'March', revenue: 48000000, profit: 14000000, bop: 5000000 },
  ];

  return (
    <BarChart
      data={data}
      dataKey={['revenue', 'profit']}
      xAxisKey="month"
      title="Monthly Sales & Profit"
      subtitle="Revenue vs profit by month"
      colors={['#3B82F6', '#10B981']}
      tooltipFormatter={currencyFormatter}
      yAxisFormatter={(value) => `Rp ${(value / 1000000).toFixed(1)}M`}
      stacked={false}
      height={400}
    />
  );
};

/**
 * Example 6: Top Products Sales
 * Pie chart showing top 5 products by revenue
 */
export const TopProductsSalesExample = () => {
  const data = [
    { name: 'Voopoo Drag X', value: 8500000 },
    { name: 'Geekvape Aegis', value: 6200000 },
    { name: 'Lost Mary 5000', value: 5800000 },
    { name: 'Oxva Velocity', value: 4500000 },
    { name: 'Other Products', value: 9000000 },
  ];

  return (
    <PieChart
      data={data}
      title="Top 5 Products by Revenue"
      subtitle="Sales revenue distribution"
      colors={['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6']}
      tooltipFormatter={currencyFormatter}
      height={350}
    />
  );
};

/**
 * Example 7: Kasir Performance
 * Bar chart showing kasir performance metrics
 */
export const KasirPerformanceExample = () => {
  const data = [
    { kasir: 'Ahmad', transactions: 156, totalSales: 15600000, avgTransaction: 100000 },
    { kasir: 'Budi', transactions: 142, totalSales: 14200000, avgTransaction: 100141 },
    { kasir: 'Citra', transactions: 168, totalSales: 16800000, avgTransaction: 100000 },
    { kasir: 'Dani', transactions: 135, totalSales: 13500000, avgTransaction: 100000 },
  ];

  return (
    <BarChart
      data={data}
      dataKey={['transactions', 'avgTransaction']}
      xAxisKey="kasir"
      title="Kasir Performance This Month"
      subtitle="Transactions and average transaction value"
      colors={['#3B82F6', '#10B981']}
      tooltipFormatter={(value) => {
        if (value > 1000) return currencyFormatter(value);
        return value.toString();
      }}
      height={350}
    />
  );
};

/**
 * Example 8: Complete Financial Report
 * Demonstrates the FinancialReportTemplate
 */
export const FinancialReportExample = () => {
  const data = {
    monthlyRevenue: [
      { month: 'Jan', revenue: 50000000, profit: 15000000 },
      { month: 'Feb', revenue: 52000000, profit: 16000000 },
      { month: 'Mar', revenue: 48000000, profit: 14000000 },
      { month: 'Apr', revenue: 55000000, profit: 16500000 },
    ],
    expenseBreakdown: [
      { category: 'Electricity', amount: 5000000 },
      { category: 'Rent', amount: 10000000 },
      { category: 'Salaries', amount: 15000000 },
      { category: 'Marketing', amount: 3000000 },
    ],
    dailyTrend: [
      { date: 'Apr 1', revenue: 1200000, expenses: 400000, profit: 800000 },
      { date: 'Apr 2', revenue: 1400000, expenses: 450000, profit: 950000 },
      { date: 'Apr 3', revenue: 1100000, expenses: 380000, profit: 720000 },
      { date: 'Apr 4', revenue: 1600000, expenses: 500000, profit: 1100000 },
    ],
    summary: {
      totalRevenue: 205000000,
      totalExpenses: 33000000,
      totalProfit: 61500000,
      profitMargin: 30,
    },
  };

  return (
    <FinancialReportTemplate
      data={data}
      title="Financial Report - Q1 2024"
      subtitle="Quarterly financial performance"
      showSummary={true}
      showMonthlyChart={true}
      showExpenseBreakdown={true}
      showDailyTrend={true}
    />
  );
};

/**
 * Example 9: Complete Sales Report
 * Demonstrates the SalesReportTemplate
 */
export const SalesReportExample = () => {
  const data = {
    storePerformance: [
      { storeName: 'Store A', totalSales: 50000000, transactionCount: 250, averageTransaction: 200000 },
      { storeName: 'Store B', totalSales: 75000000, transactionCount: 350, averageTransaction: 214286 },
      { storeName: 'Store C', totalSales: 30000000, transactionCount: 150, averageTransaction: 200000 },
    ],
    dailyBreakdown: [
      { date: '1 Apr', sales: 2000000, transactions: 50 },
      { date: '2 Apr', sales: 2500000, transactions: 60 },
      { date: '3 Apr', sales: 2200000, transactions: 55 },
      { date: '4 Apr', sales: 2800000, transactions: 70 },
    ],
    paymentMethodDistribution: [
      { name: 'Cash', value: 100000000 },
      { name: 'Member', value: 35000000 },
      { name: 'Tempo', value: 20000000 },
    ],
    topProducts: [
      { productName: 'Voopoo Drag X', quantity: 120, revenue: 8500000 },
      { productName: 'Geekvape Aegis', quantity: 95, revenue: 6200000 },
      { productName: 'Lost Mary 5000', quantity: 105, revenue: 5800000 },
    ],
    summary: {
      totalRevenue: 155000000,
      totalTransactions: 750,
      averageTransactionValue: 206667,
      topStore: 'Store B',
    },
  };

  return (
    <SalesReportTemplate
      data={data}
      period="daily"
      title="Daily Sales Report"
      subtitle="Store and product performance"
      showSummary={true}
      showStorePerformance={true}
      showDailyTrend={true}
      showPaymentMethods={true}
      showTopProducts={true}
    />
  );
};

/**
 * Example 10: Store Comparison
 * Compare multiple stores across key metrics
 */
export const StoreComparisonExample = () => {
  const data = [
    { store: 'Store A', revenue: 50000000, profit: 15000000, transactions: 250, avgTicket: 200000 },
    { store: 'Store B', revenue: 75000000, profit: 22500000, transactions: 350, avgTicket: 214286 },
    { store: 'Store C', revenue: 30000000, profit: 9000000, transactions: 150, avgTicket: 200000 },
    { store: 'Store D', revenue: 45000000, profit: 13500000, transactions: 225, avgTicket: 200000 },
  ];

  return (
    <BarChart
      data={data}
      dataKey={['revenue', 'profit']}
      xAxisKey="store"
      title="Store Performance Comparison"
      subtitle="Revenue and profit across all stores"
      colors={['#3B82F6', '#10B981']}
      tooltipFormatter={currencyFormatter}
      yAxisFormatter={(value) => `Rp ${(value / 1000000).toFixed(1)}M`}
      height={400}
    />
  );
};

export default {
  DailySalesOverviewExample,
  RevenueTrendExample,
  PaymentMethodDistributionExample,
  InventoryStatusExample,
  MonthlySalesComparisonExample,
  TopProductsSalesExample,
  KasirPerformanceExample,
  FinancialReportExample,
  SalesReportExample,
  StoreComparisonExample,
};
