import { Router } from 'express';
import authRoutes from './auth';
import userRoutes from './users';
import customerRoutes from './customers';
import resourceRoutes from './resources';
import projectRoutes from './projects';
import weeklyEffortRoutes from './weeklyEfforts';
import weeklyMetricsRoutes from './weeklyMetrics';
import dashboardRoutes from './dashboard';
import auditLogRoutes from './auditLogs';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/customers', customerRoutes);
router.use('/resources', resourceRoutes);
router.use('/projects', projectRoutes);
router.use('/weekly-efforts', weeklyEffortRoutes);
router.use('/weekly-metrics', weeklyMetricsRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/audit-logs', auditLogRoutes);

export default router;
