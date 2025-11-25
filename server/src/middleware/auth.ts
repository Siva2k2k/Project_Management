import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
import { AuthError, ForbiddenError } from '../utils/errors';
import { userRepository } from '../dbrepo';
import { IUser, UserRole } from '../types';

export interface AuthRequest extends Request {
  user?: IUser;
}

export const authenticate = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AuthError('No token provided');
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      throw new AuthError('Invalid authorization header format');
    }

    const decoded = verifyToken(token);

    const user = await userRepository.findById(decoded.userId);

    if (!user) {
      throw new AuthError('User not found');
    }

    if (!user.is_active) {
      throw new AuthError('User account is deactivated');
    }

    if (user.is_deleted) {
      throw new AuthError('User account has been deleted');
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

export const authorize = (...roles: UserRole[]) => {
  return (req: AuthRequest, _res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        throw new AuthError('Authentication required');
      }

      if (!roles.includes(req.user.role as UserRole)) {
        throw new ForbiddenError(
          `Access denied. Required roles: ${roles.join(', ')}`
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

export const optionalAuth = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      return next();
    }

    try {
      const decoded = verifyToken(token);
      const user = await userRepository.findById(decoded.userId);

      if (user && user.is_active && !user.is_deleted) {
        req.user = user;
      }
    } catch {
      // Token invalid but optional, continue without user
    }

    next();
  } catch (error) {
    next(error);
  }
};
