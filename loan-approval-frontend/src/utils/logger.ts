export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4,
}

export enum LogType {
  FRONTEND = 'frontend',
  ERROR = 'error',
  API = 'api',
  AUTHENTICATION = 'authentication',
  PERFORMANCE = 'performance',
}

const LOG_LEVEL_MAP: Record<string, LogLevel> = {
  debug: LogLevel.DEBUG,
  info: LogLevel.INFO,
  warn: LogLevel.WARN,
  error: LogLevel.ERROR,
  fatal: LogLevel.FATAL,
};

const currentLevel: LogLevel =
  LOG_LEVEL_MAP[(import.meta.env.VITE_LOG_LEVEL || 'info').toLowerCase()] || LogLevel.INFO;

const logEndpoint = import.meta.env.VITE_LOG_ENDPOINT || '';

function getTimestamp(): string {
  const d = new Date();
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  const s = String(d.getSeconds()).padStart(2, '0');
  return `${y}-${mo}-${dd} ${h}:${mi}:${s}`;
}

function maskSensitiveData(message: string): string {
  let masked = message;
  masked = masked.replace(/(password|passwd|pwd|secret)(["'\s:=]+)[^\s,;}]+/gi, '$1$2***');
  masked = masked.replace(/(token|jwt|api[_-]?key|apikey)(["'\s:=]+)[^\s,;}]+/gi, '$1$2***');
  masked = masked.replace(/(Authorization:\s*Bearer\s+)[^\s,;"]+/gi, '$1***');
  return masked;
}

function formatLog(
  level: string,
  type: string,
  message: string,
  meta?: Record<string, any>
): { text: string; data: Record<string, any> } {
  const timestamp = getTimestamp();
  const maskedMsg = maskSensitiveData(message);

  let text = `[${timestamp}]\nLEVEL: ${level}\nTYPE: ${type}\n`;
  if (meta?.file) text += `FILE: ${meta.file}\n`;
  if (meta?.function) text += `FUNCTION: ${meta.function}()\n`;
  if (meta?.line) text += `LINE: ${meta.line}\n`;
  if (meta?.requestId) text += `REQUEST_ID: ${meta.requestId}\n`;
  if (meta?.userId) text += `USER_ID: ${meta.userId}\n`;
  if (meta?.url) text += `URL: ${meta.url}\n`;
  if (meta?.stack) text += `STACK: ${meta.stack}\n`;
  if (meta?.sessionId) text += `SESSION_ID: ${meta.sessionId}\n`;
  text += `MESSAGE: ${maskedMsg}\n`;

  return { text, data: { timestamp, level, type, message: maskedMsg, ...meta } };
}

class Logger {
  private type: LogType;

  constructor(type: LogType) {
    this.type = type;
  }

  private log(
    level: string,
    logLevel: LogLevel,
    message: string,
    meta?: Record<string, any>
  ): void {
    if (logLevel < currentLevel) return;

    const { text, data } = formatLog(level, this.type, message, meta);

    switch (logLevel) {
      case LogLevel.ERROR:
      case LogLevel.FATAL:
        console.error(text);
        break;
      case LogLevel.WARN:
        console.warn(text);
        break;
      default:
        console.log(text);
    }

    if (logEndpoint && logLevel >= LogLevel.ERROR) {
      fetch(logEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).catch(() => {});
    }
  }

  debug(message: string, meta?: Record<string, any>): void {
    this.log('DEBUG', LogLevel.DEBUG, message, meta);
  }

  info(message: string, meta?: Record<string, any>): void {
    this.log('INFO', LogLevel.INFO, message, meta);
  }

  warn(message: string, meta?: Record<string, any>): void {
    this.log('WARN', LogLevel.WARN, message, meta);
  }

  error(message: string, meta?: Record<string, any>): void {
    this.log('ERROR', LogLevel.ERROR, message, meta);
  }

  fatal(message: string, meta?: Record<string, any>): void {
    this.log('FATAL', LogLevel.FATAL, message, meta);
  }

  performance(name: string, durationMs: number, meta?: Record<string, any>): void {
    this.log('INFO', LogLevel.INFO, `PERF: ${name} = ${durationMs}ms`, {
      ...meta,
      type: 'performance',
      durationMs,
    });
  }
}

export const logger = new Logger(LogType.FRONTEND);
export const apiLogger = new Logger(LogType.API);
export const authLogger = new Logger(LogType.AUTHENTICATION);
export const errorLogger = new Logger(LogType.ERROR);
export const perfLogger = new Logger(LogType.PERFORMANCE);
