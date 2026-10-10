import crypto from 'crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import pinoHttp from 'pino-http';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';
import { authRouter } from './routes/auth.routes.js';
import { userRouter } from './routes/user.routes.js';
import { saveRouter } from './routes/save.routes.js';
import { csrfGuard } from './middlewares/csrf.js';
import { errorHandler, notFound } from './middlewares/errorHandler.js';

function requestSerializer(req) {
  const serialized = pinoHttp.stdSerializers.req(req);
  serialized.url = serialized.url.replace(/([?&]token=)[^&]*/gi, '$1[redacted]');
  if (serialized.query && Object.prototype.hasOwnProperty.call(serialized.query, 'token')) {
    serialized.query.token = '[redacted]';
  }
  return serialized;
}

export function createApp() {
  const app = express();
  const demoDirectory = fileURLToPath(new URL('../public/demo', import.meta.url));
  app.set('trust proxy', 1);
  app.use(pinoHttp({ logger, serializers: { req: requestSerializer } }));
  app.use(helmet({
    hsts: env.NODE_ENV === 'production' ? { maxAge: 15552000, includeSubDomains: true } : false
  }));
  app.use(cors({
    origin(origin, callback) {
      if (!origin || env.allowedOrigins.includes(origin) || env.allowedOrigins.includes('*')) return callback(null, true);
      try {
        const url = new URL(origin);
        if (url.hostname.endsWith('.netlify.app') || url.hostname === 'localhost' || url.protocol === 'capacitor:') {
          return callback(null, true);
        }
      } catch {}
      callback(new Error('Origem nao permitida.'));
    },
    credentials: true
  }));
  app.use(cookieParser());
  app.use('/api/v1/saves', express.json({ limit: '300kb' }));
  app.use('/.netlify/functions/api/saves', express.json({ limit: '300kb' }));
  app.use('/.netlify/functions/api/api/v1/saves', express.json({ limit: '300kb' }));
  app.use(express.json({ limit: '100kb' }));
  app.use((req, res, next) => {
    if (!req.cookies?.lg_csrf) {
      res.cookie('lg_csrf', crypto.randomBytes(16).toString('base64url'), {
        httpOnly: false,
        secure: env.COOKIE_SECURE || env.NODE_ENV === 'production',
        sameSite: env.COOKIE_SAME_SITE,
        path: '/'
      });
    }
    next();
  });
  app.use(csrfGuard);
  app.use('/demo', express.static(path.resolve(demoDirectory), { dotfiles: 'deny', index: false }));

  const apiRouter = express.Router();
  apiRouter.get('/health', (_req, res) => {
    res.json({ ok: true, data: { status: 'healthy', service: 'light-group-login' } });
  });
  apiRouter.use('/auth', authRouter);
  apiRouter.use('/users', userRouter);
  apiRouter.use('/saves', saveRouter);

  app.use('/api/v1', apiRouter);
  app.use('/.netlify/functions/api', apiRouter);
  app.use('/.netlify/functions/api/api/v1', apiRouter);
  app.use(notFound);
  app.use(errorHandler);
  return app;
}
