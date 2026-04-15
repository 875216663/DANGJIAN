const DEFAULT_BACKEND_BASE_URL = 'http://localhost:9091';

export type StorageMode = 'database' | 'local-file' | 'unknown';

export interface AuthSessionUser {
  id: number;
  name: string;
  username?: string;
  role: string;
  role_label: string;
  branch_id?: number;
  branch_name?: string;
}

export interface DemoAccount {
  user_id: number;
  username: string;
  password: string;
  description: string;
  user: AuthSessionUser;
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
