import { api } from './client';
import {
  CustomerResponse,
  FinancingApplicationResponse,
  MerchantPublicResponse,
  NafathInitResponse,
  OtpSendResponse,
  QrCodeResponse,
  TokenResponse,
  TransactionResponse,
  WalletResponse,
} from './types';

export type OtpPurpose = 'LOGIN' | 'REGISTER' | 'RESET_PIN' | 'PAYMENT';
export type FinancingPlan = 'PAY_IN_1' | 'PAY_IN_30' | 'INSTALLMENTS_4';

export function sendOtp(phone: string, purpose: OtpPurpose): Promise<OtpSendResponse> {
  return api<OtpSendResponse>('/auth/otp/send', {
    method: 'POST',
    body: JSON.stringify({ phone, purpose }),
    skipAuth: true,
  });
}

export function verifyOtp(
  phone: string,
  purpose: OtpPurpose,
  code: string,
  fullName?: string,
): Promise<TokenResponse> {
  return api<TokenResponse>('/auth/otp/verify', {
    method: 'POST',
    body: JSON.stringify({ phone, purpose, code, ...(fullName ? { fullName } : {}) }),
    skipAuth: true,
  });
}

export function logout(refreshToken: string): Promise<void> {
  return api<void>('/auth/logout', {
    method: 'POST',
    body: JSON.stringify({ refreshToken }),
  });
}

export function setPin(pin: string): Promise<void> {
  return api<void>('/auth/pin/set', { method: 'POST', body: JSON.stringify({ pin }) });
}

export function verifyPin(pin: string): Promise<void> {
  return api<void>('/auth/pin/verify', { method: 'POST', body: JSON.stringify({ pin }) });
}

export function initiateNafath(nationalId: string): Promise<NafathInitResponse> {
  return api<NafathInitResponse>('/customers/me/kyc/nafath', {
    method: 'POST',
    body: JSON.stringify({ nationalId }),
  });
}

export function getMe(): Promise<CustomerResponse> {
  return api<CustomerResponse>('/customers/me');
}

export function updateMe(fullName: string): Promise<CustomerResponse> {
  return api<CustomerResponse>('/customers/me', {
    method: 'PATCH',
    body: JSON.stringify({ fullName }),
  });
}

export function getMyQrCode(): Promise<QrCodeResponse> {
  return api<QrCodeResponse>('/customers/me/qr-code');
}

export function getMerchantPublic(merchantId: string): Promise<MerchantPublicResponse> {
  return api<MerchantPublicResponse>(`/merchants/${merchantId}/public`);
}

export function requestWallet(
  merchantId: string,
  amount: number,
  planType: FinancingPlan,
): Promise<{ applicationId: string; status: string }> {
  return api('/wallets', {
    method: 'POST',
    body: JSON.stringify({ merchantId, amount, planType }),
  });
}

export function listWallets(): Promise<WalletResponse[]> {
  return api<WalletResponse[]>('/wallets');
}

export function listFinancingApplications(): Promise<FinancingApplicationResponse[]> {
  return api<FinancingApplicationResponse[]>('/financing/applications');
}

export function getFinancingApplication(id: string): Promise<FinancingApplicationResponse> {
  return api<FinancingApplicationResponse>(`/financing/applications/${id}`);
}

export function listTransactions(walletId: string): Promise<TransactionResponse[]> {
  return api<TransactionResponse[]>(`/transactions?walletId=${encodeURIComponent(walletId)}`);
}
