import type { Request, Response } from 'express';
import { sendSuccess } from '../utils/api-response';
import * as authService from '../services/auth.service';
import type { AuthenticatedRequest } from '../middlewares/auth.middleware';

export async function getAuthUsers(_req: Request, res: Response) {
  const result = await authService.listUsers();
  return sendSuccess(
    res,
    result.users,
    '获取用户目录成功',
    200,
    {
      defaultUserId: result.defaultUserId,
      storage: result.storage,
    }
  );
}

export async function getDemoAccounts(_req: Request, res: Response) {
  const result = await authService.listDemoAccounts();
  return sendSuccess(res, result.accounts, '获取演示账号成功', 200, {
    storage: result.storage,
  });
}

export async function login(req: Request, res: Response) {
  const payload = await authService.login(req.body.username, req.body.password);
  return sendSuccess(
    res,
    {
      token: payload.token,
      user: payload.user,
      expiresInHours: payload.expiresInHours,
      storage: payload.storage,
    },
    '登录成功'
  );
}

export async function getSession(req: AuthenticatedRequest, res: Response) {
  const payload = await authService.getSession(req.auth!);
  return sendSuccess(res, payload, '获取当前会话成功');
}
