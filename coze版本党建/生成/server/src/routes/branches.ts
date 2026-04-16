import { Router } from 'express';
import { authenticate, requireRoles } from '../middlewares/auth.middleware';
import { validateRequest } from '../middlewares/validate-request.middleware';
import {
  activistMutationSchema,
  branchActivistParamSchema,
  branchListQuerySchema,
  branchMutationSchema,
  branchUpdateSchema,
  idParamSchema,
} from '../utils/validators';
import { asyncHandler } from '../utils/async-handler';
import * as branchController from '../controllers/branch.controller';

const router = Router();

router.get(
  '/',
  authenticate,
  validateRequest(branchListQuerySchema, 'query'),
  asyncHandler(branchController.listBranches)
);
router.get(
  '/:id',
  authenticate,
  validateRequest(idParamSchema, 'params'),
  asyncHandler(branchController.getBranchById)
);
router.get(
  '/:id/members',
  authenticate,
  validateRequest(idParamSchema, 'params'),
  asyncHandler(branchController.getBranchMembers)
);
router.get(
  '/:id/activists',
  authenticate,
  validateRequest(idParamSchema, 'params'),
  asyncHandler(branchController.listBranchActivists)
);
router.post(
  '/:id/activists',
  authenticate,
  requireRoles('party_committee', 'party_inspection', 'branch_secretary'),
  validateRequest(idParamSchema, 'params'),
  validateRequest(activistMutationSchema, 'body'),
  asyncHandler(branchController.createActivist)
);
router.put(
  '/:id/activists/:activistId',
  authenticate,
  requireRoles('party_committee', 'party_inspection', 'branch_secretary'),
  validateRequest(branchActivistParamSchema, 'params'),
  validateRequest(activistMutationSchema, 'body'),
  asyncHandler(branchController.updateActivist)
);
router.delete(
  '/:id/activists/:activistId',
  authenticate,
  requireRoles('party_committee', 'party_inspection', 'branch_secretary'),
  validateRequest(branchActivistParamSchema, 'params'),
  asyncHandler(branchController.deleteActivist)
);
router.post(
  '/',
  authenticate,
  requireRoles('party_committee', 'party_inspection'),
  validateRequest(branchMutationSchema, 'body'),
  asyncHandler(branchController.createBranch)
);
router.put(
  '/:id',
  authenticate,
  requireRoles('party_committee', 'party_inspection', 'branch_secretary'),
  validateRequest(idParamSchema, 'params'),
  validateRequest(branchUpdateSchema, 'body'),
  asyncHandler(branchController.updateBranch)
);
router.delete(
  '/:id',
  authenticate,
  requireRoles('party_committee', 'party_inspection'),
  validateRequest(idParamSchema, 'params'),
  asyncHandler(branchController.deleteBranch)
);

export default router;
