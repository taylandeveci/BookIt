import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/useTheme';
import { typography } from '../theme/theme';

type BadgeVariant = 'primary' | 'secondary' | 'destructive' | 'muted';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  iconSize?: number;
}

export const Badge: React.FC<BadgeProps> = ({
  label,
  variant = 'muted',
  icon,
  iconSize = 12,
}) => {
  const { colors } = useTheme();

  let bg: string;
  let fg: string;

  switch (variant) {
    case 'primary':
      bg = colors.primary + '22';
      fg = colors.primary;
      break;
    case 'secondary':
      bg = colors.secondary + '22';
      fg = colors.secondary;
      break;
    case 'destructive':
      bg = colors.destructive + '22';
      fg = colors.destructive;
      break;
    default:
      bg = colors.muted;
      fg = colors.mutedForeground;
  }

  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      {icon && <Ionicons name={icon} size={iconSize} color={fg} style={styles.icon} />}
      <Text style={[typography.bodySemiBold, styles.label, { color: fg }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  icon: {
    marginRight: 4,
  },
  label: {
    fontSize: 11,
  },
});
