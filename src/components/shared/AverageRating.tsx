import React from 'react';
import { View, Text } from 'react-native';
import { RatingStars } from '../RatingStars';
import { useTheme } from '../../theme/useTheme';
import { typography, spacing } from '../../theme/theme';
import { useTranslation } from 'react-i18next';

interface AverageRatingProps {
  averageRating: number;
  reviewCount: number;
  size: 'compact' | 'full';
}

export const AverageRating: React.FC<AverageRatingProps> = ({ averageRating, reviewCount, size }) => {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const safe = !isNaN(averageRating) && isFinite(averageRating) ? averageRating : 0;

  if (size === 'compact') {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <Text style={[typography.bodySemiBold, { color: colors.foreground, fontSize: typography.sizes.sm }]}>
          {safe.toFixed(1)}
        </Text>
        <RatingStars rating={safe} size={12} />
        <Text style={[typography.body, { color: colors.mutedForeground, fontSize: typography.sizes.xs }]}>
          ({reviewCount})
        </Text>
      </View>
    );
  }

  return (
    <View style={{ alignItems: 'center' }}>
      <Text style={[typography.heading, { color: colors.foreground, fontSize: 64, marginBottom: spacing.sm }]}>
        {safe.toFixed(1)}
      </Text>
      <RatingStars rating={safe} size={24} />
      <Text style={[typography.body, { color: colors.mutedForeground, fontSize: typography.sizes.sm, marginTop: spacing.sm }]}>
        {t('businessReviews.based', { count: reviewCount })}
      </Text>
    </View>
  );
};
