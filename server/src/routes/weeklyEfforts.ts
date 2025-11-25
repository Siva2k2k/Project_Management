import { Router, Response, NextFunction } from 'express';
import { weeklyEffortService } from '../services/weeklyEffortService';
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
  createWeeklyEffortSchema,
  updateWeeklyEffortSchema,
  weeklyEffortQuerySchema,
  bulkWeeklyEffortSchema,
} from '../validators/weeklyEffort';

const router = Router();

// All routes require authentication
router.use(authenticate);

// POST /api/v1/weekly-efforts - Create a new weekly effort entry
router.post(
  '/',
  authorize(UserRole.ADMIN, UserRole.MANAGER, UserRole.CEO),
  validate(createWeeklyEffortSchema),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const effort = await weeklyEffortService.createWeeklyEffort(
        req.body,
        req.user!._id.toString()
      );
      sendCreated(res, effort, 'Weekly effort entry created successfully');
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/v1/weekly-efforts/bulk - Bulk create weekly effort entries
router.post(
  '/bulk',
  authorize(UserRole.ADMIN, UserRole.MANAGER, UserRole.CEO),
  validate(bulkWeeklyEffortSchema),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const result = await weeklyEffortService.bulkCreateWeeklyEfforts(
        req.body,
        req.user!._id.toString()
      );
      sendSuccess(res, result, 'Bulk weekly effort creation completed');
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/v1/weekly-efforts - List all weekly effort entries
router.get(
  '/',
  validateQuery(weeklyEffortQuerySchema),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const query = req.query as unknown as {
        page: number;
        limit: number;
        project?: string;
        resource?: string;
        week_start_date?: string;
        sort: string;
        order: 'asc' | 'desc';
      };
      const { page, limit, project, resource, week_start_date, sort, order } = query;

      const result = await weeklyEffortService.listWeeklyEfforts(
        {
          project,
          resource,
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

// GET /api/v1/weekly-efforts/project/:projectId - Get weekly efforts by project
router.get(
  '/project/:projectId',
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { page = 1, limit = 10, sort = 'week_start_date', order = 'desc' } = req.query;

      const result = await weeklyEffortService.getWeeklyEffortsByProject(
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

// GET /api/v1/weekly-efforts/project/:projectId/total-hours - Get total hours by project
router.get(
  '/project/:projectId/total-hours',
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const totalHours = await weeklyEffortService.getTotalHoursByProject(req.params.projectId);
      sendSuccess(res, { totalHours });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/v1/weekly-efforts/project/:projectId/resource-allocation - Get resource allocation by project
router.get(
  '/project/:projectId/resource-allocation',
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const allocation = await weeklyEffortService.getResourceAllocationByProject(req.params.projectId);
      sendSuccess(res, allocation);
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/v1/weekly-efforts/resource/:resourceId - Get weekly efforts by resource
router.get(
  '/resource/:resourceId',
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { page = 1, limit = 10, sort = 'week_start_date', order = 'desc' } = req.query;

      const result = await weeklyEffortService.getWeeklyEffortsByResource(
        req.params.resourceId,
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

// GET /api/v1/weekly-efforts/:id - Get weekly effort by ID
router.get(
  '/:id',
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const effort = await weeklyEffortService.getWeeklyEffortById(req.params.id);
      sendSuccess(res, effort);
    } catch (error) {
      next(error);
    }
  }
);

// PUT /api/v1/weekly-efforts/:id - Update weekly effort
router.put(
  '/:id',
  authorize(UserRole.ADMIN, UserRole.MANAGER, UserRole.CEO),
  validate(updateWeeklyEffortSchema),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const effort = await weeklyEffortService.updateWeeklyEffort(
        req.params.id,
        req.body,
        req.user!._id.toString()
      );
      sendSuccess(res, effort, 'Weekly effort entry updated successfully');
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /api/v1/weekly-efforts/:id - Delete weekly effort
router.delete(
  '/:id',
  authorize(UserRole.ADMIN, UserRole.MANAGER, UserRole.CEO),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      await weeklyEffortService.deleteWeeklyEffort(
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
