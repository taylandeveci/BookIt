import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/useTheme';

interface RatingStarsProps {
  rating: number;
  size?: number;
  interactive?: boolean;
  onRate?: (rating: number) => void;
}

export const RatingStars: React.FC<RatingStarsProps> = ({
  rating,
  size = 20,
  interactive = false,
  onRate,
}) => {
  const { colors } = useTheme();

  const renderStar = (index: number) => {
    const filled = index < Math.floor(rating);
    const partial = index === Math.floor(rating) && rating % 1 !== 0;
    const hitSlopVal = Math.max(0, Math.ceil((44 - size) / 2));
    const hitSlop = { top: hitSlopVal, bottom: hitSlopVal, left: hitSlopVal, right: hitSlopVal };

    const icon = (
      <Ionicons
        name={filled || partial ? 'star' : 'star-outline'}
        size={size}
        color={filled || partial ? colors.secondary : colors.muted}
        style={partial ? { opacity: 0.4 } : undefined}
      />
    );

    if (interactive) {
      return (
        <TouchableOpacity
          key={index}
          onPress={() => onRate && onRate(index + 1)}
          style={styles.star}
          hitSlop={hitSlop}
          activeOpacity={0.7}
        >
          {icon}
        </TouchableOpacity>
      );
    }

    return (
      <View key={index} style={styles.star}>
        {icon}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {[0, 1, 2, 3, 4].map((index) => renderStar(index))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  star: {
    marginRight: 4,
  },
});
