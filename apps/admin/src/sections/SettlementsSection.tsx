import { useEffect, useState } from 'react';
import { api, ApiError } from '../api';
import { useI18n } from '../i18n/I18nContext';
import { Settlement, SettlementRunResult, SettlementStatus } from '../types';
import Badge from '../components/Badge';
import Modal from '../components/Modal';
import {
  canMarkPaid,
  canReconcile,
  formatAmount,
  formatDate,
  settlementStatusKey,
  settlementStatusTone,
} from '../statusMeta';

const ALL_STATUSES: SettlementStatus[] = ['PENDING', 'PAID', 'RECONCILED'];

function todayPeriod(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function SettlementsSection() {
  const { t } = useI18n();
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [filter, setFilter] = useState<SettlementStatus | ''>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [runPeriod, setRunPeriod] = useState(todayPeriod());
  const [running, setRunning] = useState(false);
  const [runResult, setRunResult] = useState('');
  const [payTarget, setPayTarget] = useState<Settlement | null>(null);

  async function load(status: SettlementStatus | '') {
    setLoading(true);
    setError('');
    try {
      const qs = status ? `?status=${status}` : '';
      const res = await api<Settlement[]>(`/admin/settlements${qs}`);
      setSettlements(res);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('common_error_generic'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(filter);
  }, [filter]);

  async function runSettlement() {
    setRunning(true);
    setError('');
    setRunResult('');
    try {
      const res = await api<SettlementRunResult>('/admin/settlements/run', {
        method: 'POST',
        body: JSON.stringify({ period: runPeriod }),
      });
      setRunResult(
        t('settlements_run_success', {
          created: res.settlementsCreated,
          period: res.period,
          processed: res.merchantsProcessed,
        }),
      );
      await load(filter);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('common_error_generic'));
    } finally {
      setRunning(false);
    }
  }

  function handlePaid(id: string, bankRef: string) {
    setSettlements((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: 'PAID', bankRef, paidAt: new Date().toISOString() } : s)),
    );
    setPayTarget(null);
  }

  async function reconcile(settlement: Settlement) {
    try {
      await api(`/admin/settlements/${settlement.id}/reconcile`, { method: 'PATCH' });
      setSettlements((prev) =>
        prev.map((s) => (s.id === settlement.id ? { ...s, status: 'RECONCILED' } : s)),
      );
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('common_error_generic'));
    }
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-xl font-black text-slate-800">{t('settlements_title')}</h1>
        <div className="flex flex-wrap items-end gap-2">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500">
              {t('settlements_run_period_label')}
            </label>
            <input
              type="date"
              value={runPeriod}
              onChange={(e) => setRunPeriod(e.target.value)}
              className="rounded-lg border border-slate-300 p-2 text-sm focus:border-primary focus:outline-none"
            />
          </div>
          <button
            type="button"
            disabled={running}
            onClick={runSettlement}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
          >
            {running ? t('common_loading') : t('settlements_run_button')}
          </button>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as SettlementStatus | '')}
            className="rounded-lg border border-slate-300 p-2 text-sm focus:border-primary focus:outline-none"
          >
            <option value="">{t('settlements_filter_all')}</option>
            {ALL_STATUSES.map((s) => (
              <option key={s} value={s}>
                {t(settlementStatusKey(s))}
              </option>
            ))}
          </select>
        </div>
      </div>

      {runResult && <p className="mb-3 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{runResult}</p>}
      {loading && <p className="text-sm text-slate-500">{t('common_loading')}</p>}
      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      {!loading && !error && settlements.length === 0 && (
        <p className="text-sm text-slate-500">{t('settlements_empty')}</p>
      )}

      {!loading && !error && settlements.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="p-3 text-start font-semibold text-slate-600">{t('settlements_col_merchant')}</th>
                <th className="p-3 text-start font-semibold text-slate-600">{t('settlements_col_period')}</th>
                <th className="p-3 text-start font-semibold text-slate-600">{t('settlements_col_gross')}</th>
                <th className="p-3 text-start font-semibold text-slate-600">{t('settlements_col_commission')}</th>
                <th className="p-3 text-start font-semibold text-slate-600">{t('settlements_col_net')}</th>
                <th className="p-3 text-start font-semibold text-slate-600">{t('common_status')}</th>
                <th className="p-3 text-start font-semibold text-slate-600">{t('common_created_at')}</th>
                <th className="p-3 text-start font-semibold text-slate-600">{t('common_actions')}</th>
              </tr>
            </thead>
            <tbody>
              {settlements.map((settlement) => (
                <tr key={settlement.id} className="border-b border-slate-100 last:border-0">
                  <td className="p-3 font-mono text-xs text-slate-500">{settlement.merchantId.slice(0, 8)}</td>
                  <td className="p-3 text-slate-700">{settlement.period}</td>
                  <td className="num p-3 text-slate-800">
                    {formatAmount(settlement.gross)} {t('common_sar')}
                  </td>
                  <td className="num p-3 text-slate-500">
                    {formatAmount(settlement.commission)} {t('common_sar')}
                  </td>
                  <td className="num p-3 font-semibold text-slate-800">
                    {formatAmount(settlement.net)} {t('common_sar')}
                  </td>
                  <td className="p-3">
                    <Badge tone={settlementStatusTone[settlement.status]}>
                      {t(settlementStatusKey(settlement.status))}
                    </Badge>
                  </td>
                  <td className="p-3 text-slate-500">{formatDate(settlement.createdAt)}</td>
                  <td className="p-3">
                    <div className="flex gap-2">
                      {canMarkPaid(settlement.status) && (
                        <button
                          type="button"
                          onClick={() => setPayTarget(settlement)}
                          className="rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-white hover:opacity-90"
                        >
                          {t('settlements_pay')}
                        </button>
                      )}
                      {canReconcile(settlement.status) && (
                        <button
                          type="button"
                          onClick={() => reconcile(settlement)}
                          className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700"
                        >
                          {t('settlements_reconcile')}
                        </button>
                      )}
                      {!canMarkPaid(settlement.status) && !canReconcile(settlement.status) && (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {payTarget && (
        <PayModal settlement={payTarget} onClose={() => setPayTarget(null)} onPaid={handlePaid} />
      )}
    </div>
  );
}

function PayModal({
  settlement,
  onClose,
  onPaid,
}: {
  settlement: Settlement;
  onClose: () => void;
  onPaid: (id: string, bankRef: string) => void;
}) {
  const { t } = useI18n();
  const [bankRef, setBankRef] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function confirm() {
    if (!bankRef.trim()) {
      setError(t('settlements_pay_bankref_required'));
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await api(`/admin/settlements/${settlement.id}/pay`, {
        method: 'PATCH',
        body: JSON.stringify({ bankRef: bankRef.trim() }),
      });
      onPaid(settlement.id, bankRef.trim());
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('common_error_generic'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title={t('settlements_pay_modal_title')} onClose={onClose}>
      <div className="space-y-3">
        <p className="text-sm text-slate-600">
          {formatAmount(settlement.net)} {t('common_sar')} — {settlement.period}
        </p>
        <label className="block text-sm font-medium">{t('settlements_pay_bankref_label')}</label>
        <input
          value={bankRef}
          onChange={(e) => setBankRef(e.target.value)}
          placeholder={t('settlements_pay_bankref_placeholder')}
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
