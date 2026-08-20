import React, { useEffect, useState } from 'react';
import { Text } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { Screen } from '../components/Screen';
import { TextField } from '../components/TextField';
import { PrimaryButton } from '../components/PrimaryButton';
import { useI18n } from '../i18n/I18nContext';
import { sendOtp, verifyOtp } from '../api/customer';
import { ApiError } from '../api/client';
import { setTokens, getPinIsSet } from '../storage/secureStorage';
import { colors, fontSize, spacing } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'OtpVerify'>;

export function OtpVerifyScreen({ navigation, route }: Props) {
  const { phone, purpose, canResendInSeconds } = route.params;
  const { t } = useI18n();
  const [code, setCode] = useState('');
  const [fullName, setFullName] = useState('');
  const [needsName, setNeedsName] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(canResendInSeconds);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const id = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [secondsLeft > 0]);

  const onResend = async () => {
    setResending(true);
    setError(null);
    try {
      const res = await sendOtp(phone, purpose);
      setSecondsLeft(res.canResendInSeconds);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('common_error_generic'));
    } finally {
      setResending(false);
    }
  };

  const onVerify = async () => {
    setError(null);
    setLoading(true);
    try {
      const result = await verifyOtp(phone, purpose, code, needsName ? fullName : undefined);
      await setTokens({ accessToken: result.accessToken, refreshToken: result.refreshToken });

      if (purpose === 'RESET_PIN') {
        // Existing, already-verified customer resetting a forgotten local PIN —
        // always go set a fresh one, never straight to Home.
        navigation.replace('PinSetup', { mode: 'reset' });
        return;
      }

      if (result.isNewUser) {
        navigation.replace('PinSetup');
        return;
      }
      const pinAlreadySet = await getPinIsSet();
      navigation.replace(pinAlreadySet ? 'Home' : 'PinSetup');
    } catch (e) {
      if (e instanceof ApiError && e.code === 'VALIDATION_ERROR' && !needsName) {
        // Backend signals a first-time phone number by rejecting verify without
        // fullName (see auth.service.ts's verifyOtp) — ask for it and let the
        // customer resubmit the same code.
        setNeedsName(true);
        setError(t('otp_name_prompt'));
      } else {
        setError(e instanceof ApiError ? e.message : t('common_error_generic'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <Text style={{ fontSize: fontSize.md, color: colors.muted, marginBottom: spacing.sm }}>
        {t('otp_subtitle')} {phone}
      </Text>
      <TextField
        value={code}
        onChangeText={setCode}
        placeholder="000000"
        keyboardType="number-pad"
        maxLength={6}
        error={!needsName ? error ?? undefined : undefined}
        autoFocus
      />
      {needsName ? (
        <>
          <Text style={{ color: colors.primary, marginBottom: spacing.sm }}>{t('otp_name_prompt')}</Text>
          <TextField
            value={fullName}
            onChangeText={setFullName}
            placeholder={t('otp_name_placeholder')}
            error={needsName ? error && error !== t('otp_name_prompt') ? error : undefined : undefined}
          />
        </>
      ) : null}

      <PrimaryButton
        label={t('otp_verify')}
        onPress={onVerify}
        loading={loading}
        disabled={code.length < 6 || (needsName && fullName.trim().length === 0)}
      />

      {secondsLeft > 0 ? (
        <Text style={{ textAlign: 'center', color: colors.muted, marginTop: spacing.md }}>
          {t('otp_resend_in', { seconds: secondsLeft })}
        </Text>
      ) : (
        <Text
          onPress={resending ? undefined : onResend}
          style={{ textAlign: 'center', color: colors.primary, marginTop: spacing.md, fontWeight: '600' }}
        >
          {t('otp_resend')}
        </Text>
      )}
    </Screen>
  );
}
