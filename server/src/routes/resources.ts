import { Router, Response, NextFunction } from 'express';
import { resourceService } from '../services/resourceService';
import {
  authenticate,
  authorize,
  AuthRequest,
  validate,
  validateQuery,
} from '../middleware';
import { sendSuccess, sendCreated, sendNoContent, sendPaginated } from '../utils/response';
import { UserRole, ResourceStatus, Currency } from '../types';
import {
  createResourceSchema,
  updateResourceSchema,
  updateResourceStatusSchema,
  resourceQuerySchema,
} from '../validators/resource';

const router = Router();

// All routes require authentication
router.use(authenticate);

// POST /api/v1/resources - Create a new resource
router.post(
  '/',
  authorize(UserRole.ADMIN, UserRole.MANAGER, UserRole.CEO),
  validate(createResourceSchema),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const resource = await resourceService.createResource(
        req.body,
        req.user!._id.toString()
      );
      sendCreated(res, resource, 'Resource created successfully');
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/v1/resources - List all resources
router.get(
  '/',
  validateQuery(resourceQuerySchema),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const query = req.query as unknown as {
        page: number;
        limit: number;
        search?: string;
        status?: ResourceStatus;
        currency?: Currency;
        sort: string;
        order: 'asc' | 'desc';
      };
      const { page, limit, search, status, currency, sort, order } = query;

      const result = await resourceService.listResources(
        { search, status, currency },
        { page, limit, sort, order }
      );

      sendPaginated(res, result.data, result.page, result.limit, result.total);
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/v1/resources/active - Get all active resources
router.get(
  '/active',
  async (_req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const resources = await resourceService.getActiveResources();
      sendSuccess(res, resources);
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/v1/resources/search - Search resources by name
router.get(
  '/search',
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { q } = req.query;

      if (!q || typeof q !== 'string') {
        res.status(400).json({
          success: false,
          message: 'Search query parameter "q" is required',
        });
        return;
      }

      const resources = await resourceService.searchResources(q);
      sendSuccess(res, resources);
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/v1/resources/:id - Get resource by ID
router.get(
  '/:id',
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const resource = await resourceService.getResourceById(req.params.id);
      sendSuccess(res, resource);
    } catch (error) {
      next(error);
    }
  }
);

// PUT /api/v1/resources/:id - Update resource
router.put(
  '/:id',
  authorize(UserRole.ADMIN, UserRole.MANAGER, UserRole.CEO),
  validate(updateResourceSchema),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const resource = await resourceService.updateResource(
        req.params.id,
        req.body,
        req.user!._id.toString()
      );
      sendSuccess(res, resource, 'Resource updated successfully');
    } catch (error) {
      next(error);
    }
  }
);

// PATCH /api/v1/resources/:id/status - Update resource status
router.patch(
  '/:id/status',
  authorize(UserRole.ADMIN, UserRole.MANAGER, UserRole.CEO),
  validate(updateResourceStatusSchema),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const resource = await resourceService.updateResourceStatus(
        req.params.id,
        req.body,
        req.user!._id.toString()
      );
      sendSuccess(res, resource, 'Resource status updated successfully');
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /api/v1/resources/:id - Delete resource (soft delete)
router.delete(
  '/:id',
  authorize(UserRole.ADMIN, UserRole.MANAGER, UserRole.CEO),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      await resourceService.deleteResource(
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
