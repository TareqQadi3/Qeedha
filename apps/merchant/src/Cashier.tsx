import { useCallback, useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import type { Result } from '@zxing/library';
import { api, clearAuth, getUserId } from './api';

type Step = 'amount' | 'qr' | 'otp' | 'confirm' | 'success' | 'error';

interface CustomerInfo {
  customerId: string;
  fullName: string;
  phone: string;
  walletId: string;
  balance: number;
}

interface PayResponse {
  id: string;
  remainingAmount?: number;
  amount: number;
}

export default function Cashier() {
  const [step, setStep] = useState<Step>('amount');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [customer, setCustomer] = useState<CustomerInfo | null>(null);
  const [verifyMethod, setVerifyMethod] = useState<'QR' | 'OTP'>('QR');
  const [token, setToken] = useState('');
  const [phone, setPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpAttempts, setOtpAttempts] = useState(0);
  const [otpLocked, setOtpLocked] = useState(false);
  const [lastSuccess, setLastSuccess] = useState<{ amount: number; name: string; remaining: number } | null>(null);
  const idempotencyKey = useRef<string>('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<{ stop?: () => void } | null>(null);

  const numericAmount = Number(amount);
  const validAmount = amount !== '' && numericAmount > 0;

  function reset() {
    stopScanner();
    setStep('amount');
    setAmount('');
    setError('');
    setCustomer(null);
    setToken('');
    setPhone('');
    setOtpCode('');
    setOtpAttempts(0);
    setOtpLocked(false);
    idempotencyKey.current = '';
  }

  function logout() {
    clearAuth();
    window.location.reload();
  }

  function describeError(e: unknown): string {
    const err = e as Error & { code?: string };
    const code = err?.code || '';
    const msg = err?.message || '';
    if (code === 'NOT_FOUND' || /not found|غير موجود/i.test(msg)) return 'العميل غير موجود أو لا توجد محفظة نشطة';
    if (code === 'UNAUTHORIZED' && /qr/i.test(msg)) return 'رمز QR منتهي أو غير صالح، اطلب من العميل تحديث الرمز';
    if (code === 'UNAUTHORIZED' && /otp|رمز/i.test(msg)) return 'رمز التحقق غير صحيح أو منتهي';
    if (code === 'CONFLICT' && /payload|مطابقة|idempotency/i.test(msg)) return 'تمت معالجة هذا الطلب بالفعل بمواصفات مختلفة';
    if (code === 'FORBIDDEN' && /balance|رصيد|كافٍ/i.test(msg)) return 'الرصيد غير كافٍ لإتمام العملية';
    return msg || 'حدث خطأ غير متوقع، حاول مرة أخرى';
  }

  function startConfirm(info: CustomerInfo, method: 'QR' | 'OTP') {
    setCustomer(info);
    setVerifyMethod(method);
    idempotencyKey.current = crypto.randomUUID();
    setStep('confirm');
  }

  function stopScanner() {
    controlsRef.current?.stop?.();
    controlsRef.current = null;
    if (videoRef.current && videoRef.current.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach((t) => t.stop());
      videoRef.current.srcObject = null;
    }
  }

  const startScanner = useCallback(async () => {
    setError('');
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('المتصفح لا يدعم الكاميرا، استخدم متصفحًا حديثًا');
      return false;
    }
    try {
      const reader = new BrowserMultiFormatReader();
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
      if (!videoRef.current) return false;
      videoRef.current.srcObject = stream;
      await videoRef.current.play().catch(() => undefined);
      controlsRef.current = reader.decodeFromVideoElement(videoRef.current, (result?: Result) => {
        if (!result) return;
        const text = result.getText();
        stopScanner();
        void verifyQrToken(text);
      }) as unknown as { stop: () => void };
      return true;
    } catch {
      setError('تعذّر الوصول للكاميرا، تأكد من إذن الكاميرا');
      return false;
    }
  }, []);

  async function verifyQrToken(text: string) {
    setLoading(true);
    setError('');
    try {
      const info = await api<CustomerInfo>('/transactions/verify-token', {
        method: 'POST',
        body: JSON.stringify({ method: 'QR', token: text }),
      });
      setToken(text);
      startConfirm(info, 'QR');
    } catch (e) {
      setError(describeError(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (step !== 'qr') return;
    const mounted = true;
    (async () => {
      const ok = await startScanner();
      if (!mounted || !ok) stopScanner();
    })();
    return stopScanner;
  }, [step, startScanner]);

  useEffect(() => {
    if (step !== 'success' || !lastSuccess) return;
    const t = setTimeout(() => reset(), 3000);
    return () => clearTimeout(t);
  }, [step, lastSuccess]);

  async function chooseQr() {
    if (!validAmount) {
      setError('أدخل مبلغًا صحيحًا أكبر من صفر');
      return;
    }
    setError('');
    setCustomer(null);
    setToken('');
    setStep('qr');
  }

  function chooseOtp() {
    if (!validAmount) {
      setError('أدخل مبلغًا صحيحًا أكبر من صفر');
      return;
    }
    setError('');
    setCustomer(null);
    setPhone('');
    setOtpCode('');
    setOtpAttempts(0);
    setOtpLocked(false);
    setStep('otp');
  }

  async function sendOtp() {
    setError('');
    setLoading(true);
    try {
      await api('/auth/otp/send', {
        method: 'POST',
        body: JSON.stringify({ phone, purpose: 'PAYMENT' }),
      });
      setError('');
    } catch (e) {
      setError(describeError(e));
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp() {
    setError('');
    if (!/^\d{6}$/.test(otpCode)) {
      setError('الرمز يجب أن يكون 6 أرقام');
      return;
    }
    if (otpLocked) return;
    setLoading(true);
    try {
      const info = await api<CustomerInfo>('/transactions/verify-token', {
        method: 'POST',
        body: JSON.stringify({ method: 'OTP', token: otpCode, phone }),
      });
      startConfirm(info, 'OTP');
    } catch (e) {
      const next = otpAttempts + 1;
      setOtpAttempts(next);
      if (next >= 3) {
        setOtpLocked(true);
        setError('تم تجاوز الحد المسموح من المحاولات. أعد إرسال رمز جديد');
      } else {
        setError(`${describeError(e)} (المحاولة ${next} من 3)`);
      }
    } finally {
      setLoading(false);
    }
  }

  async function confirmPay() {
    setError('');
    if (!customer || !idempotencyKey.current) return;
    setLoading(true);
    try {
      const res = await api<PayResponse>('/transactions', {
        method: 'POST',
        headers: { 'Idempotency-Key': idempotencyKey.current },
        body: JSON.stringify({
          walletId: customer.walletId,
          amount: numericAmount,
          method: verifyMethod,
          token: verifyMethod === 'QR' ? token : otpCode,
          cashierId: getUserId() || undefined,
        }),
      });
      const remaining = res.remainingAmount ?? customer.balance - numericAmount;
      setLastSuccess({ amount: numericAmount, name: customer.fullName, remaining });
      setStep('success');
    } catch (e) {
      setError(describeError(e));
      setStep('error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <header className="bg-brand text-white px-4 py-3 flex items-center justify-between shadow">
        <div className="flex flex-col">
          <span className="text-xs opacity-80">الكاشير</span>
          <h1 className="text-lg font-bold">قيّدها | صندوق الدفع</h1>
        </div>
        <button onClick={logout} className="text-sm bg-brand-dark px-3 py-1.5 rounded-lg">
          خروج
        </button>
      </header>

      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-lg">
          {step === 'amount' && (
            <AmountStep amount={amount} setAmount={setAmount} valid={validAmount} onQr={chooseQr} onOtp={chooseOtp} error={error} />
          )}

          {step === 'qr' && (
            <QrStep videoRef={videoRef} amount={numericAmount} loading={loading} onCancel={reset} error={error} />
          )}

          {step === 'otp' && (
            <OtpStep
              phone={phone}
              setPhone={setPhone}
              otpCode={otpCode}
              setOtpCode={setOtpCode}
              loading={loading}
              locked={otpLocked}
              attempts={otpAttempts}
              onSend={sendOtp}
              onVerify={verifyOtp}
              onCancel={reset}
              error={error}
            />
          )}

          {step === 'confirm' && customer && (
            <ConfirmStep amount={numericAmount} customer={customer} loading={loading} onConfirm={confirmPay} onCancel={reset} />
          )}

          {step === 'success' && lastSuccess && <SuccessStep data={lastSuccess} />}

          {step === 'error' && <ErrorStep error={error} onRetry={() => setStep('confirm')} onReset={reset} />}
        </div>
      </main>
    </div>
  );
}

function formatSAR(n: number): string {
  return new Intl.NumberFormat('ar-SA', { style: 'currency', currency: 'SAR', maximumFractionDigits: 2 }).format(n);
}

interface AmountStepProps {
  amount: string;
  setAmount: (v: string) => void;
  valid: boolean;
  onQr: () => void;
  onOtp: () => void;
  error: string;
}

function AmountStep({ amount, setAmount, valid, onQr, onOtp, error }: AmountStepProps) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold mb-1">إدخال المبلغ</h2>
        <p className="text-sm text-slate-500">أدخل مبلغ الشراء أولًا، ثم اختر طريقة التحقق من العميل</p>
      </div>
      <div className="relative">
        <input
          type="number"
          inputMode="numeric"
          value={amount}
          onChange={(e) => {
            const v = e.target.value;
            if (v === '' || /^\d+(\.\d{0,2})?$/.test(v)) setAmount(v);
          }}
          placeholder="0.00"
          autoFocus
          className="num w-full rounded-xl border-2 border-slate-200 p-5 text-4xl font-black text-center focus:border-brand focus:outline-none"
        />
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">ريال</span>
      </div>
      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <div className="grid grid-cols-2 gap-3">
        <button onClick={onQr} disabled={!valid} className="rounded-xl bg-brand p-4 font-bold text-white text-lg disabled:opacity-50 shadow">
          مسح QR
        </button>
        <button onClick={onOtp} disabled={!valid} className="rounded-xl bg-brand-dark p-4 font-bold text-white text-lg disabled:opacity-50 shadow">
          رقم جوال
        </button>
      </div>
    </div>
  );
}

interface QrStepProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  amount: number;
  loading: boolean;
  onCancel: () => void;
  error: string;
}

function QrStep({ videoRef, amount, loading, onCancel, error }: QrStepProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">مسح رمز QR</h2>
        <span className="text-2xl font-black text-brand num">{formatSAR(amount)}</span>
      </div>
      <div className="relative rounded-xl overflow-hidden bg-black aspect-square">
        <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
        <div className="absolute inset-8 border-4 border-accent rounded-xl pointer-events-none" />
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <div className="h-12 w-12 rounded-full border-4 border-white/30 border-t-white animate-spin" />
          </div>
        )}
      </div>
      <p className="text-sm text-slate-500 text-center">وجّه الكاميرا نحو رمز العميل. سيظهر اسم العميل ورصيده قبل التأكيد.</p>
      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <button onClick={onCancel} className="w-full rounded-xl border border-slate-300 p-3 font-bold">
        إلغاء
      </button>
    </div>
  );
}

interface OtpStepProps {
  phone: string;
  setPhone: (v: string) => void;
  otpCode: string;
  setOtpCode: (v: string) => void;
  loading: boolean;
  locked: boolean;
  attempts: number;
  onSend: () => void;
  onVerify: () => void;
  onCancel: () => void;
  error: string;
}

function OtpStep({ phone, setPhone, otpCode, setOtpCode, loading, locked, attempts, onSend, onVerify, onCancel, error }: OtpStepProps) {
  const canSend = /^\+9665\d{8}$/.test(phone);
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">تحقق برقم الجوال</h2>
      <div>
        <label className="block text-sm font-medium mb-1">رقم جوال العميل</label>
        <div className="flex gap-2">
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+9665xxxxxxxx"
            className="flex-1 rounded-lg border border-slate-300 p-3 text-sm focus:border-brand focus:outline-none"
          />
          <button onClick={onSend} disabled={!canSend || loading} className="rounded-lg bg-brand-dark px-4 text-white font-medium disabled:opacity-50">
            إرسال رمز
          </button>
        </div>
      </div>
      <div>
        <label className="block text-slate-700 mb-1 text-sm font-medium">رمز التحقق (6 أرقام)</label>
        <div className="flex justify-center">
          <input
            value={otpCode}
            onChange={(e) => {
              if (/^\d{0,6}$/.test(e.target.value)) setOtpCode(e.target.value);
            }}
            inputMode="numeric"
            placeholder="••••••"
            maxLength={6}
            className="num w-44 text-center rounded-lg border-2 border-slate-200 p-3 text-3xl font-black tracking-widest focus:border-brand focus:outline-none"
          />
        </div>
      </div>
      {attempts > 0 && !locked && <p className="text-xs text-slate-400 text-center">المحاولات المتبقية: {3 - attempts}</p>}
      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <button
        onClick={onVerify}
        disabled={loading || locked || otpCode.length !== 6}
        className="w-full rounded-xl bg-brand p-4 text-white font-bold disabled:opacity-50"
      >
        {loading ? 'جارٍ التحقق...' : 'تحقق'}
      </button>
      <button onClick={onCancel} className="w-full rounded-xl border border-slate-300 p-3 font-bold">
        إلغاء
      </button>
    </div>
  );
}

