import type { Response } from 'express';

export interface ApiMeta {
  [key: string]: unknown;
}

export function sendSuccess<T>(
  res: Response,
  data: T,
  message = 'OK',
  statusCode = 200,
  meta?: ApiMeta
) {
  return res.status(statusCode).json({
    code: 0,
    message,
    data,
    ...(meta ? { meta } : {}),
  });
}

export function sendError(
  res: Response,
  statusCode: number,
  message: string,
  details?: unknown,
  code?: number | string
) {
  return res.status(statusCode).json({
    code: code ?? statusCode,
    message,
    data: null,
    ...(details !== undefined ? { details } : {}),
  });
}
