import { useEffect, useState } from 'react';
import { api, getMerchantId } from '../api';
import { useI18n } from '../i18n/I18nContext';
import { Branch, TransactionRow, TransactionStatus } from '../types';
import Badge from '../components/Badge';
import Modal from '../components/Modal';
import {
  canRefund,
  formatAmount,
  formatDate,
  transactionStatusKey,
  transactionStatusTone,
  transactionTypeKey,
} from '../statusMeta';

const ALL_STATUSES: TransactionStatus[] = ['PENDING', 'COMPLETED', 'FAILED', 'REVERSED'];

export default function TransactionsSection() {
  const { t } = useI18n();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);
  const [branchFilter, setBranchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<TransactionStatus | ''>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refundTarget, setRefundTarget] = useState<TransactionRow | null>(null);

  useEffect(() => {
    const merchantId = getMerchantId();
    if (!merchantId) return;
    api<Branch[]>(`/merchants/${merchantId}/branches`)
      .then(setBranches)
      .catch(() => undefined);
  }, []);

  async function load() {
    const merchantId = getMerchantId();
    if (!merchantId) return;
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (branchFilter) params.set('branchId', branchFilter);
      if (statusFilter) params.set('status', statusFilter);
      const qs = params.toString();
      const res = await api<TransactionRow[]>(
        `/merchants/${merchantId}/transactions${qs ? `?${qs}` : ''}`,
      );
      setTransactions(res);
    } catch (e) {
      setError((e as Error).message || t('common_error_generic'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [branchFilter, statusFilter]);

  function handleRefunded(originalId: string, refundTx: TransactionRow) {
    setTransactions((prev) => [refundTx, ...prev]);
    setRefundTarget(null);
    void originalId;
  }

  function branchName(branchId: string | null): string {
    if (!branchId) return '—';
    return branches.find((b) => b.id === branchId)?.name ?? branchId.slice(0, 8);
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-xl font-black text-slate-800">{t('transactions_title')}</h1>
        <div className="flex flex-wrap gap-2">
          <select
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}
            className="rounded-lg border border-slate-300 p-2 text-sm focus:border-brand focus:outline-none"
          >
            <option value="">{t('transactions_filter_branch_all')}</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as TransactionStatus | '')}
            className="rounded-lg border border-slate-300 p-2 text-sm focus:border-brand focus:outline-none"
          >
            <option value="">{t('transactions_filter_status_all')}</option>
            {ALL_STATUSES.map((s) => (
              <option key={s} value={s}>
                {t(transactionStatusKey(s))}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading && <p className="text-sm text-slate-500">{t('common_loading')}</p>}
      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      {!loading && !error && transactions.length === 0 && (
        <p className="text-sm text-slate-500">{t('transactions_empty')}</p>
      )}

      {!loading && !error && transactions.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="p-3 text-start font-semibold text-slate-600">{t('transactions_col_id')}</th>
                <th className="p-3 text-start font-semibold text-slate-600">{t('transactions_col_branch')}</th>
                <th className="p-3 text-start font-semibold text-slate-600">{t('transactions_col_type')}</th>
                <th className="p-3 text-start font-semibold text-slate-600">{t('transactions_col_amount')}</th>
                <th className="p-3 text-start font-semibold text-slate-600">{t('common_status')}</th>
                <th className="p-3 text-start font-semibold text-slate-600">{t('common_created_at')}</th>
                <th className="p-3 text-start font-semibold text-slate-600">{t('common_actions')}</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => (
                <tr key={tx.id} className="border-b border-slate-100 last:border-0">
                  <td className="p-3 font-mono text-xs text-slate-500">{tx.id.slice(0, 8)}</td>
                  <td className="p-3 text-slate-600">{branchName(tx.branchId)}</td>
                  <td className="p-3">{t(transactionTypeKey(tx.type))}</td>
                  <td className="num p-3 font-semibold text-slate-800">
                    {formatAmount(tx.amount)} {t('common_sar')}
                  </td>
                  <td className="p-3">
                    <Badge tone={transactionStatusTone[tx.status]}>
                      {t(transactionStatusKey(tx.status))}
                    </Badge>
                  </td>
                  <td className="p-3 text-slate-500">{formatDate(tx.createdAt)}</td>
                  <td className="p-3">
                    {canRefund(tx.type, tx.status) ? (
                      <button
                        type="button"
                        onClick={() => setRefundTarget(tx)}
                        className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-rose-700"
                      >
                        {t('transactions_refund_action')}
                      </button>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {refundTarget && (
        <RefundModal
          transaction={refundTarget}
          onClose={() => setRefundTarget(null)}
          onRefunded={handleRefunded}
        />
      )}
    </div>
  );
}

function RefundModal({
  transaction,
  onClose,
  onRefunded,
}: {
  transaction: TransactionRow;
  onClose: () => void;
  onRefunded: (originalId: string, refundTx: TransactionRow) => void;
}) {
  const { t } = useI18n();
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function confirm() {
    // The backend's RefundRequestDto requires a non-empty `reason`, so this dashboard
    // mirrors that requirement rather than treating it as optional.
    if (!reason.trim()) {
      setError(t('common_reason_required'));
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const refundTx = await api<TransactionRow>(`/transactions/${transaction.id}/refund`, {
        method: 'POST',
        headers: { 'Idempotency-Key': crypto.randomUUID() },
        body: JSON.stringify({ reason: reason.trim() }),
      });
      onRefunded(transaction.id, refundTx);
    } catch (e) {
      setError((e as Error).message || t('common_error_generic'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title={t('transactions_refund_modal_title')} onClose={onClose}>
      <div className="space-y-3">
        <p className="text-sm text-slate-600">
          {formatAmount(transaction.amount)} {t('common_sar')} — {transaction.id.slice(0, 8)}
        </p>
        <label className="block text-sm font-medium">{t('transactions_refund_reason_label')}</label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder={t('transactions_refund_reason_placeholder')}
          rows={3}
          className="w-full rounded-lg border border-slate-300 p-3 text-sm focus:border-brand focus:outline-none"
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
            className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-bold text-white hover:bg-rose-700 disabled:opacity-60"
          >
            {submitting ? t('common_loading') : t('common_confirm')}
          </button>
        </div>
      </div>
    </Modal>
  );
}
