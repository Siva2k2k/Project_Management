import { ConfidentialClientApplication, AuthorizationCodeRequest } from '@azure/msal-node';
import { config } from '../config';
import { userRepository } from '../dbrepo';
import { generateTokenPair } from '../utils/jwt';
import { AuthError, InternalError } from '../utils/errors';
import { logger } from '../utils';
import { IUser, UserRole } from '../types';

interface MicrosoftUserInfo {
  id: string;
  displayName: string;
  mail: string;
  userPrincipalName: string;
}

class MicrosoftAuthService {
  private msalClient: ConfidentialClientApplication | null = null;

  private getMsalClient(): ConfidentialClientApplication {
    if (this.msalClient) {
      return this.msalClient;
    }

    if (!config.msClientId || !config.msClientSecret || !config.msTenantId) {
      throw new AuthError('Microsoft SSO is not configured');
    }

    this.msalClient = new ConfidentialClientApplication({
      auth: {
        clientId: config.msClientId,
        authority: `https://login.microsoftonline.com/${config.msTenantId}`,
        clientSecret: config.msClientSecret,
      },
    });

    return this.msalClient;
  }

  async getAuthUrl(): Promise<string> {
    try {
      const msalClient = this.getMsalClient();

      const authCodeUrlParameters = {
        scopes: ['user.read', 'email', 'profile', 'openid'],
        redirectUri: config.msRedirectUri || 'http://localhost:5000/api/v1/auth/microsoft/callback',
      };

      // Generate auth URL synchronously with state parameter for CSRF protection
      const state = Buffer.from(JSON.stringify({ timestamp: Date.now() })).toString('base64');

      return await msalClient.getAuthCodeUrl({
        ...authCodeUrlParameters,
        state,
      });
    } catch (error) {
      logger.error('Failed to generate Microsoft auth URL:', error);
      throw new InternalError('Failed to initiate Microsoft authentication');
    }
  }

  async getAuthUrlAsync(): Promise<string> {
    try {
      const msalClient = this.getMsalClient();

      const authCodeUrlParameters = {
        scopes: ['user.read', 'email', 'profile', 'openid'],
        redirectUri: config.msRedirectUri || 'http://localhost:5000/api/v1/auth/microsoft/callback',
        state: Buffer.from(JSON.stringify({ timestamp: Date.now() })).toString('base64'),
      };

      const authUrl = await msalClient.getAuthCodeUrl(authCodeUrlParameters);
      return authUrl;
    } catch (error) {
      logger.error('Failed to generate Microsoft auth URL:', error);
      throw new InternalError('Failed to initiate Microsoft authentication');
    }
  }

  async handleCallback(code: string): Promise<{
    user: Partial<IUser>;
    accessToken: string;
    refreshToken: string;
  }> {
    try {
      const msalClient = this.getMsalClient();

      const tokenRequest: AuthorizationCodeRequest = {
        code,
        scopes: ['user.read', 'email', 'profile', 'openid'],
        redirectUri: config.msRedirectUri || 'http://localhost:5000/api/v1/auth/microsoft/callback',
      };

      // Exchange code for tokens
      const response = await msalClient.acquireTokenByCode(tokenRequest);

      if (!response || !response.accessToken) {
        throw new AuthError('Failed to acquire token from Microsoft');
      }

      // Get user info from Microsoft Graph
      const userInfo = await this.getUserInfo(response.accessToken);

      // Find or create user
      const user = await this.findOrCreateUser(userInfo);

      // Generate our JWT tokens
      const tokens = generateTokenPair(user._id, user.email, user.role);

      // Save refresh token
      await userRepository.updateRefreshToken(
        user._id,
        tokens.refreshToken,
        tokens.refreshExpires
      );

      logger.info(`Microsoft SSO login successful: ${user.email}`);

      return {
        user: this.sanitizeUser(user),
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      };
    } catch (error) {
      if (error instanceof AuthError) {
        throw error;
      }
      logger.error('Microsoft SSO callback failed:', error);
      throw new InternalError('Failed to complete Microsoft authentication');
    }
  }

  private async getUserInfo(accessToken: string): Promise<MicrosoftUserInfo> {
    try {
      const response = await fetch('https://graph.microsoft.com/v1.0/me', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new AuthError('Failed to fetch user info from Microsoft');
      }

      const userInfo = await response.json();
      return userInfo as MicrosoftUserInfo;
    } catch (error) {
      if (error instanceof AuthError) {
        throw error;
      }
      logger.error('Failed to get Microsoft user info:', error);
      throw new InternalError('Failed to retrieve user information');
    }
  }

  private async findOrCreateUser(userInfo: MicrosoftUserInfo): Promise<IUser> {
    const email = userInfo.mail || userInfo.userPrincipalName;

    if (!email) {
      throw new AuthError('No email address found in Microsoft account');
    }

    const normalizedEmail = email.toLowerCase();

    // Try to find existing user (first attempt)
    let user = await userRepository.findByEmailWithoutPassword(normalizedEmail);

    if (user) {
      // Update user info if needed
      if (user.name !== userInfo.displayName) {
        try {
          user = await userRepository.updateById(user._id.toString(), {
            name: userInfo.displayName,
            last_modified_date: new Date(),
          });
        } catch (updateError) {
          logger.warn('Failed to update user name, continuing with existing data:', updateError);
        }
      }
      return user!;
    }

    // User doesn't exist, try to create
    try {
      const newUser = await userRepository.create({
        name: userInfo.displayName,
        email: normalizedEmail,
        password: `ms_sso_${Date.now()}_${Math.random().toString(36)}`, // Random password for SSO users
        role: UserRole.MANAGER,
        is_active: true,
        email_verified: true,
        refresh_tokens: [],
      } as Partial<IUser>);

      logger.info(`New user created via Microsoft SSO: ${normalizedEmail}`);
      return newUser;
    } catch (createError: any) {
      // Handle duplicate key error - user might have been created between our check and creation attempt
      if (createError.code === 11000 || createError.message?.includes('E11000')) {
        logger.warn(`Duplicate key error for ${normalizedEmail}, fetching existing user`);

        // Try to fetch the user again
        const existingUser = await userRepository.findByEmailWithoutPassword(normalizedEmail);

        if (existingUser) {
          logger.info(`Successfully retrieved existing user: ${normalizedEmail}`);
          return existingUser;
        }

        // If we still can't find the user, something is very wrong
        logger.error(`User exists (duplicate key) but cannot be found: ${normalizedEmail}`);
        throw new InternalError('Database inconsistency detected. Please contact support.');
      }

      // For other errors, log and re-throw
      logger.error('Failed to create user:', createError);
      throw new InternalError('Failed to create user account');
    }
  }

  private sanitizeUser(user: IUser): Partial<IUser> {
    return {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
      is_active: user.is_active,
    };
  }
}

export const microsoftAuthService = new MicrosoftAuthService();
