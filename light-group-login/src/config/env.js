import 'dotenv/config';
import { z } from 'zod';

const boolish = z.preprocess((value) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return ['1', 'true', 'yes', 'sim'].includes(value.toLowerCase());
  return value;
}, z.boolean());

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  PUBLIC_BASE_URL: z.string().url().default('http://localhost:4000'),
  SUPABASE_URL: z.string().url(),
  SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  SUPABASE_SECRET_KEY: z.string().min(1),
  ALLOWED_ORIGINS: z.string().default('http://localhost:8080,http://localhost:4000'),
  APP_IDS: z.string().default('floristever'),
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET deve ter pelo menos 32 bytes/caracteres.'),
  HIBP_CHECK: boolish.default(false),
  REQUIRE_EMAIL_VERIFICATION: boolish.default(true),
  ACCESS_TOKEN_MINUTES: z.coerce.number().int().positive().default(15),
  REFRESH_TOKEN_DAYS: z.coerce.number().int().positive().default(14),
  REFRESH_TOKEN_REMEMBER_DAYS: z.coerce.number().int().positive().default(30),
  COOKIE_SECURE: boolish.default(false),
  COOKIE_SAME_SITE: z.enum(['strict', 'lax', 'none']).default('lax'),
  SMTP_HOST: z.string().default(''),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_SECURE: boolish.default(false),
  SMTP_USER: z.string().default(''),
  SMTP_PASS: z.string().default(''),
  SMTP_FROM: z.string().default('Light Group <no-reply@lightgroup.local>')
}).superRefine((values, context) => {
  if (!values.SUPABASE_SECRET_KEY.startsWith('sb_secret_')) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['SUPABASE_SECRET_KEY'],
      message: 'Usa uma chave Supabase Secret Key do servidor; não uses uma chave exposta ou publishable.'
    });
  }
  if (values.NODE_ENV === 'production' && !values.SMTP_HOST) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['SMTP_HOST'],
      message: 'SMTP_HOST é obrigatório em produção para verificação e recuperação de conta.'
    });
  }
});

const parsed = schema.safeParse({
  ...process.env,
  ...(process.env.NODE_ENV === 'test' ? {
    SUPABASE_URL: process.env.SUPABASE_URL || 'http://127.0.0.1:54321',
    SUPABASE_PUBLISHABLE_KEY: process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || 'test-anon-key',
    SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || 'sb_secret_test-only'
  } : {})
});

if (!parsed.success) {
  console.error('Configuracao invalida:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = {
  ...parsed.data,
  allowedOrigins: parsed.data.ALLOWED_ORIGINS.split(',').map((origin) => origin.trim()).filter(Boolean),
  appIds: parsed.data.APP_IDS.split(',').map((appId) => appId.trim()).filter(Boolean)
};
