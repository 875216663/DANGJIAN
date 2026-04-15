import 'dotenv/config';
import { Pool } from 'pg';

function parsePort(value?: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 5432;
}

export function isDatabaseEnabled() {
  return Boolean(
    process.env.DATABASE_URL ||
      (process.env.DB_HOST && process.env.DB_NAME && process.env.DB_USER)
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

  pool = process.env.DATABASE_URL
    ? new Pool({
        connectionString: process.env.DATABASE_URL,
        max: 5,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 20000,
        keepAlive: true,
        ssl:
          process.env.DB_SSL === 'false'
            ? false
            : { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false' },
      })
    : new Pool({
        host: process.env.DB_HOST,
        port: parsePort(process.env.DB_PORT),
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD || '',
        max: 5,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 20000,
        keepAlive: true,
        ssl:
          process.env.DB_SSL === 'true'
            ? { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false' }
            : false,
      });

  pool.on('connect', () => {
    console.log('Database connected successfully');
  });

  pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
  });

  return pool;
}
