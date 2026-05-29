const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const { env } = require('./config/env');
const { errorHandler } = require('./middleware/errorHandler');

function createApp() {
  const app = express();

  // Security & logging
  app.use(helmet());
  app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

  // Stripe webhooks need raw body - mount BEFORE json parser
  app.use('/api/v1/webhooks/stripe', express.raw({ type: 'application/json' }));

  // Body parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  // Health check
  app.get('/api/v1/health', (_req, res) => {
    res.json({ status: 'ok', uptime: process.uptime() });
  });

  // API routes - lazy require to avoid circular deps during startup
  app.use('/api/v1', require('./routes'));

  // 404 handler
  app.use((_req, res) => {
    res.status(404).json({ success: false, error: { message: 'Not found', code: 'NOT_FOUND' } });
  });

  // Global error handler
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
