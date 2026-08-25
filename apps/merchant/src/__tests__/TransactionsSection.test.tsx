import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { I18nProvider } from '../i18n/I18nContext';
import TransactionsSection from '../sections/TransactionsSection';
import { api, getMerchantId } from '../api';
import { Branch, TransactionRow } from '../types';

vi.mock('../api', async () => {
  const actual = await vi.importActual<typeof import('../api')>('../api');
  return { ...actual, api: vi.fn(), getMerchantId: vi.fn() };
});

const mockedApi = vi.mocked(api);
const mockedGetMerchantId = vi.mocked(getMerchantId);

const branch: Branch = {
  id: 'branch-1',
  merchantId: 'merch-1',
  name: 'الفرع الرئيسي',
  geoLocation: null,
  createdAt: new Date().toISOString(),
};

const purchaseTx: TransactionRow = {
  id: 'tx-aaaaaaaa-1111',
  walletId: 'w-1',
  branchId: 'branch-1',
  cashierId: 'c-1',
  type: 'PURCHASE',
  amount: '150.00',
  method: 'QR',
  status: 'COMPLETED',
  createdAt: new Date().toISOString(),
};

function renderSection() {
  return render(
    <I18nProvider>
      <TransactionsSection />
    </I18nProvider>,
  );
}

describe('TransactionsSection', () => {
  beforeEach(() => {
    mockedApi.mockReset();
    mockedGetMerchantId.mockReturnValue('merch-1');
  });

  it('requires a non-empty reason before submitting a refund, matching the backend DTO', async () => {
    mockedApi.mockResolvedValueOnce([branch]); // branches for the filter dropdown
    mockedApi.mockResolvedValueOnce([purchaseTx]); // initial transactions load
    renderSection();

    await waitFor(() => screen.getByText('استرجاع'));
    fireEvent.click(screen.getByText('استرجاع'));

    // Confirming with an empty reason must not call the refund endpoint.
    const callsBeforeConfirm = mockedApi.mock.calls.length;
    fireEvent.click(screen.getByText('تأكيد'));
    expect(screen.getByText('الرجاء إدخال السبب')).toBeInTheDocument();
    expect(mockedApi.mock.calls.length).toBe(callsBeforeConfirm);

    const textarea = screen.getByPlaceholderText('اكتب سبب الاسترجاع...');
    fireEvent.change(textarea, { target: { value: 'طلب العميل' } });

    mockedApi.mockResolvedValueOnce({ ...purchaseTx, id: 'tx-refund-1', type: 'REFUND' });
    fireEvent.click(screen.getByText('تأكيد'));

    await waitFor(() =>
      expect(mockedApi).toHaveBeenLastCalledWith(
        `/transactions/${purchaseTx.id}/refund`,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({ 'Idempotency-Key': expect.any(String) }),
          body: JSON.stringify({ reason: 'طلب العميل' }),
        }),
      ),
    );
  });

  it('sends the branch and status filters as query params when changed', async () => {
    mockedApi.mockResolvedValueOnce([branch]);
    mockedApi.mockResolvedValueOnce([purchaseTx]);
    renderSection();

    await waitFor(() => screen.getByText('استرجاع'));

    mockedApi.mockResolvedValueOnce([]);
    fireEvent.change(screen.getByDisplayValue('كل الفروع'), { target: { value: 'branch-1' } });

    await waitFor(() =>
      expect(mockedApi).toHaveBeenLastCalledWith(
        `/merchants/merch-1/transactions?branchId=branch-1`,
      ),
    );

    mockedApi.mockResolvedValueOnce([]);
    fireEvent.change(screen.getByDisplayValue('كل الحالات'), { target: { value: 'COMPLETED' } });

    await waitFor(() =>
      expect(mockedApi).toHaveBeenLastCalledWith(
        `/merchants/merch-1/transactions?branchId=branch-1&status=COMPLETED`,
      ),
    );
  });
});
