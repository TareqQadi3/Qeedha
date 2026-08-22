import React, { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { Row } from '../components/Row';
import { useI18n } from '../i18n/I18nContext';
import { TranslationKeys } from '../i18n/ar';
import { listFinancingApplications } from '../api/customer';
import { FinancingApplicationResponse } from '../api/types';
import { colors, fontSize, radius, spacing } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Repayment'>;

const PLAN_KEY: Record<string, TranslationKeys> = {
  PAY_IN_1: 'financing_plan_pay_in_1',
  PAY_IN_30: 'financing_plan_pay_in_30',
  INSTALLMENTS_4: 'financing_plan_installments_4',
};

const STATUS_COLOR: Record<string, string> = {
  PENDING: colors.warning,
  APPROVED: colors.success,
  REJECTED: colors.danger,
  CANCELLED: colors.muted,
  DEFAULTED: colors.danger,
};

/**
 * Intentionally does not call any "payment schedule" endpoint — the backend
 * has no such API surface for the customer app. Qeedha's architecture routes
 * repayment/collection through the financing partner (see README's Phase 2
 * notes on FinancingGateway), so this screen only reflects application state.
 */
export function RepaymentScreen(_props: Props) {
  const { t } = useI18n();
  const [applications, setApplications] = useState<FinancingApplicationResponse[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const apps = await listFinancingApplications();
      setApplications(apps);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <FlatList
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{ padding: spacing.md }}
      data={applications}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={
        <View style={{ backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md }}>
          <Text style={{ color: colors.muted, lineHeight: 20 }}>{t('repayment_note')}</Text>
        </View>
      }
      ListEmptyComponent={
        <Text style={{ color: colors.muted, textAlign: 'center', marginTop: spacing.xl }}>
          {t('repayment_no_applications')}
        </Text>
      }
      renderItem={({ item }) => (
        <View
          style={{
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: radius.md,
            padding: spacing.md,
            marginBottom: spacing.sm,
          }}
        >
          <Row justify="space-between">
            <Text style={{ color: colors.text, fontWeight: '700' }}>
              {Number(item.amount).toFixed(2)} {t('common_sar')}
            </Text>
            <Text style={{ color: STATUS_COLOR[item.status] ?? colors.muted, fontWeight: '600' }}>{item.status}</Text>
          </Row>
          <Text style={{ color: colors.muted, marginTop: 2, fontSize: fontSize.sm }}>
            {t(PLAN_KEY[item.planType] ?? 'financing_plan_pay_in_1')}
          </Text>
          {item.decidedAt ? (
            <Text style={{ color: colors.muted, marginTop: 2, fontSize: fontSize.sm }}>
              {t('repayment_decided_at')}: {new Date(item.decidedAt).toLocaleDateString()}
            </Text>
          ) : null}
        </View>
      )}
    />
  );
}
