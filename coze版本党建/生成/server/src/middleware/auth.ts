import type { Request, Response, NextFunction } from 'express';
import { USER_DIRECTORY } from '../data/store';

export interface AuthRequest extends Request {
  userId?: number;
  userRole?: string;
  userBranchId?: number;
}

// 权限等级定义
export const RoleHierarchy = {
  party_committee: 4,    // 党委领导
  party_inspection: 5,   // 党建纪检部（超级管理员）
  branch_secretary: 3,   // 党支部书记/委员
  branch_member: 2,      // 党支部委员
  member: 1,             // 普通党员
} as const;

// 认证中间件
export const authMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // 从请求头获取token（实际场景应该从企微token或JWT中解析）
    // 这里简化处理，使用user_id header
    const userId = req.headers['x-user-id'] as string;

    if (!userId) {
      return res.status(401).json({ error: '未授权访问' });
    }

    // 简化认证：直接从header中获取用户信息（用于开发测试）
    // 生产环境应该从数据库查询
    const roleHeader = req.headers['x-user-role'] as string;
    const branchIdHeader = req.headers['x-user-branch-id'] as string;
    const parsedUserId = parseInt(userId);
    const userProfile = USER_DIRECTORY[parsedUserId];

    req.userId = parsedUserId;
    req.userRole = roleHeader || userProfile?.role || 'member';
    req.userBranchId = branchIdHeader
      ? parseInt(branchIdHeader)
      : userProfile?.branch_id;

    // 可选：如果需要严格认证，取消下面的注释
    /*
    如果后续接入统一身份认证，可以在这里改为：
    1. 解析 JWT / 单点登录票据
    2. 从用户中心读取角色与支部信息
    3. 将 userId、userRole、userBranchId 挂载到 req 上
    */

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ error: '认证失败' });
  }
};

// 角色检查中间件
export const requireRole = (...allowedRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.userRole || !allowedRoles.includes(req.userRole)) {
      return res.status(403).json({ error: '权限不足' });
    }
    next();
  };
};

// 数据权限过滤中间件（仅查看本支部数据）
export const branchFilter = (req: AuthRequest, res: Response, next: NextFunction) => {
  // 党委领导和纪检部可以查看全部数据
  if (req.userRole === 'party_committee' || req.userRole === 'party_inspection') {
    return next();
  }

  // 其他角色只能查看本支部数据
  if (req.userBranchId) {
    req.query.branch_id = req.userBranchId.toString();
  }

  next();
};
