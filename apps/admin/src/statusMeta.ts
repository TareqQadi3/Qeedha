import { ApiCredentialStatus, ApplicationStatus, FinancingPlan, MerchantStatus } from './types';
import { TranslationKeys } from './i18n/ar';

export type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'info';

export const merchantStatusTone: Record<MerchantStatus, Tone> = {
  [MerchantStatus.PENDING]: 'warning',
  [MerchantStatus.ACTIVE]: 'success',
  [MerchantStatus.SUSPENDED]: 'danger',
  [MerchantStatus.CLOSED]: 'neutral',
};

export const applicationStatusTone: Record<ApplicationStatus, Tone> = {
  [ApplicationStatus.PENDING]: 'warning',
  [ApplicationStatus.APPROVED]: 'success',
  [ApplicationStatus.REJECTED]: 'danger',
  [ApplicationStatus.CANCELLED]: 'neutral',
  [ApplicationStatus.DEFAULTED]: 'danger',
};

export const credentialStatusTone: Record<ApiCredentialStatus, Tone> = {
  ACTIVE: 'success',
  REVOKED: 'neutral',
};

export function merchantStatusKey(status: MerchantStatus): TranslationKeys {
  return `merchants_status_${status}` as TranslationKeys;
}

export function applicationStatusKey(status: ApplicationStatus): TranslationKeys {
  return `applications_status_${status}` as TranslationKeys;
}

export function credentialStatusKey(status: ApiCredentialStatus): TranslationKeys {
  return `credentials_status_${status}` as TranslationKeys;
}

export function planKey(plan: FinancingPlan): TranslationKeys {
  return `plan_${plan}` as TranslationKeys;
}

/** Only PENDING financing applications may be decided (approved/rejected) by an admin. */
export function canDecideApplication(status: ApplicationStatus): boolean {
  return status === ApplicationStatus.PENDING;
}

export function formatAmount(amount: string | number): string {
  const n = typeof amount === 'string' ? Number(amount) : amount;
  if (Number.isNaN(n)) return String(amount);
  return `${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-GB', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}
