import { Router, Response, NextFunction } from 'express';
import { userService } from '../services/userService';
import {
  authenticate,
  authorize,
  AuthRequest,
  validate,
  validateQuery,
} from '../middleware';
import { sendSuccess, sendNoContent, sendPaginated } from '../utils/response';
import { UserRole } from '../types';
import {
  updateProfileSchema,
  updateUserRoleSchema,
  userQuerySchema,
  bulkImportSchema,
  createUserSchema,
} from '../validators/user';

const router = Router();

// All routes require authentication
router.use(authenticate);

// GET /api/v1/users/profile - Get current user profile
router.get(
  '/profile',
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const profile = await userService.getProfile(req.user!._id.toString());
      sendSuccess(res, profile);
    } catch (error) {
      next(error);
    }
  }
);

// PUT /api/v1/users/profile - Update current user profile
router.put(
  '/profile',
  validate(updateProfileSchema),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const profile = await userService.updateProfile(
        req.user!._id.toString(),
        req.body,
        req.user!._id.toString()
      );
      sendSuccess(res, profile, 'Profile updated successfully');
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/v1/users/avatar - Upload avatar
router.post(
  '/avatar',
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      // For now, accept avatar URL directly
      // TODO: Implement file upload with multer
      const { avatarUrl } = req.body;

      if (!avatarUrl) {
        res.status(400).json({
          success: false,
          message: 'Avatar URL is required',
        });
        return;
      }

      const profile = await userService.updateAvatar(
        req.user!._id.toString(),
        avatarUrl
      );
      sendSuccess(res, profile, 'Avatar updated successfully');
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /api/v1/users/account - Deactivate own account
router.delete(
  '/account',
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      await userService.deactivateAccount(req.user!._id.toString());

      // Clear refresh token cookie
      res.clearCookie('refreshToken');

      sendNoContent(res);
    } catch (error) {
      next(error);
    }
  }
);

// Admin-only routes

// GET /api/v1/users - List all users (Admin only)
router.get(
  '/',
  authorize(UserRole.ADMIN, UserRole.CEO),
  validateQuery(userQuerySchema),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const query = req.query as unknown as {
        page: number;
        limit: number;
        search?: string;
        role?: UserRole;
        is_active?: boolean;
        sort: string;
        order: 'asc' | 'desc';
      };
      const { page, limit, search, role, is_active, sort, order } = query;

      const result = await userService.listUsers(
        { search, role, is_active },
        { page, limit, sort, order }
      );

      sendPaginated(res, result.data, result.page, result.limit, result.total);
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/v1/users/:id - Get user by ID (Admin only)
router.get(
  '/:id',
  authorize(UserRole.ADMIN, UserRole.CEO),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const user = await userService.getUserById(req.params.id);
      sendSuccess(res, user);
    } catch (error) {
      next(error);
    }
  }
);

// PUT /api/v1/users/:id/role - Update user role (Admin only)
router.put(
  '/:id/role',
  authorize(UserRole.ADMIN),
  validate(updateUserRoleSchema),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const user = await userService.updateUserRole(
        req.params.id,
        req.body.role,
        req.user!._id.toString()
      );
      sendSuccess(res, user, 'User role updated successfully');
    } catch (error) {
      next(error);
    }
  }
);

// PUT /api/v1/users/:id/activate - Activate user (Admin only)
router.put(
  '/:id/activate',
  authorize(UserRole.ADMIN),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const user = await userService.activateUser(
        req.params.id,
        req.user!._id.toString()
      );
      sendSuccess(res, user, 'User activated successfully');
    } catch (error) {
      next(error);
    }
  }
);

// PUT /api/v1/users/:id/deactivate - Deactivate user (Admin only)
router.put(
  '/:id/deactivate',
  authorize(UserRole.ADMIN),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      await userService.deactivateAccount(req.params.id);
      sendSuccess(res, null, 'User deactivated successfully');
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /api/v1/users/:id - Delete user (Admin only)
router.delete(
  '/:id',
  authorize(UserRole.ADMIN),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      await userService.deleteUser(req.params.id, req.user!._id.toString());
      sendNoContent(res);
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/v1/users/bulk-import - Bulk import users (Admin only)
router.post(
  '/bulk-import',
  authorize(UserRole.ADMIN),
  validate(bulkImportSchema),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const result = await userService.bulkImportUsers(
        req.body,
        req.user!._id.toString()
      );
      sendSuccess(res, result, 'Bulk import completed');
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/v1/users/create - Create new user (Admin only)
router.post(
  '/create',
  authorize(UserRole.ADMIN),
  validate(createUserSchema),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const user = await userService.createUser(
        req.body,
        req.user!._id.toString()
      );
      sendSuccess(res, user, 'User created successfully');
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/v1/users/:id/reset-password - Reset user password (Admin only)
router.post(
  '/:id/reset-password',
  authorize(UserRole.ADMIN),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      await userService.resetUserPassword(
        req.params.id,
        req.user!._id.toString()
      );
      sendSuccess(res, null, 'Password reset email sent successfully');
    } catch (error) {
      next(error);
    }
  }
);

// PUT /api/v1/users/:id - Update user (Admin only)
router.put(
  '/:id',
  authorize(UserRole.ADMIN),
  validate(updateProfileSchema),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const user = await userService.updateProfile(
        req.params.id,
        req.body,
        req.user!._id.toString()
      );
      sendSuccess(res, user, 'User updated successfully');
    } catch (error) {
      next(error);
    }
  }
);

export default router;
