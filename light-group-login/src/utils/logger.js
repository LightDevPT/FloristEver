import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'res.headers["set-cookie"]',
      '*.password',
      '*.confirmPassword',
      '*.token',
      '*.refreshToken',
      '*.accessToken'
    ],
    censor: '[redacted]'
  }
});
