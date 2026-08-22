import { useEffect, useState } from 'react';
import { api, ApiError } from '../api';
import { useI18n } from '../i18n/I18nContext';
import { ApiCredentialCreated, ApiCredentialSummary } from '../types';
import Badge from '../components/Badge';
import Modal from '../components/Modal';
import { credentialStatusKey, credentialStatusTone, formatDate } from '../statusMeta';

interface SelectedMerchant {
  id: string;
  name: string;
}

export default function ApiCredentialsSection({
  merchant,
  onGoToMerchants,
}: {
  merchant: SelectedMerchant | null;
  onGoToMerchants: () => void;
}) {
  const { t } = useI18n();

  if (!merchant) {
    return (
      <div>
        <h1 className="mb-4 text-xl font-black text-slate-800">{t('credentials_title')}</h1>
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <p className="mb-4 text-sm text-slate-500">{t('credentials_pick_merchant_prompt')}</p>
          <button
            type="button"
            onClick={onGoToMerchants}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white"
          >
            {t('credentials_go_to_merchants')}
          </button>
        </div>
      </div>
    );
  }

  return <MerchantCredentials merchant={merchant} onGoToMerchants={onGoToMerchants} />;
}

function MerchantCredentials({
  merchant,
  onGoToMerchants,
}: {
  merchant: SelectedMerchant;
  onGoToMerchants: () => void;
}) {
  const { t } = useI18n();
  const [credentials, setCredentials] = useState<ApiCredentialSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);
  const [revealed, setRevealed] = useState<ApiCredentialCreated | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<ApiCredentialSummary | null>(null);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const res = await api<ApiCredentialSummary[]>(`/admin/merchants/${merchant.id}/api-credentials`);
      setCredentials(res);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('common_error_generic'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [merchant.id]);

  async function createCredential(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    setError('');
    try {
      const created = await api<ApiCredentialCreated>(`/admin/merchants/${merchant.id}/api-credentials`, {
        method: 'POST',
        body: JSON.stringify({ name: name.trim() }),
      });
      setName('');
      setRevealed(created);
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('common_error_generic'));
    } finally {
      setCreating(false);
    }
  }

  async function confirmRevoke() {
    if (!revokeTarget) return;
    try {
      await api(`/admin/merchants/${merchant.id}/api-credentials/${revokeTarget.id}/revoke`, {
        method: 'PATCH',
      });
      setCredentials((prev) =>
        prev.map((c) => (c.id === revokeTarget.id ? { ...c, status: 'REVOKED' } : c)),
      );
      setRevokeTarget(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('common_error_generic'));
      setRevokeTarget(null);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={onGoToMerchants}
        className="mb-2 text-sm font-semibold text-primary hover:underline"
      >
        {t('common_back')} — {t('credentials_back_to_merchants')}
      </button>
      <h1 className="mb-4 text-xl font-black text-slate-800">
        {t('credentials_for_merchant', { name: merchant.name })}
      </h1>

      <form onSubmit={createCredential} className="mb-4 flex flex-wrap items-end gap-2">
        <div className="flex-1 min-w-[200px]">
          <label className="mb-1 block text-sm font-medium">{t('credentials_name_label')}</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('credentials_name_placeholder')}
            className="w-full rounded-lg border border-slate-300 p-2.5 text-sm focus:border-primary focus:outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={creating || !name.trim()}
          className="rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60"
        >
          {creating ? t('common_loading') : t('credentials_create_button')}
        </button>
      </form>

      {error && <p className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {loading && <p className="text-sm text-slate-500">{t('common_loading')}</p>}

      {!loading && credentials.length === 0 && (
        <p className="text-sm text-slate-500">{t('credentials_empty')}</p>
      )}

      {!loading && credentials.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="p-3 text-start font-semibold text-slate-600">{t('credentials_col_name')}</th>
                <th className="p-3 text-start font-semibold text-slate-600">{t('common_status')}</th>
                <th className="p-3 text-start font-semibold text-slate-600">{t('common_created_at')}</th>
                <th className="p-3 text-start font-semibold text-slate-600">{t('common_actions')}</th>
              </tr>
            </thead>
            <tbody>
              {credentials.map((cred) => (
                <tr key={cred.id} className="border-b border-slate-100 last:border-0">
                  <td className="p-3 font-semibold text-slate-800">{cred.name}</td>
                  <td className="p-3">
                    <Badge tone={credentialStatusTone[cred.status]}>{t(credentialStatusKey(cred.status))}</Badge>
                  </td>
                  <td className="p-3 text-slate-500">{formatDate(cred.createdAt)}</td>
                  <td className="p-3">
                    {cred.status === 'ACTIVE' ? (
                      <button
                        type="button"
                        onClick={() => setRevokeTarget(cred)}
                        className="rounded-lg border border-rose-300 px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-50"
                      >
                        {t('credentials_revoke')}
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

      {revealed && <SecretRevealModal credential={revealed} onClose={() => setRevealed(null)} />}

      {revokeTarget && (
        <Modal title={t('credentials_revoke_confirm_title')} onClose={() => setRevokeTarget(null)}>
          <p className="mb-4 text-sm text-slate-600">{t('credentials_revoke_confirm_body')}</p>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setRevokeTarget(null)}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600"
            >
              {t('common_cancel')}
            </button>
            <button
              type="button"
              onClick={confirmRevoke}
              className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-bold text-white hover:bg-rose-700"
            >
              {t('credentials_revoke')}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function SecretRevealModal({
  credential,
  onClose,
}: {
  credential: ApiCredentialCreated;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const [copiedField, setCopiedField] = useState<'key' | 'secret' | null>(null);

  async function copy(field: 'key' | 'secret', value: string) {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // clipboard API may be unavailable — the value is still selectable/visible.
    }
    setCopiedField(field);
    setTimeout(() => setCopiedField((prev) => (prev === field ? null : prev)), 2000);
  }

  return (
    // No onClose passed to Modal: this dialog is intentionally not dismissible via
    // backdrop/escape — the secret is shown exactly once, so closing must be explicit.
    <Modal title={t('credentials_reveal_title')}>
      <div className="space-y-4">
        <p className="rounded-lg bg-amber-50 p-3 text-sm font-semibold text-amber-800">
          {t('credentials_reveal_warning')}
        </p>
        <div>
          <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">
            {t('credentials_api_key')}
          </label>
          <div className="flex items-center gap-2">
            <code className="flex-1 select-all break-all rounded-lg bg-slate-100 p-2.5 text-xs">
              {credential.apiKey}
            </code>
            <button
              type="button"
              onClick={() => copy('key', credential.apiKey)}
              className="shrink-0 rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700"
            >
              {copiedField === 'key' ? t('common_copied') : t('common_copy')}
            </button>
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">
            {t('credentials_api_secret')}
          </label>
          <div className="flex items-center gap-2">
            <code className="flex-1 select-all break-all rounded-lg bg-slate-100 p-2.5 text-xs">
              {credential.apiSecret}
            </code>
            <button
              type="button"
              onClick={() => copy('secret', credential.apiSecret)}
              className="shrink-0 rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700"
            >
              {copiedField === 'secret' ? t('common_copied') : t('common_copy')}
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="w-full rounded-lg bg-primary py-2.5 text-sm font-bold text-white"
        >
          {t('credentials_reveal_confirm_close')}
        </button>
      </div>
    </Modal>
  );
}
