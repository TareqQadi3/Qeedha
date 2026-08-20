import { useEffect, useState } from 'react';
import { api, ApiError } from '../api';
import { useI18n } from '../i18n/I18nContext';
import { Merchant, MerchantStatus } from '../types';
import Badge from '../components/Badge';
import Modal from '../components/Modal';
import { formatDate, merchantStatusKey, merchantStatusTone } from '../statusMeta';

const ALL_STATUSES = Object.values(MerchantStatus);

export default function MerchantsSection({
  onOpenCredentials,
}: {
  onOpenCredentials: (merchant: { id: string; name: string }) => void;
}) {
  const { t } = useI18n();
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [filter, setFilter] = useState<MerchantStatus | ''>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusTarget, setStatusTarget] = useState<Merchant | null>(null);

  async function load(status: MerchantStatus | '') {
    setLoading(true);
    setError('');
    try {
      const qs = status ? `?status=${status}` : '';
      const res = await api<Merchant[]>(`/admin/merchants${qs}`);
      setMerchants(res);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('common_error_generic'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(filter);
  }, [filter]);

  function handleStatusChanged(id: string, status: MerchantStatus) {
    setMerchants((prev) => prev.map((m) => (m.id === id ? { ...m, status } : m)));
    setStatusTarget(null);
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-black text-slate-800">{t('merchants_title')}</h1>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as MerchantStatus | '')}
          className="rounded-lg border border-slate-300 p-2 text-sm focus:border-primary focus:outline-none"
        >
          <option value="">{t('merchants_filter_all')}</option>
          {ALL_STATUSES.map((s) => (
            <option key={s} value={s}>
              {t(merchantStatusKey(s))}
            </option>
          ))}
        </select>
      </div>

      {loading && <p className="text-sm text-slate-500">{t('common_loading')}</p>}
      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      {!loading && !error && merchants.length === 0 && (
        <p className="text-sm text-slate-500">{t('merchants_empty')}</p>
      )}

      {!loading && !error && merchants.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="p-3 text-start font-semibold text-slate-600">{t('merchants_col_name')}</th>
                <th className="p-3 text-start font-semibold text-slate-600">{t('merchants_col_cr')}</th>
                <th className="p-3 text-start font-semibold text-slate-600">{t('common_status')}</th>
                <th className="p-3 text-start font-semibold text-slate-600">{t('common_created_at')}</th>
                <th className="p-3 text-start font-semibold text-slate-600">{t('common_actions')}</th>
              </tr>
            </thead>
            <tbody>
              {merchants.map((merchant) => (
                <tr key={merchant.id} className="border-b border-slate-100 last:border-0">
                  <td className="p-3">
                    <button
                      type="button"
                      onClick={() => onOpenCredentials({ id: merchant.id, name: merchant.name })}
                      className="font-semibold text-primary hover:underline"
                    >
                      {merchant.name}
                    </button>
                  </td>
                  <td className="p-3 text-slate-500">{merchant.crNumber || '—'}</td>
                  <td className="p-3">
                    <Badge tone={merchantStatusTone[merchant.status]}>
                      {t(merchantStatusKey(merchant.status))}
                    </Badge>
                  </td>
                  <td className="p-3 text-slate-500">{formatDate(merchant.createdAt)}</td>
                  <td className="p-3">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setStatusTarget(merchant)}
                        className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
                      >
                        {t('merchants_change_status')}
                      </button>
                      <button
                        type="button"
                        onClick={() => onOpenCredentials({ id: merchant.id, name: merchant.name })}
                        className="rounded-lg border border-primary px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary/5"
                      >
                        {t('merchants_view_credentials')}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {statusTarget && (
        <StatusChangeModal
          merchant={statusTarget}
          onClose={() => setStatusTarget(null)}
          onChanged={handleStatusChanged}
        />
      )}
    </div>
  );
}

function StatusChangeModal({
  merchant,
  onClose,
  onChanged,
}: {
  merchant: Merchant;
  onClose: () => void;
  onChanged: (id: string, status: MerchantStatus) => void;
}) {
  const { t } = useI18n();
  const [status, setStatus] = useState<MerchantStatus>(merchant.status);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function confirm() {
    if (status === MerchantStatus.SUSPENDED && !reason.trim()) {
      setError(t('merchants_suspend_reason_required'));
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await api(`/admin/merchants/${merchant.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status, ...(reason.trim() ? { reason: reason.trim() } : {}) }),
      });
      onChanged(merchant.id, status);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('common_error_generic'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title={t('merchants_status_change_title')} onClose={onClose}>
      <div className="space-y-3">
        <p className="text-sm font-semibold text-slate-700">{merchant.name}</p>
        <label className="block text-sm font-medium">{t('merchants_status_change_to')}</label>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as MerchantStatus)}
          className="w-full rounded-lg border border-slate-300 p-3 text-sm focus:border-primary focus:outline-none"
        >
          {ALL_STATUSES.map((s) => (
            <option key={s} value={s}>
              {t(merchantStatusKey(s))}
            </option>
          ))}
        </select>
        <label className="block text-sm font-medium">
          {t('common_reason')}{' '}
          {status !== MerchantStatus.SUSPENDED && (
            <span className="font-normal text-slate-400">{t('common_optional')}</span>
          )}
        </label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          className="w-full rounded-lg border border-slate-300 p-3 text-sm focus:border-primary focus:outline-none"
        />
        {error && <p className="rounded-lg bg-red-50 p-2 text-sm text-red-700">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600"
          >
            {t('common_cancel')}
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={confirm}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
          >
            {submitting ? t('common_loading') : t('common_confirm')}
          </button>
        </div>
      </div>
    </Modal>
  );
}
