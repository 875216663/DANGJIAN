import { Router } from 'express';
import { authenticate, requireRoles } from '../middlewares/auth.middleware';
import { memberImportUpload } from '../middlewares/upload.middleware';
import { validateRequest } from '../middlewares/validate-request.middleware';
import {
  idParamSchema,
  memberExportQuerySchema,
  memberListQuerySchema,
  memberMutationSchema,
  memberUpdateSchema,
} from '../utils/validators';
import { asyncHandler } from '../utils/async-handler';
import * as memberController from '../controllers/member.controller';

const router = Router();

router.get(
  '/',
  authenticate,
  validateRequest(memberListQuerySchema, 'query'),
  asyncHandler(memberController.listMembers)
);
router.get(
  '/export',
  authenticate,
  validateRequest(memberExportQuerySchema, 'query'),
  asyncHandler(memberController.exportMembers)
);
router.get(
  '/:id',
  authenticate,
  validateRequest(idParamSchema, 'params'),
  asyncHandler(memberController.getMemberById)
);
router.post(
  '/import',
  authenticate,
  requireRoles('party_committee', 'party_inspection', 'branch_secretary'),
  memberImportUpload.single('file'),
  asyncHandler(memberController.importMembers)
);
router.post(
  '/',
  authenticate,
  requireRoles('party_committee', 'party_inspection', 'branch_secretary'),
  validateRequest(memberMutationSchema, 'body'),
  asyncHandler(memberController.createMember)
);
router.put(
  '/:id',
  authenticate,
  requireRoles('party_committee', 'party_inspection', 'branch_secretary'),
  validateRequest(idParamSchema, 'params'),
  validateRequest(memberUpdateSchema, 'body'),
  asyncHandler(memberController.updateMember)
);
router.delete(
  '/:id',
  authenticate,
  requireRoles('party_committee', 'party_inspection', 'branch_secretary'),
  validateRequest(idParamSchema, 'params'),
  asyncHandler(memberController.deleteMember)
);

export default router;
