import { Router } from 'express';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { UserRole } from '../types';
import * as dashboardService from '../services/dashboardService';

const router = Router();

// Manager dashboard
router.get(
  '/manager',
  authenticate,
  authorize(UserRole.MANAGER, UserRole.ADMIN, UserRole.CEO),
  async (req: AuthRequest, res, next) => {
    try {
      const userId = req.user!._id.toString();
      const data = await dashboardService.getManagerDashboard(userId);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
);

// CEO dashboard
router.get(
  '/ceo',
  authenticate,
  authorize(UserRole.CEO, UserRole.ADMIN),
  async (_req: AuthRequest, res, next) => {
    try {
      const data = await dashboardService.getCEODashboard();
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
);

// Project drill-down
router.get(
  '/project/:id',
  authenticate,
  authorize(UserRole.MANAGER, UserRole.ADMIN, UserRole.CEO),
  async (req: AuthRequest, res, next) => {
    try {
      const { id } = req.params;
      const data = await dashboardService.getProjectDrillDown(id);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
);

// KPI metrics
router.get(
  '/kpis',
  authenticate,
  authorize(UserRole.MANAGER, UserRole.ADMIN, UserRole.CEO),
  async (req: AuthRequest, res, next) => {
    try {
      const userId = req.user!.role === UserRole.CEO || req.user!.role === UserRole.ADMIN ? undefined : req.user!._id.toString();
      const data = await dashboardService.getKPIs(userId);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
);

// Trending data
router.get(
  '/trends',
  authenticate,
  authorize(UserRole.MANAGER, UserRole.ADMIN, UserRole.CEO),
  async (req: AuthRequest, res, next) => {
    try {
      const { projectId, timeRange = '30' } = req.query;
      const userId = req.user!.role === UserRole.CEO || req.user!.role === UserRole.ADMIN ? undefined : req.user!._id.toString();
      const data = await dashboardService.getTrends(
        projectId as string | undefined,
        userId,
        parseInt(timeRange as string)
      );
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
