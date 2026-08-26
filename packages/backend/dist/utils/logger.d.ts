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
declare class Logger {
    private minLevel;
    constructor(minLevel?: LogLevel);
    /**
     * Check if a log level should be logged
     */
    private shouldLog;
    /**
     * Format log entry as JSON
     */
    private formatLog;
    /**
     * Format log entry for console output
     */
    private formatConsoleLog;
    /**
     * Output log
     */
    private output;
    /**
     * Log at debug level
     */
    debug(message: string, context?: LogContext, duration?: number): void;
    /**
     * Log at info level
     */
    info(message: string, context?: LogContext, duration?: number): void;
    /**
     * Log at warn level
     */
    warn(message: string, context?: LogContext, duration?: number): void;
    /**
     * Log at error level
     */
    error(message: string, error?: Error | null, context?: LogContext, duration?: number): void;
    /**
     * Set minimum log level
     */
    setLevel(level: LogLevel): void;
}
export declare const logger: Logger;
export {};
//# sourceMappingURL=logger.d.ts.map