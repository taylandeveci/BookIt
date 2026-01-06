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

    const StarComponent = interactive ? TouchableOpacity : View;

    return (
      <StarComponent
        key={index}
        onPress={() => interactive && onRate && onRate(index + 1)}
        style={styles.star}
      >
        <Ionicons
          name={filled ? 'star' : partial ? 'star-half' : 'star-outline'}
          size={size}
          color={filled || partial ? colors.secondary : colors.muted}
        />
      </StarComponent>
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
