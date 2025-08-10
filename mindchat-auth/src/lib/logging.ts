import type { ErrorCode, LogLevel, LogEntry, EventCategory } from './loggingConstants';
import { getEventCategory, getLogLevel } from './loggingConstants';

/**
 * Logger configuration interface
 */
type LoggerConfig = {
  isDevelopment: boolean;
  minLogLevel: LogLevel;
  enableConsoleOutput: boolean;
  enableJsonFormat: boolean;
  enableColors: boolean;
};

/**
 * ANSI color codes for console output
 */
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  green: '\x1b[32m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
} as const;

/**
 * Logger class for structured authentication logging
 */
class AuthLogger {
  private config: LoggerConfig;

  constructor(config?: Partial<LoggerConfig>) {
    this.config = {
      isDevelopment: import.meta.env.DEV || false,
      minLogLevel: import.meta.env.DEV ? 0 : 1, // DEBUG in dev, INFO in prod
      enableConsoleOutput: true,
      enableJsonFormat: !import.meta.env.DEV, // JSON in prod, pretty in dev
      enableColors: import.meta.env.DEV || false,
      ...config,
    };
  }

  /**
   * Creates a log entry with consistent structure
   */
  private createLogEntry(
    code: ErrorCode,
    message: string,
    context: LogEntry['context'] = {},
    metadata?: Record<string, unknown>,
    error?: Error
  ): LogEntry {
    const timestamp = new Date().toISOString();
    const level = getLogLevel(code);
    
    const logEntry: LogEntry = {
      timestamp,
      level,
      code,
      message,
      context: {
        requestId: this.generateRequestId(),
        ...context,
      },
      metadata,
    };

    if (error) {
      logEntry.error = {
        name: error.name,
        message: error.message,
        stack: this.config.isDevelopment ? error.stack : undefined,
      };
    }

    return logEntry;
  }

  /**
   * Generates a unique request ID for tracing
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  /**
   * Gets color for log level
   */
  private getColorForLevel(level: LogLevel): string {
    if (!this.config.enableColors) return '';
    
    switch (level) {
      case 0: return colors.gray;    // DEBUG
      case 1: return colors.blue;    // INFO
      case 2: return colors.yellow;  // WARN
      case 3: return colors.red;     // ERROR
      case 4: return colors.magenta; // CRITICAL
      default: return colors.reset;
    }
  }

  /**
   * Gets log level name
   */
  private getLevelName(level: LogLevel): string {
    const names = ['DEBUG', 'INFO', 'WARN', 'ERROR', 'CRITICAL'];
    return names[level] || 'UNKNOWN';
  }

  /**
   * Formats log entry for console output
   */
  private formatForConsole(entry: LogEntry): string {
    const color = this.getColorForLevel(entry.level);
    const reset = this.config.enableColors ? colors.reset : '';
    const levelName = this.getLevelName(entry.level).padEnd(8);
    const category = getEventCategory(entry.code).toUpperCase().padEnd(10);
    
    if (this.config.enableJsonFormat) {
      return JSON.stringify(entry, null, 2);
    }

    // Pretty format for development
    const parts = [
      `${color}[${entry.timestamp}]${reset}`,
      `${color}${levelName}${reset}`,
      `${colors.cyan}${category}${reset}`,
      `${colors.gray}[${entry.code}]${reset}`,
      entry.message,
    ];

    if (entry.context.ip) {
      parts.push(`${colors.gray}(${entry.context.ip})${reset}`);
    }

    if (entry.error) {
      parts.push(`\n${color}Error: ${entry.error.message}${reset}`);
      if (entry.error.stack && this.config.isDevelopment) {
        parts.push(`\n${colors.gray}${entry.error.stack}${reset}`);
      }
    }

    if (entry.metadata && Object.keys(entry.metadata).length > 0) {
      parts.push(`\n${colors.gray}Metadata: ${JSON.stringify(entry.metadata, null, 2)}${reset}`);
    }

    return parts.join(' ');
  }

  /**
   * Outputs log entry based on configuration
   */
  private output(entry: LogEntry): void {
    if (entry.level < this.config.minLogLevel) {
      return; // Skip logs below minimum level
    }

    if (this.config.enableConsoleOutput) {
      const formatted = this.formatForConsole(entry);
      
      // Use appropriate console method based on level
      switch (entry.level) {
        case 0: // DEBUG
          console.debug(formatted);
          break;
        case 1: // INFO
          console.info(formatted);
          break;
        case 2: // WARN
          console.warn(formatted);
          break;
        case 3: // ERROR
        case 4: // CRITICAL
          console.error(formatted);
          break;
        default:
          console.log(formatted);
      }
    }

    // In production, you could add additional outputs here:
    // - File logging
    // - External logging service
    // - Database logging
    // - Webhook notifications for critical errors
  }

