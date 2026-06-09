import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput as RNTextInput,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { RootStackParamList } from '../../navigation/RootNavigator';
import { reviewService } from '../../services/reviewService';
import { useAuthStore } from '../../store/authStore';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../lib/queryKeys';
import { useTheme } from '../../theme/useTheme';
import { Button, RatingStars, Card, Toast } from '../../components';
import { spacing, typography, borderRadius } from '../../theme/theme';
import { containsProfanity } from '../../lib/filterProfanity';
import { useNotificationStore } from '../../store/notificationStore';

type RouteParams = RouteProp<RootStackParamList, 'Review'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const ReviewScreen: React.FC = () => {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const route = useRoute<RouteParams>();
  const navigation = useNavigation<NavigationProp>();
  const user = useAuthStore((state) => state.user);

  const queryClient = useQueryClient();
  const addNotification = useNotificationStore((s) => s.addNotification);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [ratingError, setRatingError] = useState('');
  const [commentError, setCommentError] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const handleSubmit = async () => {
    if (!user) return;

    if (rating === 0) {
      setRatingError(t('reviews.ratingRequired'));
      return;
    }

    if (containsProfanity(comment)) {
      setCommentError(t('reviews.profanityError'));
      return;
    }

    setLoading(true);
    try {
      await reviewService.createReview(
        user.id,
        route.params.appointmentId,
        route.params.businessId,
        { rating, comment }
      );

      setToast({ message: t('reviews.submitSuccess'), type: 'success' });

      const businessId = route.params.businessId;
      queryClient.invalidateQueries({ queryKey: queryKeys.reviews.forBusiness(businessId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.businesses.reviews(businessId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.businesses.detail(businessId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.businesses.averageRating(businessId) });
      queryClient.invalidateQueries({ queryKey: ['owner', 'dashboard'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.customerAll });
      queryClient.invalidateQueries({ queryKey: queryKeys.businesses.list() });
      if (route.params.businessOwnerId) {
        addNotification({
          type: 'new_review',
          title: t('notifications.newReview'),
          body: `${user.name} — ${t('notifications.starCount', { count: rating })}`,
          userId: route.params.businessOwnerId,
        });
      }

      setTimeout(() => {
        navigation.goBack();
      }, 1500);
    } catch (error: any) {
      setToast({
        message: error.message || t('reviews.submitError'),
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onHide={() => setToast(null)}
        />
      )}

      <ScrollView contentContainerStyle={styles.content}>
        <Card style={styles.card}>
          {route.params.businessName ? (
            <Text style={[styles.title, typography.heading, { color: colors.foreground }]}>
              {route.params.businessName}
            </Text>
          ) : (
            <Text style={[styles.title, typography.heading, { color: colors.foreground }]}>
              {t('reviews.experienceQuestion')}
            </Text>
          )}

          {route.params.serviceName ? (
            <Text style={[styles.subtitle, typography.body, { color: colors.mutedForeground }]}>
              {route.params.serviceName}
            </Text>
          ) : null}


          <View style={styles.ratingSection}>
            <Text
              style={[
                styles.label,
                typography.bodySemiBold,
                { color: colors.foreground },
              ]}
            >
              {t('reviews.rating')}
            </Text>
            <RatingStars
              rating={rating}
              size={40}
              interactive
              onRate={(value) => {
                setRating(value);
                if (ratingError) setRatingError('');
              }}
            />
            {ratingError ? (
              <Text style={[typography.body, { color: colors.destructive, fontSize: typography.sizes.sm, marginTop: spacing.xs }]}>
                {ratingError}
              </Text>
            ) : null}
          </View>

          <View style={styles.commentSection}>
            <Text
              style={[
                styles.label,
                typography.bodySemiBold,
                { color: colors.foreground },
              ]}
            >
              {t('reviews.yourReview')}
            </Text>
            <RNTextInput
              style={[
                styles.commentInput,
                typography.body,
                {
                  backgroundColor: colors.input,
                  borderColor: colors.inputBorder,
                  color: colors.foreground,
                  borderRadius: borderRadius.lg,
                },
              ]}
              placeholder={t('reviews.reviewPlaceholder')}
              placeholderTextColor={colors.placeholder}
              value={comment}
              onChangeText={(v) => { setComment(v); if (commentError) setCommentError(''); }}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />
            {commentError ? (
              <Text style={[typography.body, { color: colors.destructive, fontSize: typography.sizes.sm, marginTop: spacing.xs }]}>
                {commentError}
              </Text>
            ) : null}
          </View>

          <Button
            title={t('reviews.submitReview')}
            onPress={handleSubmit}
            loading={loading}
            fullWidth
            style={rating === 0 ? { opacity: 0.5 } : undefined}
          />
        </Card>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: spacing.xl,
  },
  card: {
    padding: spacing.xl,
  },
  title: {
    fontSize: typography.sizes.xxl,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: typography.sizes.sm,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  ratingSection: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  label: {
    fontSize: typography.sizes.md,
    marginBottom: spacing.md,
  },
  commentSection: {
    marginBottom: spacing.xl,
  },
  commentInput: {
    borderWidth: 1,
    padding: spacing.lg,
    fontSize: typography.sizes.md,
    minHeight: 120,
  },
});
