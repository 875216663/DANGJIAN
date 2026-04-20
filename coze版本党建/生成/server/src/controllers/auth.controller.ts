import type { Request, Response } from 'express';
import { sendSuccess } from '../utils/api-response';
import * as authService from '../services/auth.service';
import type { AuthenticatedRequest } from '../middlewares/auth.middleware';

// 返回所有可登录用户，供前端登录页或用户选择器使用。
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

// 返回演示账号列表，便于测试环境快速登录。
export async function getDemoAccounts(_req: Request, res: Response) {
  const result = await authService.listDemoAccounts();
  return sendSuccess(res, result.accounts, '获取演示账号成功', 200, {
    storage: result.storage,
  });
}

// 登录成功后签发 token，并把前端需要的用户信息一起返回。
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

// 根据鉴权中间件解析出的用户上下文，返回当前会话信息。
export async function getSession(req: AuthenticatedRequest, res: Response) {
  const payload = await authService.getSession(req.auth!);
  return sendSuccess(res, payload, '获取当前会话成功');
}
