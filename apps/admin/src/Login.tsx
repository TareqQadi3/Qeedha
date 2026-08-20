import { useState } from 'react';
import { api, ApiError, setAuth } from './api';
import { AdminLoginResponse } from './types';
import { useI18n } from './i18n/I18nContext';

export default function Login({ onLoggedIn }: { onLoggedIn: () => void }) {
  const { t } = useI18n();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api<AdminLoginResponse>('/auth/admin/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      setAuth(res.accessToken, res.role, email);
      onLoggedIn();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('login_error_invalid'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-primary p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h1 className="text-2xl font-black text-primary mb-1">{t('app_title')}</h1>
        <p className="text-sm text-slate-500 mb-5">{t('login_subtitle')}</p>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">{t('common_email')}</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('login_email_placeholder')}
              className="w-full rounded-lg border border-slate-300 p-3 text-sm focus:border-primary focus:outline-none"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{t('common_password')}</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-slate-300 p-3 text-sm focus:border-primary focus:outline-none"
              required
            />
          </div>
          {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-primary p-3 font-bold text-white disabled:opacity-60"
          >
            {loading ? t('common_logging_in') : t('common_login')}
          </button>
        </form>
      </div>
    </div>
  );
}
