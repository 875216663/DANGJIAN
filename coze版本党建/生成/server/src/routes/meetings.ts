import { Router } from 'express';
import { authenticate, requireRoles } from '../middlewares/auth.middleware';
import { validateRequest } from '../middlewares/validate-request.middleware';
import {
  idParamSchema,
  meetingListQuerySchema,
  meetingMutationSchema,
} from '../utils/validators';
import { asyncHandler } from '../utils/async-handler';
import * as meetingController from '../controllers/meeting.controller';

const router = Router();

router.get('/stats/summary', authenticate, asyncHandler(meetingController.getMeetingStats));
router.get(
  '/',
  authenticate,
  validateRequest(meetingListQuerySchema, 'query'),
  asyncHandler(meetingController.listMeetings)
);
router.get(
  '/:id',
  authenticate,
  validateRequest(idParamSchema, 'params'),
  asyncHandler(meetingController.getMeetingById)
);
router.post(
  '/',
  authenticate,
  requireRoles('party_inspection', 'branch_secretary', 'party_committee'),
  validateRequest(meetingMutationSchema, 'body'),
  asyncHandler(meetingController.createMeeting)
);
router.put(
  '/:id',
  authenticate,
  requireRoles('party_inspection', 'branch_secretary', 'party_committee'),
  validateRequest(idParamSchema, 'params'),
  validateRequest(meetingMutationSchema.partial(), 'body'),
  asyncHandler(meetingController.updateMeeting)
);
router.delete(
  '/:id',
  authenticate,
  requireRoles('party_inspection', 'branch_secretary', 'party_committee'),
  validateRequest(idParamSchema, 'params'),
  asyncHandler(meetingController.deleteMeeting)
);

export default router;
