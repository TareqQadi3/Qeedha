import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { Screen } from '../components/Screen';
import { Row } from '../components/Row';
import { TextField } from '../components/TextField';
import { PrimaryButton } from '../components/PrimaryButton';
import { useI18n } from '../i18n/I18nContext';
import { getMerchantPublic, requestWallet, FinancingPlan } from '../api/customer';
import { ApiError } from '../api/client';
import { colors, fontSize, radius, spacing } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'RequestFinancing'>;

const AMOUNT_PRESETS = [500, 1000, 1500, 2000];

const PLANS: { value: FinancingPlan; labelKey: 'financing_plan_pay_in_1' | 'financing_plan_pay_in_30' | 'financing_plan_installments_4' }[] = [
  { value: 'PAY_IN_1', labelKey: 'financing_plan_pay_in_1' },
  { value: 'PAY_IN_30', labelKey: 'financing_plan_pay_in_30' },
  { value: 'INSTALLMENTS_4', labelKey: 'financing_plan_installments_4' },
];

type Step = 'merchant' | 'amount' | 'plan' | 'review';

/**
 * merchantId is a plain UUID server-side (CreateWalletRequestDto.merchantId is
 * @IsUUID()) — there is no merchant directory/search API yet, so "search by
 * code" in v1 is manual entry of that ID/code as given by the store. A full
 * merchant directory is out of scope for this phase.
 */
export function RequestFinancingScreen({ navigation }: Props) {
  const { t } = useI18n();
  const [step, setStep] = useState<Step>('merchant');

  const [merchantId, setMerchantId] = useState('');
  const [merchantName, setMerchantName] = useState<string | null>(null);
  const [merchantError, setMerchantError] = useState<string | null>(null);
  const [resolving, setResolving] = useState(false);

  const [amount, setAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState('');

  const [plan, setPlan] = useState<FinancingPlan | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const resolveMerchant = async () => {
    setMerchantError(null);
    setResolving(true);
    try {
      const merchant = await getMerchantPublic(merchantId.trim());
      setMerchantName(merchant.name);
      setStep('amount');
    } catch (e) {
      setMerchantError(
        e instanceof ApiError && e.status === 404 ? t('financing_merchant_not_found') : t('common_error_generic'),
      );
    } finally {
      setResolving(false);
    }
  };

  const selectedAmount = amount ?? (Number(customAmount) > 0 ? Number(customAmount) : null);

  const submit = async () => {
    if (!selectedAmount || !plan) return;
    setSubmitError(null);
    setSubmitting(true);
    try {
      const result = await requestWallet(merchantId.trim(), selectedAmount, plan);
      navigation.replace('ApplicationStatus', { applicationId: result.applicationId });
    } catch (e) {
      setSubmitError(e instanceof ApiError ? e.message : t('common_error_generic'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen scroll>
      {step === 'merchant' && (
        <View>
          <Text style={styles.stepTitle}>{t('financing_step_merchant_title')}</Text>
          <Text style={styles.stepSubtitle}>{t('financing_step_merchant_subtitle')}</Text>
          <TextField
            value={merchantId}
            onChangeText={setMerchantId}
            placeholder={t('financing_merchant_placeholder')}
            error={merchantError ?? undefined}
            autoFocus
          />
          <PrimaryButton
            label={t('financing_merchant_resolve')}
            onPress={resolveMerchant}
            loading={resolving}
            disabled={merchantId.trim().length === 0}
          />
        </View>
      )}

      {step === 'amount' && (
        <View>
          <Text style={styles.stepTitle}>{t('financing_step_amount_title')}</Text>
          <Row style={{ flexWrap: 'wrap', marginBottom: spacing.md }}>
            {AMOUNT_PRESETS.map((preset) => (
              <Text
                key={preset}
                onPress={() => {
                  setAmount(preset);
                  setCustomAmount('');
                }}
                style={[styles.chip, amount === preset && styles.chipActive]}
              >
                {preset} {t('common_sar')}
              </Text>
            ))}
          </Row>
          <TextField
            value={customAmount}
            onChangeText={(v) => {
              setCustomAmount(v);
              setAmount(null);
            }}
            placeholder={t('financing_amount_custom')}
            keyboardType="numeric"
          />
          <PrimaryButton
            label={t('common_next')}
            onPress={() => setStep('plan')}
            disabled={!selectedAmount || selectedAmount <= 0}
          />
        </View>
      )}

      {step === 'plan' && (
        <View>
          <Text style={styles.stepTitle}>{t('financing_step_plan_title')}</Text>
          {PLANS.map((p) => (
            <Text
              key={p.value}
              onPress={() => setPlan(p.value)}
              style={[styles.planOption, plan === p.value && styles.planOptionActive]}
            >
              {t(p.labelKey)}
            </Text>
          ))}
          <PrimaryButton label={t('common_next')} onPress={() => setStep('review')} disabled={!plan} />
        </View>
      )}

      {step === 'review' && plan && selectedAmount && (
        <View>
          <Text style={styles.stepTitle}>{t('financing_step_review_title')}</Text>
          <Row justify="space-between" style={styles.reviewRow}>
            <Text style={styles.reviewLabel}>{t('financing_review_merchant')}</Text>
            <Text style={styles.reviewValue}>{merchantName ?? merchantId}</Text>
          </Row>
          <Row justify="space-between" style={styles.reviewRow}>
            <Text style={styles.reviewLabel}>{t('financing_review_amount')}</Text>
            <Text style={styles.reviewValue}>
              {selectedAmount} {t('common_sar')}
            </Text>
          </Row>
          <Row justify="space-between" style={styles.reviewRow}>
            <Text style={styles.reviewLabel}>{t('financing_review_plan')}</Text>
            <Text style={styles.reviewValue}>
              {t(PLANS.find((p) => p.value === plan)!.labelKey)}
            </Text>
          </Row>
          {submitError ? <Text style={{ color: colors.danger, marginTop: spacing.sm }}>{submitError}</Text> : null}
          <PrimaryButton
            label={t('financing_submit')}
            onPress={submit}
            loading={submitting}
            style={{ marginTop: spacing.lg }}
          />
        </View>
      )}
    </Screen>
  );
}

const styles = {
  stepTitle: { fontSize: fontSize.lg, fontWeight: '700' as const, color: colors.text, marginBottom: spacing.sm },
  stepSubtitle: { fontSize: fontSize.sm, color: colors.muted, marginBottom: spacing.md },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
    color: colors.text,
    overflow: 'hidden' as const,
  },
  chipActive: {
    backgroundColor: colors.primary,
    color: colors.white,
    borderColor: colors.primary,
  },
  planOption: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    color: colors.text,
    fontSize: fontSize.md,
  },
  planOptionActive: {
    backgroundColor: colors.primary,
    color: colors.white,
    borderColor: colors.primary,
  },
  reviewRow: {
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  reviewLabel: { color: colors.muted },
  reviewValue: { color: colors.text, fontWeight: '600' as const },
};
