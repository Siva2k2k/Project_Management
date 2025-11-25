import { Router, Response, NextFunction } from 'express';
import { projectService } from '../services/projectService';
import {
  authenticate,
  authorize,
  AuthRequest,
  validate,
  validateQuery,
} from '../middleware';
import { sendSuccess, sendCreated, sendNoContent, sendPaginated } from '../utils/response';
import { UserRole, RAGStatus, ProjectType } from '../types';
import {
  createProjectSchema,
  updateProjectSchema,
  addMilestoneSchema,
  updateMilestoneSchema,
  projectQuerySchema,
} from '../validators/project';

const router = Router();

// All routes require authentication
router.use(authenticate);

// POST /api/v1/projects - Create a new project
router.post(
  '/',
  authorize(UserRole.ADMIN, UserRole.MANAGER, UserRole.CEO),
  validate(createProjectSchema),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const project = await projectService.createProject(
        req.body,
        req.user!._id.toString()
      );
      sendCreated(res, project, 'Project created successfully');
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/v1/projects - List all projects with filters
router.get(
  '/',
  validateQuery(projectQuerySchema),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const query = req.query as unknown as {
        page: number;
        limit: number;
        search?: string;
        assigned_manager?: string;
        customer?: string;
        overall_status?: RAGStatus;
        project_type?: ProjectType;
        sort: string;
        order: 'asc' | 'desc';
      };
      const { page, limit, search, assigned_manager, customer, overall_status, project_type, sort, order } = query;

      const result = await projectService.listProjects(
        { search, assigned_manager, customer, overall_status, project_type },
        { page, limit, sort, order }
      );

      sendPaginated(res, result.data, result.page, result.limit, result.total);
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/v1/projects/stats - Get project statistics
router.get(
  '/stats',
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { managerId } = req.query;

      // If user is a manager and no managerId specified, show their own stats
      let targetManagerId = managerId as string | undefined;
      if (!targetManagerId && req.user!.role === UserRole.MANAGER) {
        targetManagerId = req.user!._id.toString();
      }

      const stats = await projectService.getProjectStats(targetManagerId);
      sendSuccess(res, stats);
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/v1/projects/manager/:managerId - Get projects by manager
router.get(
  '/manager/:managerId',
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const projects = await projectService.getProjectsByManager(req.params.managerId);
      sendSuccess(res, projects);
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/v1/projects/customer/:customerId - Get projects by customer
router.get(
  '/customer/:customerId',
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const projects = await projectService.getProjectsByCustomer(req.params.customerId);
      sendSuccess(res, projects);
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/v1/projects/:id - Get project by ID
router.get(
  '/:id',
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const project = await projectService.getProjectById(req.params.id);
      sendSuccess(res, project);
    } catch (error) {
      next(error);
    }
  }
);

// PUT /api/v1/projects/:id - Update project
router.put(
  '/:id',
  authorize(UserRole.ADMIN, UserRole.MANAGER, UserRole.CEO),
  validate(updateProjectSchema),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const project = await projectService.updateProject(
        req.params.id,
        req.body,
        req.user!._id.toString()
      );
      sendSuccess(res, project, 'Project updated successfully');
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /api/v1/projects/:id - Delete project (soft delete)
router.delete(
  '/:id',
  authorize(UserRole.ADMIN, UserRole.MANAGER, UserRole.CEO),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      await projectService.deleteProject(
        req.params.id,
        req.user!._id.toString()
      );
      sendNoContent(res);
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/v1/projects/:id/milestones - Add milestone to project
router.post(
  '/:id/milestones',
  authorize(UserRole.ADMIN, UserRole.MANAGER, UserRole.CEO),
  validate(addMilestoneSchema),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const project = await projectService.addMilestone(
        req.params.id,
        req.body,
        req.user!._id.toString()
      );
      sendSuccess(res, project, 'Milestone added successfully');
    } catch (error) {
      next(error);
    }
  }
);

// PUT /api/v1/projects/:id/milestones/:milestoneId - Update milestone
router.put(
  '/:id/milestones/:milestoneId',
  authorize(UserRole.ADMIN, UserRole.MANAGER, UserRole.CEO),
  validate(updateMilestoneSchema),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const project = await projectService.updateMilestone(
        req.params.id,
        req.params.milestoneId,
        req.body,
        req.user!._id.toString()
      );
      sendSuccess(res, project, 'Milestone updated successfully');
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /api/v1/projects/:id/milestones/:milestoneId - Remove milestone
router.delete(
  '/:id/milestones/:milestoneId',
  authorize(UserRole.ADMIN, UserRole.MANAGER, UserRole.CEO),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const project = await projectService.removeMilestone(
        req.params.id,
        req.params.milestoneId,
        req.user!._id.toString()
      );
      sendSuccess(res, project, 'Milestone removed successfully');
    } catch (error) {
      next(error);
    }
  }
);

export default router;
