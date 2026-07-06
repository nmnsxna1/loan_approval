import * as fs from 'fs';
import * as path from 'path';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4,
}

export enum LogType {
  BACKEND = 'backend',
  FRONTEND = 'frontend',
  ERROR = 'error',
  API = 'api',
  DATABASE = 'database',
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

const currentLevel: LogLevel = LOG_LEVEL_MAP[(process.env.LOG_LEVEL || 'info').toLowerCase()] || LogLevel.INFO;

const logDir = path.resolve(
  process.env.LOG_PATH || path.join(__dirname, '..', '..', '..', 'logs')
);

if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

function getDateString(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getLogFilePath(logType: string): string {
  return path.join(logDir, `${getDateString()}-${logType}.log`);
}

function getCallerInfo(): { file: string; function: string; line: number } | null {
  const err = new Error();
  const stack = err.stack;
  if (!stack) return null;
  const lines = stack.split('\n');
  for (let i = 3; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.includes('logger.ts')) continue;
    const match = line.match(/at\s+(?:(.+?)\s+)?\(?(.+?):(\d+):(\d+)\)?/);
    if (match && !match[2].includes('logger.ts')) {
      return {
        function: match[1] || '<anonymous>',
        file: match[2].replace(/\\/g, '/').split('/').slice(-3).join('/'),
        line: parseInt(match[3]),
      };
    }
  }
  return null;
}

function maskSensitiveData(message: string): string {
  let masked = message;
  masked = masked.replace(/(password|passwd|pwd|secret)(["'\s:=]+)[^\s,;}]+/gi, '$1$2***');
  masked = masked.replace(/(token|jwt|api[_-]?key|apikey)(["'\s:=]+)[^\s,;}]+/gi, '$1$2***');
  masked = masked.replace(/(Authorization:\s*Bearer\s+)[^\s,;"]+/gi, '$1***');
  return masked;
}

function writeToFile(logType: string, content: string, sync: boolean = false): void {
  const filePath = getLogFilePath(logType);
  if (sync) {
    fs.appendFileSync(filePath, content, 'utf-8');
  } else {
    fs.appendFile(filePath, content, 'utf-8', () => {});
  }
}

function formatLog(
  level: string,
  type: string,
  message: string,
  meta?: Record<string, any>
): string {
  const ts = new Date();
  const timestamp =
    `${ts.getFullYear()}-${String(ts.getMonth() + 1).padStart(2, '0')}-${String(ts.getDate()).padStart(2, '0')} ` +
    `${String(ts.getHours()).padStart(2, '0')}:${String(ts.getMinutes()).padStart(2, '0')}:${String(ts.getSeconds()).padStart(2, '0')}`;

  let entry = `[${timestamp}]\nLEVEL: ${level}\nTYPE: ${type}\n`;

  if (meta?.file) {
    entry += `FILE: ${meta.file}\n`;
  } else {
    const caller = getCallerInfo();
    if (caller) {
      entry += `FILE: ${caller.file}\n`;
      if (caller.function !== '<anonymous>') entry += `FUNCTION: ${caller.function}()\n`;
      entry += `LINE: ${caller.line}\n`;
    }
  }
  if (!meta?.file && meta?.function) entry += `FUNCTION: ${meta.function}()\n`;
  if (meta?.requestId) entry += `REQUEST_ID: ${meta.requestId}\n`;
  if (meta?.userId) entry += `USER_ID: ${meta.userId}\n`;
  if (meta?.url) entry += `URL: ${meta.url}\n`;
  if (meta?.stack) entry += `STACK: ${meta.stack}\n`;
  if (meta?.sessionId) entry += `SESSION_ID: ${meta.sessionId}\n`;

  entry += `MESSAGE: ${maskSensitiveData(message)}\n\n`;
  return entry;
}

class Logger {
  private type: LogType;

  constructor(type: LogType) {
    this.type = type;
  }

  private log(level: string, logLevel: LogLevel, message: string, meta?: Record<string, any>): void {
    if (logLevel < currentLevel) return;

    const entry = formatLog(level, this.type, message, meta);

    switch (logLevel) {
      case LogLevel.ERROR:
      case LogLevel.FATAL:
        console.error(entry);
        break;
      case LogLevel.WARN:
        console.warn(entry);
        break;
      default:
        console.log(entry);
    }

    const isError = logLevel >= LogLevel.ERROR;
    writeToFile(this.type, entry, isError);
    if (isError && this.type !== LogType.ERROR) {
      writeToFile(LogType.ERROR, entry, true);
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
}

export const backendLogger = new Logger(LogType.BACKEND);
export const apiLogger = new Logger(LogType.API);
export const dbLogger = new Logger(LogType.DATABASE);
export const authLogger = new Logger(LogType.AUTHENTICATION);
export const errorLogger = new Logger(LogType.ERROR);
export const perfLogger = new Logger(LogType.PERFORMANCE);

export function info(message: string, ...args: any[]): void {
  backendLogger.info(message, args.length > 0 ? { extra: args } : undefined);
}
export function warn(message: string, ...args: any[]): void {
  backendLogger.warn(message, args.length > 0 ? { extra: args } : undefined);
}
export function error(message: string, ...args: any[]): void {
  backendLogger.error(message, args.length > 0 ? { extra: args } : undefined);
}
