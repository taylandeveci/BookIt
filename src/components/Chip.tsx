import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TouchableOpacityProps,
} from 'react-native';
import { useTheme } from '../theme/useTheme';
import { borderRadius, spacing, typography } from '../theme/theme';

interface ChipProps extends TouchableOpacityProps {
  label: string | React.ReactNode;
  selected?: boolean;
  variant?: 'default' | 'primary' | 'secondary';
}

export const Chip: React.FC<ChipProps> = ({
  label,
  selected = false,
  variant = 'default',
  style,
  ...props
}) => {
  const { colors } = useTheme();

  const chipStyles: ViewStyle[] = [
    styles.chip,
    {
      backgroundColor: selected ? colors.primary : colors.muted,
      borderRadius: borderRadius.pill,
    },
  ];

  if (variant === 'secondary') {
    chipStyles.push({
      backgroundColor: selected ? colors.secondary : colors.muted,
    });
  }

  return (
    <TouchableOpacity
      style={[chipStyles, style]}
      activeOpacity={0.7}
      {...props}
    >
      {typeof label === 'string' ? (
        <Text
          style={[
            styles.text,
            typography.bodySemiBold,
            {
              color: selected ? colors.primaryForeground : colors.mutedForeground,
            },
          ]}
        >
          {label}
        </Text>
      ) : (
        label
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
  },
  text: {
    fontSize: typography.sizes.sm,
  },
});
