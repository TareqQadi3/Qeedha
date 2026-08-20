import React, { useState } from 'react';
import { Text } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { Screen } from '../components/Screen';
import { TextField } from '../components/TextField';
import { PrimaryButton } from '../components/PrimaryButton';
import { useI18n } from '../i18n/I18nContext';
import { initiateNafath } from '../api/customer';
import { ApiError } from '../api/client';
import { NafathInitResponse } from '../api/types';
import { colors, fontSize, spacing } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'NafathVerify'>;

/**
 * NafathService is a stub (apps/api/src/auth/services/nafath.service.ts) that
 * always returns status: 'PENDING' from initiate() — there is no real Nafath
 * callback wired yet. We show that real pending state rather than fabricating
 * a fake "verified" result client-side.
 *
 * financing-application.service.ts's createApplication has no check on
 * nafathVerifiedAt, so wallet requests are not actually gated on KYC today —
 * the "skip for now" option below reflects that real server behavior.
 */
export function NafathVerifyScreen({ navigation }: Props) {
  const { t } = useI18n();
  const [nationalId, setNationalId] = useState('');
  const [result, setResult] = useState<NafathInitResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onStart = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await initiateNafath(nationalId);
      setResult(res);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('common_error_generic'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <Text style={{ fontSize: fontSize.md, color: colors.muted, marginBottom: spacing.lg }}>
        {t('nafath_body')}
      </Text>

      {result ? (
        <Text style={{ fontSize: fontSize.md, color: colors.primary, marginBottom: spacing.lg }}>
          {result.status === 'VERIFIED'
            ? t('nafath_status_verified')
            : result.status === 'REJECTED'
              ? t('nafath_status_rejected')
              : t('nafath_status_pending')}
        </Text>
      ) : (
        <TextField
          value={nationalId}
          onChangeText={setNationalId}
          placeholder={t('nafath_national_id_placeholder')}
          keyboardType="number-pad"
          error={error ?? undefined}
        />
      )}

      {!result ? (
        <PrimaryButton
          label={t('nafath_start')}
          onPress={onStart}
          loading={loading}
          disabled={nationalId.trim().length === 0}
        />
      ) : null}

      <PrimaryButton
        label={t('nafath_skip')}
        onPress={() => navigation.replace('Home')}
        variant="outline"
        style={{ marginTop: spacing.md }}
      />
    </Screen>
  );
}
