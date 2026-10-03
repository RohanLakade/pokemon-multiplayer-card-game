import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createApiRouter } from './routes/index.js';
import { createRateLimiters } from './middleware/rateLimiters.js';
import { notFound } from './middleware/notFound.js';
import { errorHandler } from './middleware/errorHandler.js';

// Builds the Express app without starting it, so tests can start their own copy.
export function createApp(config) {
  const app = express();
  const limiters = createRateLimiters();

  // Needed so rate limits see each visitor's real IP address behind Render's proxy
  app.set('trust proxy', config.trustProxy);

  // Order matters: security headers and CORS first, then body parsing, then routes
  app.use(helmet());
  app.use(cors({ origin: config.clientOrigin, methods: ['GET', 'POST'] }));
  app.use(express.json({ limit: '10kb' }));

  app.use('/api', limiters.api, createApiRouter(limiters));

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
