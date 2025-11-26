import { Router, Response, NextFunction } from 'express';
import { authService } from '../services/authService';
import { microsoftAuthService } from '../services/microsoftAuthService';
import { authenticate, AuthRequest, validate } from '../middleware';
import { sendSuccess, sendCreated, sendNoContent } from '../utils/response';
import { config } from '../config';
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
} from '../validators/auth';

const router = Router();

// POST /api/v1/auth/register
router.post(
  '/register',
  validate(registerSchema),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const result = await authService.register(req.body);

      // Set refresh token as HTTP-only cookie
      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      sendCreated(res, {
        user: result.user,
        accessToken: result.accessToken,
      }, 'Registration successful');
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/v1/auth/login
router.post(
  '/login',
  validate(loginSchema),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const result = await authService.login(req.body);

      // Set refresh token as HTTP-only cookie
      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      sendSuccess(res, {
        user: result.user,
        accessToken: result.accessToken,
      }, 'Login successful');
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/v1/auth/refresh
router.post(
  '/refresh',
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      // Get refresh token from cookie or body
      const refreshToken = (req.cookies && req.cookies.refreshToken) || req.body?.refreshToken;

      if (!refreshToken) {
        res.status(401).json({
          success: false,
          message: 'Refresh token is required',
        });
        return;
      }

      const result = await authService.refreshToken(refreshToken);

      // Update refresh token cookie
      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      sendSuccess(res, {
        accessToken: result.accessToken,
      }, 'Token refreshed successfully');
    } catch (error) {
      // Clear the invalid refresh token cookie
      res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
      });
      next(error);
    }
  }
);

// POST /api/v1/auth/logout
router.post(
  '/logout',
  authenticate,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const refreshToken = req.cookies?.refreshToken || req.body.refreshToken;

      await authService.logout(req.user!._id.toString(), refreshToken);

      // Clear refresh token cookie
      res.clearCookie('refreshToken');

      sendNoContent(res);
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/v1/auth/forgot-password
router.post(
  '/forgot-password',
  validate(forgotPasswordSchema),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      await authService.forgotPassword(req.body.email);

      // Always return success to prevent email enumeration
      sendSuccess(res, null, 'If the email exists, a reset link will be sent');
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/v1/auth/reset-password
router.post(
  '/reset-password',
  validate(resetPasswordSchema),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      await authService.resetPassword(req.body.token, req.body.password);

      sendSuccess(res, null, 'Password reset successful');
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/v1/auth/verify-email/:token
router.get(
  '/verify-email/:token',
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      await authService.verifyEmail(req.params.token);

      // Redirect to frontend with success message
      res.redirect(`${config.clientUrl}/login?verified=true`);
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/v1/auth/resend-verification
router.post(
  '/resend-verification',
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      await authService.resendVerificationEmail(req.body.email);

      sendSuccess(res, null, 'If the email exists and is not verified, a verification link will be sent');
    } catch (error) {
      next(error);
    }
  }
);

// PUT /api/v1/auth/change-password
router.put(
  '/change-password',
  authenticate,
  validate(changePasswordSchema),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      await authService.changePassword(req.user!._id.toString(), req.body);

      // Clear refresh token cookie after password change
      res.clearCookie('refreshToken');

      sendSuccess(res, null, 'Password changed successfully');
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/v1/auth/me
router.get(
  '/me',
  authenticate,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const profile = await authService.getProfile(req.user!._id.toString());

      sendSuccess(res, profile);
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/v1/auth/microsoft - Initiate Microsoft OAuth flow
router.get(
  '/microsoft',
  async (_req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const authUrl = await microsoftAuthService.getAuthUrlAsync();
      res.redirect(authUrl);
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/v1/auth/microsoft/callback - Handle Microsoft OAuth callback
router.get(
  '/microsoft/callback',
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { code, error, error_description } = req.query;

      if (error) {
        return res.redirect(
          `${config.clientUrl}/login?error=${encodeURIComponent(error_description as string || error as string)}`
        );
      }

      if (!code || typeof code !== 'string') {
        return res.redirect(
          `${config.clientUrl}/login?error=${encodeURIComponent('Authorization code not provided')}`
        );
      }

      const result = await microsoftAuthService.handleCallback(code);

      // Set refresh token as HTTP-only cookie
      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      // Redirect to frontend with access token
      res.redirect(
        `${config.clientUrl}/auth/callback?token=${result.accessToken}`
      );
    } catch (error) {
      next(error);
    }
  }
);

export default router;
