import { Router, Request, Response, NextFunction } from 'express';
import { auditLogRepository } from '../dbrepo';
import { authenticate } from '../middleware/auth';
import { IUser } from '../types';

const router = Router();

// All audit log routes require authentication and Admin/CEO role
router.use(authenticate);

// Middleware to check Admin/CEO role
const requireAdminOrCEO = (
  req: Request & { user?: IUser },
  res: Response,
  next: NextFunction
): void => {
  if (!req.user || (req.user.role !== 'Admin' && req.user.role !== 'CEO')) {
    res.status(403).json({
      error: {
        message: 'Access denied. Admin or CEO role required.',
      },
    });
    return;
  }
  next();
};

router.use(requireAdminOrCEO);

// Get all audit logs with pagination and filters
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const entityType = req.query.entity_type as string;
    const action = req.query.action as string;
    const userId = req.query.user_id as string;
    const startDate = req.query.start_date as string;
    const endDate = req.query.end_date as string;

    let result;

    // Apply filters based on query parameters
    if (entityType && req.query.entity_id) {
      result = await auditLogRepository.findByEntity(
        entityType,
        req.query.entity_id as string,
        { page, limit }
      );
    } else if (userId) {
      result = await auditLogRepository.findByUser(userId, { page, limit });
    } else if (action) {
      result = await auditLogRepository.findByAction(action as any, {
        page,
        limit,
      });
    } else if (startDate && endDate) {
      result = await auditLogRepository.findByDateRange(
        new Date(startDate),
        new Date(endDate),
        { page, limit }
      );
    } else {
      // Get all audit logs with pagination
      result = await auditLogRepository.findAllWithPagination({ page, limit });
    }

    res.json({
      data: result.data,
      pagination: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get audit log by ID
router.get('/:id', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const auditLog = await auditLogRepository.findByIdWithPopulate(req.params.id);

    if (!auditLog) {
      res.status(404).json({
        error: {
          message: 'Audit log not found',
        },
      });
      return;
    }

    res.json({ data: auditLog });
  } catch (error) {
    next(error);
  }
});

export default router;
