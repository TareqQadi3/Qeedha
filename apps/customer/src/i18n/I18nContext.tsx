import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import ar, { TranslationKeys } from './ar';
import en from './en';

export type Language = 'ar' | 'en';
export type Direction = 'rtl' | 'ltr';

const dictionaries: Record<Language, Record<TranslationKeys, string>> = { ar, en };

const LANGUAGE_STORAGE_KEY = 'qeedha_customer_language';

interface I18nContextValue {
  language: Language;
  dir: Direction;
  t: (key: TranslationKeys, vars?: Record<string, string | number>) => string;
  setLanguage: (language: Language) => void;
  /** Resolves once the persisted language preference has been loaded. */
  ready: boolean;
}

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return Object.keys(vars).reduce(
    (acc, key) => acc.replace(`{${key}}`, String(vars[key])),
    template,
  );
}

export interface LanguageStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}

interface I18nProviderProps {
  children: React.ReactNode;
  /** Injectable storage backend (defaults to expo-secure-store at call sites). */
  storage?: LanguageStorage;
}

export function I18nProvider({ children, storage }: I18nProviderProps) {
  const [language, setLanguageState] = useState<Language>('ar');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!storage) {
        setReady(true);
        return;
      }
      const stored = await storage.getItem(LANGUAGE_STORAGE_KEY);
      if (!cancelled && (stored === 'ar' || stored === 'en')) {
        setLanguageState(stored);
      }
      if (!cancelled) setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [storage]);

  const setLanguage = useCallback(
    (next: Language) => {
      setLanguageState(next);
      void storage?.setItem(LANGUAGE_STORAGE_KEY, next);
    },
    [storage],
  );

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
      ready,
    }),
    [language, t, setLanguage, ready],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within an I18nProvider');
  return ctx;
}
