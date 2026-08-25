import { useEffect, useState } from 'react';
import { api, getMerchantId } from '../api';
import { useI18n } from '../i18n/I18nContext';
import { Branch, MerchantUserSummary, Settlement } from '../types';
import { formatAmount } from '../statusMeta';

export default function OverviewSection() {
  const { t } = useI18n();
  const [branchCount, setBranchCount] = useState<number | null>(null);
  const [userCount, setUserCount] = useState<number | null>(null);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const merchantId = getMerchantId();
    if (!merchantId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const [branches, users, recentSettlements] = await Promise.all([
          api<Branch[]>(`/merchants/${merchantId}/branches`),
          api<MerchantUserSummary[]>(`/merchants/${merchantId}/users`),
          api<Settlement[]>(`/merchants/${merchantId}/settlements`),
        ]);
        if (cancelled) return;
        setBranchCount(branches.length);
        setUserCount(users.length);
        setSettlements(recentSettlements.slice(0, 5));
      } catch (e) {
        if (!cancelled) setError((e as Error).message || t('common_error_generic'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [t]);

  return (
    <div>
      <h1 className="mb-4 text-xl font-black text-slate-800">{t('overview_title')}</h1>

      {loading && <p className="text-sm text-slate-500">{t('common_loading')}</p>}
      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      {!loading && !error && (
        <>
          <div className="mb-6 grid grid-cols-2 gap-4 sm:max-w-md">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold text-slate-500">{t('overview_branches_count')}</p>
              <p className="num mt-1 text-3xl font-black text-brand">{branchCount ?? 0}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold text-slate-500">{t('overview_users_count')}</p>
              <p className="num mt-1 text-3xl font-black text-brand">{userCount ?? 0}</p>
            </div>
          </div>

          <h2 className="mb-2 text-sm font-bold text-slate-700">{t('overview_recent_settlements')}</h2>
          {settlements.length === 0 ? (
            <p className="text-sm text-slate-500">{t('overview_settlements_empty')}</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
              <table className="w-full min-w-[480px] text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="p-3 text-start font-semibold text-slate-600">
                      {t('settlements_col_period')}
                    </th>
                    <th className="p-3 text-start font-semibold text-slate-600">
                      {t('settlements_col_gross')}
                    </th>
                    <th className="p-3 text-start font-semibold text-slate-600">
                      {t('settlements_col_net')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {settlements.map((s) => (
                    <tr key={s.id} className="border-b border-slate-100 last:border-0">
                      <td className="p-3 text-slate-700">{s.period}</td>
                      <td className="num p-3 text-slate-800">
                        {formatAmount(s.gross)} {t('common_sar')}
                      </td>
                      <td className="num p-3 font-semibold text-slate-800">
                        {formatAmount(s.net)} {t('common_sar')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
