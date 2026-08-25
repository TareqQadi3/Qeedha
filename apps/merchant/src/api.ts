const TOKEN_KEY = 'qeedha_merchant_token';
const MERCHANT_KEY = 'qeedha_merchant_id';
const ROLE_KEY = 'qeedha_merchant_role';
const USER_KEY = 'qeedha_merchant_user';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setAuth(token: string, merchantId: string, role: string, userId: string) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(MERCHANT_KEY, merchantId);
  localStorage.setItem(ROLE_KEY, role);
  localStorage.setItem(USER_KEY, userId);
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(MERCHANT_KEY);
  localStorage.removeItem(ROLE_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getMerchantId(): string | null {
  return localStorage.getItem(MERCHANT_KEY);
}

export function getRole(): string | null {
  return localStorage.getItem(ROLE_KEY);
}

export function getUserId(): string | null {
  return localStorage.getItem(USER_KEY);
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
    const message =
      body?.message ||
      body?.error ||
      (res.status === 401 ? 'انتهت الجلسة، الرجاء تسجيل الدخول' : 'حدث خطأ غير متوقع');
    const code = body?.code || 'ERROR';
    const err = new Error(message) as Error & { code: string; status: number };
    err.code = code;
    err.status = res.status;
    throw err;
  }
  return body as T;
}
