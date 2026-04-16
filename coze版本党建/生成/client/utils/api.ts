const DEFAULT_BACKEND_BASE_URL =
  process.env.NODE_ENV === 'production'
    ? 'https://secure-harmony-production-ca68.up.railway.app'
    : 'http://localhost:9091';

export type StorageMode = 'database' | 'local-file' | 'unknown';

export interface AuthSessionUser {
  id: number;
  name: string;
  username?: string;
  role: string;
  role_label: string;
  branch_id?: number;
  branch_name?: string;
  member_id?: number;
  mobile?: string;
  status?: string;
  is_demo?: boolean;
}

export interface DemoAccount {
  user_id: number;
  username: string;
  password: string;
  description: string;
  user: AuthSessionUser;
}

export interface AuthSessionPayload {
  token: string;
  user: AuthSessionUser;
  expiresInHours: number;
  storage: StorageMode;
}

export interface ApiEnvelope<T> {
  code: number;
  message: string;
  data: T;
  meta?: Record<string, unknown>;
  details?: unknown;
}

export function getBackendBaseUrl() {
  return (process.env.EXPO_PUBLIC_BACKEND_BASE_URL || DEFAULT_BACKEND_BASE_URL).replace(/\/$/, '');
}

export function getApiUrl(path: string) {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${getBackendBaseUrl()}${normalizedPath}`;
}

export function getRequestUrl(input: RequestInfo | URL) {
  if (typeof input === 'string') {
    return input;
  }

  if (typeof URL !== 'undefined' && input instanceof URL) {
    return input.toString();
  }

  return input.url;
}

export function shouldAttachAuthHeaders(input: RequestInfo | URL) {
  const requestUrl = getRequestUrl(input);
  const backendBaseUrl = getBackendBaseUrl();

  return requestUrl.startsWith(`${backendBaseUrl}/api/`) || requestUrl.startsWith('/api/');
}

export function unwrapApiData<T>(payload: unknown): T {
  if (
    payload &&
    typeof payload === 'object' &&
    'code' in payload &&
    'data' in payload
  ) {
    return (payload as ApiEnvelope<T>).data;
  }

  return payload as T;
}

export function getApiMessage(payload: unknown, fallback = '请求失败') {
  if (!payload || typeof payload !== 'object') {
    return fallback;
  }

  const record = payload as Record<string, unknown>;
  if (typeof record.message === 'string' && record.message.trim()) {
    return record.message;
  }

  if (typeof record.error === 'string' && record.error.trim()) {
    return record.error;
  }

  return fallback;
}

export async function requestJson<T>(path: string, init?: RequestInit) {
  const response = await fetch(getApiUrl(path), init);
  const payload = await response.json().catch(() => null);
  const meta =
    payload && typeof payload === 'object' && 'meta' in payload
      ? ((payload as ApiEnvelope<T>).meta ?? undefined)
      : undefined;

  if (!response.ok) {
    throw new Error(getApiMessage(payload, '请求失败'));
  }

  return {
    response,
    payload,
    data: unwrapApiData<T>(payload),
    meta,
    message: getApiMessage(payload, '请求成功'),
  };
}
