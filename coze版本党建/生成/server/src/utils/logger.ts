import { env } from '../config/env';

type LogLevel = 'error' | 'warn' | 'info' | 'debug';

const priorities: Record<LogLevel, number> = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

function shouldLog(level: LogLevel) {
  return priorities[level] <= priorities[env.LOG_LEVEL];
}

function write(level: LogLevel, message: string, meta?: unknown) {
  if (!shouldLog(level)) {
    return;
  }

  const prefix = `[${new Date().toISOString()}] [${level.toUpperCase()}]`;
  if (meta === undefined) {
    console[level === 'debug' ? 'log' : level](`${prefix} ${message}`);
    return;
  }

  console[level === 'debug' ? 'log' : level](`${prefix} ${message}`, meta);
}

export const logger = {
  error: (message: string, meta?: unknown) => write('error', message, meta),
  warn: (message: string, meta?: unknown) => write('warn', message, meta),
  info: (message: string, meta?: unknown) => write('info', message, meta),
  debug: (message: string, meta?: unknown) => write('debug', message, meta),
};
