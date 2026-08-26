import React, { useMemo } from 'react';
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Legend,
  Tooltip,
  ResponsiveContainer,
  PieChart as PieChartType,
} from 'recharts';
import { useTheme } from '@/contexts/ThemeContext';

export interface PieChartProps {
  data: Array<{ name: string; value: number; [key: string]: any }>;
  dataKey?: string;
  nameKey?: string;
  title?: string;
  subtitle?: string;
  height?: number;
  colors?: string[];
  showLegend?: boolean;
  showLabels?: boolean;
  innerRadius?: number;
  outerRadius?: number;
  responsive?: boolean;
  tooltipFormatter?: (value: any) => string;
  labelFormatter?: (entry: any) => string;
  margin?: { top: number; right: number; bottom: number; left: number };
}

/**
 * Reusable Pie Chart component using Recharts
 * Perfect for showing distribution and breakdown of data
 * Supports donut charts when innerRadius is specified
 * Includes dark mode support and responsive design
 */
export const PieChart: React.FC<PieChartProps> = ({
  data,
  dataKey = 'value',
  nameKey = 'name',
  title,
  subtitle,
  height = 400,
  colors,
  showLegend = true,
  showLabels = true,
  innerRadius,
  outerRadius = 120,
  responsive = true,
  tooltipFormatter,
  labelFormatter,
  margin = { top: 20, right: 20, bottom: 20, left: 20 },
}) => {
  const { isDark } = useTheme();

  // Default color scheme - vibrant colors for pie charts
  const defaultColors = useMemo(() => {
    const baseColors = [
      isDark ? '#3B82F6' : '#2563EB',
      isDark ? '#10B981' : '#059669',
      isDark ? '#F59E0B' : '#D97706',
      isDark ? '#EF4444' : '#DC2626',
      isDark ? '#8B5CF6' : '#7C3AED',
      isDark ? '#06B6D4' : '#0891B2',
      isDark ? '#EC4899' : '#DB2777',
      isDark ? '#14B8A6' : '#0D9488',
    ];
    return colors || baseColors;
  }, [isDark, colors]);

  const textColor = isDark ? '#E5E7EB' : '#1F2937';

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center w-full bg-gray-50 dark:bg-gray-800 rounded-lg p-8">
        <p className="text-gray-500 dark:text-gray-400">No data available</p>
      </div>
    );
  }

  const chartConfig = {
    margin,
    startAngle: 90,
    endAngle: 450,
  };

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
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        <ResponsiveContainer width="100%" height={responsive ? height : '100%'}>
          <RechartsPieChart {...chartConfig}>
            <Pie
              data={data}
              dataKey={dataKey}
              nameKey={nameKey}
              cx="50%"
              cy="50%"
              innerRadius={innerRadius}
              outerRadius={outerRadius}
              label={
                showLabels
                  ? ({ name, value, percent }: any) =>
                      `${name}: ${percent ? (percent * 100).toFixed(0) : 0}%`
                  : false
              }
              isAnimationActive={true}
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={defaultColors[index % defaultColors.length]}
                />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
                border: `1px solid ${isDark ? '#374151' : '#E5E7EB'}`,
                borderRadius: '0.5rem',
                color: textColor,
              }}
              formatter={(value: any) => {
                if (tooltipFormatter) return tooltipFormatter(value);
                return `${value}`;
              }}
              labelStyle={{ color: textColor }}
            />
            {showLegend && (
              <Legend
                wrapperStyle={{ color: textColor }}
                contentStyle={{
                  backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
                  border: `1px solid ${isDark ? '#374151' : '#E5E7EB'}`,
                  borderRadius: '0.5rem',
                  paddingLeft: '0.75rem',
                }}
              />
            )}
          </RechartsPieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default PieChart;
