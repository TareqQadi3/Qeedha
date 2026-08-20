import React from 'react';
import { ScrollView, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useI18n } from '../i18n/I18nContext';
import { colors, spacing } from '../theme';

interface ScreenProps {
  children: React.ReactNode;
  scroll?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** Base screen container: applies text direction and standard padding/background. */
export function Screen({ children, scroll = false, style }: ScreenProps) {
  const { dir } = useI18n();
  const Container = scroll ? ScrollView : View;
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <Container
        style={scroll ? styles.scroll : [styles.body, style]}
        contentContainerStyle={scroll ? [styles.body, style] : undefined}
      >
        <View style={{ direction: dir, flex: scroll ? undefined : 1, width: '100%' }}>
          {children}
        </View>
      </Container>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
  },
  body: {
    flex: 1,
    padding: spacing.md,
  },
});
