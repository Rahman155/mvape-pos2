import React, { useMemo } from 'react';
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { useTheme } from '@/contexts/ThemeContext';

export interface BarChartProps {
  data: Array<Record<string, any>>;
  dataKey: string | string[];
  xAxisKey: string;
  title?: string;
  subtitle?: string;
  height?: number;
  colors?: string[];
  showGrid?: boolean;
  showLegend?: boolean;
  stacked?: boolean;
  responsive?: boolean;
  tooltipFormatter?: (value: any) => string;
  xAxisFormatter?: (value: any) => string;
  yAxisFormatter?: (value: any) => string;
  margin?: { top: number; right: number; bottom: number; left: number };
}

/**
 * Reusable Bar Chart component using Recharts
 * Supports single and multiple data keys with responsive design
 * Includes dark mode support and customizable formatting
 */
export const BarChart: React.FC<BarChartProps> = ({
  data,
  dataKey,
  xAxisKey,
  title,
  subtitle,
  height = 400,
  colors,
  showGrid = true,
  showLegend = true,
  stacked = false,
  responsive = true,
  tooltipFormatter,
  xAxisFormatter,
  yAxisFormatter,
  margin = { top: 20, right: 30, bottom: 20, left: 60 },
}) => {
  const { isDark } = useTheme();

  // Default color scheme - responsive to dark mode
  const defaultColors = useMemo(() => {
    const baseColors = [
      isDark ? '#3B82F6' : '#2563EB',
      isDark ? '#10B981' : '#059669',
      isDark ? '#F59E0B' : '#D97706',
      isDark ? '#EF4444' : '#DC2626',
      isDark ? '#8B5CF6' : '#7C3AED',
    ];
    return colors || baseColors;
  }, [isDark, colors]);

  const dataKeys = Array.isArray(dataKey) ? dataKey : [dataKey];

  const textColor = isDark ? '#E5E7EB' : '#1F2937';
  const gridColor = isDark ? '#374151' : '#E5E7EB';

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center w-full bg-gray-50 dark:bg-gray-800 rounded-lg p-8">
        <p className="text-gray-500 dark:text-gray-400">No data available</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      {title && (
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {title}
          </h3>
          {subtitle && (
            <p className="text-sm text-gray-600 dark:text-gray-400">{subtitle}</p>
          )}
        </div>
      )}
      <div
        style={{
          width: '100%',
          height: responsive ? 'auto' : height,
        }}
      >
        <ResponsiveContainer width="100%" height={responsive ? height : '100%'}>
          <RechartsBarChart data={data} margin={margin}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />}
            <XAxis
              dataKey={xAxisKey}
              stroke={textColor}
              tick={{ fill: textColor }}
              tickFormatter={xAxisFormatter}
            />
            <YAxis
              stroke={textColor}
              tick={{ fill: textColor }}
              tickFormatter={yAxisFormatter}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
                border: `1px solid ${isDark ? '#374151' : '#E5E7EB'}`,
                borderRadius: '0.5rem',
                color: textColor,
              }}
              formatter={tooltipFormatter}
              labelStyle={{ color: textColor }}
            />
            {showLegend && (
              <Legend
                wrapperStyle={{ color: textColor }}
                contentStyle={{
                  backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
                  border: `1px solid ${isDark ? '#374151' : '#E5E7EB'}`,
                  borderRadius: '0.5rem',
                }}
              />
            )}
            {dataKeys.map((key, index) => (
              <Bar
                key={key}
                dataKey={key}
                fill={defaultColors[index % defaultColors.length]}
                stackId={stacked ? 'stack' : undefined}
                radius={[8, 8, 0, 0]}
              />
            ))}
          </RechartsBarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default BarChart;
