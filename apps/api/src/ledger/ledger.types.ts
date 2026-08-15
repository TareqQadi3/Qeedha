export enum LedgerAccount {
  ASSET_CUSTOMER_WALLET = 'ASSET_CUSTOMER_WALLET',
  LIABILITY_FINANCING_PROVIDER = 'LIABILITY_FINANCING_PROVIDER',
  RECEIVABLE_MERCHANT_GROSS = 'RECEIVABLE_MERCHANT_GROSS',
  PAYABLE_MERCHANT_NET = 'PAYABLE_MERCHANT_NET',
  COMMISSION_INCOME = 'COMMISSION_INCOME',
  BANK = 'BANK',
}

export interface LedgerEntryInput {
  debitAccount: LedgerAccount;
  creditAccount: LedgerAccount;
  amount: number;
  description?: string;
}

export interface PostTransactionInput {
  transactionId: string;
  entries: LedgerEntryInput[];
}
