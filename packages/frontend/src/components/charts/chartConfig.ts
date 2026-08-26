/**
 * Chart Configuration Constants and Utilities
 * Provides predefined color schemes, formatting options, and chart configurations
 */

/**
 * Color Schemes for Charts
 */
export const ChartColorSchemes = {
  primary: {
    light: ['#2563EB', '#059669', '#D97706', '#DC2626', '#7C3AED'],
    dark: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'],
  },
  pastel: {
    light: ['#93C5FD', '#86EFAC', '#FCD34D', '#FECACA', '#C084FC'],
    dark: ['#60A5FA', '#4ADE80', '#FBBF24', '#F87171', '#A78BFA'],
  },
  vibrant: {
    light: ['#1E3A8A', '#065F46', '#92400E', '#7F1D1D', '#4C1D95'],
    dark: ['#BFDBFE', '#BBF7D0', '#FDE68A', '#FCA5A5', '#E9D5FF'],
  },
  professional: {
    light: ['#0369A1', '#0D9488', '#7C2D12', '#991B1B', '#5B21B6'],
    dark: ['#0EA5E9', '#14B8A6', '#EA580C', '#F87171', '#A78BFA'],
  },
};

/**
 * Predefined margin configurations for different chart types
 */
export const MarginPresets = {
  default: { top: 20, right: 30, bottom: 20, left: 60 },
  compact: { top: 10, right: 20, bottom: 10, left: 40 },
  spacious: { top: 40, right: 50, bottom: 40, left: 80 },
  minimal: { top: 5, right: 5, bottom: 5, left: 5 },
};

/**
 * Currency Formatter for financial reports
 */
export const currencyFormatter = (value: number, currency: string = 'IDR'): string => {
  const formatted = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);

  return formatted;
};

/**
 * Percentage Formatter
 */
export const percentageFormatter = (value: number, decimals: number = 1): string => {
  return `${value.toFixed(decimals)}%`;
};

/**
 * Compact number formatter (e.g., 1.2K, 1.5M)
 */
export const compactNumberFormatter = (value: number): string => {
  if (value >= 1000000) {
    return (value / 1000000).toFixed(1) + 'M';
  }
  if (value >= 1000) {
    return (value / 1000).toFixed(1) + 'K';
  }
  return value.toString();
};

/**
 * Date Formatter for X-axis
 */
export const dateFormatter = (
  date: string | Date,
  format: 'short' | 'long' = 'short'
): string => {
  const d = typeof date === 'string' ? new Date(date) : date;

  if (format === 'short') {
    return new Intl.DateTimeFormat('id-ID', {
      month: '2-digit',
      day: '2-digit',
    }).format(d);
  }

  return new Intl.DateTimeFormat('id-ID', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(d);
};

/**
 * Time Formatter (HH:MM format)
 */
export const timeFormatter = (value: number): string => {
  const hours = Math.floor(value / 60);
  const minutes = value % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
};

/**
 * Generic Tooltip Formatter Factory
 */
export const createTooltipFormatter = (
  format: 'currency' | 'percentage' | 'number' | 'compact' = 'number',
  currency: string = 'IDR'
) => {
  return (value: number) => {
    switch (format) {
      case 'currency':
        return currencyFormatter(value, currency);
      case 'percentage':
        return percentageFormatter(value);
      case 'compact':
        return compactNumberFormatter(value);
      case 'number':
      default:
        return new Intl.NumberFormat('id-ID').format(value);
    }
  };
};

/**
 * Chart Type Specific Configurations
 */
export const ChartTypeConfigs = {
  financialReport: {
    colors: ChartColorSchemes.professional.light,
    margin: MarginPresets.spacious,
    tooltipFormatter: createTooltipFormatter('currency'),
    yAxisFormatter: createTooltipFormatter('compact'),
  },
  salesReport: {
    colors: ChartColorSchemes.vibrant.light,
    margin: MarginPresets.default,
    tooltipFormatter: createTooltipFormatter('number'),
    yAxisFormatter: createTooltipFormatter('compact'),
  },
  trendReport: {
    colors: ChartColorSchemes.primary.light,
    margin: MarginPresets.spacious,
    tooltipFormatter: createTooltipFormatter('currency'),
    yAxisFormatter: createTooltipFormatter('number'),
  },
  percentageDistribution: {
    colors: ChartColorSchemes.pastel.light,
    tooltipFormatter: createTooltipFormatter('percentage'),
  },
  inventory: {
    colors: ChartColorSchemes.professional.light,
    margin: MarginPresets.default,
    tooltipFormatter: createTooltipFormatter('number'),
    yAxisFormatter: createTooltipFormatter('number'),
  },
};

/**
 * Responsive Height configurations based on device
 */
export const ResponsiveHeights = {
  mobile: 300,
  tablet: 350,
  desktop: 400,
  large: 500,
};

/**
 * Determine responsive height based on width
 */
export const getResponsiveHeight = (width: number = 0): number => {
  if (width < 640) return ResponsiveHeights.mobile;
  if (width < 1024) return ResponsiveHeights.tablet;
  if (width < 1280) return ResponsiveHeights.desktop;
  return ResponsiveHeights.large;
};
