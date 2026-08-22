import { useEffect, useState } from 'react';
import { getToken, setUnauthorizedHandler } from './api';
import { I18nProvider, useI18n } from './i18n/I18nContext';
import Login from './Login';
import Shell from './Shell';

function AppInner() {
  const { dir, language } = useI18n();
  const [token, setToken] = useState<string | null>(() => getToken());

  useEffect(() => {
    document.documentElement.dir = dir;
    document.documentElement.lang = language;
  }, [dir, language]);

  useEffect(() => {
    setUnauthorizedHandler(() => setToken(null));
    return () => setUnauthorizedHandler(null);
  }, []);

  if (!token) {
    return <Login onLoggedIn={() => setToken(getToken())} />;
  }

  return <Shell onLoggedOut={() => setToken(null)} />;
}

export default function App() {
  return (
    <I18nProvider>
      <AppInner />
    </I18nProvider>
  );
}
