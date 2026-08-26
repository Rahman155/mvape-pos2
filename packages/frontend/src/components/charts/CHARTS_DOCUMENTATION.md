# Data Visualization Components Documentation

## Overview

This package provides reusable, production-ready data visualization components built with Recharts. All components support:

- ✅ Dark mode and light mode
- ✅ Responsive design (mobile, tablet, desktop)
- ✅ TypeScript support with full type safety
- ✅ Customizable colors, formatting, and styling
- ✅ Indonesian localization for currency and dates
- ✅ Accessibility features

## Components

### 1. BarChart Component

Displays data as vertical or horizontal bars. Perfect for comparisons across categories.

#### Basic Usage

```typescript
import { BarChart } from '@/components/charts';

<BarChart
  data={[
    { category: 'Store A', sales: 50000, profit: 15000 },
    { category: 'Store B', sales: 75000, profit: 22000 },
    { category: 'Store C', sales: 60000, profit: 18000 },
  ]}
  dataKey={['sales', 'profit']}
  xAxisKey="category"
  title="Sales by Store"
/>
```

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `data` | `Array<Record<string, any>>` | Required | Chart data array |
| `dataKey` | `string \| string[]` | Required | Key(s) to plot on Y-axis |
| `xAxisKey` | `string` | Required | Key for X-axis values |
| `title` | `string` | - | Chart title |
| `subtitle` | `string` | - | Chart subtitle |
| `height` | `number` | `400` | Chart height in pixels |
| `colors` | `string[]` | Default palette | Bar colors |
| `showGrid` | `boolean` | `true` | Show grid lines |
| `showLegend` | `boolean` | `true` | Show legend |
| `stacked` | `boolean` | `false` | Stack bars on top of each other |
| `responsive` | `boolean` | `true` | Auto-resize based on container |
| `tooltipFormatter` | `(value: any) => string` | - | Format tooltip values |
| `xAxisFormatter` | `(value: any) => string` | - | Format X-axis labels |
| `yAxisFormatter` | `(value: any) => string` | - | Format Y-axis labels |
| `margin` | `MarginConfig` | `default` | Chart margins |

#### Examples

**Financial Report**
```typescript
const financialData = [
  { month: 'Jan', revenue: 10000000, expenses: 3000000 },
  { month: 'Feb', revenue: 12000000, expenses: 3500000 },
];

<BarChart
  data={financialData}
  dataKey={['revenue', 'expenses']}
  xAxisKey="month"
  title="Monthly Revenue vs Expenses"
  colors={['#3B82F6', '#EF4444']}
  tooltipFormatter={currencyFormatter}
  yAxisFormatter={(v) => compactNumberFormatter(v)}
/>
```

---

### 2. LineChart Component

Displays data as lines, ideal for showing trends over time.

#### Basic Usage

```typescript
import { LineChart } from '@/components/charts';

<LineChart
  data={[
    { date: '2024-01-01', sales: 100000, profit: 30000 },
    { date: '2024-01-02', sales: 120000, profit: 35000 },
  ]}
  dataKey="sales"
  xAxisKey="date"
  title="Daily Sales Trend"
/>
```

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `data` | `Array<Record<string, any>>` | Required | Chart data array |
| `dataKey` | `string \| string[]` | Required | Key(s) to plot on Y-axis |
| `xAxisKey` | `string` | Required | Key for X-axis values |
| `title` | `string` | - | Chart title |
| `subtitle` | `string` | - | Chart subtitle |
| `height` | `number` | `400` | Chart height in pixels |
| `colors` | `string[]` | Default palette | Line colors |
| `showGrid` | `boolean` | `true` | Show grid lines |
| `showLegend` | `boolean` | `true` | Show legend |
| `showDots` | `boolean` | `true` | Show data point dots |
| `strokeWidth` | `number` | `2` | Line thickness |
| `responsive` | `boolean` | `true` | Auto-resize based on container |
| `tooltipFormatter` | `(value: any) => string` | - | Format tooltip values |
| `xAxisFormatter` | `(value: any) => string` | - | Format X-axis labels |
| `yAxisFormatter` | `(value: any) => string` | - | Format Y-axis labels |
| `margin` | `MarginConfig` | `default` | Chart margins |

#### Examples

