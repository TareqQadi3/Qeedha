import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import ar, { TranslationKeys } from './ar';
import en from './en';

export type Language = 'ar' | 'en';
export type Direction = 'rtl' | 'ltr';

const dictionaries: Record<Language, Record<TranslationKeys, string>> = { ar, en };

const LANGUAGE_STORAGE_KEY = 'qeedha_merchant_language';

interface I18nContextValue {
  language: Language;
  dir: Direction;
  t: (key: TranslationKeys, vars?: Record<string, string | number>) => string;
  setLanguage: (language: Language) => void;
  toggleLanguage: () => void;
}

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return Object.keys(vars).reduce(
    (acc, key) => acc.replace(`{${key}}`, String(vars[key])),
    template,
  );
}

function readStoredLanguage(): Language {
  try {
    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (stored === 'ar' || stored === 'en') return stored;
  } catch {
    // localStorage unavailable (e.g. some test environments) — fall back to default.
  }
  return 'ar';
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(readStoredLanguage);

  const setLanguage = useCallback((next: Language) => {
    setLanguageState(next);
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, next);
    } catch {
      // ignore persistence failures
    }
  }, []);

  const toggleLanguage = useCallback(() => {
    setLanguage(language === 'ar' ? 'en' : 'ar');
  }, [language, setLanguage]);

  const t = useCallback(
    (key: TranslationKeys, vars?: Record<string, string | number>) =>
      interpolate(dictionaries[language][key], vars),
    [language],
  );

  const value = useMemo<I18nContextValue>(
    () => ({
      language,
      dir: language === 'ar' ? 'rtl' : 'ltr',
      t,
      setLanguage,
      toggleLanguage,
    }),
    [language, t, setLanguage, toggleLanguage],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within an I18nProvider');
  return ctx;
}
