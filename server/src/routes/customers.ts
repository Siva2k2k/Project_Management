import { Router, Response, NextFunction } from 'express';
import { customerService } from '../services/customerService';
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
  createCustomerSchema,
  updateCustomerSchema,
  customerQuerySchema,
} from '../validators/customer';

const router = Router();

// All routes require authentication
router.use(authenticate);

// POST /api/v1/customers - Create a new customer
router.post(
  '/',
  authorize(UserRole.ADMIN, UserRole.MANAGER, UserRole.CEO),
  validate(createCustomerSchema),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const customer = await customerService.createCustomer(
        req.body,
        req.user!._id.toString()
      );
      sendCreated(res, customer, 'Customer created successfully');
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/v1/customers - List all customers
router.get(
  '/',
  validateQuery(customerQuerySchema),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const query = req.query as unknown as {
        page: number;
        limit: number;
        search?: string;
        sort: string;
        order: 'asc' | 'desc';
      };
      const { page, limit, search, sort, order } = query;

      const result = await customerService.listCustomers(
        { search },
        { page, limit, sort, order }
      );

      sendPaginated(res, result.data, result.page, result.limit, result.total);
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/v1/customers/search - Search customers by name
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

      const customers = await customerService.searchCustomers(q);
      sendSuccess(res, customers);
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/v1/customers/:id - Get customer by ID
router.get(
  '/:id',
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const customer = await customerService.getCustomerById(req.params.id);
      sendSuccess(res, customer);
    } catch (error) {
      next(error);
    }
  }
);

// PUT /api/v1/customers/:id - Update customer
router.put(
  '/:id',
  authorize(UserRole.ADMIN, UserRole.MANAGER, UserRole.CEO),
  validate(updateCustomerSchema),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const customer = await customerService.updateCustomer(
        req.params.id,
        req.body,
        req.user!._id.toString()
      );
      sendSuccess(res, customer, 'Customer updated successfully');
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /api/v1/customers/:id - Delete customer (soft delete)
router.delete(
  '/:id',
  authorize(UserRole.ADMIN, UserRole.MANAGER, UserRole.CEO),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      await customerService.deleteCustomer(
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
