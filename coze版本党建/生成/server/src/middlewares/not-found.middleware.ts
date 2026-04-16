import type { Request, Response } from 'express';
import { sendError } from '../utils/api-response';

export function notFoundHandler(req: Request, res: Response) {
  return sendError(res, 404, `接口不存在: ${req.method} ${req.originalUrl}`);
}
