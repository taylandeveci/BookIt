import React from 'react';
import {
  View,
  StyleSheet,
  ViewProps,
  TouchableOpacity,
  TouchableOpacityProps,
} from 'react-native';
import { useTheme } from '../theme/useTheme';
import { borderRadius, spacing } from '../theme/theme';

interface CardProps extends ViewProps {
  pressable?: boolean;
  onPress?: () => void;
}

export const Card: React.FC<CardProps> = ({
  children,
  pressable = false,
  onPress,
  style,
  ...props
}) => {
  const { colors, shadows } = useTheme();

  const cardStyle = [
    styles.card,
    {
      backgroundColor: colors.card,
      borderRadius: borderRadius.xl,
    },
    shadows.md,
    style,
  ];

  if (pressable && onPress) {
    return (
      <TouchableOpacity
        style={cardStyle}
        onPress={onPress}
        activeOpacity={0.8}
        {...(props as TouchableOpacityProps)}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return (
    <View style={cardStyle} {...props}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: spacing.lg,
  },
});
