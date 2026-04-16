import type { Response } from 'express';
import * as xlsx from 'xlsx';
import type { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { sendSuccess } from '../utils/api-response';
import * as memberService from '../services/member.service';
import { AppError } from '../utils/app-error';

export async function listMembers(req: AuthenticatedRequest, res: Response) {
  const result = await memberService.listMembers(req.query as any, req.auth!);
  return sendSuccess(res, result.items, '获取党员列表成功', 200, result.meta);
}

export async function exportMembers(req: AuthenticatedRequest, res: Response) {
  const members = await memberService.exportMembers(req.query as any, req.auth!);
  const rows = members.map((member) => ({
    姓名: member.name,
    性别: member.gender,
    出生日期: member.birthday,
    部门: member.department,
    职务: member.position,
    政治面貌: member.political_status,
    入党日期: member.join_date,
    转正日期: member.regular_date,
    党费缴纳年月: member.last_fee_month,
    联系电话: member.phone,
    邮箱: member.email,
    所属支部: member.branch_name,
    状态: member.status,
    备注: member.remarks,
  }));

  const workbook = xlsx.utils.book_new();
  const worksheet = xlsx.utils.json_to_sheet(rows);
  xlsx.utils.book_append_sheet(workbook, worksheet, '党员信息');
  const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });

  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  res.setHeader('Content-Disposition', 'attachment; filename="members-export.xlsx"');
  res.send(buffer);
}

export async function getMemberById(req: AuthenticatedRequest, res: Response) {
  const member = await memberService.getMemberById(Number(req.params.id), req.auth!);
  return sendSuccess(res, member, '获取党员详情成功');
}

export async function importMembers(req: AuthenticatedRequest, res: Response) {
  if (!req.file) {
    throw new AppError(400, '请选择要上传的Excel文件');
  }

  const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const rows = xlsx.utils.sheet_to_json<Record<string, string>>(worksheet, { raw: false });

  if (rows.length === 0) {
    throw new AppError(400, 'Excel文件为空');
  }

  const requiredColumns = ['姓名', '入党日期'];
  const firstRow = rows[0] ?? {};
  const missingColumns = requiredColumns.filter((column) => !(column in firstRow));
  if (missingColumns.length > 0) {
    throw new AppError(400, `Excel缺少必要列：${missingColumns.join('、')}`);
  }

  const imported = await memberService.importMembers(rows, req.auth!);
  return sendSuccess(res, imported, `成功导入${imported.length}条党员信息`);
}

export async function createMember(req: AuthenticatedRequest, res: Response) {
  const created = await memberService.createMember(req.body, req.auth!);
  return sendSuccess(res, created, '创建党员成功', 201);
}

export async function updateMember(req: AuthenticatedRequest, res: Response) {
  const updated = await memberService.updateMember(Number(req.params.id), req.body, req.auth!);
  return sendSuccess(res, updated, '更新党员成功');
}

export async function deleteMember(req: AuthenticatedRequest, res: Response) {
  await memberService.deleteMember(Number(req.params.id), req.auth!);
  return sendSuccess(res, true, '删除党员成功');
}
