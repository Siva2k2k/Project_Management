import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  // Database
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/pm-dashboard',

  // JWT
  jwtSecret: process.env.JWT_SECRET || 'your-super-secret-jwt-key',
  jwtAccessExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
  jwtRefreshExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',

  // Client
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',

  // Email (to be configured)
  smtpHost: process.env.SMTP_HOST,
  smtpPort: parseInt(process.env.SMTP_PORT || '587', 10),
  smtpUser: process.env.SMTP_USER,
  smtpPass: process.env.SMTP_PASS,

  // Microsoft SSO (to be configured)
  msClientId: process.env.MS_CLIENT_ID,
  msClientSecret: process.env.MS_CLIENT_SECRET,
  msTenantId: process.env.MS_TENANT_ID,
  msRedirectUri: process.env.MS_REDIRECT_URI,

  // Organizational Hourly Rate
  organizationalHourlyRate: parseFloat(process.env.ORGANIZATIONAL_HOURLY_RATE || '50'),
};

export { connectDatabase, disconnectDatabase } from './database';
