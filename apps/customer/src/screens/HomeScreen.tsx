import React, { useCallback, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { Row } from '../components/Row';
import { PrimaryButton } from '../components/PrimaryButton';
import { useI18n } from '../i18n/I18nContext';
import { getMerchantPublic, listTransactions, listWallets } from '../api/customer';
import { WalletResponse, TransactionResponse } from '../api/types';
import { colors, fontSize, radius, spacing } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

const TXN_TYPE_KEY: Record<string, 'txn_type_activation' | 'txn_type_purchase' | 'txn_type_refund' | 'txn_type_reversal'> = {
  ACTIVATION: 'txn_type_activation',
  PURCHASE: 'txn_type_purchase',
  REFUND: 'txn_type_refund',
  REVERSAL: 'txn_type_reversal',
};

export function HomeScreen({ navigation }: Props) {
  const { t } = useI18n();
  const [wallet, setWallet] = useState<WalletResponse | null>(null);
  const [merchantName, setMerchantName] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<TransactionResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const wallets = await listWallets();
      const active = wallets.find((w) => w.status === 'ACTIVE') ?? wallets[0] ?? null;
      setWallet(active);

      if (active) {
        const [merchant, txns] = await Promise.all([
          getMerchantPublic(active.merchantId).catch(() => null),
          listTransactions(active.id).catch(() => []),
        ]);
        setMerchantName(merchant?.name ?? null);
        setTransactions(txns.slice(0, 3));
      } else {
        setMerchantName(null);
        setTransactions([]);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  const remainingRatio = wallet ? wallet.remainingAmount / Math.max(wallet.totalAmount, 1) : 0;
  const isLowBalance = wallet !== null && remainingRatio < 0.2;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <Row justify="space-between" style={{ marginBottom: spacing.md }}>
          <Text style={styles.navLink} onPress={() => navigation.navigate('Account')}>
            {t('account_title')}
          </Text>
          <Row>
            <Text style={styles.navLink} onPress={() => navigation.navigate('Repayment')}>
              {t('repayment_title')}
            </Text>
          </Row>
        </Row>

        {wallet ? (
          <View style={styles.card}>
            <Text style={styles.merchantName}>{merchantName ?? wallet.merchantId}</Text>
            <Row justify="space-between" style={{ marginTop: spacing.md }}>
              <View>
                <Text style={styles.amountLabel}>{t('home_wallet_remaining')}</Text>
                <Text style={styles.amountValue}>
                  {wallet.remainingAmount.toFixed(2)} {t('common_sar')}
                </Text>
              </View>
              <View>
                <Text style={[styles.amountLabel, { textAlign: 'right' }]}>{t('home_wallet_total')}</Text>
                <Text style={[styles.amountValueSmall, { textAlign: 'right' }]}>
                  {wallet.totalAmount.toFixed(2)} {t('common_sar')}
                </Text>
              </View>
            </Row>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${Math.max(0, Math.min(1, remainingRatio)) * 100}%` },
                  isLowBalance && { backgroundColor: colors.warning },
                ]}
              />
            </View>
            {isLowBalance ? (
              <View style={styles.lowBalanceBanner}>
                <Text style={styles.lowBalanceText}>{t('home_low_balance_banner')}</Text>
              </View>
            ) : null}
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.merchantName}>{t('home_wallet_none_title')}</Text>
            <Text style={{ color: colors.muted, marginTop: spacing.xs }}>{t('home_wallet_none_body')}</Text>
          </View>
        )}

        <PrimaryButton
          label={t('home_request_new')}
          onPress={() => navigation.navigate('RequestFinancing')}
          variant="secondary"
          style={{ marginTop: spacing.md }}
        />

        <Row justify="space-between" style={{ marginTop: spacing.lg, marginBottom: spacing.sm }}>
          <Text style={styles.sectionTitle}>{t('home_recent_transactions')}</Text>
          {wallet ? (
            <Text
              style={styles.navLink}
              onPress={() => navigation.navigate('History', { walletId: wallet.id })}
            >
              {t('home_view_all')}
            </Text>
          ) : null}
        </Row>

        {transactions.length === 0 ? (
          <Text style={{ color: colors.muted }}>{t('home_no_transactions')}</Text>
        ) : (
          transactions.map((txn) => (
            <Row key={txn.id} justify="space-between" style={styles.txnRow}>
              <Text style={{ color: colors.text }}>{t(TXN_TYPE_KEY[txn.type] ?? 'txn_type_purchase')}</Text>
              <Text style={{ color: colors.text, fontWeight: '600' }}>
                {Number(txn.amount).toFixed(2)} {t('common_sar')}
              </Text>
            </Row>
          ))
        )}
      </ScrollView>

      {wallet ? (
        <View style={styles.fabWrap}>
          <PrimaryButton label={t('home_pay_button')} onPress={() => navigation.navigate('Pay')} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  container: { padding: spacing.md, paddingBottom: 100 },
  navLink: { color: colors.primary, fontWeight: '600', fontSize: fontSize.sm },
  card: {
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  merchantName: { color: colors.white, fontSize: fontSize.lg, fontWeight: '700' },
  amountLabel: { color: 'rgba(255,255,255,0.75)', fontSize: fontSize.sm },
  amountValue: { color: colors.white, fontSize: fontSize.xxl, fontWeight: '700' },
  amountValueSmall: { color: colors.white, fontSize: fontSize.lg, fontWeight: '600' },
  progressTrack: {
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.25)',
    marginTop: spacing.md,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: colors.secondary },
  lowBalanceBanner: {
    marginTop: spacing.md,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: radius.sm,
    padding: spacing.sm,
  },
  lowBalanceText: { color: colors.white, fontWeight: '600' },
  sectionTitle: { fontSize: fontSize.md, fontWeight: '700', color: colors.text },
  txnRow: {
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  fabWrap: {
    position: 'absolute',
    bottom: spacing.lg,
    left: spacing.lg,
    right: spacing.lg,
  },
});
