import { Request, Response, NextFunction } from 'express';
import { AppError, ValidationError } from '../utils/errors';
import logger from '../utils/logger';
import { sendError } from '../utils/response';
import mongoose from 'mongoose';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): Response => {
  // Log the error
  logger.error(err.message, { stack: err.stack, path: req.path, method: req.method });

  // Handle known operational errors
  if (err instanceof AppError) {
    if (err instanceof ValidationError) {
      return sendError(res, err.message, err.statusCode, err.errors);
    }
    return sendError(res, err.message, err.statusCode);
  }

  // Handle Mongoose validation errors
  if (err instanceof mongoose.Error.ValidationError) {
    const errors = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
    return sendError(res, 'Validation failed', 400, errors);
  }

  // Handle Mongoose cast errors (invalid ObjectId)
  if (err instanceof mongoose.Error.CastError) {
    return sendError(res, `Invalid ${err.path}: ${err.value}`, 400);
  }

  // Handle MongoDB duplicate key error
  if (err.name === 'MongoServerError' && (err as unknown as { code: number }).code === 11000) {
    const keyValue = (err as unknown as { keyValue: Record<string, unknown> }).keyValue;
    const field = Object.keys(keyValue)[0];
    return sendError(res, `Duplicate value for field: ${field}`, 409);
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    return sendError(res, 'Invalid token', 401);
  }

  if (err.name === 'TokenExpiredError') {
    return sendError(res, 'Token expired', 401);
  }

  // Default to 500 internal server error
  const statusCode = 500;
  const message =
    process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message || 'Internal server error';

  return sendError(res, message, statusCode);
};

export const notFoundHandler = (
  req: Request,
  res: Response,
  _next: NextFunction
): Response => {
  return sendError(res, `Route ${req.originalUrl} not found`, 404);
};
