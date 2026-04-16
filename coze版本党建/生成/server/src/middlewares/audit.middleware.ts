import { appendFile } from 'fs';
import { resolve } from 'path';
import type { NextFunction, Response } from 'express';
import { ensureDirectory } from '../utils/file';
import type { AuthenticatedRequest } from './auth.middleware';

const AUDIT_DIR = resolve(process.cwd(), 'data', 'logs');
const AUDIT_FILE = resolve(AUDIT_DIR, 'audit.log');

function stripSensitiveBody(body: unknown) {
  if (!body || typeof body !== 'object') {
    return body;
  }

  const clone = { ...(body as Record<string, unknown>) };
  if ('password' in clone) {
    clone.password = '***';
  }
  return clone;
}

export function auditMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const originalJson = res.json.bind(res);

  res.json = ((payload: unknown) => {
    try {
      ensureDirectory(AUDIT_DIR);
      appendFile(
        AUDIT_FILE,
        `${JSON.stringify({
          time: new Date().toISOString(),
          method: req.method,
          path: req.originalUrl,
          userId: req.auth?.userId,
          role: req.auth?.role,
          statusCode: res.statusCode,
          query: req.query,
          body: stripSensitiveBody(req.body),
          responseCode:
            payload && typeof payload === 'object' && 'code' in (payload as Record<string, unknown>)
              ? (payload as Record<string, unknown>).code
              : undefined,
        })}\n`,
        'utf8',
        () => undefined
      );
    } catch {
      // 审计失败不影响主流程
    }

    return originalJson(payload);
  }) as typeof res.json;

  next();
}
