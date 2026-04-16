import type { Response } from 'express';
import type { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { sendSuccess } from '../utils/api-response';
import * as noticeService from '../services/notice.service';

export async function listNotices(req: AuthenticatedRequest, res: Response) {
  const result = await noticeService.listNotices(req.query as any, req.auth!);
  return sendSuccess(res, result.items, '获取通知列表成功', 200, result.meta);
}

export async function getNoticeById(req: AuthenticatedRequest, res: Response) {
  const data = await noticeService.getNoticeById(Number(req.params.id), req.auth!);
  return sendSuccess(res, data, '获取通知详情成功');
}

export async function createNotice(req: AuthenticatedRequest, res: Response) {
  const created = await noticeService.createNotice(req.body, req.auth!);
  return sendSuccess(res, created, '发布通知成功', 201);
}

export async function deleteNotice(req: AuthenticatedRequest, res: Response) {
  await noticeService.deleteNotice(Number(req.params.id));
  return sendSuccess(res, true, '删除通知成功');
}
