import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/useTheme';
import { spacing, typography } from '../theme/theme';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

export const BackendHealthCheck: React.FC = () => {
  const { colors } = useTheme();
  const [status, setStatus] = useState<'checking' | 'connected' | 'error'>('checking');
  const [hideAfterSuccess, setHideAfterSuccess] = useState(false);

  useEffect(() => {
    checkHealth();
  }, []);

  const checkHealth = async () => {
    try {
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), 3000)
      );
      const response = await Promise.race([
        fetch(`${API_URL}/health`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        }),
        timeout,
      ]);
      if (response.ok) {
        setStatus('connected');
        setTimeout(() => setHideAfterSuccess(true), 2000);
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
  };

  if (!__DEV__ || (status === 'connected' && hideAfterSuccess) || status === 'error') {
    return null;
  }

  const getStatusColor = () => {
    switch (status) {
      case 'checking':
        return colors.mutedForeground;
      case 'connected':
        return '#10b981';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'checking':
        return 'Checking backend...';
      case 'connected':
        return 'Backend connected';
    }
  };

  const getIcon = () => {
    switch (status) {
      case 'checking':
        return 'hourglass-outline' as const;
      case 'connected':
        return 'checkmark-circle' as const;
    }
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: getStatusColor() + '20',
          borderColor: getStatusColor(),
        },
      ]}
    >
      <Ionicons name={getIcon()} size={16} color={getStatusColor()} />
      <Text
        style={[
          styles.text,
          typography.body,
          { color: getStatusColor() },
        ]}
      >
        {getStatusText()}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
    gap: spacing.sm,
  },
  text: {
    fontSize: typography.sizes.sm,
    flex: 1,
  },
});