interface ConfirmStepProps {
  amount: number;
  customer: CustomerInfo;
  loading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

function ConfirmStep({ amount, customer, loading, onConfirm, onCancel }: ConfirmStepProps) {
  const sufficient = customer.balance >= amount;
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">تأكيد الدفع</h2>
      <div className="rounded-xl bg-slate-50 p-4 space-y-2">
        <Row label="العميل" value={customer.fullName} />
        <Row label="الجوال" value={customer.phone} />
        <Row label="الرصيد الحالي" value={formatSAR(customer.balance)} strong />
        <Row label="مبلغ الخصم" value={formatSAR(amount)} className="text-brand" big />
        {sufficient && <Row label="الرصيد بعد العملية" value={formatSAR(customer.balance - amount)} strong />}
      </div>
      {!sufficient && (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          الرصيد غير كافٍ — المتبقي {formatSAR(customer.balance)} فقط. لا يمكن إتمام العملية.
        </p>
      )}
      <div className="grid grid-cols-2 gap-3">
        <button onClick={onCancel} className="rounded-xl border border-slate-300 p-3 font-bold">
          إلغاء
        </button>
        <button onClick={onConfirm} disabled={loading || !sufficient} className="rounded-xl bg-accent p-3 font-bold text-white disabled:opacity-50 shadow">
          {loading ? 'جارٍ التأكيد...' : 'تأكيد الخصم'}
        </button>
      </div>
    </div>
  );
}

