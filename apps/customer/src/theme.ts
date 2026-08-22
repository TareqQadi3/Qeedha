import { QEEDHA_PRIMARY, QEEDHA_SECONDARY, QEEDHA_TEXT } from '@qeedha/shared';

/**
 * Central place for brand tokens used across the customer app.
 * Colors are re-exported from @qeedha/shared — never hardcode hex values in screens.
 */
export const colors = {
  primary: QEEDHA_PRIMARY,
  secondary: QEEDHA_SECONDARY,
  text: QEEDHA_TEXT,
  background: '#FFFFFF',
  surface: '#F4F6F6',
  border: '#E2E8F0',
  muted: '#64748B',
  danger: '#DC2626',
  success: '#16A34A',
  warning: '#F59E0B',
  white: '#FFFFFF',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 20,
  pill: 999,
};

export const fontSize = {
  sm: 13,
  md: 15,
  lg: 18,
  xl: 22,
  xxl: 28,
};
