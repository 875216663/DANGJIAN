import type { Response } from 'express';
import type { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { sendSuccess } from '../utils/api-response';
import * as meetingService from '../services/meeting.service';

export async function getMeetingStats(req: AuthenticatedRequest, res: Response) {
  const data = await meetingService.getMeetingStats(req.auth!);
  return sendSuccess(res, data, '获取会议统计成功');
}

export async function listMeetings(req: AuthenticatedRequest, res: Response) {
  const result = await meetingService.listMeetings(req.query as any, req.auth!);
  return sendSuccess(res, result.items, '获取会议列表成功', 200, result.meta);
}

export async function getMeetingById(req: AuthenticatedRequest, res: Response) {
  const data = await meetingService.getMeetingById(Number(req.params.id), req.auth!);
  return sendSuccess(res, data, '获取会议详情成功');
}

export async function createMeeting(req: AuthenticatedRequest, res: Response) {
  const created = await meetingService.createMeeting(req.body, req.auth!);
  return sendSuccess(res, created, '创建会议记录成功', 201);
}

export async function updateMeeting(req: AuthenticatedRequest, res: Response) {
  const updated = await meetingService.updateMeeting(Number(req.params.id), req.body);
  return sendSuccess(res, updated, '更新会议记录成功');
}

export async function deleteMeeting(req: AuthenticatedRequest, res: Response) {
  await meetingService.deleteMeeting(Number(req.params.id));
  return sendSuccess(res, true, '删除会议记录成功');
}
