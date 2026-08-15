import { useState } from 'react';
import { api, setAuth, clearAuth } from './api';

interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  role: string;
  merchantId: string;
  userId: string;
}

export default function Login() {
  const [merchantId, setMerchantId] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api<LoginResponse>('/auth/merchant/login', {
        method: 'POST',
        body: JSON.stringify({ merchantId, phone, password }),
      });
      setAuth(res.accessToken, res.merchantId, res.role, res.userId);
      window.location.reload();
    } catch (e) {
      clearAuth();
      setError((e as Error).message || 'بيانات الدخول غير صحيحة');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h1 className="text-2xl font-black text-brand mb-1">قيّدها</h1>
        <p className="text-sm text-slate-500 mb-5">بوابة البقالة — تسجيل دخول الموظف</p>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">رقم المتجر</label>
            <input
              value={merchantId}
              onChange={(e) => setMerchantId(e.target.value)}
              placeholder="معرّف المتجر"
              className="w-full rounded-lg border border-slate-300 p-3 text-sm focus:border-brand focus:outline-none"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">رقم الجوال</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+9665xxxxxxxx"
              className="w-full rounded-lg border border-slate-300 p-3 text-sm focus:border-brand focus:outline-none"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">كلمة المرور</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-slate-300 p-3 text-sm focus:border-brand focus:outline-none"
              required
            />
          </div>
          {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-brand p-3 font-bold text-white disabled:opacity-60"
          >
            {loading ? 'جارٍ الدخول...' : 'دخول'}
          </button>
        </form>
      </div>
    </div>
  );
}