import rateLimit from 'express-rate-limit';

const jsonHandler = (_req, res) => {
  res.status(429).json({
    ok: false,
    error: { code: 'RATE_LIMITED', message: 'Demasiados pedidos. Tenta novamente mais tarde.' }
  });
};

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 80,
  standardHeaders: true,
  legacyHeaders: false,
  handler: jsonHandler
});

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: jsonHandler,
  keyGenerator: (req) => `${req.ip}:${String(req.body?.identifier || '').toLowerCase().slice(0, 254)}`
});

export const saveLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  handler: jsonHandler
});
