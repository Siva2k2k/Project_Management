import crypto from 'crypto';
import { Types } from 'mongoose';
import { userRepository, PaginatedResult } from '../dbrepo';
import {
  NotFoundError,
  ConflictError,
  ValidationError,
  InternalError,
  ForbiddenError,
} from '../utils/errors';
import { logger } from '../utils';
import { IUser, UserRole, PaginationQuery } from '../types';
import { UpdateProfileInput, BulkImportInput, CreateUserInput } from '../validators/user';
import { emailService } from './emailService';

interface UserFilter {
  search?: string;
  role?: UserRole;
  is_active?: boolean;
}

class UserService {
  async getProfile(userId: string): Promise<Partial<IUser>> {
    try {
      const user = await userRepository.findById(userId);

      if (!user) {
        throw new NotFoundError('User not found');
      }

      return this.sanitizeUser(user);
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      logger.error('Get profile failed:', error);
      throw new InternalError('Failed to get profile');
    }
  }

  async updateProfile(
    userId: string,
    data: UpdateProfileInput,
    modifiedBy?: string
  ): Promise<Partial<IUser>> {
    try {
      const user = await userRepository.findById(userId);

      if (!user) {
        throw new NotFoundError('User not found');
      }

      // Check if email is being changed and if it's already taken
      if (data.email && data.email !== user.email) {
        const existingUser = await userRepository.findByEmailWithoutPassword(data.email);
        if (existingUser) {
          throw new ConflictError('Email already in use');
        }
      }

      const updatedUser = await userRepository.updateById(userId, {
        ...data,
        last_modified_date: new Date(),
        last_modified_by: modifiedBy ? new Types.ObjectId(modifiedBy) : undefined,
      });

      if (!updatedUser) {
        throw new NotFoundError('User not found');
      }

      logger.info(`Profile updated for user: ${userId}`);

      return this.sanitizeUser(updatedUser);
    } catch (error) {
      if (
        error instanceof NotFoundError ||
        error instanceof ConflictError ||
        error instanceof ValidationError
      ) {
        throw error;
      }
      logger.error('Update profile failed:', error);
      throw new InternalError('Failed to update profile');
    }
  }

  async updateAvatar(userId: string, avatarUrl: string): Promise<Partial<IUser>> {
    try {
      const updatedUser = await userRepository.updateById(userId, {
        avatar: avatarUrl,
        last_modified_date: new Date(),
      });

      if (!updatedUser) {
        throw new NotFoundError('User not found');
      }

      logger.info(`Avatar updated for user: ${userId}`);

      return this.sanitizeUser(updatedUser);
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      logger.error('Update avatar failed:', error);
      throw new InternalError('Failed to update avatar');
    }
  }

  async deactivateAccount(userId: string): Promise<void> {
    try {
      const user = await userRepository.deactivateUser(userId);

      if (!user) {
        throw new NotFoundError('User not found');
      }

      // Remove all refresh tokens
      await userRepository.removeAllRefreshTokens(userId);

      logger.info(`Account deactivated: ${userId}`);
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      logger.error('Deactivate account failed:', error);
      throw new InternalError('Failed to deactivate account');
    }
  }

  async listUsers(
    filters: UserFilter,
    pagination: PaginationQuery
  ): Promise<PaginatedResult<IUser>> {
    try {
      const query: Record<string, unknown> = {};

      if (filters.search) {
        query.$or = [
          { name: { $regex: filters.search, $options: 'i' } },
          { email: { $regex: filters.search, $options: 'i' } },
        ];
      }

      if (filters.role) {
        query.role = filters.role;
      }

      if (filters.is_active !== undefined) {
        query.is_active = filters.is_active;
      }

      const result = await userRepository.findWithPagination(query, pagination);

      return {
        ...result,
        data: result.data.map((user) => this.sanitizeUser(user) as IUser),
      };
    } catch (error) {
      logger.error('List users failed:', error);
      throw new InternalError('Failed to list users');
    }
  }

  async getUserById(userId: string): Promise<Partial<IUser>> {
    try {
      const user = await userRepository.findById(userId);

      if (!user) {
        throw new NotFoundError('User not found');
      }

      return this.sanitizeUser(user);
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      logger.error('Get user failed:', error);
      throw new InternalError('Failed to get user');
    }
  }

  async updateUserRole(
    userId: string,
    role: UserRole,
    adminId: string
  ): Promise<Partial<IUser>> {
    try {
      // Prevent self-demotion for admins
      if (userId === adminId) {
        throw new ForbiddenError('Cannot change your own role');
      }

      const user = await userRepository.findById(userId);

      if (!user) {
        throw new NotFoundError('User not found');
      }

      const updatedUser = await userRepository.updateById(userId, {
        role,
        last_modified_date: new Date(),
        last_modified_by: new Types.ObjectId(adminId),
      });

      if (!updatedUser) {
        throw new NotFoundError('User not found');
      }

      logger.info(`User role updated: ${userId} to ${role} by ${adminId}`);

      return this.sanitizeUser(updatedUser);
    } catch (error) {
      if (
        error instanceof NotFoundError ||
        error instanceof ForbiddenError
      ) {
        throw error;
      }
      logger.error('Update user role failed:', error);
      throw new InternalError('Failed to update user role');
    }
  }

