import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import path from 'path';
import { config, connectDatabase } from './config';
import { errorHandler, notFoundHandler } from './middleware';
import { logger } from './utils';
import routes from './routes';

const app = express();
const PORT = config.port;

// Determine CORS origin based on environment
const corsOrigin = config.nodeEnv === 'production'
  ? [config.clientUrl, process.env.HEROKU_APP_URL || ''].filter(Boolean)
  : config.clientUrl;

// Middleware
app.use(helmet({
  contentSecurityPolicy: config.nodeEnv === 'production' ? undefined : false,
  crossOriginEmbedderPolicy: config.nodeEnv === 'production' ? undefined : false,
}));

app.use(cors({
  origin: corsOrigin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Health check route
app.get('/api/v1/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/v1', routes);

// Serve static files from the React app in production
if (config.nodeEnv === 'production') {
  const clientBuildPath = path.join(__dirname, '../../client/dist');

  app.use(express.static(clientBuildPath));

  // Handle React routing - return index.html for all non-API routes
  app.use((_req, res) => {
    res.sendFile(path.join(clientBuildPath, 'index.html'));
  });
}

// Error handling - only use notFoundHandler in development
if (config.nodeEnv !== 'production') {
  app.use(notFoundHandler);
}

app.use(errorHandler);

// Start server
const startServer = async () => {
  try {
    await connectDatabase();

    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

export default app;
