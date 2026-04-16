import { Pool, type PoolClient } from 'pg';
import { env } from './env';
import { logger } from '../utils/logger';

export type DatabaseExecutor = Pool | PoolClient;

export function isDatabaseEnabled() {
  return Boolean(
    env.DATABASE_URL ||
      (env.DB_HOST && env.DB_NAME && env.DB_USER)
  );
}

let pool: Pool | null = null;

export function getDatabasePool() {
  if (!isDatabaseEnabled()) {
    return null;
  }

  if (pool) {
    return pool;
  }

  pool = env.DATABASE_URL
    ? new Pool({
        connectionString: env.DATABASE_URL,
        max: env.DB_POOL_MAX,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 15000,
        keepAlive: true,
        ssl:
          env.DB_SSL === 'false'
            ? false
            : { rejectUnauthorized: env.DB_SSL_REJECT_UNAUTHORIZED === 'true' },
      })
    : new Pool({
        host: env.DB_HOST,
        port: env.DB_PORT,
        database: env.DB_NAME,
        user: env.DB_USER,
        password: env.DB_PASSWORD || '',
        max: env.DB_POOL_MAX,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 15000,
        keepAlive: true,
        ssl:
          env.DB_SSL === 'true'
            ? { rejectUnauthorized: env.DB_SSL_REJECT_UNAUTHORIZED === 'true' }
            : false,
      });

  pool.on('connect', () => {
    logger.info('Database connection established');
  });

  pool.on('error', (error) => {
    logger.error('Unexpected database pool error', error);
  });

  return pool;
}

export async function closeDatabasePool() {
  if (!pool) {
    return;
  }

  await pool.end();
  pool = null;
}
