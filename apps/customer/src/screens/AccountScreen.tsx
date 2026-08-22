import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { Screen } from '../components/Screen';
import { Row } from '../components/Row';
import { PrimaryButton } from '../components/PrimaryButton';
import { useI18n } from '../i18n/I18nContext';
import { getMe, logout as apiLogout } from '../api/customer';
import { getTokens, clearAll } from '../storage/secureStorage';
import { CustomerResponse } from '../api/types';
import { colors, fontSize, radius, spacing } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Account'>;

export function AccountScreen({ navigation }: Props) {
  const { t, language, setLanguage } = useI18n();
  const [me, setMe] = useState<CustomerResponse | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    getMe()
      .then(setMe)
      .catch(() => setMe(null));
  }, []);

  const onLogout = async () => {
    setLoggingOut(true);
    try {
      const tokens = await getTokens();
      if (tokens) {
        await apiLogout(tokens.refreshToken).catch(() => undefined);
      }
    } finally {
      await clearAll();
      setLoggingOut(false);
      navigation.reset({ index: 0, routes: [{ name: 'PhoneEntry' }] });
    }
  };

  return (
    <Screen>
      {!me ? (
        <ActivityIndicator color={colors.primary} />
      ) : (
        <View style={{ marginBottom: spacing.lg }}>
          <Text style={styles.fieldLabel}>{t('phone_title')}</Text>
          <Text style={styles.fieldValue}>{me.phone}</Text>
          <Text style={[styles.fieldLabel, { marginTop: spacing.md }]}>{t('otp_name_placeholder')}</Text>
          <Text style={styles.fieldValue}>{me.fullName}</Text>
        </View>
      )}

      <Text style={styles.fieldLabel}>{t('account_language')}</Text>
      <Row style={{ marginBottom: spacing.lg }}>
        <Text
          onPress={() => setLanguage('ar')}
          style={[styles.langChip, language === 'ar' && styles.langChipActive]}
        >
          العربية
        </Text>
        <Text
          onPress={() => setLanguage('en')}
          style={[styles.langChip, language === 'en' && styles.langChipActive, { marginStart: spacing.sm }]}
        >
          English
        </Text>
      </Row>

      <PrimaryButton label={t('account_logout')} onPress={onLogout} loading={loggingOut} variant="outline" />
    </Screen>
  );
}

const styles = {
  fieldLabel: { color: colors.muted, fontSize: fontSize.sm },
  fieldValue: { color: colors.text, fontSize: fontSize.md, fontWeight: '600' as const, marginTop: 2 },
  langChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.text,
  },
  langChipActive: {
    backgroundColor: colors.primary,
    color: colors.white,
    borderColor: colors.primary,
  },
};
