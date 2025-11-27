import crypto from 'crypto';
import { userRepository } from '../dbrepo';
import { generateTokenPair, verifyToken } from '../utils/jwt';
import {
  AuthError,
  ConflictError,
  NotFoundError,
  ValidationError,
  InternalError,
} from '../utils/errors';
import { logger } from '../utils';
import { IUser, UserRole } from '../types';
import {
  RegisterInput,
  LoginInput,
  ChangePasswordInput,
} from '../validators/auth';
import { emailService } from './emailService';

interface AuthResponse {
  user: Partial<IUser>;
  accessToken: string;
  refreshToken: string;
}

class AuthService {
  async register(data: RegisterInput): Promise<AuthResponse> {
    try {
      // Check if user already exists
      const existingUser = await userRepository.findByEmailWithoutPassword(data.email);

      if (existingUser) {
        throw new ConflictError('Email already registered');
      }

      // Generate verification token
      const verificationToken = crypto.randomBytes(32).toString('hex');
      const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      // Create new user
      const user = await userRepository.create({
        name: data.name,
        email: data.email,
        password: data.password,
        role: data.role as UserRole,
        is_active: true,
        email_verified: false,
        verification_token: verificationToken,
        verification_token_expires: verificationTokenExpires,
      } as Partial<IUser>);

      // Send verification email (async, don't wait)
      emailService.sendVerificationEmail(user.email, verificationToken).catch((error) => {
        logger.error('Failed to send verification email:', error);
      });

      // Generate tokens
      const { accessToken, refreshToken, refreshExpires } = generateTokenPair(
        user._id,
        user.email,
        user.role
      );

      // Save refresh token
      await userRepository.updateRefreshToken(user._id, refreshToken, refreshExpires);

      logger.info(`User registered successfully: ${user.email}`);

      return {
        user: this.sanitizeUser(user),
        accessToken,
        refreshToken,
      };
    } catch (error) {
      if (error instanceof ConflictError || error instanceof ValidationError) {
        throw error;
      }
      logger.error('Registration failed:', error);
      throw new InternalError('Failed to register user');
    }
  }

  async login(data: LoginInput): Promise<AuthResponse> {
    try {
      // Find user with password
      const user = await userRepository.findByEmail(data.email);

      if (!user) {
        throw new AuthError('Invalid email or password');
      }

      if (!user.is_active) {
        throw new AuthError('Account is deactivated');
      }

      if (user.is_deleted) {
        throw new AuthError('Account has been deleted');
      }

      // Compare password
      const isPasswordValid = await user.comparePassword(data.password);

      if (!isPasswordValid) {
        throw new AuthError('Invalid email or password');
      }

      // Generate tokens
      const { accessToken, refreshToken, refreshExpires } = generateTokenPair(
        user._id,
        user.email,
        user.role
      );

      // Save refresh token
      await userRepository.updateRefreshToken(user._id, refreshToken, refreshExpires);

      // Clean expired tokens
      await userRepository.cleanExpiredTokens(user._id);

      logger.info(`User logged in: ${user.email}`);

      return {
        user: this.sanitizeUser(user),
        accessToken,
        refreshToken,
      };
    } catch (error) {
      if (error instanceof AuthError) {
        throw error;
      }
      logger.error('Login failed:', error);
      throw new InternalError('Failed to login');
    }
  }

