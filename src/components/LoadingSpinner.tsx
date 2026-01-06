import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useTheme } from '../theme/useTheme';
import { spacing } from '../theme/theme';

interface LoadingSpinnerProps {
  size?: 'small' | 'large';
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'large',
}) => {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <ActivityIndicator size={size} color={colors.primary} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: spacing.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
