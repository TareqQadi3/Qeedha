import { useEffect, useState } from 'react';
import { clearAuth, getRole } from './api';
import { I18nProvider, useI18n } from './i18n/I18nContext';
import { TranslationKeys } from './i18n/ar';
import Cashier from './Cashier';
import OverviewSection from './sections/OverviewSection';
import BranchesSection from './sections/BranchesSection';
import UsersSection from './sections/UsersSection';
import TransactionsSection from './sections/TransactionsSection';
import SettlementsSection from './sections/SettlementsSection';

type View = 'overview' | 'branches' | 'users' | 'transactions' | 'settlements' | 'cashier';

const NAV_ITEMS: { view: View; labelKey: TranslationKeys }[] = [
  { view: 'overview', labelKey: 'nav_overview' },
  { view: 'branches', labelKey: 'nav_branches' },
  { view: 'users', labelKey: 'nav_users' },
  { view: 'transactions', labelKey: 'nav_transactions' },
  { view: 'settlements', labelKey: 'nav_settlements' },
  { view: 'cashier', labelKey: 'nav_cashier' },
];

function OwnerShellInner() {
  const { t, language, dir, toggleLanguage } = useI18n();
  const [view, setView] = useState<View>('overview');
  const role = getRole();

  useEffect(() => {
    document.documentElement.dir = dir;
    document.documentElement.lang = language;
    return () => {
      // Restore the app's static Arabic/RTL default when leaving this view
      // (e.g. after logout, before Login/Cashier — which stay Arabic-only — render).
      document.documentElement.dir = 'rtl';
      document.documentElement.lang = 'ar';
    };
  }, [dir, language]);

  function logout() {
    clearAuth();
    window.location.reload();
  }

  // The cashier flow is rendered full-screen (it manages its own header/logout),
  // not nested inside the dashboard chrome.
  if (view === 'cashier') {
    return <Cashier />;
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
        <div>
          <h1 className="text-lg font-black text-brand">{t('app_title')}</h1>
          <p className="text-xs text-slate-500">{t('app_subtitle')}</p>
        </div>
        <div className="flex items-center gap-3 text-sm">
          {role && (
            <span className="hidden rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 sm:inline-block">
              {t(`role_${role}` as TranslationKeys)}
            </span>
          )}
          <button
            type="button"
            onClick={toggleLanguage}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
            aria-label="toggle-language"
          >
            {language === 'ar' ? 'EN' : 'AR'}
          </button>
          <button
            type="button"
            onClick={logout}
            className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-900"
          >
            {t('common_logout')}
          </button>
        </div>
      </header>

      <div className="flex flex-1 flex-col sm:flex-row">
        <nav className="flex shrink-0 gap-1 overflow-x-auto border-b border-slate-200 bg-white p-2 sm:w-56 sm:flex-col sm:border-b-0 sm:border-e sm:p-3">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.view}
              type="button"
              onClick={() => setView(item.view)}
              className={`whitespace-nowrap rounded-lg px-3 py-2 text-start text-sm font-semibold ${
                view === item.view ? 'bg-brand text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {t(item.labelKey)}
            </button>
          ))}
        </nav>

        <main className="flex-1 p-4 sm:p-6">
          {view === 'overview' && <OverviewSection />}
          {view === 'branches' && <BranchesSection />}
          {view === 'users' && <UsersSection />}
          {view === 'transactions' && <TransactionsSection />}
          {view === 'settlements' && <SettlementsSection />}
        </main>
      </div>
    </div>
  );
}

export default function OwnerShell() {
  return (
    <I18nProvider>
      <OwnerShellInner />
    </I18nProvider>
  );
}
