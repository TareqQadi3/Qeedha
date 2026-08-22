import React from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import { useI18n } from '../i18n/I18nContext';

interface RowProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  align?: 'flex-start' | 'center' | 'flex-end' | 'stretch';
  justify?: 'flex-start' | 'center' | 'flex-end' | 'space-between' | 'space-around';
}

/**
 * A horizontal flex container that flips direction for RTL without ever
 * touching I18nManager.forceRTL — the whole app drives direction off context.
 */
export function Row({ children, style, align = 'center', justify = 'flex-start' }: RowProps) {
  const { dir } = useI18n();
  return (
    <View
      style={[
        {
          flexDirection: dir === 'rtl' ? 'row-reverse' : 'row',
          alignItems: align,
          justifyContent: justify,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
