import { ApplicationStatus, FinancingPlan, MerchantStatus } from '@qeedha/shared';

export { ApplicationStatus, FinancingPlan, MerchantStatus };

/** Not exported from @qeedha/shared yet — mirrors apps/api/prisma/schema.prisma. */
export type PlatformStaffRole = 'SUPER_ADMIN' | 'OPERATIONS' | 'FINANCE' | 'SUPPORT';

/** Not exported from @qeedha/shared yet — mirrors apps/api/prisma/schema.prisma. */
export type ApiCredentialStatus = 'ACTIVE' | 'REVOKED';

export interface AdminLoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  role: PlatformStaffRole;
}

export interface Merchant {
  id: string;
  name: string;
  crNumber: string | null;
  commissionRate: string | number;
  status: MerchantStatus;
  ownerId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FinancingApplication {
  id: string;
  customerId: string;
  merchantId: string;
  providerId: string;
  amount: string | number;
  planType: FinancingPlan;
  status: ApplicationStatus;
  providerRef: string | null;
  decidedAt: string | null;
  createdAt: string;
}

export interface ApiCredentialSummary {
  id: string;
  name: string;
  status: ApiCredentialStatus;
  createdAt: string;
}

export interface ApiCredentialCreated {
  id: string;
  apiKey: string;
  apiSecret: string;
}

export type AdminDecision = 'APPROVED' | 'REJECTED';

/** Not exported from @qeedha/shared yet — mirrors apps/api/prisma/schema.prisma. */
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

export interface SettlementRunResult {
  period: string;
  merchantsProcessed: number;
  settlementsCreated: number;
  totalGross: number;
}