**Sales Trend**
```typescript
const trendData = [
  { date: '01-01', sales: 500000 },
  { date: '01-02', sales: 650000 },
  { date: '01-03', sales: 580000 },
];

<LineChart
  data={trendData}
  dataKey="sales"
  xAxisKey="date"
  title="Weekly Sales Trend"
  strokeWidth={3}
  tooltipFormatter={currencyFormatter}
/>
```

---

### 3. PieChart Component

Displays data as pie/donut slices, perfect for showing distribution and percentages.

#### Basic Usage

```typescript
import { PieChart } from '@/components/charts';

<PieChart
  data={[
    { name: 'Cash', value: 50000 },
    { name: 'Member Credit', value: 30000 },
    { name: 'Tempo', value: 20000 },
  ]}
  title="Sales by Payment Method"
/>
```

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `data` | `Array<{ name: string; value: number; ... }>` | Required | Chart data array |
| `dataKey` | `string` | `'value'` | Key containing numeric values |
| `nameKey` | `string` | `'name'` | Key containing category names |
| `title` | `string` | - | Chart title |
| `subtitle` | `string` | - | Chart subtitle |
| `height` | `number` | `400` | Chart height in pixels |
| `colors` | `string[]` | Default palette | Slice colors |
| `showLegend` | `boolean` | `true` | Show legend |
| `showLabels` | `boolean` | `true` | Show percentage labels |
| `innerRadius` | `number` | - | Inner radius (creates donut chart) |
| `outerRadius` | `number` | `120` | Outer radius |
| `responsive` | `boolean` | `true` | Auto-resize based on container |
| `tooltipFormatter` | `(value: any) => string` | - | Format tooltip values |
| `margin` | `MarginConfig` | `default` | Chart margins |

#### Examples

**Donut Chart**
```typescript
<PieChart
  data={paymentMethods}
  title="Payment Method Distribution"
  innerRadius={80}
  outerRadius={120}
  colors={['#3B82F6', '#10B981', '#F59E0B']}
/>
```

---

## Report Templates

### 1. FinancialReportTemplate

Comprehensive financial report with revenue, expenses, and profit analysis.

#### Usage

```typescript
import { FinancialReportTemplate } from '@/components/charts';

const financialData = {
  monthlyRevenue: [
    { month: 'Jan', revenue: 50000000, profit: 15000000 },
    { month: 'Feb', revenue: 60000000, profit: 18000000 },
  ],
  expenseBreakdown: [
    { category: 'Electricity', amount: 2000000 },
    { category: 'Rent', amount: 5000000 },
  ],
  dailyTrend: [
    { date: '01-01', revenue: 1000000, expenses: 300000, profit: 700000 },
  ],
  summary: {
    totalRevenue: 110000000,
    totalExpenses: 7000000,
    totalProfit: 33000000,
    profitMargin: 30,
  },
};

<FinancialReportTemplate
  data={financialData}
  title="Financial Report - January 2024"
/>
```

#### Features

- Summary cards with key metrics
- Monthly revenue vs profit bar chart
- Expense breakdown by category
- Daily profit trend line chart
- Full revenue/expenses/profit daily trend

---

### 2. SalesReportTemplate

Detailed sales performance with store comparisons and product analysis.

#### Usage

```typescript
import { SalesReportTemplate } from '@/components/charts';

const salesData = {
  storePerformance: [
    { storeName: 'Store A', totalSales: 50000000, transactionCount: 250, averageTransaction: 200000 },
    { storeName: 'Store B', totalSales: 75000000, transactionCount: 350, averageTransaction: 214000 },
  ],
  dailyBreakdown: [
    { date: '01-01', sales: 2000000, transactions: 50 },
  ],
  paymentMethodDistribution: [
    { name: 'Cash', value: 50000000 },
    { name: 'Member', value: 20000000 },
  ],
  topProducts: [
    { productName: 'Product A', quantity: 100, revenue: 5000000 },
  ],
  summary: {
    totalRevenue: 125000000,
    totalTransactions: 600,
    averageTransactionValue: 208000,
    topStore: 'Store B',
  },
};

<SalesReportTemplate
  data={salesData}
  period="daily"
  title="Daily Sales Report"
/>
```

#### Features

- Sales summary metrics
- Store performance comparison chart
- Daily sales trend line chart
- Payment method distribution pie chart
- Top products table
- Transaction frequency tracking

---

## Formatting Utilities

### Currency Formatter

