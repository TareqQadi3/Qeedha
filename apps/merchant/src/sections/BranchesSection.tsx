import { useEffect, useState } from 'react';
import { api, getMerchantId } from '../api';
import { useI18n } from '../i18n/I18nContext';
import { Branch } from '../types';
import Modal from '../components/Modal';

export default function BranchesSection() {
  const { t } = useI18n();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  async function load() {
    const merchantId = getMerchantId();
    if (!merchantId) return;
    setLoading(true);
    setError('');
    try {
      const res = await api<Branch[]>(`/merchants/${merchantId}/branches`);
      setBranches(res);
    } catch (e) {
      setError((e as Error).message || t('common_error_generic'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function handleCreated(branch: Branch) {
    setBranches((prev) => [branch, ...prev]);
    setShowCreate(false);
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-black text-slate-800">{t('branches_title')}</h1>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="rounded-lg bg-brand px-4 py-2 text-sm font-bold text-white hover:opacity-90"
        >
          {t('branches_create_button')}
        </button>
      </div>

      {loading && <p className="text-sm text-slate-500">{t('common_loading')}</p>}
      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      {!loading && !error && branches.length === 0 && (
        <p className="text-sm text-slate-500">{t('branches_empty')}</p>
      )}

      {!loading && !error && branches.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full min-w-[480px] text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="p-3 text-start font-semibold text-slate-600">{t('branches_col_name')}</th>
                <th className="p-3 text-start font-semibold text-slate-600">{t('branches_col_geo')}</th>
                <th className="p-3 text-start font-semibold text-slate-600">{t('common_created_at')}</th>
              </tr>
            </thead>
            <tbody>
              {branches.map((branch) => (
                <tr key={branch.id} className="border-b border-slate-100 last:border-0">
                  <td className="p-3 font-semibold text-slate-800">{branch.name}</td>
                  <td className="num p-3 text-slate-500">
                    {branch.geoLocation ? `${branch.geoLocation.lat}, ${branch.geoLocation.lng}` : '—'}
                  </td>
                  <td className="p-3 text-slate-500">{new Date(branch.createdAt).toLocaleDateString('ar-SA')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && (
        <CreateBranchModal onClose={() => setShowCreate(false)} onCreated={handleCreated} />
      )}
    </div>
  );
}

function CreateBranchModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (branch: Branch) => void;
}) {
  const { t } = useI18n();
  const [name, setName] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const merchantId = getMerchantId();
    if (!merchantId || !name.trim()) return;
    setSubmitting(true);
    setError('');
    try {
      const geoLocation =
        lat.trim() && lng.trim() ? { lat: Number(lat), lng: Number(lng) } : undefined;
      const branch = await api<Branch>(`/merchants/${merchantId}/branches`, {
        method: 'POST',
        body: JSON.stringify({ name: name.trim(), geoLocation }),
      });
      onCreated(branch);
    } catch (e) {
      setError((e as Error).message || t('common_error_generic'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title={t('branches_create_button')} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <div>
          <label className="mb-1 block text-sm font-medium">{t('branches_name_label')}</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('branches_name_placeholder')}
            className="w-full rounded-lg border border-slate-300 p-3 text-sm focus:border-brand focus:outline-none"
            required
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium">
              {t('branches_lat_label')} {t('common_optional')}
            </label>
            <input
              value={lat}
              onChange={(e) => setLat(e.target.value)}
              inputMode="decimal"
              className="w-full rounded-lg border border-slate-300 p-3 text-sm focus:border-brand focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">
              {t('branches_lng_label')} {t('common_optional')}
            </label>
            <input
              value={lng}
              onChange={(e) => setLng(e.target.value)}
              inputMode="decimal"
              className="w-full rounded-lg border border-slate-300 p-3 text-sm focus:border-brand focus:outline-none"
            />
          </div>
        </div>
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
            type="submit"
            disabled={submitting || !name.trim()}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
          >
            {submitting ? t('common_loading') : t('common_save')}
          </button>
        </div>
      </form>
    </Modal>
  );
}
