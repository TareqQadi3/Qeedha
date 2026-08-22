import React from 'react';
import { KeyboardTypeOptions, StyleSheet, Text, TextInput, View } from 'react-native';
import { useI18n } from '../i18n/I18nContext';
import { colors, fontSize, radius, spacing } from '../theme';

interface TextFieldProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  keyboardType?: KeyboardTypeOptions;
  secureTextEntry?: boolean;
  maxLength?: number;
  autoFocus?: boolean;
}

export function TextField({
  value,
  onChangeText,
  placeholder,
  label,
  error,
  keyboardType,
  secureTextEntry,
  maxLength,
  autoFocus,
}: TextFieldProps) {
  const { dir } = useI18n();
  return (
    <View style={styles.container}>
      {label ? <Text style={[styles.label, { textAlign: dir === 'rtl' ? 'right' : 'left' }]}>{label}</Text> : null}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        keyboardType={keyboardType}
        secureTextEntry={secureTextEntry}
        maxLength={maxLength}
        autoFocus={autoFocus}
        style={[
          styles.input,
          { textAlign: dir === 'rtl' ? 'right' : 'left', writingDirection: dir },
          error ? styles.inputError : null,
        ]}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: fontSize.sm,
    color: colors.muted,
    marginBottom: spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    fontSize: fontSize.md,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  inputError: {
    borderColor: colors.danger,
  },
  error: {
    color: colors.danger,
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
  },
});
