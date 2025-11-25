import { Router, Response, NextFunction } from 'express';
import { weeklyMetricsService } from '../services/weeklyMetricsService';
import {
  authenticate,
  authorize,
  AuthRequest,
  validate,
  validateQuery,
} from '../middleware';
import { sendSuccess, sendCreated, sendNoContent, sendPaginated } from '../utils/response';
import { UserRole } from '../types';
import {
  createWeeklyMetricsSchema,
  updateWeeklyMetricsSchema,
  weeklyMetricsQuerySchema,
} from '../validators/weeklyMetrics';

const router = Router();

// All routes require authentication
router.use(authenticate);

// POST /api/v1/weekly-metrics - Create a new weekly metrics entry
router.post(
  '/',
  authorize(UserRole.ADMIN, UserRole.MANAGER, UserRole.CEO),
  validate(createWeeklyMetricsSchema),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const metrics = await weeklyMetricsService.createWeeklyMetrics(
        req.body,
        req.user!._id.toString()
      );
      sendCreated(res, metrics, 'Weekly metrics entry created successfully');
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/v1/weekly-metrics - List all weekly metrics entries
router.get(
  '/',
  validateQuery(weeklyMetricsQuerySchema),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const query = req.query as unknown as {
        page: number;
        limit: number;
        project?: string;
        week_start_date?: string;
        sort: string;
        order: 'asc' | 'desc';
      };
      const { page, limit, project, week_start_date, sort, order } = query;

      const result = await weeklyMetricsService.listWeeklyMetrics(
        {
          project,
          week_start_date: week_start_date ? new Date(week_start_date) : undefined
        },
        { page, limit, sort, order }
      );

      sendPaginated(res, result.data, result.page, result.limit, result.total);
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/v1/weekly-metrics/project/:projectId - Get weekly metrics by project
router.get(
  '/project/:projectId',
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { page = 1, limit = 10, sort = 'week_start_date', order = 'desc' } = req.query;

      const result = await weeklyMetricsService.getWeeklyMetricsByProject(
        req.params.projectId,
        {
          page: Number(page),
          limit: Number(limit),
          sort: sort as string,
          order: order as 'asc' | 'desc',
        }
      );

      sendPaginated(res, result.data, result.page, result.limit, result.total);
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/v1/weekly-metrics/project/:projectId/total-hours - Get total hours by project
router.get(
  '/project/:projectId/total-hours',
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const totalHours = await weeklyMetricsService.getTotalHoursByProject(req.params.projectId);
      sendSuccess(res, { totalHours });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/v1/weekly-metrics/project/:projectId/latest - Get latest metrics by project
router.get(
  '/project/:projectId/latest',
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const metrics = await weeklyMetricsService.getLatestMetricsByProject(req.params.projectId);
      sendSuccess(res, metrics);
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/v1/weekly-metrics/:id - Get weekly metrics by ID
router.get(
  '/:id',
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const metrics = await weeklyMetricsService.getWeeklyMetricsById(req.params.id);
      sendSuccess(res, metrics);
    } catch (error) {
      next(error);
    }
  }
);

// PUT /api/v1/weekly-metrics/:id - Update weekly metrics
router.put(
  '/:id',
  authorize(UserRole.ADMIN, UserRole.MANAGER, UserRole.CEO),
  validate(updateWeeklyMetricsSchema),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const metrics = await weeklyMetricsService.updateWeeklyMetrics(
        req.params.id,
        req.body,
        req.user!._id.toString()
      );
      sendSuccess(res, metrics, 'Weekly metrics entry updated successfully');
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /api/v1/weekly-metrics/:id - Delete weekly metrics
router.delete(
  '/:id',
  authorize(UserRole.ADMIN, UserRole.MANAGER, UserRole.CEO),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      await weeklyMetricsService.deleteWeeklyMetrics(
        req.params.id,
        req.user!._id.toString()
      );
      sendNoContent(res);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