  async refreshToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    try {
      // Verify the refresh token
      const decoded = verifyToken(refreshToken);

      // Find user
      const user = await userRepository.findById(decoded.userId);

      if (!user) {
        throw new AuthError('User not found');
      }

      if (!user.is_active || user.is_deleted) {
        throw new AuthError('Account is not active');
      }

      // Check if refresh token exists and is valid
      const tokenExists = user.refresh_token &&
        user.refresh_token.token === refreshToken &&
        user.refresh_token.expires > new Date();

      if (!tokenExists) {
        throw new AuthError('Invalid or expired refresh token');
      }

      // Remove old refresh token
      await userRepository.removeRefreshToken(user._id);

      // Generate new tokens
      const tokens = generateTokenPair(user._id, user.email, user.role);

      // Save new refresh token
      await userRepository.updateRefreshToken(
        user._id,
        tokens.refreshToken,
        tokens.refreshExpires
      );

      logger.info(`Token refreshed for user: ${user.email}`);

      return {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      };
    } catch (error) {
      if (error instanceof AuthError) {
        throw error;
      }
      logger.error('Token refresh failed:', error);
      throw new AuthError('Failed to refresh token');
    }
  }

  async logout(userId: string): Promise<void> {
    try {
      // Remove the user's refresh token
      await userRepository.removeRefreshToken(userId);

      logger.info(`User logged out: ${userId}`);
    } catch (error) {
      logger.error('Logout failed:', error);
      throw new InternalError('Failed to logout');
    }
  }

  async changePassword(
    userId: string,
    data: ChangePasswordInput
  ): Promise<void> {
    try {
      // Find user with password
      const user = await userRepository.findById(userId);

      if (!user) {
        throw new NotFoundError('User not found');
      }

      // Get user with password field
      const userWithPassword = await userRepository.findByEmail(user.email);

      if (!userWithPassword) {
        throw new NotFoundError('User not found');
      }

      // Verify current password
      const isPasswordValid = await userWithPassword.comparePassword(data.currentPassword);

      if (!isPasswordValid) {
        throw new ValidationError('Current password is incorrect');
      }

      // Update password
      userWithPassword.password = data.newPassword;
      await userWithPassword.save();

      // Invalidate all refresh tokens
      await userRepository.removeAllRefreshTokens(userId);

      logger.info(`Password changed for user: ${userId}`);
    } catch (error) {
      if (
        error instanceof NotFoundError ||
        error instanceof ValidationError ||
        error instanceof AuthError
      ) {
        throw error;
      }
      logger.error('Password change failed:', error);
      throw new InternalError('Failed to change password');
    }
  }

  async verifyEmail(token: string): Promise<void> {
    try {
      // Find user by verification token
      const user = await userRepository.findOne({
        verification_token: token,
        verification_token_expires: { $gt: new Date() },
      });

      if (!user) {
        throw new ValidationError('Invalid or expired verification token');
      }

      // Update user
      user.email_verified = true;
      user.verification_token = undefined;
      user.verification_token_expires = undefined;
      await user.save();

      // Send welcome email
      emailService.sendWelcomeEmail(user.email, user.name).catch((error) => {
        logger.error('Failed to send welcome email:', error);
      });

      logger.info(`Email verified for user: ${user.email}`);
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      logger.error('Email verification failed:', error);
      throw new InternalError('Failed to verify email');
    }
  }

  async resendVerificationEmail(email: string): Promise<void> {
    try {
      const user = await userRepository.findByEmailWithoutPassword(email);

      if (!user) {
        // Don't reveal if email exists
        return;
      }

      if (user.email_verified) {
        throw new ValidationError('Email is already verified');
      }

      // Generate new verification token
      const verificationToken = crypto.randomBytes(32).toString('hex');
      const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      // Update user
      await userRepository.updateById(user._id.toString(), {
        verification_token: verificationToken,
        verification_token_expires: verificationTokenExpires,
      });

      // Send verification email
      await emailService.sendVerificationEmail(user.email, verificationToken);

      logger.info(`Verification email resent to: ${email}`);
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      logger.error('Resend verification email failed:', error);
      throw new InternalError('Failed to resend verification email');
    }
  }

  async forgotPassword(email: string): Promise<void> {
    try {
      const user = await userRepository.findByEmailWithoutPassword(email);

      if (!user) {
        // Don't reveal if email exists
        logger.info(`Forgot password requested for non-existent email: ${email}`);
        return;
      }

      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      // Update user
      await userRepository.updateById(user._id.toString(), {
        password_reset_token: resetToken,
        password_reset_expires: resetExpires,
      });

      // Send password reset email
      await emailService.sendPasswordResetEmail(user.email, resetToken);

      logger.info(`Password reset email sent to: ${email}`);
    } catch (error) {
      logger.error('Forgot password failed:', error);
      throw new InternalError('Failed to process forgot password request');
    }
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    try {
      // Find user by reset token
      const user = await userRepository.findOne({
        password_reset_token: token,
        password_reset_expires: { $gt: new Date() },
      });

      if (!user) {
        throw new ValidationError('Invalid or expired password reset token');
      }

      // Get user with password field to update
      const userWithPassword = await userRepository.findByEmail(user.email);

      if (!userWithPassword) {
        throw new NotFoundError('User not found');
      }

      // Update password
      userWithPassword.password = newPassword;
      userWithPassword.password_reset_token = undefined;
      userWithPassword.password_reset_expires = undefined;
      await userWithPassword.save();

      // Invalidate all refresh tokens
      await userRepository.removeAllRefreshTokens(user._id.toString());

      logger.info(`Password reset successfully for: ${user.email}`);
    } catch (error) {
      if (error instanceof ValidationError || error instanceof NotFoundError) {
        throw error;
      }
      logger.error('Reset password failed:', error);
      throw new InternalError('Failed to reset password');
    }
  }

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

  private sanitizeUser(user: IUser): Partial<IUser> & { createdAt?: Date } {
    return {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
      is_active: user.is_active,
      email_verified: user.email_verified,
      createdAt: (user as unknown as { createdAt: Date }).createdAt,
    };
  }
}

export const authService = new AuthService();
