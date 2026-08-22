import { useEffect, useState } from 'react';
import { api, ApiError } from '../api';
import { useI18n } from '../i18n/I18nContext';
import { AdminDecision, ApplicationStatus, FinancingApplication } from '../types';
import Badge from '../components/Badge';
import Modal from '../components/Modal';
import {
  applicationStatusKey,
  applicationStatusTone,
  canDecideApplication,
  formatAmount,
  formatDate,
  planKey,
} from '../statusMeta';

export default function ApplicationsSection() {
  const { t } = useI18n();
  const [applications, setApplications] = useState<FinancingApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [decisionTarget, setDecisionTarget] = useState<{
    application: FinancingApplication;
    decision: AdminDecision;
  } | null>(null);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const res = await api<FinancingApplication[]>('/admin/applications');
      setApplications(res);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('common_error_generic'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function handleDecided(id: string, decision: AdminDecision) {
    setApplications((prev) =>
      prev.map((app) =>
        app.id === id
          ? {
              ...app,
              status: decision === 'APPROVED' ? ApplicationStatus.APPROVED : ApplicationStatus.REJECTED,
              decidedAt: new Date().toISOString(),
            }
          : app,
      ),
    );
    setDecisionTarget(null);
  }

  return (
    <div>
      <h1 className="mb-4 text-xl font-black text-slate-800">{t('applications_title')}</h1>

      {loading && <p className="text-sm text-slate-500">{t('common_loading')}</p>}
      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      {!loading && !error && applications.length === 0 && (
        <p className="text-sm text-slate-500">{t('applications_empty')}</p>
      )}

      {!loading && !error && applications.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-start">
                <th className="p-3 text-start font-semibold text-slate-600">{t('applications_col_id')}</th>
                <th className="p-3 text-start font-semibold text-slate-600">{t('applications_col_amount')}</th>
                <th className="p-3 text-start font-semibold text-slate-600">{t('applications_col_plan')}</th>
                <th className="p-3 text-start font-semibold text-slate-600">{t('common_status')}</th>
                <th className="p-3 text-start font-semibold text-slate-600">{t('applications_col_created')}</th>
                <th className="p-3 text-start font-semibold text-slate-600">{t('applications_col_decided')}</th>
                <th className="p-3 text-start font-semibold text-slate-600">{t('common_actions')}</th>
              </tr>
            </thead>
            <tbody>
              {applications.map((application) => (
                <tr key={application.id} className="border-b border-slate-100 last:border-0">
                  <td className="p-3 font-mono text-xs text-slate-500">{application.id.slice(0, 8)}</td>
                  <td className="num p-3 font-semibold text-slate-800">
                    {formatAmount(application.amount)} {t('common_sar')}
                  </td>
                  <td className="p-3">{t(planKey(application.planType))}</td>
                  <td className="p-3">
                    <Badge tone={applicationStatusTone[application.status]}>
                      {t(applicationStatusKey(application.status))}
                    </Badge>
                  </td>
                  <td className="p-3 text-slate-500">{formatDate(application.createdAt)}</td>
                  <td className="p-3 text-slate-500">{formatDate(application.decidedAt)}</td>
                  <td className="p-3">
                    {canDecideApplication(application.status) ? (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setDecisionTarget({ application, decision: 'APPROVED' })}
                          className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700"
                        >
                          {t('applications_approve')}
                        </button>
                        <button
                          type="button"
                          onClick={() => setDecisionTarget({ application, decision: 'REJECTED' })}
                          className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-rose-700"
                        >
                          {t('applications_reject')}
                        </button>
                      </div>
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

      {decisionTarget && (
        <DecisionModal
          application={decisionTarget.application}
          decision={decisionTarget.decision}
          onClose={() => setDecisionTarget(null)}
          onDecided={handleDecided}
        />
      )}
    </div>
  );
}

function DecisionModal({
  application,
  decision,
  onClose,
  onDecided,
}: {
  application: FinancingApplication;
  decision: AdminDecision;
  onClose: () => void;
  onDecided: (id: string, decision: AdminDecision) => void;
}) {
  const { t } = useI18n();
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function confirm() {
    if (!reason.trim()) {
      setError(t('common_reason_required'));
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await api(`/admin/applications/${application.id}/decide`, {
        method: 'POST',
        body: JSON.stringify({ decision, reason: reason.trim() }),
      });
      onDecided(application.id, decision);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('common_error_generic'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      title={t(decision === 'APPROVED' ? 'applications_decide_title_approve' : 'applications_decide_title_reject')}
      onClose={onClose}
    >
      <div className="space-y-3">
        <p className="text-sm text-slate-600">
          {formatAmount(application.amount)} {t('common_sar')} — {t(planKey(application.planType))}
        </p>
        <label className="block text-sm font-medium">{t('applications_decide_reason_label')}</label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder={t('applications_decide_reason_placeholder')}
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
            className={`rounded-lg px-4 py-2 text-sm font-bold text-white disabled:opacity-60 ${
              decision === 'APPROVED' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
            }`}
          >
            {submitting ? t('common_loading') : t('applications_decide_submit')}
          </button>
        </div>
      </div>
    </Modal>
  );
}
