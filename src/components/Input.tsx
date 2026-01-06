import React from 'react';
import {
  TextInput,
  View,
  Text,
  StyleSheet,
  TextInputProps,
  ViewStyle,
} from 'react-native';
import { useTheme } from '../theme/useTheme';
import { borderRadius, spacing, typography } from '../theme/theme';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  containerStyle?: ViewStyle;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  containerStyle,
  style,
  ...props
}) => {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Text
          style={[
            styles.label,
            typography.bodySemiBold,
            { color: colors.foreground },
          ]}
        >
          {label}
        </Text>
      )}
      <TextInput
        style={[
          styles.input,
          typography.body,
          {
            backgroundColor: colors.input,
            borderColor: error ? colors.destructive : colors.inputBorder,
            color: colors.foreground,
          },
          style,
        ]}
        placeholderTextColor={colors.placeholder}
        {...props}
      />
      {error && (
        <Text
          style={[
            styles.error,
            typography.body,
            { color: colors.destructive },
          ]}
        >
          {error}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: typography.sizes.sm,
    marginBottom: spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderRadius: borderRadius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: typography.sizes.md,
  },
  error: {
    fontSize: typography.sizes.xs,
    marginTop: spacing.xs,
    marginLeft: spacing.md,
  },
});
