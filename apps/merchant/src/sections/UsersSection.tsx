import { useEffect, useState } from 'react';
import { api, getMerchantId } from '../api';
import { useI18n } from '../i18n/I18nContext';
import { MerchantUserRole, MerchantUserStatus, MerchantUserSummary } from '../types';
import Modal from '../components/Modal';
import { TranslationKeys } from '../i18n/ar';

const ROLES: MerchantUserRole[] = ['OWNER', 'MANAGER', 'CASHIER'];
const STATUSES: MerchantUserStatus[] = ['ACTIVE', 'SUSPENDED'];

export default function UsersSection() {
  const { t } = useI18n();
  const [users, setUsers] = useState<MerchantUserSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState<MerchantUserSummary | null>(null);

  async function load() {
    const merchantId = getMerchantId();
    if (!merchantId) return;
    setLoading(true);
    setError('');
    try {
      const res = await api<MerchantUserSummary[]>(`/merchants/${merchantId}/users`);
      setUsers(res);
    } catch (e) {
      setError((e as Error).message || t('common_error_generic'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function handleCreated(user: MerchantUserSummary) {
    setUsers((prev) => [user, ...prev]);
    setShowCreate(false);
  }

  function handleUpdated(updated: MerchantUserSummary) {
    setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
    setEditTarget(null);
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-black text-slate-800">{t('users_title')}</h1>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="rounded-lg bg-brand px-4 py-2 text-sm font-bold text-white hover:opacity-90"
        >
          {t('users_create_button')}
        </button>
      </div>

      {loading && <p className="text-sm text-slate-500">{t('common_loading')}</p>}
      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      {!loading && !error && users.length === 0 && (
        <p className="text-sm text-slate-500">{t('users_empty')}</p>
      )}

      {!loading && !error && users.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="p-3 text-start font-semibold text-slate-600">{t('users_col_name')}</th>
                <th className="p-3 text-start font-semibold text-slate-600">{t('users_col_phone')}</th>
                <th className="p-3 text-start font-semibold text-slate-600">{t('users_col_role')}</th>
                <th className="p-3 text-start font-semibold text-slate-600">{t('common_status')}</th>
                <th className="p-3 text-start font-semibold text-slate-600">{t('common_actions')}</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b border-slate-100 last:border-0">
                  <td className="p-3 font-semibold text-slate-800">{user.fullName || '—'}</td>
                  <td className="num p-3 text-slate-600">{user.phone}</td>
                  <td className="p-3">{t(`role_${user.role}` as TranslationKeys)}</td>
                  <td className="p-3 text-slate-600">
                    {user.status === 'ACTIVE'
                      ? t('user_status_ACTIVE')
                      : user.status === 'SUSPENDED'
                        ? t('user_status_SUSPENDED')
                        : user.status}
                  </td>
                  <td className="p-3">
                    <button
                      type="button"
                      onClick={() => setEditTarget(user)}
                      className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50"
                    >
                      {t('common_save')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && (
        <CreateUserModal onClose={() => setShowCreate(false)} onCreated={handleCreated} />
      )}

      {editTarget && (
        <EditUserModal
          user={editTarget}
          onClose={() => setEditTarget(null)}
          onUpdated={handleUpdated}
        />
      )}
    </div>
  );
}

function CreateUserModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (user: MerchantUserSummary) => void;
}) {
  const { t } = useI18n();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<MerchantUserRole>('CASHIER');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const merchantId = getMerchantId();
    if (!merchantId) return;
    setSubmitting(true);
    setError('');
    try {
      const user = await api<MerchantUserSummary>(`/merchants/${merchantId}/users`, {
        method: 'POST',
        body: JSON.stringify({ fullName, phone, password, role }),
      });
      onCreated(user);
    } catch (e) {
      setError((e as Error).message || t('common_error_generic'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title={t('users_create_button')} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <div>
          <label className="mb-1 block text-sm font-medium">{t('users_fullname_label')}</label>
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full rounded-lg border border-slate-300 p-3 text-sm focus:border-brand focus:outline-none"
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">{t('users_phone_label')}</label>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder={t('users_phone_placeholder')}
            className="w-full rounded-lg border border-slate-300 p-3 text-sm focus:border-brand focus:outline-none"
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">{t('users_password_label')}</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-slate-300 p-3 text-sm focus:border-brand focus:outline-none"
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">{t('users_role_label')}</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as MerchantUserRole)}
            className="w-full rounded-lg border border-slate-300 p-3 text-sm focus:border-brand focus:outline-none"
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {t(`role_${r}` as TranslationKeys)}
              </option>
            ))}
          </select>
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
            disabled={submitting}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
          >
            {submitting ? t('common_loading') : t('common_save')}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function EditUserModal({
  user,
  onClose,
  onUpdated,
}: {
  user: MerchantUserSummary;
  onClose: () => void;
  onUpdated: (user: MerchantUserSummary) => void;
}) {
  const { t } = useI18n();
  const [role, setRole] = useState<MerchantUserRole>(user.role);
  const [status, setStatus] = useState<string>(user.status);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const merchantId = getMerchantId();
    if (!merchantId) return;
    setSubmitting(true);
    setError('');
    try {
      const updated = await api<MerchantUserSummary>(
        `/merchants/${merchantId}/users/${user.id}`,
        {
          method: 'PATCH',
          body: JSON.stringify({ role, status }),
        },
      );
      onUpdated(updated);
    } catch (e) {
      setError((e as Error).message || t('common_error_generic'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title={user.fullName || user.phone} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <div>
          <label className="mb-1 block text-sm font-medium">{t('users_role_label')}</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as MerchantUserRole)}
            className="w-full rounded-lg border border-slate-300 p-3 text-sm focus:border-brand focus:outline-none"
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {t(`role_${r}` as TranslationKeys)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">{t('users_status_label')}</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full rounded-lg border border-slate-300 p-3 text-sm focus:border-brand focus:outline-none"
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {t(`user_status_${s}` as TranslationKeys)}
              </option>
            ))}
          </select>
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
            disabled={submitting}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
          >
            {submitting ? t('common_loading') : t('common_save')}
          </button>
        </div>
      </form>
    </Modal>
  );
}
