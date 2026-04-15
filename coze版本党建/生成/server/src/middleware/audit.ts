import type { Request, Response, NextFunction } from 'express';
import { appendFileSync, existsSync, mkdirSync } from 'fs';
import { resolve } from 'path';
import type { AuthRequest } from './auth';

const AUDIT_LOG_DIR = resolve(process.cwd(), 'data', 'logs');
const AUDIT_LOG_FILE = resolve(AUDIT_LOG_DIR, 'audit.log');

export const auditLog = async (req: AuthRequest, res: Response, next: NextFunction) => {
  // 保存原始的 res.json 方法
  const originalJson = res.json.bind(res);

  // 重写 res.json 方法
  res.json = function (data: any) {
    // 异步记录审计日志（不阻塞响应）
    recordAuditLog(req, res.statusCode, data).catch(err => {
      console.error('Failed to record audit log:', err);
    });

    // 调用原始方法
    return originalJson(data);
  };

  next();
};

async function recordAuditLog(req: AuthRequest, statusCode: number, responseData: any) {
  try {
    const action = `${req.method} ${req.route?.path || req.path}`;
    const module = req.path.split('/')[2] || 'unknown'; // /api/v1/members => members

    if (!existsSync(AUDIT_LOG_DIR)) {
      mkdirSync(AUDIT_LOG_DIR, { recursive: true });
    }

    const payload = {
      time: new Date().toISOString(),
      userId: req.userId,
      action,
      module,
      resourceType: req.params.id ? 'id' : null,
      resourceId: req.params.id ? parseInt(req.params.id as string) : null,
      ipAddress:
        (Array.isArray(req.headers['x-forwarded-for'])
          ? req.headers['x-forwarded-for'][0]
          : (req.headers['x-forwarded-for'] as string)) ||
        (Array.isArray(req.headers['x-real-ip'])
          ? req.headers['x-real-ip'][0]
          : (req.headers['x-real-ip'] as string)) ||
        req.ip ||
        '',
      userAgent: Array.isArray(req.headers['user-agent'])
        ? req.headers['user-agent'][0]
        : req.headers['user-agent'],
      requestData: { body: req.body, query: req.query },
      responseData,
      status: statusCode >= 200 && statusCode < 300 ? 'success' : 'failed',
      errorMessage: statusCode >= 400 ? responseData?.error || responseData?.message : null,
    };

    appendFileSync(AUDIT_LOG_FILE, `${JSON.stringify(payload)}\n`, 'utf8');
  } catch (error) {
    console.error('Audit log error:', error);
  }
}
