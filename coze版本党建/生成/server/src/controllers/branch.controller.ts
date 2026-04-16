import type { Response } from 'express';
import type { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { sendSuccess } from '../utils/api-response';
import * as branchService from '../services/branch.service';

export async function listBranches(req: AuthenticatedRequest, res: Response) {
  const branches = await branchService.listBranches(req.query as any, req.auth!);
  return sendSuccess(res, branches, '获取支部列表成功');
}

export async function getBranchById(req: AuthenticatedRequest, res: Response) {
  const branch = await branchService.getBranchById(Number(req.params.id), req.auth!);
  return sendSuccess(res, branch, '获取支部详情成功');
}

export async function getBranchMembers(req: AuthenticatedRequest, res: Response) {
  const members = await branchService.getBranchMembers(Number(req.params.id), req.auth!);
  return sendSuccess(res, members, '获取支部成员成功');
}

export async function listBranchActivists(req: AuthenticatedRequest, res: Response) {
  const activists = await branchService.listBranchActivists(Number(req.params.id), req.auth!);
  return sendSuccess(res, activists, '获取积极分子成功');
}

export async function createBranch(req: AuthenticatedRequest, res: Response) {
  const created = await branchService.createBranch(req.body, req.auth!);
  return sendSuccess(res, created, '创建支部成功', 201);
}

export async function updateBranch(req: AuthenticatedRequest, res: Response) {
  const updated = await branchService.updateBranch(Number(req.params.id), req.body, req.auth!);
  return sendSuccess(res, updated, '更新支部成功');
}

export async function deleteBranch(req: AuthenticatedRequest, res: Response) {
  await branchService.deleteBranch(Number(req.params.id), req.auth!);
  return sendSuccess(res, true, '删除支部成功');
}

export async function createActivist(req: AuthenticatedRequest, res: Response) {
  const created = await branchService.createActivist(
    Number(req.params.id),
    req.body,
    req.auth!
  );
  return sendSuccess(res, created, '创建积极分子成功', 201);
}

export async function updateActivist(req: AuthenticatedRequest, res: Response) {
  const updated = await branchService.updateActivist(
    Number(req.params.id),
    Number(req.params.activistId),
    req.body,
    req.auth!
  );
  return sendSuccess(res, updated, '更新积极分子成功');
}

export async function deleteActivist(req: AuthenticatedRequest, res: Response) {
  await branchService.deleteActivist(
    Number(req.params.id),
    Number(req.params.activistId),
    req.auth!
  );
  return sendSuccess(res, true, '删除积极分子成功');
}
