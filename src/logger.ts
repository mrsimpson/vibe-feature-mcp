/**
 * Logging utility for Vibe Feature MCP Server
 *
 * Provides structured logging with proper MCP compliance:
 * - Uses stderr for all local logging (MCP requirement)
 * - Supports MCP log message notifications to client
 * - Provides structured logging with proper levels:
 *   - debug: Tracing and detailed execution flow
 *   - info: Success operations and important milestones
 *   - warn: Expected errors and recoverable issues
 *   - error: Caught but unexpected errors
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export interface LogContext {
  component?: string;
  conversationId?: string;
  phase?: string;
  operation?: string;
  [key: string]: unknown;
}

// Global MCP server reference for log notifications
let mcpServerInstance: McpServer | null = null;

// Test mode detection function to check at runtime
function isTestMode(): boolean {
  // Check explicit environment variables
  if (process.env.NODE_ENV === 'test' || process.env.VITEST === 'true') {
    return true;
  }

  // Check if running in a temporary directory (common for tests)
  const cwd = process.cwd();
  if (cwd.includes('/tmp/') || cwd.includes('temp') || cwd.includes('test-')) {
    return true;
  }

  // Check if LOG_LEVEL is explicitly set to ERROR
  if (process.env.LOG_LEVEL === 'ERROR') {
    return true;
  }

  return false;
}

/**
 * Set the MCP server instance for log notifications
 */
export function setMcpServerForLogging(server: McpServer): void {
  mcpServerInstance = server;
}

class Logger {
  private component: string;
  private explicitLogLevel?: LogLevel;

  constructor(component: string, logLevel?: LogLevel) {
    this.component = component;
    this.explicitLogLevel = logLevel;
  }

  private getCurrentLogLevel(): LogLevel {
    // Force ERROR level in test environments
    if (isTestMode()) {
      return LogLevel.ERROR;
    }

    // Check environment variable
    const envLevel = this.getLogLevelFromEnv();
    if (envLevel !== null) {
      return envLevel;
    }

    // If explicit log level was provided, use it
    if (this.explicitLogLevel !== undefined) {
      return this.explicitLogLevel;
    }

    // Default to INFO
    return LogLevel.INFO;
  }

  private getLogLevelFromEnv(): LogLevel | null {
    const envLevel = process.env.LOG_LEVEL?.toUpperCase();
    switch (envLevel) {
      case 'DEBUG':
        return LogLevel.DEBUG;
      case 'INFO':
        return LogLevel.INFO;
      case 'WARN':
        return LogLevel.WARN;
      case 'ERROR':
        return LogLevel.ERROR;
      default:
        return null;
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.getCurrentLogLevel();
  }

  private formatMessage(
    level: string,
    message: string,
    context?: LogContext
  ): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` ${JSON.stringify(context)}` : '';
    return `[${timestamp}] ${level.toUpperCase()} [${this.component}] ${message}${contextStr}`;
  }

  /**
   * Send log message to MCP client if server is available
   */
  private async sendMcpLogMessage(
    level: 'debug' | 'info' | 'warning' | 'error',
    message: string,
    context?: LogContext
  ): Promise<void> {
    if (mcpServerInstance) {
      try {
        // Safely serialize context to avoid JSON issues
        let logData = message;
        if (context) {
          try {
            const contextStr = JSON.stringify(context, null, 0);
            logData = `${message} ${contextStr}`;
          } catch (_error) {
            // If JSON serialization fails, just use the message
            logData = `${message} [context serialization failed]`;
          }
        }

        await mcpServerInstance.server.notification({
          method: 'notifications/message',
          params: {
            level,
            logger: this.component,
            data: logData,
          },
        });
      } catch (error) {
        // Fallback to stderr if MCP notification fails
        // Don't use this.error to avoid infinite recursion
        if (!isTestMode()) {
          process.stderr.write(
            `[MCP-LOG-ERROR] Failed to send log notification: ${error}\n`
          );
        }
      }
    }
  }

