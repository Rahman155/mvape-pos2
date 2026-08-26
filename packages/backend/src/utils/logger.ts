import { config } from '../config/index.js';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  requestId?: string;
  userId?: string;
  [key: string]: unknown;
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: {
    message: string;
    stack?: string;
    code?: string;
  };
  duration?: number;
}

/**
 * Log level priority: debug < info < warn < error
 */
const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

class Logger {
  private minLevel: LogLevel;

  constructor(minLevel: LogLevel = 'info') {
    this.minLevel = minLevel;
  }

  /**
   * Check if a log level should be logged
   */
  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[this.minLevel];
  }

  /**
   * Format log entry as JSON
   */
  private formatLog(entry: LogEntry): string {
    return JSON.stringify(entry);
  }

  /**
   * Format log entry for console output
   */
  private formatConsoleLog(entry: LogEntry): string {
    const { timestamp, level, message, context, error, duration } = entry;
    const parts = [
      `[${timestamp}]`,
      `[${level.toUpperCase()}]`,
      message,
    ];

    if (duration !== undefined) {
      parts.push(`(${duration}ms)`);
    }

    if (context && Object.keys(context).length > 0) {
      parts.push(JSON.stringify(context));
    }

    if (error) {
      parts.push(`Error: ${error.message}`);
      if (error.code) parts.push(`(${error.code})`);
    }

    return parts.join(' ');
  }

  /**
   * Output log
   */
  private output(level: LogLevel, message: string): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
    };

    const output = config.server.isDevelopment
      ? this.formatConsoleLog(entry)
      : this.formatLog(entry);

    // eslint-disable-next-line no-console
    console[level === 'error' ? 'error' : 'log'](output);
  }

  /**
   * Log at debug level
   */
  debug(
    message: string,
    context?: LogContext,
    duration?: number
  ): void {
    if (!this.shouldLog('debug')) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: 'debug',
      message,
      context,
      duration,
    };

    // eslint-disable-next-line no-console
    console.log(
      config.server.isDevelopment
        ? this.formatConsoleLog(entry)
        : this.formatLog(entry)
    );
  }

  /**
   * Log at info level
   */
  info(
    message: string,
    context?: LogContext,
    duration?: number
  ): void {
    if (!this.shouldLog('info')) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: 'info',
      message,
      context,
      duration,
    };

    // eslint-disable-next-line no-console
    console.log(
      config.server.isDevelopment
        ? this.formatConsoleLog(entry)
        : this.formatLog(entry)
    );
  }

  /**
   * Log at warn level
   */
  warn(
    message: string,
    context?: LogContext,
    duration?: number
  ): void {
    if (!this.shouldLog('warn')) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: 'warn',
      message,
      context,
      duration,
    };

    // eslint-disable-next-line no-console
    console.warn(
      config.server.isDevelopment
        ? this.formatConsoleLog(entry)
        : this.formatLog(entry)
    );
  }

  /**
   * Log at error level
   */
  error(
    message: string,
    error?: Error | null,
    context?: LogContext,
    duration?: number
  ): void {
    if (!this.shouldLog('error')) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: 'error',
      message,
      context,
      duration,
      error: error ? {
        message: error.message,
        stack: config.server.isDevelopment ? error.stack : undefined,
        code: (error as any).code,
      } : undefined,
    };

    // eslint-disable-next-line no-console
    console.error(
      config.server.isDevelopment
        ? this.formatConsoleLog(entry)
        : this.formatLog(entry)
    );
  }

  /**
   * Set minimum log level
   */
  setLevel(level: LogLevel): void {
    this.minLevel = level;
  }
}

// Create singleton logger instance
export const logger = new Logger(config.logging.level);
