import { resolve } from 'path';
import type { Request, Response } from 'express';
import { env } from '../config/env';
import { sendSuccess } from '../utils/api-response';
import * as studyService from '../services/study.service';
import { AppError } from '../utils/app-error';
import type { AuthenticatedRequest } from '../middlewares/auth.middleware';

function buildDownloadUrl(req: Request, fileId: string) {
  const baseUrl = env.PUBLIC_APP_URL?.trim() || `${req.protocol}://${req.get('host')}`;
  return `${baseUrl}/api/v1/study/files/${fileId}/download`;
}

export async function listStudyFiles(req: Request, res: Response) {
  const files = await studyService.listStudyFiles();
  return sendSuccess(
    res,
    files.map((file) => ({
      ...file,
      downloadUrl: buildDownloadUrl(req, file.id),
    })),
    '获取学习资料成功'
  );
}

export async function uploadStudyFile(req: AuthenticatedRequest, res: Response) {
  if (!req.file) {
    throw new AppError(400, '请选择要上传的文件');
  }

  const created = await studyService.uploadStudyFile({
    title: req.body.title,
    description: req.body.description,
    file: req.file,
    uploadedBy: String(req.auth?.userId || 'system'),
  });

  return sendSuccess(
    res,
    {
      ...created,
      downloadUrl: buildDownloadUrl(req, created.id),
    },
    '上传学习资料成功',
    201
  );
}

export async function downloadStudyFile(req: Request, res: Response) {
  const file = await studyService.getStudyFileById(req.params.id);
  const absolutePath = resolve(process.cwd(), 'data', file.relativePath);
  return res.download(absolutePath, file.fileName);
}

export async function deleteStudyFile(req: AuthenticatedRequest, res: Response) {
  await studyService.deleteStudyFile(req.params.id);
  return sendSuccess(res, true, '删除学习资料成功');
}
