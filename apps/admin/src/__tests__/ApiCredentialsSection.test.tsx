import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { I18nProvider } from '../i18n/I18nContext';
import ApiCredentialsSection from '../sections/ApiCredentialsSection';
import { api } from '../api';

vi.mock('../api', async () => {
  const actual = await vi.importActual<typeof import('../api')>('../api');
  return { ...actual, api: vi.fn() };
});

const mockedApi = vi.mocked(api);
const merchant = { id: 'm1', name: 'بقالة الحي' };

describe('ApiCredentialsSection', () => {
  beforeEach(() => {
    mockedApi.mockReset();
  });

  it('prompts to pick a merchant from the Merchants section, without a merchant-picker of its own', () => {
    render(
      <I18nProvider>
        <ApiCredentialsSection merchant={null} onGoToMerchants={() => {}} />
      </I18nProvider>,
    );

    expect(screen.getByText(/اختر تاجرًا/)).toBeInTheDocument();
    // No select/combobox anywhere in this view — the only entry point is the Merchants list.
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(mockedApi).not.toHaveBeenCalled();
  });

  it('reveals the secret exactly once after issuing a credential, then discards it on close', async () => {
    mockedApi.mockResolvedValueOnce([]); // initial credentials list

    render(
      <I18nProvider>
        <ApiCredentialsSection merchant={merchant} onGoToMerchants={() => {}} />
      </I18nProvider>,
    );

    await waitFor(() => screen.getByPlaceholderText('مثال: تكامل نقاط البيع'));
    fireEvent.change(screen.getByPlaceholderText('مثال: تكامل نقاط البيع'), {
      target: { value: 'تكامل تجريبي' },
    });

    mockedApi.mockResolvedValueOnce({ id: 'cred1', apiKey: 'qk_live_abc123', apiSecret: 'top-secret-value' });
    mockedApi.mockResolvedValueOnce([
      { id: 'cred1', name: 'تكامل تجريبي', status: 'ACTIVE', createdAt: new Date().toISOString() },
    ]);

    fireEvent.click(screen.getByText('إصدار مفتاح جديد'));

    // The secret is shown in the one-time reveal modal.
    expect(await screen.findByText('top-secret-value')).toBeInTheDocument();
    expect(screen.getByText(/لن تتمكن من رؤيته مرة أخرى/)).toBeInTheDocument();

    // The credentials list itself never carries the secret — only the summary fields.
    expect(mockedApi).toHaveBeenNthCalledWith(
      3,
      `/admin/merchants/${merchant.id}/api-credentials`,
    );

    // Closing is an explicit confirmation, not a dismissible backdrop click.
    fireEvent.click(screen.getByText("لقد حفظت السر، إغلاق"));

    await waitFor(() => expect(screen.queryByText('top-secret-value')).not.toBeInTheDocument());
    // The secret is gone from the DOM entirely and cannot be re-opened without calling
    // the create endpoint again (there is no "view secret" action on existing rows).
    expect(screen.queryByText('qk_live_abc123')).not.toBeInTheDocument();
  });

  it('does not let the reveal modal be dismissed by a backdrop click', async () => {
    mockedApi.mockResolvedValueOnce([]);
    render(
      <I18nProvider>
        <ApiCredentialsSection merchant={merchant} onGoToMerchants={() => {}} />
      </I18nProvider>,
    );

    await waitFor(() => screen.getByPlaceholderText('مثال: تكامل نقاط البيع'));
    fireEvent.change(screen.getByPlaceholderText('مثال: تكامل نقاط البيع'), {
      target: { value: 'x' },
    });
    mockedApi.mockResolvedValueOnce({ id: 'cred1', apiKey: 'k', apiSecret: 'top-secret-value' });
    mockedApi.mockResolvedValueOnce([]);
    fireEvent.click(screen.getByText('إصدار مفتاح جديد'));

    const secret = await screen.findByText('top-secret-value');
    // Clicking the dialog's backdrop (the outer presentation element) must not close it.
    const backdrop = secret.closest('[role="presentation"]') as HTMLElement;
    fireEvent.click(backdrop);
    expect(screen.getByText('top-secret-value')).toBeInTheDocument();
  });
});
