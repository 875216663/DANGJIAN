import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { isAppError } from '../utils/app-error';
import { logger } from '../utils/logger';
import { sendError } from '../utils/api-response';

export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (error instanceof ZodError) {
    return sendError(
      res,
      400,
      '请求参数校验失败',
      error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      }))
    );
  }

  if (isAppError(error)) {
    return sendError(res, error.statusCode, error.message, error.details, error.code);
  }

  logger.error('Unhandled application error', error);
  return sendError(res, 500, '服务器内部错误');
}
