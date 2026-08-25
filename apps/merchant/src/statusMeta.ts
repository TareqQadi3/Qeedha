import { SettlementStatus, TransactionStatus, TransactionType } from './types';
import { Tone } from './components/Badge';
import { TranslationKeys } from './i18n/ar';

export const transactionStatusTone: Record<TransactionStatus, Tone> = {
  PENDING: 'warning',
  COMPLETED: 'success',
  FAILED: 'danger',
  REVERSED: 'neutral',
};

export const settlementStatusTone: Record<SettlementStatus, Tone> = {
  PENDING: 'warning',
  PAID: 'info',
  RECONCILED: 'success',
};

export function transactionStatusKey(status: TransactionStatus): TranslationKeys {
  return `transaction_status_${status}` as TranslationKeys;
}

export function transactionTypeKey(type: TransactionType): TranslationKeys {
  return `transaction_type_${type}` as TranslationKeys;
}

export function settlementStatusKey(status: SettlementStatus): TranslationKeys {
  return `settlements_status_${status}` as TranslationKeys;
}

/** Only a COMPLETED PURCHASE transaction can be refunded from this dashboard. */
export function canRefund(type: TransactionType, status: TransactionStatus): boolean {
  return type === 'PURCHASE' && status === 'COMPLETED';
}

export function formatAmount(amount: string | number): string {
  const n = typeof amount === 'string' ? Number(amount) : amount;
  if (Number.isNaN(n)) return String(amount);
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('ar-SA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}
