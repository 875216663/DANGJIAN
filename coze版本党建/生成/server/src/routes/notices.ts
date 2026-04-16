import { Router } from 'express';
import { authenticate, requireRoles } from '../middlewares/auth.middleware';
import { validateRequest } from '../middlewares/validate-request.middleware';
import { asyncHandler } from '../utils/async-handler';
import { idParamSchema, noticeListQuerySchema, noticeMutationSchema } from '../utils/validators';
import * as noticeController from '../controllers/notice.controller';

const router = Router();

router.get(
  '/',
  authenticate,
  validateRequest(noticeListQuerySchema, 'query'),
  asyncHandler(noticeController.listNotices)
);
router.get(
  '/:id',
  authenticate,
  validateRequest(idParamSchema, 'params'),
  asyncHandler(noticeController.getNoticeById)
);
router.post(
  '/',
  authenticate,
  requireRoles('party_inspection', 'branch_secretary', 'party_committee'),
  validateRequest(noticeMutationSchema, 'body'),
  asyncHandler(noticeController.createNotice)
);
router.delete(
  '/:id',
  authenticate,
  requireRoles('party_inspection', 'party_committee'),
  validateRequest(idParamSchema, 'params'),
  asyncHandler(noticeController.deleteNotice)
);

export default router;
