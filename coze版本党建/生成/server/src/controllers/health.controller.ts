import type { Request, Response } from 'express';
import { isDatabaseEnabled } from '../config/database';
import { sendSuccess } from '../utils/api-response';

export async function getHealth(_req: Request, res: Response) {
  const data = {
    status: 'ok',
    storage: isDatabaseEnabled() ? 'database' : 'local-file',
  };

  return res.status(200).json({
    code: 0,
    message: '服务健康状态正常',
    data,
    ...data,
  });
}
