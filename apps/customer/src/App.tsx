import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { I18nProvider } from './i18n/I18nContext';
import { RootNavigator } from './navigation/RootNavigator';
import { RootStackParamList } from './navigation/types';
import { getTokens, getPinIsSet, languageStorage } from './storage/secureStorage';
import { setUnauthorizedHandler } from './api/client';
import { colors } from './theme';

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

type InitialRoute = keyof RootStackParamList;

function Bootstrap({ children }: { children: (route: InitialRoute) => React.ReactNode }) {
  const [route, setRoute] = useState<InitialRoute | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [tokens, pinIsSet] = await Promise.all([getTokens(), getPinIsSet()]);
      if (cancelled) return;
      if (tokens && pinIsSet) {
        setRoute('PinUnlock');
      } else if (tokens) {
        setRoute('Home');
      } else {
        setRoute('Onboarding');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!route) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return <>{children(route)}</>;
}

export default function App() {
  useEffect(() => {
    // Last-resort net for when a refresh-and-retry also fails with 401: the
    // client has already cleared tokens, so force the user back to PhoneEntry.
    setUnauthorizedHandler(() => {
      if (navigationRef.isReady()) {
        navigationRef.reset({ index: 0, routes: [{ name: 'PhoneEntry' }] });
      }
    });
  }, []);

  return (
    <SafeAreaProvider>
      <I18nProvider storage={languageStorage}>
        <NavigationContainer ref={navigationRef}>
          <Bootstrap>{(route) => <RootNavigator initialRouteName={route} />}</Bootstrap>
        </NavigationContainer>
      </I18nProvider>
    </SafeAreaProvider>
  );
}
