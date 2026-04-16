import type { NextFunction, Request, Response } from 'express';
import { env, isProduction } from '../config/env';
import { USER_DIRECTORY } from '../models/auth.model';
import { AppError } from '../utils/app-error';
import { verifyAuthToken } from '../utils/token';

export interface CurrentUserContext {
  userId: number;
  role: string;
  branchId?: number;
  username?: string;
}

export interface AuthenticatedRequest extends Request {
  auth?: CurrentUserContext;
}

function buildContextFromLegacyHeaders(req: Request): CurrentUserContext | null {
  const userIdRaw = req.headers['x-user-id'];
  if (!userIdRaw) {
    return null;
  }

  const userId = Number(Array.isArray(userIdRaw) ? userIdRaw[0] : userIdRaw);
  if (!Number.isInteger(userId) || userId <= 0) {
    return null;
  }

  const profile = USER_DIRECTORY[userId];
  return {
    userId,
    role: (Array.isArray(req.headers['x-user-role']) ? req.headers['x-user-role'][0] : req.headers['x-user-role']) || profile?.role || 'member',
    branchId: req.headers['x-user-branch-id']
      ? Number(Array.isArray(req.headers['x-user-branch-id']) ? req.headers['x-user-branch-id'][0] : req.headers['x-user-branch-id'])
      : profile?.branch_id,
  };
}

export function authenticate(req: AuthenticatedRequest, _res: Response, next: NextFunction) {
  const authorization = req.headers.authorization;

  if (authorization?.startsWith('Bearer ')) {
    const token = authorization.slice(7).trim();
    const payload = verifyAuthToken(token);

    if (!payload) {
      return next(new AppError(401, '登录状态已失效，请重新登录'));
    }

    if (!USER_DIRECTORY[payload.userId]) {
      return next(new AppError(401, '当前登录用户不存在'));
    }

    req.auth = {
      userId: payload.userId,
      role: payload.role,
      branchId: payload.branchId,
      username: payload.username,
    };
    return next();
  }

  if (!isProduction) {
    const fallbackContext = buildContextFromLegacyHeaders(req);
    if (fallbackContext) {
      req.auth = fallbackContext;
      return next();
    }
  }

  return next(new AppError(401, '未授权访问'));
}

export function requireRoles(...allowedRoles: string[]) {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
    if (!req.auth?.role || !allowedRoles.includes(req.auth.role)) {
      return next(new AppError(403, '权限不足'));
    }

    next();
  };
}

export function resolveBranchScope(
  currentUser: CurrentUserContext,
  requestedBranchId?: number
) {
  if (currentUser.role === 'party_committee' || currentUser.role === 'party_inspection') {
    return requestedBranchId;
  }

  return currentUser.branchId ?? requestedBranchId;
}

export function getTokenExpiryHours() {
  return env.TOKEN_EXPIRES_IN_HOURS;
}