  /**
   * Extracts context from request object
   */
  private extractRequestContext(request?: Request): LogEntry['context'] {
    if (!request) return {};

    try {
      const url = new URL(request.url);
      return {
        method: request.method,
        url: url.pathname,
        ip: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
            request.headers.get('x-real-ip') ||
            request.headers.get('cf-connecting-ip') ||
            'unknown',
        userAgent: request.headers.get('user-agent') || undefined,
      };
    } catch {
      return {
        method: request.method,
        ip: 'unknown',
      };
    }
  }

  /**
   * Logs an authentication event
   */
  log(
    code: ErrorCode,
    message: string,
    context?: LogEntry['context'],
    metadata?: Record<string, unknown>
  ): void {
    const entry = this.createLogEntry(code, message, context, metadata);
    this.output(entry);
  }

  /**
   * Logs an error with full error details
   */
  logError(
    code: ErrorCode,
    message: string,
    error: Error,
    context?: LogEntry['context'],
    metadata?: Record<string, unknown>
  ): void {
    const entry = this.createLogEntry(code, message, context, metadata, error);
    this.output(entry);
  }

  /**
   * Logs a request-based event (extracts context from request)
   */
  logRequest(
    code: ErrorCode,
    message: string,
    request: Request,
    additionalContext?: Partial<LogEntry['context']>,
    metadata?: Record<string, unknown>
  ): void {
    const requestContext = this.extractRequestContext(request);
    const context = { ...requestContext, ...additionalContext };
    this.log(code, message, context, metadata);
  }

  /**
   * Logs a request-based error
   */
  logRequestError(
    code: ErrorCode,
    message: string,
    error: Error,
    request: Request,
    additionalContext?: Partial<LogEntry['context']>,
    metadata?: Record<string, unknown>
  ): void {
    const requestContext = this.extractRequestContext(request);
    const context = { ...requestContext, ...additionalContext };
    this.logError(code, message, error, context, metadata);
  }

  /**
   * Creates a child logger with additional context
   */
  child(additionalContext: Partial<LogEntry['context']>): AuthLogger {
    const childLogger = new AuthLogger(this.config);
    
    // Override the log methods to include additional context
    const originalLog = childLogger.log.bind(childLogger);
    const originalLogError = childLogger.logError.bind(childLogger);
    
    childLogger.log = (code, message, context = {}, metadata) => {
      originalLog(code, message, { ...additionalContext, ...context }, metadata);
    };
    
    childLogger.logError = (code, message, error, context = {}, metadata) => {
      originalLogError(code, message, error, { ...additionalContext, ...context }, metadata);
    };
    
    return childLogger;
  }

  /**
   * Updates logger configuration
   */
  configure(newConfig: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}

/**
 * Default logger instance
 */
export const logger = new AuthLogger();

/**
 * Creates a logger instance for a specific request
 */
export const createRequestLogger = (request: Request): AuthLogger => {
  const requestContext = {
    method: request.method,
    url: new URL(request.url).pathname,
    ip: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
        request.headers.get('x-real-ip') ||
        request.headers.get('cf-connecting-ip') ||
        'unknown',
    userAgent: request.headers.get('user-agent') || undefined,
  };
  
  return logger.child(requestContext);
};

/**
 * Creates a logger instance for a specific user
 */
export const createUserLogger = (userId: string, email?: string): AuthLogger => {
  return logger.child({ userId, email });
};

/**
 * Performance measurement utility
 */
export const measurePerformance = <T>(
  operation: string,
  fn: () => T | Promise<T>
): T | Promise<T> => {
  const start = performance.now();
  
  try {
    const result = fn();
    
    if (result instanceof Promise) {
      return result.finally(() => {
        const duration = performance.now() - start;
        logger.log(
          1008, // Using session refresh success as a performance event
          `Performance: ${operation} completed`,
          {},
          { operation, duration: `${duration.toFixed(2)}ms` }
        );
      });
    } else {
      const duration = performance.now() - start;
      logger.log(
        1008,
        `Performance: ${operation} completed`,
        {},
        { operation, duration: `${duration.toFixed(2)}ms` }
      );
      return result;
    }
  } catch (error) {
    const duration = performance.now() - start;
    logger.logError(
      5002, // Internal server error
      `Performance: ${operation} failed`,
      error as Error,
      {},
      { operation, duration: `${duration.toFixed(2)}ms` }
    );
    throw error;
  }
};

/**
 * Export types and constants for external use
 */
export type { LoggerConfig, LogEntry };
export { AuthLogger };
