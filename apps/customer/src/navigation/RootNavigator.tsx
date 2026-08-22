import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from './types';
import { useI18n } from '../i18n/I18nContext';
import { colors } from '../theme';

import { OnboardingScreen } from '../screens/OnboardingScreen';
import { PhoneEntryScreen } from '../screens/PhoneEntryScreen';
import { OtpVerifyScreen } from '../screens/OtpVerifyScreen';
import { PinSetupScreen } from '../screens/PinSetupScreen';
import { PinUnlockScreen } from '../screens/PinUnlockScreen';
import { NafathVerifyScreen } from '../screens/NafathVerifyScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { RequestFinancingScreen } from '../screens/RequestFinancingScreen';
import { ApplicationStatusScreen } from '../screens/ApplicationStatusScreen';
import { PayScreen } from '../screens/PayScreen';
import { HistoryScreen } from '../screens/HistoryScreen';
import { RepaymentScreen } from '../screens/RepaymentScreen';
import { AccountScreen } from '../screens/AccountScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

interface RootNavigatorProps {
  initialRouteName: keyof RootStackParamList;
}

/**
 * Headers are shown with per-screen translated titles. Note: React Navigation's
 * own RTL mirroring (e.g. which side the back chevron renders on) is driven by
 * I18nManager.isRTL, which this app deliberately never calls forceRTL on (see
 * src/i18n/I18nContext.tsx) — so the header chrome stays LTR-oriented even in
 * Arabic. Screen bodies use the Row/Screen primitives which *do* mirror via
 * the `dir` context value. This is a known, intentional trade-off.
 */
export function RootNavigator({ initialRouteName }: RootNavigatorProps) {
  const { t } = useI18n();

  return (
    <Stack.Navigator
      initialRouteName={initialRouteName}
      screenOptions={{
        headerTitleAlign: 'center',
        headerTintColor: colors.primary,
        headerStyle: { backgroundColor: colors.background },
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="Onboarding" component={OnboardingScreen} options={{ headerShown: false }} />
      <Stack.Screen name="PhoneEntry" component={PhoneEntryScreen} options={{ title: t('phone_title') }} />
      <Stack.Screen name="OtpVerify" component={OtpVerifyScreen} options={{ title: t('otp_title') }} />
      <Stack.Screen name="PinSetup" component={PinSetupScreen} options={{ title: t('pin_setup_title'), headerBackVisible: false }} />
      <Stack.Screen name="PinUnlock" component={PinUnlockScreen} options={{ title: t('pin_unlock_title'), headerShown: false }} />
      <Stack.Screen name="NafathVerify" component={NafathVerifyScreen} options={{ title: t('nafath_title') }} />
      <Stack.Screen name="Home" component={HomeScreen} options={{ title: t('home_hello'), headerBackVisible: false }} />
      <Stack.Screen name="RequestFinancing" component={RequestFinancingScreen} options={{ title: t('home_request_new') }} />
      <Stack.Screen name="ApplicationStatus" component={ApplicationStatusScreen} options={{ title: t('application_status_title'), headerBackVisible: false }} />
      <Stack.Screen name="Pay" component={PayScreen} options={{ title: t('pay_title') }} />
      <Stack.Screen name="History" component={HistoryScreen} options={{ title: t('history_title') }} />
      <Stack.Screen name="Repayment" component={RepaymentScreen} options={{ title: t('repayment_title') }} />
      <Stack.Screen name="Account" component={AccountScreen} options={{ title: t('account_title') }} />
    </Stack.Navigator>
  );
}
