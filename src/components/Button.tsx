import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  TouchableOpacityProps,
} from 'react-native';
import { useTheme } from '../theme/useTheme';
import { borderRadius, spacing, typography } from '../theme/theme';

interface ButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  disabled,
  style,
  ...props
}) => {
  const { colors, shadows } = useTheme();

  const buttonStyles: ViewStyle[] = [
    styles.base,
    {
      backgroundColor: colors.primary,
      borderRadius: borderRadius.pill,
    },
    shadows.sm,
  ];

  const textStyles: TextStyle[] = [
    styles.text,
    typography.bodySemiBold,
    {
      color: colors.primaryForeground,
    },
  ];

  // Variants
  if (variant === 'secondary') {
    buttonStyles.push({ backgroundColor: colors.secondary });
    textStyles.push({ color: colors.secondaryForeground });
  } else if (variant === 'outline') {
    buttonStyles.push({
      backgroundColor: 'transparent',
      borderWidth: 2,
      borderColor: colors.border,
    });
    textStyles.push({ color: colors.foreground });
  } else if (variant === 'ghost') {
    buttonStyles.push({ backgroundColor: 'transparent' });
    textStyles.push({ color: colors.primary });
  } else if (variant === 'destructive') {
    buttonStyles.push({ backgroundColor: colors.destructive });
    textStyles.push({ color: colors.destructiveForeground });
  }

  // Sizes
  if (size === 'sm') {
    buttonStyles.push({ paddingHorizontal: spacing.md, paddingVertical: spacing.sm });
    textStyles.push({ fontSize: typography.sizes.sm });
  } else if (size === 'md') {
    buttonStyles.push({ paddingHorizontal: spacing.lg, paddingVertical: spacing.md });
    textStyles.push({ fontSize: typography.sizes.md });
  } else if (size === 'lg') {
    buttonStyles.push({ paddingHorizontal: spacing.xl, paddingVertical: spacing.lg });
    textStyles.push({ fontSize: typography.sizes.lg });
  }

  if (fullWidth) {
    buttonStyles.push({ width: '100%' });
  }

  if (disabled || loading) {
    buttonStyles.push({ opacity: 0.5 });
  }

  return (
    <TouchableOpacity
      style={[buttonStyles, style]}
      disabled={disabled || loading}
      activeOpacity={0.7}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={textStyles[1].color as string} />
      ) : (
        <Text style={textStyles}>{title}</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  text: {
    textAlign: 'center',
  },
});
