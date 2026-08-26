# Data Visualization Components

Production-ready chart components for the Vapestore POS system, built with Recharts and featuring comprehensive support for financial and sales reporting.

## Quick Start

### Installation

Components are already bundled with the project. Import them directly:

```typescript
import { BarChart, LineChart, PieChart } from '@/components/charts';
import { FinancialReportTemplate, SalesReportTemplate } from '@/components/charts';
```

### Basic Usage

```typescript
// Simple Bar Chart
<BarChart
  data={[
    { store: 'Store A', sales: 50000 },
    { store: 'Store B', sales: 75000 },
  ]}
  dataKey="sales"
  xAxisKey="store"
  title="Store Sales"
/>

// Line Chart with Trend
<LineChart
  data={dailyData}
  dataKey="revenue"
  xAxisKey="date"
  title="Revenue Trend"
  tooltipFormatter={currencyFormatter}
/>

// Pie Chart Distribution
<PieChart
  data={[
    { name: 'Cash', value: 50000 },
    { name: 'Member', value: 30000 },
  ]}
  title="Payment Methods"
/>
```

## Components

### BarChart
- **Use case**: Compare values across categories
- **Examples**: Store comparison, monthly revenue, inventory levels
- **Features**: Single/multiple series, stacked mode, responsive

### LineChart
- **Use case**: Show trends over time
- **Examples**: Daily/weekly/monthly trends, profit progression
- **Features**: Multiple series, smooth curves, dot indicators

### PieChart
- **Use case**: Show distribution and proportions
- **Examples**: Payment methods, top products, store contribution
- **Features**: Pie and donut modes, percentage labels, custom colors

### FinancialReportTemplate
- **Use case**: Complete financial reporting dashboard
- **Includes**: Summary cards, revenue/profit charts, expense breakdown
- **Data required**: Monthly revenue, expenses, daily trends, summary

### SalesReportTemplate
- **Use case**: Sales performance analysis
- **Includes**: Store comparison, daily trends, payment breakdown, top products
- **Data required**: Store performance, daily data, payment methods, top items

## Features

✅ **Dark Mode Support** - Automatic adaptation to light/dark theme
✅ **Responsive Design** - Mobile, tablet, desktop optimization
✅ **Localization** - Indonesian currency (Rp) and date formatting
✅ **Accessibility** - ARIA labels, keyboard navigation, high contrast
✅ **TypeScript** - Full type safety with comprehensive interfaces
✅ **Customizable** - Colors, formatting, margins, dimensions
✅ **Performance** - Optimized rendering, memoization, efficient updates

## Configuration

### Color Schemes

```typescript
import { ChartColorSchemes } from '@/components/charts';

// Primary (default)
colors={ChartColorSchemes.primary.light}

// Pastel
colors={ChartColorSchemes.pastel.dark}

// Vibrant
colors={ChartColorSchemes.vibrant.light}

// Professional
colors={ChartColorSchemes.professional.dark}
```

### Formatting

```typescript
import { 
  currencyFormatter, 
  compactNumberFormatter,
  percentageFormatter 
} from '@/components/charts';

// Currency: "Rp 1.500.000"
tooltipFormatter={currencyFormatter}

// Compact: "1.5M" or "5K"
tooltipFormatter={compactNumberFormatter}

// Percentage: "25.5%"
tooltipFormatter={(v) => percentageFormatter(v, 1)}
```

### Margins & Sizing

```typescript
import { MarginPresets } from '@/components/charts';

// Pre-defined margins
margin={MarginPresets.default}      // { top: 20, right: 30, bottom: 20, left: 60 }
margin={MarginPresets.spacious}    // { top: 40, right: 50, bottom: 40, left: 80 }
margin={MarginPresets.compact}     // { top: 10, right: 20, bottom: 10, left: 40 }

// Or custom
margin={{ top: 20, right: 30, bottom: 20, left: 60 }}
```

## Common Use Cases

### Financial Dashboard
```typescript
<FinancialReportTemplate
  data={financialData}
  title="Financial Report - January 2024"
  period="monthly"
/>
```

### Daily Sales Report
```typescript
<SalesReportTemplate
  data={salesData}
  period="daily"
  title="Daily Sales Report"
  showTopProducts={true}
/>
```

### Store Comparison
```typescript
<BarChart
  data={storeData}
  dataKey={['revenue', 'profit']}
  xAxisKey="storeName"
  title="Store Performance"
  colors={['#3B82F6', '#10B981']}
/>
```

### Revenue Trend
```typescript
<LineChart
  data={trendData}
  dataKey="revenue"
  xAxisKey="date"
  title="30-Day Revenue Trend"
  strokeWidth={3}
  tooltipFormatter={currencyFormatter}
/>
```

### Product Distribution
```typescript
<PieChart
  data={topProducts}
  title="Top 5 Products"
  colors={['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6']}
  tooltipFormatter={currencyFormatter}
/>
```

## Integration with Data Fetching

