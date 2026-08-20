import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { I18nProvider } from '../i18n/I18nContext';
import SettlementsSection from '../sections/SettlementsSection';
import { api } from '../api';
import { Settlement } from '../types';

vi.mock('../api', async () => {
  const actual = await vi.importActual<typeof import('../api')>('../api');
  return { ...actual, api: vi.fn() };
});

const mockedApi = vi.mocked(api);

const pending: Settlement = {
  id: 's-1',
  merchantId: 'aaaaaaaa-1111-1111-1111-111111111111',
  period: '2026-08-19',
  gross: '1000.00',
  commission: '30.00',
  net: '970.00',
  status: 'PENDING',
  bankRef: null,
  createdAt: new Date().toISOString(),
  paidAt: null,
};

const paid: Settlement = {
  ...pending,
  id: 's-2',
  period: '2026-08-18',
  status: 'PAID',
  bankRef: 'TRX-1',
};

function renderSection() {
  return render(
    <I18nProvider>
      <SettlementsSection />
    </I18nProvider>,
  );
}

describe('SettlementsSection', () => {
  beforeEach(() => {
    mockedApi.mockReset();
  });

  it('only offers Mark Paid on PENDING rows and Reconcile on PAID rows', async () => {
    mockedApi.mockResolvedValueOnce([pending, paid]);
    renderSection();

    await waitFor(() => expect(screen.getAllByRole('row')).toHaveLength(3)); // header + 2 rows

    expect(screen.getAllByRole('button', { name: 'تسجيل الدفع' })).toHaveLength(1);
    expect(screen.getAllByRole('button', { name: 'تأكيد المطابقة' })).toHaveLength(1);
  });

  it('running a settlement posts the selected period and shows the result', async () => {
    mockedApi.mockResolvedValueOnce([]); // initial load
    renderSection();
    await waitFor(() => screen.getByText('تشغيل التسوية'));

    mockedApi.mockResolvedValueOnce({ period: '2026-08-20', merchantsProcessed: 3, settlementsCreated: 2, totalGross: 1500 });
    mockedApi.mockResolvedValueOnce([]); // reload after run

    fireEvent.click(screen.getByText('تشغيل التسوية'));

    await waitFor(() =>
      expect(mockedApi).toHaveBeenCalledWith(
        '/admin/settlements/run',
        expect.objectContaining({ method: 'POST' }),
      ),
    );
    expect(await screen.findByText(/تم إنشاء 2 تسوية/)).toBeInTheDocument();
  });

  it('requires a bank reference before marking a settlement as paid', async () => {
    mockedApi.mockResolvedValueOnce([pending]);
    renderSection();

    await waitFor(() => screen.getByText('تسجيل الدفع'));
    fireEvent.click(screen.getByText('تسجيل الدفع'));

    fireEvent.click(screen.getByText('تأكيد'));
    expect(screen.getByText('الرجاء إدخال مرجع التحويل البنكي')).toBeInTheDocument();
    expect(mockedApi).toHaveBeenCalledTimes(1); // only the initial load, no PATCH sent

    fireEvent.change(screen.getByPlaceholderText('مثال: TRX-2026-000123'), {
      target: { value: 'TRX-999' },
    });
    mockedApi.mockResolvedValueOnce({});
    fireEvent.click(screen.getByText('تأكيد'));

    await waitFor(() =>
      expect(mockedApi).toHaveBeenLastCalledWith(
        `/admin/settlements/${pending.id}/pay`,
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ bankRef: 'TRX-999' }),
        }),
      ),
    );

    // Row becomes reconcile-only after being marked paid, and the modal closes.
    await waitFor(() => expect(screen.queryByText('تسجيل الدفع')).not.toBeInTheDocument());
    expect(screen.getByText('تأكيد المطابقة')).toBeInTheDocument();
  });

  it('reconciling a PAID settlement calls the reconcile endpoint and removes the action', async () => {
    mockedApi.mockResolvedValueOnce([paid]);
    renderSection();

    await waitFor(() => screen.getByText('تأكيد المطابقة'));
    mockedApi.mockResolvedValueOnce({});
    fireEvent.click(screen.getByText('تأكيد المطابقة'));

    await waitFor(() =>
      expect(mockedApi).toHaveBeenLastCalledWith(`/admin/settlements/${paid.id}/reconcile`, {
        method: 'PATCH',
      }),
    );
    await waitFor(() => expect(screen.queryByText('تأكيد المطابقة')).not.toBeInTheDocument());
  });
});