function Row({ label, value, strong, big, className = '' }: { label: string; value: string; strong?: boolean; big?: boolean; className?: string }) {
  const valClass = `${strong ? 'font-bold' : 'font-medium'} ${big ? 'text-brand text-xl' : ''} ${className}`;
  return (
    <div className={`flex justify-between ${big ? 'pt-2 border-t border-slate-200' : ''}`}>
      <span className="text-slate-600 text-sm">{label}</span>
      <span className={`num ${valClass}`}>{value}</span>
    </div>
  );
}

function SuccessStep({ data }: { data: { amount: number; name: string; remaining: number } }) {
  useEffect(() => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g);
      g.connect(ctx.destination);
      o.type = 'sine';
      o.frequency.value = 880;
      g.gain.setValueAtTime(0.001, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      o.start();
      o.stop(ctx.currentTime + 0.5);
    } catch {
      // ignore audio errors
    }
  }, []);
  return (
    <div className="space-y-5 text-center py-4">
      <div className="mx-auto w-20 h-20 rounded-full bg-accent flex items-center justify-center">
        <svg viewBox="0 0 24 24" className="w-12 h-12 text-white" fill="none" stroke="currentColor" strokeWidth="3">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h2 className="text-2xl font-black text-brand">تم الدفع بنجاح</h2>
      <div className="rounded-xl bg-slate-50 p-4 space-y-2">
        <Row label="العميل" value={data.name} />
        <Row label="المبلغ المخصوم" value={formatSAR(data.amount)} big />
        <Row label="الرصيد المتبقي" value={formatSAR(data.remaining)} strong className="text-accent" />
      </div>
      <p className="text-sm text-slate-400">سيعود صندوق الدفع تلقائيًا خلال لحظات...</p>
    </div>
  );
}

function ErrorStep({ error, onRetry, onReset }: { error: string; onRetry: () => void; onReset: () => void }) {
  return (
    <div className="space-y-5 text-center py-4">
      <div className="mx-auto w-20 h-20 rounded-full bg-red-100 flex items-center justify-center">
        <svg viewBox="0 0 24 24" className="w-12 h-12 text-red-600" fill="none" stroke="currentColor" strokeWidth="3">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </div>
      <h2 className="text-2xl font-black text-red-600">فشل العملية</h2>
      <p className="rounded-lg bg-red-50 p-4 text-sm text-red-700">{error}</p>
      <div className="grid grid-cols-2 gap-3">
        <button onClick={onReset} className="rounded-xl border border-slate-300 p-3 font-bold">
          مبلغ جديد
        </button>
        <button onClick={onRetry} className="rounded-xl bg-brand p-3 font-bold text-white">
          إعادة المحاولة
        </button>
      </div>
    </div>
  );
}