/**
 * Formatting utility functions for date, time, currency, and other values
 */

/**
 * Format a date object to a readable display format
 * @param date - The date to format
 * @returns Formatted date string (e.g., "15 Jan 2024")
 */
export function formatDateForDisplay(date: Date): string {
  const options: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  };
  return new Intl.DateTimeFormat('en-US', options).format(date);
}

/**
 * Format a time from a date object
 * @param date - The date object containing the time
 * @returns Formatted time string (e.g., "09:30:45")
 */
export function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

/**
 * Format a date to ISO date string (YYYY-MM-DD)
 * @param date - The date to format
 * @returns ISO date string
 */
export function formatDateToISO(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Format currency value
 * @param amount - The amount to format
 * @param currency - The currency code (default: IDR)
 * @returns Formatted currency string
 */
export function formatCurrency(amount: number, currency: string = 'IDR'): string {
  const formatter = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  return formatter.format(amount);
}

/**
 * Format a number with thousand separators
 * @param number - The number to format
 * @returns Formatted number string
 */
export function formatNumber(number: number): string {
  return new Intl.NumberFormat('en-US').format(number);
}

/**
 * Format percentage value
 * @param value - The value (0-100 or decimal)
 * @param decimals - Number of decimal places (default: 1)
 * @returns Formatted percentage string
 */
export function formatPercent(value: number, decimals: number = 1): string {
  return `${(value).toFixed(decimals)}%`;
}

/**
 * Format duration from minutes
 * @param minutes - Duration in minutes
 * @returns Formatted duration string (e.g., "2h 30m")
 */
export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours === 0) {
    return `${mins}m`;
  }

  if (mins === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${mins}m`;
}

/**
 * Format date range to readable string
 * @param startDate - Start date
 * @param endDate - End date
 * @returns Formatted date range string
 */
export function formatDateRange(startDate: Date, endDate: Date): string {
  const start = formatDateForDisplay(startDate);
  const end = formatDateForDisplay(endDate);
  return `${start} - ${end}`;
}
