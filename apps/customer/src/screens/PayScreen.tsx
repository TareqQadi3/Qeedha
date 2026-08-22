import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { Screen } from '../components/Screen';
import { Row } from '../components/Row';
import { PrimaryButton } from '../components/PrimaryButton';
import { useI18n } from '../i18n/I18nContext';
import { getMe, getMyQrCode, sendOtp } from '../api/customer';
import { ApiError } from '../api/client';
import { colors, fontSize, radius, spacing } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Pay'>;

type Tab = 'qr' | 'manual';

export function PayScreen({ navigation: _navigation }: Props) {
  const { t } = useI18n();
  const [tab, setTab] = useState<Tab>('qr');

  const [token, setToken] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [qrLoading, setQrLoading] = useState(true);
  const [qrError, setQrError] = useState<string | null>(null);

  const [phone, setPhone] = useState<string | null>(null);
  const [manualSending, setManualSending] = useState(false);
  const [manualSent, setManualSent] = useState(false);
  const [manualError, setManualError] = useState<string | null>(null);

  const fetchQrToken = useCallback(async () => {
    setQrError(null);
    setQrLoading(true);
    try {
      const res = await getMyQrCode();
      setToken(res.token);
      setSecondsLeft(res.expiresInSeconds);
    } catch (e) {
      setQrError(e instanceof ApiError ? e.message : t('common_error_generic'));
    } finally {
      setQrLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (tab !== 'qr') return;
    fetchQrToken();
  }, [tab, fetchQrToken]);

  useEffect(() => {
    if (tab !== 'qr' || secondsLeft <= 0) return;
    const id = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [tab, secondsLeft > 0]);

  // Auto-refresh once the QR token's ~60s TOTP window expires.
  useEffect(() => {
    if (tab === 'qr' && secondsLeft === 0 && token && !qrLoading) {
      fetchQrToken();
    }
  }, [tab, secondsLeft, token, qrLoading, fetchQrToken]);

  useEffect(() => {
    getMe()
      .then((me) => setPhone(me.phone))
      .catch(() => setPhone(null));
  }, []);

  const onSendManualCode = async () => {
    if (!phone) return;
    setManualError(null);
    setManualSending(true);
    try {
      await sendOtp(phone, 'PAYMENT');
      setManualSent(true);
    } catch (e) {
      setManualError(e instanceof ApiError ? e.message : t('common_error_generic'));
    } finally {
      setManualSending(false);
    }
  };

  return (
    <Screen>
      <Row justify="space-between" style={{ marginBottom: spacing.lg }}>
        <Text
          onPress={() => setTab('qr')}
          style={[styles.tab, tab === 'qr' && styles.tabActive]}
        >
          {t('pay_tab_qr')}
        </Text>
        <Text
          onPress={() => setTab('manual')}
          style={[styles.tab, tab === 'manual' && styles.tabActive]}
        >
          {t('pay_tab_manual')}
        </Text>
      </Row>

      {tab === 'qr' ? (
        <View style={{ alignItems: 'center' }}>
          {qrLoading && !token ? (
            <ActivityIndicator color={colors.primary} size="large" />
          ) : qrError ? (
            <>
              <Text style={{ color: colors.danger, marginBottom: spacing.md }}>{qrError}</Text>
              <PrimaryButton label={t('common_retry')} onPress={fetchQrToken} />
            </>
          ) : token ? (
            <>
              <View style={styles.qrWrap}>
                <QRCode value={token} size={220} color={colors.text} backgroundColor={colors.white} />
              </View>
              <Text style={{ marginTop: spacing.lg, color: colors.muted }}>
                {t('pay_qr_expires_in', { seconds: secondsLeft })}
              </Text>
            </>
          ) : null}
        </View>
      ) : (
        <View>
          {manualSent ? (
            <Text style={{ color: colors.text, fontSize: fontSize.md, lineHeight: 22 }}>
              {t('pay_manual_instructions')}
            </Text>
          ) : (
            <>
              <Text style={{ color: colors.muted, marginBottom: spacing.lg }}>{t('pay_manual_instructions')}</Text>
              {manualError ? <Text style={{ color: colors.danger, marginBottom: spacing.md }}>{manualError}</Text> : null}
              <PrimaryButton
                label={t('pay_manual_send')}
                onPress={onSendManualCode}
                loading={manualSending}
                disabled={!phone}
              />
            </>
          )}
        </View>
      )}
    </Screen>
  );
}

const styles = {
  tab: {
    flex: 1,
    textAlign: 'center' as const,
    paddingVertical: spacing.sm,
    color: colors.muted,
    fontWeight: '600' as const,
    borderBottomWidth: 2,
    borderBottomColor: colors.border,
  },
  tabActive: {
    color: colors.primary,
    borderBottomColor: colors.primary,
  },
  qrWrap: {
    padding: spacing.lg,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
};
