/**
 * YİSA-S Server-side Logging
 * Structured logging utility
 */

type LogLevel = "debug" | "info" | "warn" | "error"

interface LogEntry {
  level: LogLevel
  message: string
  timestamp: string
  context?: Record<string, unknown>
  error?: {
    name: string
    message: string
    stack?: string
  }
}

class Logger {
  private logLevel: LogLevel

  constructor() {
    this.logLevel = (process.env.LOG_LEVEL as LogLevel) || "info"
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ["debug", "info", "warn", "error"]
    return levels.indexOf(level) >= levels.indexOf(this.logLevel)
  }

  private formatLog(level: LogLevel, message: string, context?: Record<string, unknown>, error?: Error): LogEntry {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      context,
    }

    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      }
    }

    return entry
  }

  private writeLog(entry: LogEntry): void {
    if (!this.shouldLog(entry.level)) {
      return
    }

    // Console output (development)
    if (process.env.NODE_ENV === "development") {
      const prefix = `[${entry.level.toUpperCase()}]`
      const contextStr = entry.context ? ` ${JSON.stringify(entry.context)}` : ""
      const errorStr = entry.error ? `\nError: ${entry.error.message}` : ""

      console.log(`${prefix} ${entry.message}${contextStr}${errorStr}`)
    }

    // Production'da structured logging (ileride Sentry, Logtail, vb. entegrasyonu)
    if (process.env.NODE_ENV === "production") {
      // Structured log output (JSON)
      console.log(JSON.stringify(entry))
    }
  }

  debug(message: string, context?: Record<string, unknown>): void {
    this.writeLog(this.formatLog("debug", message, context))
  }

  info(message: string, context?: Record<string, unknown>): void {
    this.writeLog(this.formatLog("info", message, context))
  }

  warn(message: string, context?: Record<string, unknown>): void {
    this.writeLog(this.formatLog("warn", message, context))
  }

  error(message: string, error?: Error, context?: Record<string, unknown>): void {
    this.writeLog(this.formatLog("error", message, context, error))
  }
}

// Singleton instance
export const logger = new Logger()

// Convenience functions
export const log = {
  debug: (message: string, context?: Record<string, unknown>) => logger.debug(message, context),
  info: (message: string, context?: Record<string, unknown>) => logger.info(message, context),
  warn: (message: string, context?: Record<string, unknown>) => logger.warn(message, context),
  error: (message: string, error?: Error, context?: Record<string, unknown>) => logger.error(message, error, context),
}
