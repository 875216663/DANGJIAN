import { createHmac, timingSafeEqual } from 'crypto';
import { env } from '../config/env';

export interface AuthTokenPayload {
  userId: number;
  role: string;
  branchId?: number;
  username?: string;
  exp: number;
}

function toBase64Url(value: string) {
  return Buffer.from(value)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function fromBase64Url(value: string) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  return Buffer.from(padded, 'base64').toString('utf8');
}

function sign(rawPayload: string) {
  return createHmac('sha256', env.JWT_SECRET).update(rawPayload).digest('base64url');
}

export function createAuthToken(payload: Omit<AuthTokenPayload, 'exp'>) {
  const body: AuthTokenPayload = {
    ...payload,
    exp: Date.now() + env.TOKEN_EXPIRES_IN_HOURS * 60 * 60 * 1000,
  };

  const encoded = toBase64Url(JSON.stringify(body));
  const signature = sign(encoded);
  return `${encoded}.${signature}`;
}

export function verifyAuthToken(token: string) {
  const [encodedPayload, signature] = token.split('.');

  if (!encodedPayload || !signature) {
    return null;
  }

  const expectedSignature = sign(encodedPayload);
  const providedSignatureBuffer = Buffer.from(signature);
  const expectedSignatureBuffer = Buffer.from(expectedSignature);

  if (providedSignatureBuffer.length !== expectedSignatureBuffer.length) {
    return null;
  }

  const isValidSignature = timingSafeEqual(
    providedSignatureBuffer,
    expectedSignatureBuffer
  );

  if (!isValidSignature) {
    return null;
  }

  try {
    const payload = JSON.parse(fromBase64Url(encodedPayload)) as AuthTokenPayload;
    if (payload.exp <= Date.now()) {
      return null;
    }

    return payload;
  } catch (_error) {
    return null;
  }
}
