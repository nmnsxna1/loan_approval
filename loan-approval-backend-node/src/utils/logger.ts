const LOG_PREFIX = '[Loan-App]';

export function info(message: string, ...args: any[]) {
  console.log(`${LOG_PREFIX} INFO: ${message}`, ...args);
}

export function warn(message: string, ...args: any[]) {
  console.warn(`${LOG_PREFIX} WARN: ${message}`, ...args);
}

export function error(message: string, ...args: any[]) {
  console.error(`${LOG_PREFIX} ERROR: ${message}`, ...args);
}
