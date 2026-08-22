import { useState } from 'react';
import { clearAuth, getEmail, getRole } from './api';
import { useI18n } from './i18n/I18nContext';
import { PlatformStaffRole } from './types';
import ApplicationsSection from './sections/ApplicationsSection';
import MerchantsSection from './sections/MerchantsSection';
import ApiCredentialsSection from './sections/ApiCredentialsSection';
import SettlementsSection from './sections/SettlementsSection';
import { TranslationKeys } from './i18n/ar';

type View = 'applications' | 'merchants' | 'credentials' | 'settlements';

interface SelectedMerchant {
  id: string;
  name: string;
}

const NAV_ITEMS: { view: View; labelKey: TranslationKeys }[] = [
  { view: 'applications', labelKey: 'nav_applications' },
  { view: 'merchants', labelKey: 'nav_merchants' },
  { view: 'credentials', labelKey: 'nav_credentials' },
  { view: 'settlements', labelKey: 'nav_settlements' },
];

export default function Shell({ onLoggedOut }: { onLoggedOut: () => void }) {
  const { t, language, toggleLanguage } = useI18n();
  const [view, setView] = useState<View>('applications');
  const [selectedMerchant, setSelectedMerchant] = useState<SelectedMerchant | null>(null);

  const email = getEmail();
  const role = getRole() as PlatformStaffRole | null;

  function logout() {
    clearAuth();
    onLoggedOut();
  }

  function openCredentials(merchant: SelectedMerchant) {
    setSelectedMerchant(merchant);
    setView('credentials');
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
        <div>
          <h1 className="text-lg font-black text-primary">{t('app_title')}</h1>
          <p className="text-xs text-slate-500">{t('app_subtitle')}</p>
        </div>
        <div className="flex items-center gap-3 text-sm">
          {email && (
            <div className="hidden text-end sm:block">
              <p className="font-semibold text-slate-700">{email}</p>
              {role && <p className="text-xs text-slate-500">{t(`role_${role}` as TranslationKeys)}</p>}
            </div>
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
                view === item.view
                  ? 'bg-primary text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {t(item.labelKey)}
            </button>
          ))}
        </nav>

        <main className="flex-1 p-4 sm:p-6">
          {view === 'applications' && <ApplicationsSection />}
          {view === 'merchants' && <MerchantsSection onOpenCredentials={openCredentials} />}
          {view === 'credentials' && (
            <ApiCredentialsSection
              merchant={selectedMerchant}
              onGoToMerchants={() => setView('merchants')}
            />
          )}
          {view === 'settlements' && <SettlementsSection />}
        </main>
      </div>
    </div>
  );
}