  debug(message: string, context?: LogContext): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      const formattedMessage = this.formatMessage('debug', message, context);
      // Always log to stderr for MCP compliance
      process.stderr.write(formattedMessage + '\n');
      // Also send to MCP client if available (only for debug level)
      this.sendMcpLogMessage('debug', message, context).catch(() => {
        // Ignore MCP notification errors for debug messages
      });
    }
  }

  info(message: string, context?: LogContext): void {
    if (this.shouldLog(LogLevel.INFO)) {
      const formattedMessage = this.formatMessage('info', message, context);
      // Always log to stderr for MCP compliance
      process.stderr.write(formattedMessage + '\n');

      // Send enhanced notifications for important events
      this.sendEnhancedMcpNotification('info', message, context).catch(() => {
        // Ignore MCP notification errors for info messages
      });
    }
  }

  /**
   * Send enhanced MCP notifications with better formatting for important events
   */
  private async sendEnhancedMcpNotification(
    level: 'debug' | 'info' | 'warning' | 'error',
    message: string,
    context?: LogContext
  ): Promise<void> {
    if (mcpServerInstance) {
      try {
        let enhancedMessage = message;
        let notificationLevel = level;

        // Enhance phase transition messages
        if (
          context &&
          (context.from || context.to) &&
          message.includes('transition')
        ) {
          const from = context.from
            ? this.capitalizePhase(context.from as string)
            : '';
          const to = context.to
            ? this.capitalizePhase(context.to as string)
            : '';
          if (from && to) {
            enhancedMessage = `Phase Transition: ${from} → ${to}`;
            notificationLevel = 'info';
          }
        }

        // Enhance initialization messages
        if (message.includes('initialized successfully')) {
          enhancedMessage = '🚀 Vibe Feature MCP Server Ready';
          notificationLevel = 'info';
        }

        // Safely serialize context to avoid JSON issues
        let logData = enhancedMessage;
        if (context) {
          try {
            const contextStr = JSON.stringify(context, null, 0);
            logData = `${enhancedMessage} ${contextStr}`;
          } catch (_error) {
            // If JSON serialization fails, just use the message
            logData = `${enhancedMessage} [context serialization failed]`;
          }
        }

        // Use the underlying server's notification method
        await mcpServerInstance.server.notification({
          method: 'notifications/message',
          params: {
            level: notificationLevel,
            logger: this.component,
            data: logData,
          },
        });
      } catch (error) {
        // Fallback to stderr if MCP notification fails
        // Don't use this.error to avoid infinite recursion
        if (!isTestMode()) {
          process.stderr.write(
            `[MCP-LOG-ERROR] Failed to send log notification: ${error}\n`
          );
        }
      }
    }
  }

  /**
   * Capitalize phase name for display
   */
  private capitalizePhase(phase: string): string {
    return phase
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  warn(message: string, context?: LogContext): void {
    if (this.shouldLog(LogLevel.WARN)) {
      const formattedMessage = this.formatMessage('warn', message, context);
      // Always log to stderr for MCP compliance
      process.stderr.write(formattedMessage + '\n');
      // Also send to MCP client if available
      this.sendEnhancedMcpNotification('warning', message, context).catch(
        () => {
          // Ignore MCP notification errors for warn messages
        }
      );
    }
  }

  error(message: string, error?: Error, context?: LogContext): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      const errorContext = error
        ? { ...context, error: error.message, stack: error.stack }
        : context;
      const formattedMessage = this.formatMessage(
        'error',
        message,
        errorContext
      );
      // Always log to stderr for MCP compliance
      process.stderr.write(formattedMessage + '\n');
      // Also send to MCP client if available
      this.sendEnhancedMcpNotification('error', message, errorContext).catch(
        () => {
          // Ignore MCP notification errors for error messages
        }
      );
    }
  }

  child(childComponent: string): Logger {
    return new Logger(
      `${this.component}:${childComponent}`,
      this.explicitLogLevel
    );
  }
}

// Factory function to create loggers
export function createLogger(component: string, logLevel?: LogLevel): Logger {
  return new Logger(component, logLevel);
}

// Default logger for the main application
export const logger = createLogger('VibeFeatureMCP');
