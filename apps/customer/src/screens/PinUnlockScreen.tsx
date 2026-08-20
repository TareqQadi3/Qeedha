import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { Screen } from '../components/Screen';
import { TextField } from '../components/TextField';
import { PrimaryButton } from '../components/PrimaryButton';
import { useI18n } from '../i18n/I18nContext';
import { verifyPin, getMe, sendOtp } from '../api/customer';
import { ApiError } from '../api/client';
import { clearAll } from '../storage/secureStorage';
import { colors, fontSize, spacing } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'PinUnlock'>;

export function PinUnlockScreen({ navigation }: Props) {
  const { t } = useI18n();
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);

  const onUnlock = async () => {
    setError(null);
    setLoading(true);
    try {
      await verifyPin(pin);
      navigation.replace('Home');
    } catch (e) {
      setError(e instanceof ApiError ? t('pin_invalid') : t('common_error_generic'));
    } finally {
      setLoading(false);
    }
  };

  const onForgotPin = async () => {
    setError(null);
    setForgotLoading(true);
    try {
      // The access/refresh session is still valid even though the local PIN
      // lock is forgotten — reuse it to look up the phone number and kick off
      // a RESET_PIN OTP, rather than forcing a full logout.
      const me = await getMe();
      const { canResendInSeconds } = await sendOtp(me.phone, 'RESET_PIN');
      navigation.replace('OtpVerify', { phone: me.phone, purpose: 'RESET_PIN', canResendInSeconds });
    } catch {
      // Session itself is no longer usable (e.g. refresh token expired/revoked) —
      // fall back to full re-authentication from scratch.
      await clearAll();
      navigation.replace('PhoneEntry');
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <Screen>
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <Text style={{ fontSize: fontSize.xl, fontWeight: '700', color: colors.text, textAlign: 'center', marginBottom: spacing.lg }}>
          {t('pin_unlock_title')}
        </Text>
        <TextField
          value={pin}
          onChangeText={setPin}
          placeholder="••••"
          keyboardType="number-pad"
          secureTextEntry
          maxLength={6}
          error={error ?? undefined}
          autoFocus
        />
        <PrimaryButton label={t('otp_verify')} onPress={onUnlock} loading={loading} disabled={pin.length < 4} />
        <Text
          onPress={forgotLoading ? undefined : onForgotPin}
          style={{ textAlign: 'center', color: colors.primary, marginTop: spacing.lg }}
        >
          {forgotLoading ? t('common_loading') : t('pin_unlock_forgot')}
        </Text>
      </View>
    </Screen>
  );
}
