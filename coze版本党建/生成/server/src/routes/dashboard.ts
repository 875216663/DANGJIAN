import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import { asyncHandler } from '../utils/async-handler';
import * as dashboardController from '../controllers/dashboard.controller';

const router = Router();

router.get('/', authenticate, asyncHandler(dashboardController.getSummary));
router.get('/alerts', authenticate, asyncHandler(dashboardController.getAlerts));
router.get('/todos', authenticate, asyncHandler(dashboardController.getTodos));

export default router;
