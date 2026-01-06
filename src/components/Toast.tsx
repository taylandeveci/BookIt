import React, { useEffect, useRef } from 'react';
import { Animated, Text, StyleSheet, Dimensions } from 'react-native';
import { useTheme } from '../theme/useTheme';
import { borderRadius, spacing, typography } from '../theme/theme';

interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info';
  duration?: number;
  onHide: () => void;
}

export const Toast: React.FC<ToastProps> = ({
  message,
  type = 'info',
  duration = 3000,
  onHide,
}) => {
  const { colors, shadows } = useTheme();
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-100)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: -100,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => onHide());
    }, duration);

    return () => clearTimeout(timer);
  }, []);

  let backgroundColor = colors.card;
  let textColor = colors.foreground;

  if (type === 'success') {
    backgroundColor = colors.success;
    textColor = colors.primaryForeground;
  } else if (type === 'error') {
    backgroundColor = colors.destructive;
    textColor = colors.destructiveForeground;
  } else if (type === 'info') {
    backgroundColor = colors.info;
    textColor = '#FFFFFF';
  }

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor,
          borderRadius: borderRadius.lg,
          opacity,
          transform: [{ translateY }],
        },
        shadows.lg,
      ]}
    >
      <Text
        style={[
          styles.text,
          typography.bodySemiBold,
          { color: textColor },
        ]}
      >
        {message}
      </Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    left: spacing.lg,
    right: spacing.lg,
    padding: spacing.lg,
    zIndex: 1000,
  },
  text: {
    fontSize: typography.sizes.md,
    textAlign: 'center',
  },
});
