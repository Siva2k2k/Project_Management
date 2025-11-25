import jwt, { JwtPayload, SignOptions } from 'jsonwebtoken';
import { Types } from 'mongoose';
import { config } from '../config';
import { AuthError } from './errors';

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
}

export interface DecodedToken extends JwtPayload {
  userId: string;
  email: string;
  role: string;
}

export const generateAccessToken = (payload: TokenPayload): string => {
  try {
    return jwt.sign(payload, config.jwtSecret, {
      expiresIn: config.jwtAccessExpiry,
    } as SignOptions);
  } catch (error) {
    throw new AuthError('Failed to generate access token');
  }
};

export const generateRefreshToken = (payload: TokenPayload): string => {
  try {
    return jwt.sign(payload, config.jwtSecret, {
      expiresIn: config.jwtRefreshExpiry,
    } as SignOptions);
  } catch (error) {
    throw new AuthError('Failed to generate refresh token');
  }
};

export const verifyToken = (token: string): DecodedToken => {
  try {
    const decoded = jwt.verify(token, config.jwtSecret) as DecodedToken;
    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new AuthError('Token has expired');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new AuthError('Invalid token');
    }
    throw new AuthError('Token verification failed');
  }
};

export const generateTokenPair = (
  userId: Types.ObjectId | string,
  email: string,
  role: string
): { accessToken: string; refreshToken: string; refreshExpires: Date } => {
  const payload: TokenPayload = {
    userId: userId.toString(),
    email,
    role,
  };

  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  // Calculate refresh token expiry
  const refreshExpires = new Date();
  const expiryDays = parseInt(config.jwtRefreshExpiry.replace('d', ''), 10) || 7;
  refreshExpires.setDate(refreshExpires.getDate() + expiryDays);

  return { accessToken, refreshToken, refreshExpires };
};

export const decodeToken = (token: string): DecodedToken | null => {
  try {
    return jwt.decode(token) as DecodedToken;
  } catch {
    return null;
  }
};
