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
      const response = await fetch(`${API_URL}/health`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('[BACKEND HEALTH]', 'Connected:', data);
        setStatus('connected');
        // Auto-hide after 2 seconds if connected
        setTimeout(() => setHideAfterSuccess(true), 2000);
      } else {
        console.warn('[BACKEND HEALTH]', 'HTTP Error:', response.status);
        setStatus('error');
      }
    } catch (error) {
      console.error('[BACKEND HEALTH]', 'Failed:', error);
      setStatus('error');
    }
  };

  // Hide if connected and timeout passed
  if (status === 'connected' && hideAfterSuccess) {
    return null;
  }

  // Only show during development
  if (__DEV__ === false) {
    return null;
  }

  const getStatusColor = () => {
    switch (status) {
      case 'checking':
        return colors.mutedForeground;
      case 'connected':
        return '#10b981'; // green
      case 'error':
        return colors.destructive;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'checking':
        return 'Checking backend...';
      case 'connected':
        return 'Backend connected';
      case 'error':
        return `Backend not reachable at ${API_URL}`;
    }
  };

  const getIcon = () => {
    switch (status) {
      case 'checking':
        return 'hourglass-outline';
      case 'connected':
        return 'checkmark-circle';
      case 'error':
        return 'warning';
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
