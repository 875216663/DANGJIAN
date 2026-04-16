import { Router } from 'express';
import { authenticate, requireRoles } from '../middlewares/auth.middleware';
import { studyFileUpload } from '../middlewares/upload.middleware';
import { validateRequest } from '../middlewares/validate-request.middleware';
import { asyncHandler } from '../utils/async-handler';
import { studyUploadSchema } from '../utils/validators';
import * as studyController from '../controllers/study.controller';

const router = Router();

router.post(
  '/files',
  authenticate,
  requireRoles('party_committee', 'party_inspection', 'branch_secretary'),
  studyFileUpload.single('file'),
  validateRequest(studyUploadSchema, 'body'),
  asyncHandler(studyController.uploadStudyFile)
);
router.get('/files', authenticate, asyncHandler(studyController.listStudyFiles));
router.get('/files/:id/download', authenticate, asyncHandler(studyController.downloadStudyFile));
router.delete(
  '/files/:id',
  authenticate,
  requireRoles('party_committee', 'party_inspection', 'branch_secretary'),
  asyncHandler(studyController.deleteStudyFile)
);

export default router;
