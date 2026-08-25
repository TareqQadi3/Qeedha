/** Local, merchant-app-scoped types — mirrors apps/api/prisma/schema.prisma. Not shared across apps. */

export type MerchantUserRole = 'OWNER' | 'MANAGER' | 'CASHIER';

/** MerchantUser.status is a free-form string column (default "ACTIVE") — these are the two
 * business-meaningful values this dashboard offers. */
export type MerchantUserStatus = 'ACTIVE' | 'SUSPENDED';

export interface Branch {
  id: string;
  merchantId: string;
  name: string;
  geoLocation: Record<string, number> | null;
  createdAt: string;
}

export interface MerchantUserSummary {
  id: string;
  merchantId: string;
  role: MerchantUserRole;
  phone: string;
  fullName: string | null;
  status: string;
  createdAt: string;
}

export type TransactionType = 'ACTIVATION' | 'PURCHASE' | 'REFUND' | 'REVERSAL';
export type TransactionMethod = 'QR' | 'OTP' | 'MANUAL';
export type TransactionStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'REVERSED';

export interface TransactionRow {
  id: string;
  walletId: string;
  branchId: string | null;
  cashierId: string | null;
  type: TransactionType;
  amount: string | number;
  method: TransactionMethod;
  status: TransactionStatus;
  createdAt: string;
}

export type SettlementStatus = 'PENDING' | 'PAID' | 'RECONCILED';

export interface Settlement {
  id: string;
  merchantId: string;
  period: string;
  gross: string | number;
  commission: string | number;
  net: string | number;
  status: SettlementStatus;
  bankRef: string | null;
  createdAt: string;
  paidAt: string | null;
}
