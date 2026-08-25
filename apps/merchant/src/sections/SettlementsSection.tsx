import { useEffect, useState } from 'react';
import { api, getMerchantId } from '../api';
import { useI18n } from '../i18n/I18nContext';
import { Settlement } from '../types';
import Badge from '../components/Badge';
import { formatAmount, settlementStatusKey, settlementStatusTone } from '../statusMeta';

export default function SettlementsSection() {
  const { t } = useI18n();
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
        const res = await api<Settlement[]>(`/merchants/${merchantId}/settlements`);
        if (!cancelled) setSettlements(res);
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
      <h1 className="mb-4 text-xl font-black text-slate-800">{t('settlements_title')}</h1>

      {loading && <p className="text-sm text-slate-500">{t('common_loading')}</p>}
      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      {!loading && !error && settlements.length === 0 && (
        <p className="text-sm text-slate-500">{t('settlements_empty')}</p>
      )}

      {!loading && !error && settlements.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="p-3 text-start font-semibold text-slate-600">{t('settlements_col_period')}</th>
                <th className="p-3 text-start font-semibold text-slate-600">{t('settlements_col_gross')}</th>
                <th className="p-3 text-start font-semibold text-slate-600">{t('settlements_col_commission')}</th>
                <th className="p-3 text-start font-semibold text-slate-600">{t('settlements_col_net')}</th>
                <th className="p-3 text-start font-semibold text-slate-600">{t('common_status')}</th>
              </tr>
            </thead>
            <tbody>
              {settlements.map((s) => (
                <tr key={s.id} className="border-b border-slate-100 last:border-0">
                  <td className="p-3 text-slate-700">{s.period}</td>
                  <td className="num p-3 text-slate-800">
                    {formatAmount(s.gross)} {t('common_sar')}
                  </td>
                  <td className="num p-3 text-slate-500">
                    {formatAmount(s.commission)} {t('common_sar')}
                  </td>
                  <td className="num p-3 font-semibold text-slate-800">
                    {formatAmount(s.net)} {t('common_sar')}
                  </td>
                  <td className="p-3">
                    <Badge tone={settlementStatusTone[s.status]}>{t(settlementStatusKey(s.status))}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
