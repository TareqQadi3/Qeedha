const TOKEN_KEY = 'qeedha_admin_token';
const ROLE_KEY = 'qeedha_admin_role';
const EMAIL_KEY = 'qeedha_admin_email';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getRole(): string | null {
  return localStorage.getItem(ROLE_KEY);
}

export function getEmail(): string | null {
  return localStorage.getItem(EMAIL_KEY);
}

export function setAuth(token: string, role: string, email: string) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(ROLE_KEY, role);
  localStorage.setItem(EMAIL_KEY, email);
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(ROLE_KEY);
  localStorage.removeItem(EMAIL_KEY);
}

export class ApiError extends Error {
  code: string;
  status: number;

  constructor(message: string, code: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

/** Called whenever an API response comes back 401 — lets the app fall back to the login screen. */
let unauthorizedHandler: (() => void) | null = null;

export function setUnauthorizedHandler(handler: (() => void) | null) {
  unauthorizedHandler = handler;
}

export async function api<T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`/v1${path}`, { ...options, headers });
  const text = await res.text();
  const body = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const message: string =
      body?.message ||
      (res.status === 401 ? 'انتهت الجلسة، الرجاء تسجيل الدخول' : 'حدث خطأ غير متوقع');
    const code: string = body?.code || 'ERROR';

    if (res.status === 401) {
      clearAuth();
      unauthorizedHandler?.();
    }

    throw new ApiError(message, code, res.status);
  }

  return body as T;
}
