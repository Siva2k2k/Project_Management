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
    
    // Build filters object
    const filters: any = {};
    
    if (req.query.entity_type) {
      filters.entityType = req.query.entity_type as string;
    }
    
    if (req.query.entity_id) {
      filters.entityId = req.query.entity_id as string;
    }
    
    if (req.query.action) {
      filters.action = req.query.action as string;
    }
    
    if (req.query.user_id) {
      filters.userId = req.query.user_id as string;
    }
    
    if (req.query.start_date) {
      filters.startDate = new Date(req.query.start_date as string);
    }
    
    if (req.query.end_date) {
      filters.endDate = new Date(req.query.end_date as string);
    }

    // Use the new findWithFilters method that supports multiple filters
    const result = await auditLogRepository.findWithFilters(filters, { page, limit });

    // Enrich with entity names
    const enrichedData = await auditLogRepository.enrichWithEntityNames(result.data);

    res.json({
      data: enrichedData,
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
