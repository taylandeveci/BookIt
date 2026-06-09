import React from 'react';
import { View, Text } from 'react-native';
import { Card } from '../Card';
import { RatingStars } from '../RatingStars';
import { useTheme } from '../../theme/useTheme';
import { typography, spacing } from '../../theme/theme';
import { useTranslation } from 'react-i18next';
import { Review } from '../../types';

interface ReviewCardProps {
  review: Review;
  style?: object;
}

export const ReviewCard: React.FC<ReviewCardProps> = ({ review, style }) => {
  const { colors } = useTheme();
  const { t } = useTranslation();

  const dateFormatted = new Date(review.createdAt).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <Card style={[{ marginBottom: spacing.md }, style]}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.xs }}>
        <View style={{ flex: 1 }}>
          <Text style={[typography.bodySemiBold, { color: colors.foreground, fontSize: typography.sizes.sm }]}>
            {review.user?.fullName || t('common.anonymous')}
          </Text>
          <RatingStars rating={review.rating} size={14} />
        </View>
        <Text style={[typography.body, { color: colors.mutedForeground, fontSize: typography.sizes.xs }]}>
          {dateFormatted}
        </Text>
      </View>

      {(review.commentText || review.comment) ? (
        <Text style={[typography.body, { color: colors.foreground, fontSize: typography.sizes.sm, marginTop: spacing.xs }]}>
          {review.commentText || review.comment}
        </Text>
      ) : null}
    </Card>
  );
};
