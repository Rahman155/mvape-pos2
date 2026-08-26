import React, { useMemo } from 'react';
import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { useTheme } from '@/contexts/ThemeContext';

export interface LineChartProps {
  data: Array<Record<string, any>>;
  dataKey: string | string[];
  xAxisKey: string;
  title?: string;
  subtitle?: string;
  height?: number;
  colors?: string[];
  showGrid?: boolean;
  showLegend?: boolean;
  showDots?: boolean;
  strokeWidth?: number;
  responsive?: boolean;
  tooltipFormatter?: (value: any) => string;
  xAxisFormatter?: (value: any) => string;
  yAxisFormatter?: (value: any) => string;
  margin?: { top: number; right: number; bottom: number; left: number };
}

/**
 * Reusable Line Chart component using Recharts
 * Ideal for displaying trends over time with multiple data series
 * Supports responsive design and dark mode
 */
export const LineChart: React.FC<LineChartProps> = ({
  data,
  dataKey,
  xAxisKey,
  title,
  subtitle,
  height = 400,
  colors,
  showGrid = true,
  showLegend = true,
  showDots = true,
  strokeWidth = 2,
  responsive = true,
  tooltipFormatter,
  xAxisFormatter,
  yAxisFormatter,
  margin = { top: 20, right: 30, bottom: 20, left: 60 },
}) => {
  const { isDark } = useTheme();

  // Default color scheme
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
          <RechartsLineChart data={data} margin={margin}>
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
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                stroke={defaultColors[index % defaultColors.length]}
                strokeWidth={strokeWidth}
                dot={showDots}
                activeDot={{ r: 6 }}
                isAnimationActive={true}
              />
            ))}
          </RechartsLineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default LineChart;