  async activateUser(userId: string, adminId: string): Promise<Partial<IUser>> {
    try {
      const user = await userRepository.activateUser(userId);

      if (!user) {
        throw new NotFoundError('User not found');
      }

      await userRepository.updateById(userId, {
        last_modified_by: new Types.ObjectId(adminId),
      });

      logger.info(`User activated: ${userId} by ${adminId}`);

      return this.sanitizeUser(user);
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      logger.error('Activate user failed:', error);
      throw new InternalError('Failed to activate user');
    }
  }

  async bulkImportUsers(
    data: BulkImportInput,
    adminId: string
  ): Promise<{ success: number; failed: number; errors: string[] }> {
    try {
      const results = {
        success: 0,
        failed: 0,
        errors: [] as string[],
      };

      for (const userData of data.users) {
        try {
          // Check if user already exists
          const existingUser = await userRepository.findByEmailWithoutPassword(
            userData.email.toLowerCase()
          );

          if (existingUser) {
            results.failed++;
            results.errors.push(`${userData.email}: Email already exists`);
            continue;
          }

          // Generate random password if not provided
          const password =
            userData.password ||
            `Import${Date.now()}${Math.random().toString(36).slice(-8)}`;

          await userRepository.create({
            name: userData.name,
            email: userData.email.toLowerCase(),
            password,
            role: (userData.role as UserRole) || UserRole.MANAGER,
            is_active: true,
            last_modified_by: new Types.ObjectId(adminId),
          } as Partial<IUser>);

          results.success++;
        } catch (err) {
          results.failed++;
          if (err instanceof Error) {
            results.errors.push(err.message);
          }
        }
      }

      logger.info(
        `Bulk import completed: ${results.success} success, ${results.failed} failed`
      );

      return results;
    } catch (error) {
      logger.error('Bulk import failed:', error);
      throw new InternalError('Failed to import users');
    }
  }

  async deleteUser(userId: string, adminId: string): Promise<void> {
    try {
      if (userId === adminId) {
        throw new ForbiddenError('Cannot delete your own account');
      }

      const user = await userRepository.softDelete(userId);

      if (!user) {
        throw new NotFoundError('User not found');
      }

      // Remove all refresh tokens
      await userRepository.removeAllRefreshTokens(userId);

      logger.info(`User deleted: ${userId} by ${adminId}`);
    } catch (error) {
      if (
        error instanceof NotFoundError ||
        error instanceof ForbiddenError
      ) {
        throw error;
      }
      logger.error('Delete user failed:', error);
      throw new InternalError('Failed to delete user');
    }
  }

  async createUser(
    data: CreateUserInput,
    adminId: string
  ): Promise<Partial<IUser>> {
    try {
      // Check if user already exists
      const existingUser = await userRepository.findByEmailWithoutPassword(data.email);

      if (existingUser) {
        throw new ConflictError('Email already registered');
      }

      // Create new user
      const user = await userRepository.create({
        name: data.name,
        email: data.email,
        password: data.password,
        role: data.role as UserRole,
        is_active: true,
        email_verified: true,
        last_modified_by: new Types.ObjectId(adminId),
      } as Partial<IUser>);

      // Send email with credentials (async, don't wait)
      emailService.sendNewUserEmail(user.email, user.name, data.password).catch((error) => {
        logger.error('Failed to send new user email:', error);
      });

      logger.info(`User created by admin: ${user.email} by ${adminId}`);

      return this.sanitizeUser(user);
    } catch (error) {
      if (error instanceof ConflictError || error instanceof ValidationError) {
        throw error;
      }
      logger.error('Create user failed:', error);
      throw new InternalError('Failed to create user');
    }
  }

  async resetUserPassword(userId: string, adminId: string): Promise<void> {
    try {
      const user = await userRepository.findById(userId);

      if (!user) {
        throw new NotFoundError('User not found');
      }

      // Generate password reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      // Update user with reset token
      await userRepository.updateById(userId, {
        password_reset_token: resetToken,
        password_reset_expires: resetExpires,
        last_modified_by: new Types.ObjectId(adminId),
      });

      // Send password reset email with direct link
      await emailService.sendAdminPasswordResetEmail(user.email, user.name, resetToken);

      logger.info(`Password reset initiated for user: ${userId} by admin ${adminId}`);
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      logger.error('Reset user password failed:', error);
      throw new InternalError('Failed to reset user password');
    }
  }

  private sanitizeUser(user: IUser): Partial<IUser> & { createdAt?: Date } {
    return {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
      is_active: user.is_active,
      last_modified_date: user.last_modified_date,
      createdAt: (user as unknown as { createdAt: Date }).createdAt,
    };
  }
}

export const userService = new UserService();
