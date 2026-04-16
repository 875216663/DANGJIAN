import type { Response } from 'express';
import type { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { sendSuccess } from '../utils/api-response';
import * as dashboardService from '../services/dashboard.service';

export async function getSummary(req: AuthenticatedRequest, res: Response) {
  const data = await dashboardService.getDashboardSummary(req.auth!);
  return sendSuccess(res, data, '获取看板数据成功');
}

export async function getAlerts(req: AuthenticatedRequest, res: Response) {
  const data = await dashboardService.getDashboardAlerts(req.auth!);
  return sendSuccess(res, data, '获取预警列表成功');
}

export async function getTodos(req: AuthenticatedRequest, res: Response) {
  const data = await dashboardService.getDashboardTodos(req.auth!);
  return sendSuccess(res, data, '获取待办任务成功');
}
