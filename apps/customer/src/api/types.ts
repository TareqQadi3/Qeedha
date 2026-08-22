/** Response/request shapes mirroring the real API DTOs consumed by the customer app. */

export interface OtpSendResponse {
  expiresInSeconds: number;
  canResendInSeconds: number;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  isNewUser: boolean;
}

export interface CustomerResponse {
  id: string;
  phone: string;
  fullName: string;
  status: string;
  nafathVerifiedAt?: string | null;
}

export interface WalletResponse {
  id: string;
  customerId: string;
  merchantId: string;
  applicationId: string;
  totalAmount: number;
  remainingAmount: number;
  status: string;
  expiresAt?: string | null;
}

export interface FinancingApplicationResponse {
  id: string;
  customerId: string;
  merchantId: string;
  providerId: string;
  amount: number | string;
  planType: 'PAY_IN_1' | 'PAY_IN_30' | 'INSTALLMENTS_4';
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'DEFAULTED';
  providerRef?: string | null;
  decidedAt?: string | null;
  createdAt: string;
}

export interface TransactionResponse {
  id: string;
  walletId: string;
  type: string;
  amount: number;
  method: string;
  status: string;
  createdAt: string;
  remainingAmount?: number;
}

export interface MerchantPublicResponse {
  id: string;
  name: string;
  status: string;
}

export interface QrCodeResponse {
  token: string;
  expiresInSeconds: number;
}

export interface NafathInitResponse {
  transactionId: string;
  status: 'PENDING' | 'VERIFIED' | 'REJECTED';
}
