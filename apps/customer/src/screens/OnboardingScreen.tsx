import React, { useRef, useState } from 'react';
import { Dimensions, NativeScrollEvent, NativeSyntheticEvent, ScrollView, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RootStackParamList } from '../navigation/types';
import { useI18n } from '../i18n/I18nContext';
import { PrimaryButton } from '../components/PrimaryButton';
import { colors, fontSize, spacing } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Onboarding'>;

const { width } = Dimensions.get('window');

const SLIDES = [
  { title: 'onboarding_slide1_title', body: 'onboarding_slide1_body', emoji: '🛒' },
  { title: 'onboarding_slide2_title', body: 'onboarding_slide2_body', emoji: '📱' },
  { title: 'onboarding_slide3_title', body: 'onboarding_slide3_body', emoji: '📊' },
] as const;

export function OnboardingScreen({ navigation }: Props) {
  const { t } = useI18n();
  const [index, setIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  const finish = () => navigation.replace('PhoneEntry');

  const onMomentumScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(e.nativeEvent.contentOffset.x / width);
    setIndex(next);
  };

  const isLast = index === SLIDES.length - 1;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.skipRow}>
        <Text onPress={finish} style={styles.skip} accessibilityRole="button">
          {t('common_skip')}
        </Text>
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onMomentumScrollEnd}
      >
        {SLIDES.map((slide) => (
          <View key={slide.title} style={[styles.slide, { width }]}>
            <Text style={styles.emoji}>{slide.emoji}</Text>
            <Text style={styles.title}>{t(slide.title)}</Text>
            <Text style={styles.body}>{t(slide.body)}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.dots}>
        {SLIDES.map((slide, i) => (
          <View key={slide.title} style={[styles.dot, i === index && styles.dotActive]} />
        ))}
      </View>

      <View style={styles.footer}>
        {isLast ? (
          <PrimaryButton label={t('onboarding_get_started')} onPress={finish} />
        ) : (
          <PrimaryButton
            label={t('common_next')}
            onPress={() => scrollRef.current?.scrollTo({ x: (index + 1) * width, animated: true })}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  skipRow: { alignItems: 'flex-end', paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  skip: { color: colors.muted, fontSize: fontSize.md, padding: spacing.sm },
  slide: { alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  emoji: { fontSize: 72, marginBottom: spacing.lg },
  title: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  body: { fontSize: fontSize.md, color: colors.muted, textAlign: 'center', lineHeight: 22 },
  dots: { flexDirection: 'row', justifyContent: 'center', marginBottom: spacing.md },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
    marginHorizontal: 4,
  },
  dotActive: { backgroundColor: colors.primary, width: 20 },
  footer: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },
});
