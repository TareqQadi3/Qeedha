export enum UserStatus {
  ACTIVE = 'ACTIVE',
  PENDING_KYC = 'PENDING_KYC',
  SUSPENDED = 'SUSPENDED',
  DELETED = 'DELETED',
}

export enum MerchantStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  CLOSED = 'CLOSED',
}

export enum MerchantUserRole {
  OWNER = 'OWNER',
  MANAGER = 'MANAGER',
  CASHIER = 'CASHIER',
}

export enum FinancingPlan {
  PAY_IN_1 = 'PAY_IN_1',
  PAY_IN_30 = 'PAY_IN_30',
  INSTALLMENTS_4 = 'INSTALLMENTS_4',
}

export enum ApplicationStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
  DEFAULTED = 'DEFAULTED',
}

export enum WalletStatus {
  ACTIVE = 'ACTIVE',
  FROZEN = 'FROZEN',
  EXPIRED = 'EXPIRED',
  CLOSED = 'CLOSED',
}

export enum TransactionType {
  ACTIVATION = 'ACTIVATION',
  PURCHASE = 'PURCHASE',
  REFUND = 'REFUND',
  REVERSAL = 'REVERSAL',
}

export enum TransactionMethod {
  QR = 'QR',
  OTP = 'OTP',
  MANUAL = 'MANUAL',
}

export enum TransactionStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  REVERSED = 'REVERSED',
}

export enum SettlementStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  RECONCILED = 'RECONCILED',
}

export enum PaymentScheduleStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  OVERDUE = 'OVERDUE',
}

export enum NotificationChannel {
  SMS = 'SMS',
  PUSH = 'PUSH',
  EMAIL = 'EMAIL',
}

export enum NotificationStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  FAILED = 'FAILED',
}

export enum OtpPurpose {
  LOGIN = 'LOGIN',
  REGISTER = 'REGISTER',
  RESET_PIN = 'RESET_PIN',
  PAYMENT = 'PAYMENT',
}

export interface AuditPayload {
  actor: string;
  action: string;
  entity: string;
  entityId: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
}

export interface IdempotencyKey {
  key: string;
  resourceType: string;
  resourceId?: string;
  expiresAt: Date;
}

export interface Money {
  amount: number;
  currency: 'SAR';
}

export const QEEDHA_PRIMARY = '#0E5F58';
export const QEEDHA_SECONDARY = '#F5A623';
export const QEEDHA_TEXT = '#1E293B';
