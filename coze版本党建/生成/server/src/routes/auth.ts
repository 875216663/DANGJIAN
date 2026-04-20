import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import { validateRequest } from '../middlewares/validate-request.middleware';
import { loginSchema } from '../utils/validators';
import { asyncHandler } from '../utils/async-handler';
import * as authController from '../controllers/auth.controller';

const router = Router();

// 用户目录：用于前端登录页/切换用户等场景。
router.get('/users', asyncHandler(authController.getAuthUsers));
// 演示账号：返回可直接登录的测试账号信息。
router.get('/accounts', asyncHandler(authController.getDemoAccounts));
// 登录接口：先校验请求体，再进入认证逻辑。
router.post(
  '/login',
  validateRequest(loginSchema, 'body'),
  asyncHandler(authController.login)
);
// 会话接口：仅对已登录用户开放。
router.get('/session', authenticate, asyncHandler(authController.getSession));

export default router;
