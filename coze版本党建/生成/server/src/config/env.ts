import 'dotenv/config';
import { z } from 'zod';

const DEFAULT_JWT_SECRET = 'dangjian-demo-secret-change-me';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(5000),
  DATABASE_URL: z.string().optional(),
  DB_HOST: z.string().optional(),
  DB_PORT: z.coerce.number().int().positive().optional(),
  DB_NAME: z.string().optional(),
  DB_USER: z.string().optional(),
  DB_PASSWORD: z.string().optional(),
  DB_SSL: z.enum(['true', 'false']).default('true'),
  DB_SSL_REJECT_UNAUTHORIZED: z.enum(['true', 'false']).default('false'),
  DB_POOL_MAX: z.coerce.number().int().positive().default(10),
  JWT_SECRET: z.string().min(16).default(DEFAULT_JWT_SECRET),
  TOKEN_EXPIRES_IN_HOURS: z.coerce.number().int().positive().default(24),
  CORS_ORIGIN: z.string().default('*'),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  PUBLIC_APP_URL: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  throw new Error(`Invalid environment variables: ${parsed.error.message}`);
}

if (parsed.data.NODE_ENV === 'production' && parsed.data.JWT_SECRET === DEFAULT_JWT_SECRET) {
  throw new Error('JWT_SECRET must be set explicitly in production');
}

export const env = parsed.data;

export const isProduction = env.NODE_ENV === 'production';

function getConfiguredOrigins() {
  return env.CORS_ORIGIN.split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export function isOriginAllowed(origin?: string) {
  if (!origin) {
    return true;
  }

  if (env.CORS_ORIGIN.trim() === '*') {
    return true;
  }

  if (getConfiguredOrigins().includes(origin)) {
    return true;
  }

  try {
    const { hostname } = new URL(origin);
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return true;
    }

    if (hostname.endsWith('.vercel.app')) {
      return true;
    }
  } catch {
    return false;
  }

  return false;
}
