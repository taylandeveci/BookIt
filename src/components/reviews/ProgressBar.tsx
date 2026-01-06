import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/useTheme';
import { borderRadius } from '../../theme/theme';

interface ProgressBarProps {
  value: number; // 0-1
  height?: number;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ value, height = 8 }) => {
  const { colors } = useTheme();
  
  return (
    <View
      style={[
        styles.track,
        {
          backgroundColor: colors.muted,
          height,
          borderRadius: height / 2,
        },
      ]}
    >
      <View
        style={[
          styles.fill,
          {
            backgroundColor: colors.primary,
            width: `${Math.min(100, Math.max(0, value * 100))}%`,
            height,
            borderRadius: height / 2,
          },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  track: {
    overflow: 'hidden',
    flex: 1,
  },
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
});
