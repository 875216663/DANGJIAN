import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import { validateRequest } from '../middlewares/validate-request.middleware';
import { loginSchema } from '../utils/validators';
import { asyncHandler } from '../utils/async-handler';
import * as authController from '../controllers/auth.controller';

const router = Router();

router.get('/users', asyncHandler(authController.getAuthUsers));
router.get('/accounts', asyncHandler(authController.getDemoAccounts));
router.post(
  '/login',
  validateRequest(loginSchema, 'body'),
  asyncHandler(authController.login)
);
router.get('/session', authenticate, asyncHandler(authController.getSession));

export default router;
