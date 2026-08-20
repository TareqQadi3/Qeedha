import React, { useState } from 'react';
import { Text } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { Screen } from '../components/Screen';
import { TextField } from '../components/TextField';
import { PrimaryButton } from '../components/PrimaryButton';
import { useI18n } from '../i18n/I18nContext';
import { setPin as apiSetPin } from '../api/customer';
import { ApiError } from '../api/client';
import { setPinIsSet } from '../storage/secureStorage';
import { colors, fontSize, spacing } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'PinSetup'>;

const PIN_REGEX = /^\d{4,6}$/;

export function PinSetupScreen({ navigation, route }: Props) {
  const isReset = route.params?.mode === 'reset';
  const { t } = useI18n();
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [step, setStep] = useState<'create' | 'confirm'>('create');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onContinue = () => {
    setError(null);
    if (!PIN_REGEX.test(pin)) {
      setError(t('pin_invalid'));
      return;
    }
    setStep('confirm');
  };

  const onSubmit = async () => {
    setError(null);
    if (confirmPin !== pin) {
      setError(t('pin_mismatch'));
      setConfirmPin('');
      return;
    }
    setLoading(true);
    try {
      await apiSetPin(pin);
      await setPinIsSet(true);
      navigation.replace(isReset ? 'Home' : 'NafathVerify');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('common_error_generic'));
    } finally {
      setLoading(false);
    }
  };

  if (step === 'create') {
    return (
      <Screen>
        <Text style={{ fontSize: fontSize.md, color: colors.muted, marginBottom: spacing.lg }}>
          {t('pin_setup_subtitle')}
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
        <PrimaryButton label={t('common_next')} onPress={onContinue} disabled={pin.length < 4} />
      </Screen>
    );
  }

  return (
    <Screen>
      <Text style={{ fontSize: fontSize.md, color: colors.muted, marginBottom: spacing.lg }}>
        {t('pin_setup_confirm_subtitle')}
      </Text>
      <TextField
        value={confirmPin}
        onChangeText={setConfirmPin}
        placeholder="••••"
        keyboardType="number-pad"
        secureTextEntry
        maxLength={6}
        error={error ?? undefined}
        autoFocus
      />
      <PrimaryButton
        label={t('common_confirm')}
        onPress={onSubmit}
        loading={loading}
        disabled={confirmPin.length < 4}
      />
    </Screen>
  );
}
