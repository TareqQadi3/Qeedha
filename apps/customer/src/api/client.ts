import { clearTokens, getAccessToken, getTokens, setTokens } from '../storage/secureStorage';

const DEFAULT_BASE_URL = 'http://localhost:3001/v1';

function getBaseUrl(): string {
  return process.env.EXPO_PUBLIC_API_URL || DEFAULT_BASE_URL;
}

export interface ApiErrorShape {
  message: string;
  code: string;
  status: number;
}

export class ApiError extends Error implements ApiErrorShape {
  code: string;
  status: number;

  constructor(message: string, code: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
  }
}

/** Called once a silent refresh-and-retry has also failed with 401 — the app should force logout. */
type UnauthorizedHandler = () => void;
let unauthorizedHandler: UnauthorizedHandler | null = null;

export function setUnauthorizedHandler(handler: UnauthorizedHandler | null): void {
  unauthorizedHandler = handler;
}

// Coalesce concurrent 401s onto a single in-flight refresh call.
let refreshInFlight: Promise<boolean> | null = null;

async function performRefresh(): Promise<boolean> {
  const tokens = await getTokens();
  if (!tokens) return false;

  try {
    const res = await fetch(`${getBaseUrl()}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: tokens.refreshToken }),
    });
    const text = await res.text();
    const body = text ? JSON.parse(text) : null;
    if (!res.ok || !body?.accessToken || !body?.refreshToken) return false;

    await setTokens({ accessToken: body.accessToken, refreshToken: body.refreshToken });
    return true;
  } catch {
    return false;
  }
}

function refreshOnce(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = performRefresh().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

export interface ApiOptions extends RequestInit {
  /** Skip attaching the Authorization header (e.g. for otp/send before login). */
  skipAuth?: boolean;
}

export async function api<T = unknown>(
  path: string,
  options: ApiOptions = {},
  _isRetry = false,
): Promise<T> {
  const { skipAuth, ...init } = options;
  const token = skipAuth ? null : await getAccessToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string> | undefined),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${getBaseUrl()}${path}`, { ...init, headers });
  const text = await res.text();
  const body = text ? JSON.parse(text) : null;

  if (!res.ok) {
    if (res.status === 401 && !skipAuth && !_isRetry) {
      const refreshed = await refreshOnce();
      if (refreshed) {
        return api<T>(path, options, true);
      }
      await clearTokens();
      unauthorizedHandler?.();
    }

    const message = body?.message || 'Unexpected error';
    const code = body?.code || 'ERROR';
    throw new ApiError(message, code, res.status);
  }

  return body as T;
}
