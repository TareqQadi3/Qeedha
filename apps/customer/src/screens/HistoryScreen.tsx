import React, { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { Row } from '../components/Row';
import { useI18n } from '../i18n/I18nContext';
import { TranslationKeys } from '../i18n/ar';
import { listTransactions } from '../api/customer';
import { TransactionResponse } from '../api/types';
import { colors, fontSize, spacing } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'History'>;

const TXN_TYPE_KEY: Record<string, TranslationKeys> = {
  ACTIVATION: 'txn_type_activation',
  PURCHASE: 'txn_type_purchase',
  REFUND: 'txn_type_refund',
  REVERSAL: 'txn_type_reversal',
};

const TXN_STATUS_KEY: Record<string, TranslationKeys> = {
  PENDING: 'txn_status_pending',
  COMPLETED: 'txn_status_completed',
  FAILED: 'txn_status_failed',
  REVERSED: 'txn_status_reversed',
};

export function HistoryScreen({ route }: Props) {
  const { walletId } = route.params;
  const { t } = useI18n();
  const [transactions, setTransactions] = useState<TransactionResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const txns = await listTransactions(walletId);
      setTransactions(txns);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [walletId]);

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
      data={transactions}
      keyExtractor={(item) => item.id}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            load();
          }}
        />
      }
      ListEmptyComponent={<Text style={{ color: colors.muted, textAlign: 'center', marginTop: spacing.xl }}>{t('history_empty')}</Text>}
      renderItem={({ item }) => (
        <View style={{ paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border }}>
          <Row justify="space-between">
            <Text style={{ color: colors.text, fontWeight: '600' }}>
              {t(TXN_TYPE_KEY[item.type] ?? 'txn_type_purchase')}
            </Text>
            <Text style={{ color: colors.text, fontWeight: '700' }}>
              {Number(item.amount).toFixed(2)} {t('common_sar')}
            </Text>
          </Row>
          <Row justify="space-between" style={{ marginTop: 2 }}>
            <Text style={{ color: colors.muted, fontSize: fontSize.sm }}>
              {new Date(item.createdAt).toLocaleDateString()}
            </Text>
            <Text style={{ color: colors.muted, fontSize: fontSize.sm }}>
              {t(TXN_STATUS_KEY[item.status] ?? 'txn_status_pending')}
            </Text>
          </Row>
        </View>
      )}
    />
  );
}
