import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { Screen } from '../components/Screen';
import { PrimaryButton } from '../components/PrimaryButton';
import { useI18n } from '../i18n/I18nContext';
import { getFinancingApplication } from '../api/customer';
import { FinancingApplicationResponse } from '../api/types';
import { colors, fontSize, spacing } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'ApplicationStatus'>;

const POLL_INTERVAL_MS = 3000;
const POLL_TIMEOUT_MS = 30000;

export function ApplicationStatusScreen({ navigation, route }: Props) {
  const { applicationId } = route.params;
  const { t } = useI18n();
  const [application, setApplication] = useState<FinancingApplicationResponse | null>(null);
  const [timedOut, setTimedOut] = useState(false);
  const startedAt = useRef(Date.now());

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    const poll = async () => {
      try {
        const app = await getFinancingApplication(applicationId);
        if (cancelled) return;
        setApplication(app);
        if (app.status === 'PENDING' && Date.now() - startedAt.current < POLL_TIMEOUT_MS) {
          timer = setTimeout(poll, POLL_INTERVAL_MS);
        } else if (app.status === 'PENDING') {
          setTimedOut(true);
        }
      } catch {
        if (!cancelled && Date.now() - startedAt.current < POLL_TIMEOUT_MS) {
          timer = setTimeout(poll, POLL_INTERVAL_MS);
        }
      }
    };

    poll();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [applicationId]);

  const status = application?.status ?? 'PENDING';

  return (
    <Screen>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        {status === 'PENDING' && !timedOut && (
          <>
            <ActivityIndicator color={colors.primary} size="large" style={{ marginBottom: spacing.lg }} />
            <Text style={{ fontSize: fontSize.md, color: colors.text }}>{t('application_status_pending')}</Text>
          </>
        )}

        {status === 'APPROVED' && (
          <>
            <Text style={{ fontSize: 56, marginBottom: spacing.md }}>🎉</Text>
            <Text style={{ fontSize: fontSize.lg, fontWeight: '700', color: colors.success, marginBottom: spacing.lg }}>
              {t('application_status_approved')}
            </Text>
            <PrimaryButton label={t('application_status_go_home')} onPress={() => navigation.replace('Home')} />
          </>
        )}

        {status === 'REJECTED' && (
          <>
            <Text style={{ fontSize: 56, marginBottom: spacing.md }}>😔</Text>
            <Text style={{ fontSize: fontSize.lg, fontWeight: '700', color: colors.danger, marginBottom: spacing.lg }}>
              {t('application_status_rejected')}
            </Text>
            <PrimaryButton label={t('application_status_go_home')} onPress={() => navigation.replace('Home')} />
          </>
        )}

        {status === 'PENDING' && timedOut && (
          <>
            <Text style={{ fontSize: fontSize.md, color: colors.muted, marginBottom: spacing.lg }}>
              {t('application_status_pending')}
            </Text>
            <PrimaryButton label={t('application_status_go_home')} onPress={() => navigation.replace('Home')} variant="outline" />
          </>
        )}
      </View>
    </Screen>
  );
}