```typescript
import { currencyFormatter } from '@/components/charts';

currencyFormatter(1500000);  // "Rp 1.500.000"
currencyFormatter(5000, 'USD');  // "$5"
```

### Compact Number Formatter

```typescript
import { compactNumberFormatter } from '@/components/charts';

compactNumberFormatter(1500000);  // "1.5M"
compactNumberFormatter(5000);     // "5K"
```

### Percentage Formatter

```typescript
import { percentageFormatter } from '@/components/charts';

percentageFormatter(25.5, 1);  // "25.5%"
percentageFormatter(33.333, 2);  // "33.33%"
```

### Date Formatter

```typescript
import { dateFormatter } from '@/components/charts';

dateFormatter('2024-01-15', 'short');  // "01/15"
dateFormatter('2024-01-15', 'long');   // "15 Januari 2024"
```

---

## Color Schemes

Multiple predefined color schemes available:

```typescript
import { ChartColorSchemes } from '@/components/charts';

// Primary scheme
ChartColorSchemes.primary.light;  // Light mode colors
ChartColorSchemes.primary.dark;   // Dark mode colors

// Pastel scheme
ChartColorSchemes.pastel.light;

// Vibrant scheme
ChartColorSchemes.vibrant.dark;

// Professional scheme
ChartColorSchemes.professional.light;
```

---

## Dark Mode Support

All components automatically adapt to dark mode through the `ThemeContext`:

```typescript
import { BarChart } from '@/components/charts';
import { useTheme } from '@/contexts/ThemeContext';

// Automatically respects theme changes
<BarChart data={data} dataKey="sales" xAxisKey="date" />
```

---

## Responsive Design

Charts automatically resize based on container width and device type:

```typescript
// Mobile: 300px height
// Tablet: 350px height
// Desktop: 400px height
// Large: 500px height

<BarChart data={data} dataKey="sales" xAxisKey="date" responsive={true} />
```

Override height for specific use cases:

```typescript
<BarChart
  data={data}
  dataKey="sales"
  xAxisKey="date"
  responsive={true}
  height={600}
/>
```

---

## Accessibility Features

- Proper semantic HTML
- ARIA labels on charts
- Keyboard navigation support
- High contrast in dark mode
- Color-blind friendly palettes
- Tooltip support for screen readers

---

## Performance Considerations

1. **Memoization**: Components use `useMemo` for color calculations
2. **Responsive Container**: Recharts handles responsiveness efficiently
3. **Data Optimization**: Provide pre-aggregated data when possible
4. **Large Datasets**: Consider data sampling for 1000+ data points

---

## Integration Examples

### In a Dashboard

```typescript
import { FinancialReportTemplate, SalesReportTemplate } from '@/components/charts';

export function OwnerDashboard() {
  return (
    <div className="space-y-8">
      <FinancialReportTemplate data={financialData} />
      <SalesReportTemplate data={salesData} period="daily" />
    </div>
  );
}
```

### With Data Fetching

```typescript
import { useEffect, useState } from 'react';
import { BarChart } from '@/components/charts';

export function StoreSalesChart() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStoreSales().then(data => {
      setData(data);
      setLoading(false);
    });
  }, []);

  if (loading) return <div>Loading...</div>;
  
  return (
    <BarChart
      data={data}
      dataKey="sales"
      xAxisKey="storeName"
      title="Store Sales Comparison"
    />
  );
}
```

### Custom Formatting

```typescript
<LineChart
  data={trendData}
  dataKey="profit"
  xAxisKey="date"
  title="Profit Trend"
  tooltipFormatter={(value) => `Rp ${(value/1000000).toFixed(1)}M`}
  yAxisFormatter={(value) => `${(value/1000).toFixed(0)}K`}
  xAxisFormatter={(date) => new Date(date).toLocaleDateString('id-ID')}
/>
```

---

## Troubleshooting

### Chart not displaying

1. Verify data array is not empty
2. Confirm `dataKey` and `xAxisKey` match data properties
3. Check responsive container parent has width defined

### Colors not showing

1. Verify `colors` array length matches number of data keys
2. Check color hex values are valid
3. For dark mode, ensure colors have sufficient contrast

### Responsive not working

1. Set `responsive={true}` (default)
2. Ensure parent container has defined width
3. Check CSS doesn't have conflicting dimensions

---

## Support

For issues or feature requests, refer to the main Vapestore POS documentation.