```typescript
import { useEffect, useState } from 'react';
import { BarChart } from '@/components/charts';
import { api } from '@/services/api';

export function SalesChartWidget() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get('/reports/daily-sales')
      .then(response => {
        setData(response.data);
        setLoading(false);
      })
      .catch(err => {
        setError(err);
        setLoading(false);
      });
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error loading chart</div>;
  
  return (
    <BarChart
      data={data}
      dataKey="sales"
      xAxisKey="store"
      title="Daily Sales by Store"
    />
  );
}
```

## Responsive Behavior

Components automatically adjust based on container width:

| Width | Height | Device |
|-------|--------|--------|
| < 640px | 300px | Mobile |
| 640-1024px | 350px | Tablet |
| 1024-1280px | 400px | Desktop |
| > 1280px | 500px | Large Desktop |

Override with `height` prop:
```typescript
<BarChart data={data} dataKey="sales" xAxisKey="date" height={600} />
```

## Dark Mode

Automatic theme adaptation through `ThemeContext`:

```typescript
// Light mode colors
isDark={false} → Blues, Greens, Warm colors

// Dark mode colors  
isDark={true} → Lighter shades for visibility
```

Customize colors for specific theme:
```typescript
const colors = isDark 
  ? ['#60A5FA', '#4ADE80']  // Dark mode
  : ['#3B82F6', '#10B981']; // Light mode

<BarChart data={data} dataKey="sales" xAxisKey="date" colors={colors} />
```

## Performance Tips

1. **Pre-aggregate data**: Provide summarized data instead of raw transactions
2. **Limit data points**: Ideally < 100 points per chart
3. **Memoize data**: Use `useMemo` when deriving chart data
4. **Lazy load**: Load charts below the fold with intersection observer
5. **Sampling**: For large datasets, sample data points intelligently

```typescript
// Good: Pre-aggregated data
const chartData = salesByStore.map(store => ({
  storeName: store.name,
  totalSales: store.revenue,
}));

// Avoid: Raw transaction-level data
const chartData = allTransactions; // Too many points
```

## Testing

```typescript
import { render, screen } from '@testing-library/react';
import { BarChart } from '@/components/charts';

describe('BarChart', () => {
  it('should render title', () => {
    render(
      <BarChart
        data={[{ x: 'A', y: 10 }]}
        dataKey="y"
        xAxisKey="x"
        title="Test Chart"
      />
    );
    expect(screen.getByText('Test Chart')).toBeInTheDocument();
  });

  it('should display empty state with no data', () => {
    render(
      <BarChart
        data={[]}
        dataKey="y"
        xAxisKey="x"
      />
    );
    expect(screen.getByText('No data available')).toBeInTheDocument();
  });
});
```

## Accessibility

Charts include:
- Semantic HTML structure
- ARIA labels on interactive elements
- Keyboard navigation support
- High contrast ratios in dark mode
- Color-blind friendly palettes
- Tooltip support for screen readers

## Browser Support

- Chrome/Edge: Latest
- Firefox: Latest
- Safari: Latest
- Mobile browsers: iOS Safari 12+, Chrome Android

## Examples

See `examples.tsx` for 10+ practical examples including:
- Daily sales overview
- Revenue trends
- Payment method distribution
- Inventory status
- Kasir performance
- Complete financial and sales reports

## API Reference

### BarChart Props
| Prop | Type | Default |
|------|------|---------|
| data | Array | Required |
| dataKey | string \| string[] | Required |
| xAxisKey | string | Required |
| title | string | - |
| height | number | 400 |
| colors | string[] | Default palette |
| showLegend | boolean | true |
| stacked | boolean | false |
| tooltipFormatter | Function | - |

### LineChart Props
| Prop | Type | Default |
|------|------|---------|
| data | Array | Required |
| dataKey | string \| string[] | Required |
| xAxisKey | string | Required |
| strokeWidth | number | 2 |
| showDots | boolean | true |
| (others) | - | Same as BarChart |

### PieChart Props
| Prop | Type | Default |
|------|------|---------|
| data | Array | Required |
| innerRadius | number | - |
| outerRadius | number | 120 |
| showLabels | boolean | true |
| (others) | - | Common chart props |

## Troubleshooting

**Chart not visible**
- Check data array is not empty
- Verify dataKey and xAxisKey exist in data
- Ensure parent has defined width

**Colors look wrong**
- Check color hex values are valid
- Verify colors array length matches data series
- Check dark mode contrast

**Responsive not working**
- Set `responsive={true}` (default)
- Ensure parent container has width
- Check for CSS conflicts

## Support & Documentation

- Full documentation: See `CHARTS_DOCUMENTATION.md`
- Examples: See `examples.tsx`
- Tests: See `__tests__/` directory
- Integration guide: Refer to main spec requirements

## Requirements Coverage

✅ Requirement 16: Financial Reports - Complete implementation with FinancialReportTemplate
✅ Requirement 23: Daily Sales Report - Daily sales chart and template
✅ Requirement 24: Weekly Sales Report - Weekly aggregation support
✅ Requirement 25: Monthly Sales Report - Monthly comparison and trends
✅ Responsive design for all devices
✅ Dark mode support throughout
✅ Professional UI with consistent styling
