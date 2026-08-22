import React, { useState } from 'react';
import { Text } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { Screen } from '../components/Screen';
import { TextField } from '../components/TextField';
import { PrimaryButton } from '../components/PrimaryButton';
import { useI18n } from '../i18n/I18nContext';
import { sendOtp } from '../api/customer';
import { ApiError } from '../api/client';
import { colors, fontSize, spacing } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'PhoneEntry'>;

const PHONE_REGEX = /^\+9665\d{8}$/;

export function PhoneEntryScreen({ navigation }: Props) {
  const { t } = useI18n();
  const [phone, setPhone] = useState('+9665');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    setError(null);
    if (!PHONE_REGEX.test(phone)) {
      setError(t('phone_invalid'));
      return;
    }
    setLoading(true);
    try {
      const { canResendInSeconds } = await sendOtp(phone, 'LOGIN');
      navigation.navigate('OtpVerify', { phone, purpose: 'LOGIN', canResendInSeconds });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('common_error_generic'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <Text style={{ fontSize: fontSize.md, color: colors.muted, marginBottom: spacing.lg }}>
        {t('phone_subtitle')}
      </Text>
      <TextField
        value={phone}
        onChangeText={setPhone}
        placeholder={t('phone_placeholder')}
        keyboardType="phone-pad"
        error={error ?? undefined}
        autoFocus
      />
      <PrimaryButton label={t('phone_send_code')} onPress={onSubmit} loading={loading} />
    </Screen>
  );
}
