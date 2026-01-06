import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/useTheme';
import { spacing, typography } from '../theme/theme';

interface EmptyStateProps {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  description?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
}) => {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      {icon && (
        <View style={styles.iconContainer}>
          <Ionicons name={icon} size={64} color={colors.mutedForeground} />
        </View>
      )}
      <Text
        style={[
          styles.title,
          typography.headingSemiBold,
          { color: colors.foreground },
        ]}
      >
        {title}
      </Text>
      {description && (
        <Text
          style={[
            styles.description,
            typography.body,
            { color: colors.mutedForeground },
          ]}
        >
          {description}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  iconContainer: {
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: typography.sizes.xl,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  description: {
    fontSize: typography.sizes.md,
    textAlign: 'center',
    maxWidth: 280,
  },
});
