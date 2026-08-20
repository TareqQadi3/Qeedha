import * as SecureStore from 'expo-secure-store';

/**
 * All auth-sensitive values (tokens, PIN presence flag) live in SecureStore,
 * never in plain AsyncStorage. Only the language preference — not sensitive —
 * is also stored here for a single, simple storage surface.
 */
const KEYS = {
  accessToken: 'qeedha_customer_access_token',
  refreshToken: 'qeedha_customer_refresh_token',
  pinIsSet: 'qeedha_customer_pin_is_set',
  language: 'qeedha_customer_language',
} as const;

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export async function getTokens(): Promise<AuthTokens | null> {
  const [accessToken, refreshToken] = await Promise.all([
    SecureStore.getItemAsync(KEYS.accessToken),
    SecureStore.getItemAsync(KEYS.refreshToken),
  ]);
  if (!accessToken || !refreshToken) return null;
  return { accessToken, refreshToken };
}

export async function setTokens(tokens: AuthTokens): Promise<void> {
  await Promise.all([
    SecureStore.setItemAsync(KEYS.accessToken, tokens.accessToken),
    SecureStore.setItemAsync(KEYS.refreshToken, tokens.refreshToken),
  ]);
}

export async function clearTokens(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(KEYS.accessToken),
    SecureStore.deleteItemAsync(KEYS.refreshToken),
  ]);
}

export async function getAccessToken(): Promise<string | null> {
  return SecureStore.getItemAsync(KEYS.accessToken);
}

export async function setAccessToken(accessToken: string): Promise<void> {
  await SecureStore.setItemAsync(KEYS.accessToken, accessToken);
}

/** Whether this device has already completed PIN setup (never stores the PIN itself). */
export async function getPinIsSet(): Promise<boolean> {
  const value = await SecureStore.getItemAsync(KEYS.pinIsSet);
  return value === 'true';
}

export async function setPinIsSet(isSet: boolean): Promise<void> {
  await SecureStore.setItemAsync(KEYS.pinIsSet, isSet ? 'true' : 'false');
}

export async function clearAll(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(KEYS.accessToken),
    SecureStore.deleteItemAsync(KEYS.refreshToken),
    SecureStore.deleteItemAsync(KEYS.pinIsSet),
  ]);
}

/** Storage adapter for I18nProvider, backed by SecureStore for consistency. */
export const languageStorage = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
};
