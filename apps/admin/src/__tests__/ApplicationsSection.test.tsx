import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { I18nProvider } from '../i18n/I18nContext';
import ApplicationsSection from '../sections/ApplicationsSection';
import { api } from '../api';
import { ApplicationStatus, FinancingApplication, FinancingPlan } from '../types';

vi.mock('../api', async () => {
  const actual = await vi.importActual<typeof import('../api')>('../api');
  return { ...actual, api: vi.fn() };
});

const mockedApi = vi.mocked(api);

const pendingApp: FinancingApplication = {
  id: 'aaaaaaaa-1111-1111-1111-111111111111',
  customerId: 'c1',
  merchantId: 'm1',
  providerId: 'p1',
  amount: '500.00',
  planType: FinancingPlan.PAY_IN_1,
  status: ApplicationStatus.PENDING,
  providerRef: null,
  decidedAt: null,
  createdAt: new Date().toISOString(),
};

const approvedApp: FinancingApplication = {
  id: 'bbbbbbbb-2222-2222-2222-222222222222',
  customerId: 'c2',
  merchantId: 'm2',
  providerId: 'p1',
  amount: '750.00',
  planType: FinancingPlan.INSTALLMENTS_4,
  status: ApplicationStatus.APPROVED,
  providerRef: 'manual:bbbbbbbb-2222-2222-2222-222222222222',
  decidedAt: new Date().toISOString(),
  createdAt: new Date().toISOString(),
};

function renderSection() {
  return render(
    <I18nProvider>
      <ApplicationsSection />
    </I18nProvider>,
  );
}

describe('ApplicationsSection', () => {
  beforeEach(() => {
    mockedApi.mockReset();
  });

  it('only shows Approve/Reject actions on PENDING rows, not on already-decided ones', async () => {
    mockedApi.mockResolvedValueOnce([pendingApp, approvedApp]);
    renderSection();

    await waitFor(() => expect(screen.getAllByRole('row')).toHaveLength(3)); // header + 2 data rows

    expect(screen.getAllByRole('button', { name: 'قبول' })).toHaveLength(1);
    expect(screen.getAllByRole('button', { name: 'رفض' })).toHaveLength(1);
  });

  it('requires a reason and posts the decision to the decide endpoint, then reflects it read-only', async () => {
    mockedApi.mockResolvedValueOnce([pendingApp]);
    renderSection();

    await waitFor(() => screen.getByText('قبول'));
    fireEvent.click(screen.getByText('قبول'));

    // Confirming without a reason must not call the API.
    fireEvent.click(screen.getByText('تأكيد القرار'));
    expect(screen.getByText('الرجاء إدخال السبب')).toBeInTheDocument();
    expect(mockedApi).toHaveBeenCalledTimes(1); // only the initial load

    const textarea = screen.getByPlaceholderText('اكتب سبب القرار...');
    fireEvent.change(textarea, { target: { value: 'الطلب يبدو سليمًا' } });

    mockedApi.mockResolvedValueOnce({});
    fireEvent.click(screen.getByText('تأكيد القرار'));

    await waitFor(() =>
      expect(mockedApi).toHaveBeenLastCalledWith(
        `/admin/applications/${pendingApp.id}/decide`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ decision: 'APPROVED', reason: 'الطلب يبدو سليمًا' }),
        }),
      ),
    );

    // After a successful decision the row becomes read-only (no more Approve/Reject buttons).
    await waitFor(() => expect(screen.queryByText('قبول')).not.toBeInTheDocument());
    expect(screen.queryByText('رفض')).not.toBeInTheDocument();
  });
});
