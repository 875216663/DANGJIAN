export class AppError extends Error {
  statusCode: number;
  code: number | string;
  details?: unknown;

  constructor(statusCode: number, message: string, details?: unknown, code?: number | string) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code ?? statusCode;
    this.details = details;
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}
