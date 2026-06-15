import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { RootStackParamList } from '../../navigation/RootNavigator';
import { reviewService } from '../../services/reviewService';
import { businessService } from '../../services/businessService';
import { Review } from '../../types';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../../lib/queryKeys';
import { useTheme } from '../../theme/useTheme';
import {
  Card,
  RatingStars,
  Chip,
  LoadingSpinner,
  EmptyState,
  Toast,
  AverageRating,
} from '../../components';
// Inline implementations (formerly in src/components/reviews/)
const ProgressBar: React.FC<{ value: number; height?: number }> = ({ value, height = 8 }) => {
  const { colors } = useTheme();
  return (
    <View style={{ height, backgroundColor: colors.muted, borderRadius: height / 2, overflow: 'hidden' }}>
      <View style={{ height, width: `${Math.min(1, Math.max(0, value)) * 100}%`, backgroundColor: colors.primary, borderRadius: height / 2 }} />
    </View>
  );
};
import { spacing, typography } from '../../theme/theme';

type RouteParams = RouteProp<RootStackParamList, 'BusinessReviews'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

type FilterType = 'all' | 'recent' | 'highest' | 'lowest';

interface RatingDistribution {
  5: number;
  4: number;
  3: number;
  2: number;
  1: number;
}

const ReviewListItem = React.memo<{
  item: Review;
  isHelpful: boolean;
  onToggleHelpful: (reviewId: string) => void;
}>(({ item, isHelpful, onToggleHelpful }) => {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const dateFormatted = new Date(item.createdAt).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <Card style={styles.reviewCard}>
      {/* Avatar + Name + Time */}
      <View style={styles.reviewHeader}>
        <View style={styles.avatarRow}>
          <View style={[styles.avatar, { backgroundColor: colors.muted }]}>
            <Ionicons name="person" size={20} color={colors.mutedForeground} />
          </View>
          <View style={styles.userInfo}>
            <Text style={[styles.userName, typography.bodySemiBold, { color: colors.foreground }]}>
              {item.user?.fullName || t('common.anonymous')}
            </Text>
            <RatingStars rating={item.rating} size={14} />
          </View>
        </View>
        <Text style={[styles.timeAgo, typography.body, { color: colors.mutedForeground }]}>
          {dateFormatted}
        </Text>
      </View>

      {/* Review Text */}
      <Text style={[styles.reviewText, typography.body, { color: colors.foreground }]}>
        {item.commentText || item.comment}
      </Text>

      {/* Helpful Button */}
      <View style={styles.helpfulRow}>
        <TouchableOpacity
          onPress={() => onToggleHelpful(item.id)}
          style={styles.helpfulButton}
        >
          <Ionicons
            name={isHelpful ? 'thumbs-up' : 'thumbs-up-outline'}
            size={16}
            color={isHelpful ? colors.primary : colors.mutedForeground}
          />
          <Text
            style={[
              styles.helpfulText,
              typography.body,
              { color: isHelpful ? colors.primary : colors.mutedForeground },
            ]}
          >
            {isHelpful ? '1 found helpful' : 'Helpful?'}
          </Text>
        </TouchableOpacity>
      </View>
    </Card>
  );
});

export const BusinessReviewsScreen: React.FC = () => {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const route = useRoute<RouteParams>();
  const navigation = useNavigation<NavigationProp>();
  
  const [selectedFilter, setSelectedFilter] = useState<FilterType>('all');
  const [helpfulReviews, setHelpfulReviews] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const { businessId } = route.params;

  const { data: ratingData, isLoading: ratingLoading } = useQuery({
    queryKey: queryKeys.businesses.averageRating(businessId),
    queryFn: async () => {
      const biz = await businessService.getBusiness(businessId);
      return {
        averageRating: Number(biz?.averageRating) || 0,
        reviewCount: biz?.reviewCount || 0,
      };
    },
  });

  const liveRating = ratingData?.averageRating ?? 0;
  const liveReviewCount = ratingData?.reviewCount ?? 0;

  const { data: reviews = [], isLoading: loading } = useQuery({
    queryKey: queryKeys.reviews.forBusiness(businessId),
    queryFn: async () => {
      const data = await reviewService.getReviews(businessId);
      return Array.isArray(data) ? (data as Review[]) : [];
    },
  });

  // Calculate rating distribution
  const distribution: RatingDistribution = useMemo(() => {
    const dist: RatingDistribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach((review) => {
      const rating = Math.round(review.rating) as 1 | 2 | 3 | 4 | 5;
      dist[rating]++;
    });
    return dist;
  }, [reviews]);

  // Filter and sort reviews
  const filteredReviews = useMemo(() => {
    let filtered = [...reviews];

    switch (selectedFilter) {
      case 'recent':
        filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      case 'highest':
        filtered.sort((a, b) => b.rating - a.rating);
        break;
      case 'lowest':
        filtered.sort((a, b) => a.rating - b.rating);
        break;
      default:
        // 'all' - no sorting
        break;
    }

    return filtered;
  }, [reviews, selectedFilter]);

  const toggleHelpful = useCallback((reviewId: string) => {
    setHelpfulReviews((prev) => {
      const updated = new Set(prev);
      if (updated.has(reviewId)) {
        updated.delete(reviewId);
      } else {
        updated.add(reviewId);
      }
      return updated;
    });
  }, []);

  const renderHeader = useCallback(() => (
    <View>
      {/* Rating Summary Card */}
      <Card style={styles.summaryCard}>
        {ratingLoading ? (
          <LoadingSpinner size="small" />
        ) : (
          <AverageRating averageRating={liveRating} reviewCount={liveReviewCount} size="full" />
        )}
      </Card>

      {/* Rating Distribution Card */}
      <Card style={styles.distributionCard}>
        {([5, 4, 3, 2, 1] as const).map((star) => {
          const count = distribution[star];
          const percentage = liveReviewCount > 0 ? count / liveReviewCount : 0;
          return (
            <View key={star} style={styles.distributionRow}>
              <View style={styles.starLabelRow}>
                <Text style={[typography.bodySemiBold, { color: colors.foreground, fontSize: typography.sizes.sm }]}>
                  {star}
                </Text>
                <Ionicons name="star" size={11} color={colors.secondary} style={{ marginLeft: 2 }} />
              </View>
              <View style={styles.barContainer}>
                <ProgressBar value={percentage} height={8} />
              </View>
              <Text style={[styles.countLabel, typography.body, { color: colors.mutedForeground }]}>
                {count}
              </Text>
            </View>
          );
        })}
      </Card>

      {/* Filter Chips */}
      <View style={styles.filterRow}>
        {(['all', 'recent', 'highest', 'lowest'] as const).map((filter) => (
          <Chip
            key={filter}
            label={filter.charAt(0).toUpperCase() + filter.slice(1)}
            selected={selectedFilter === filter}
            onPress={() => setSelectedFilter(filter)}
            style={styles.filterChip}
          />
        ))}
      </View>
    </View>
  ), [ratingLoading, liveRating, liveReviewCount, distribution, selectedFilter, colors]);

  const renderReview = useCallback(
    ({ item }: { item: Review }) => (
      <ReviewListItem item={item} isHelpful={helpfulReviews.has(item.id)} onToggleHelpful={toggleHelpful} />
    ),
    [helpfulReviews, toggleHelpful]
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, typography.headingSemiBold, { color: colors.foreground }]}>
            {t('businessReviews.title')}
          </Text>
          <View style={styles.placeholderButton} />
        </View>
        <View style={styles.loadingContainer}>
          <LoadingSpinner />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onHide={() => setToast(null)}
        />
      )}
      
      {/* Custom Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, typography.headingSemiBold, { color: colors.foreground }]}>
          Reviews
        </Text>
        <TouchableOpacity style={styles.filterButton}>
          <Ionicons name="options-outline" size={24} color={colors.foreground} />
        </TouchableOpacity>
      </View>

      {/* Reviews List */}
      <FlatList
        data={filteredReviews}
        renderItem={renderReview}
        keyExtractor={(item) => item.id}
        removeClippedSubviews
        maxToRenderPerBatch={10}
        windowSize={5}
        initialNumToRender={6}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          <EmptyState
            icon="chatbubble-outline"
            title={t('businessReviews.noReviews')}
            description={t('reviews.beFirst')}
          />
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'transparent',
  },
  backButton: {
    padding: spacing.xs,
  },
  headerTitle: {
    fontSize: typography.sizes.lg,
    flex: 1,
    textAlign: 'center',
  },
  filterButton: {
    padding: spacing.xs,
  },
  placeholderButton: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: spacing.xl,
  },
  summaryCard: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    marginBottom: spacing.lg,
  },
  largeRating: {
    fontSize: 64,
    marginBottom: spacing.sm,
  },
  basedOnText: {
    fontSize: typography.sizes.sm,
    marginTop: spacing.sm,
  },
  distributionCard: {
    paddingVertical: spacing.lg,
    marginBottom: spacing.lg,
  },
  distributionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  starLabel: {
    width: 32,
    fontSize: typography.sizes.sm,
  },
  starLabelRow: {
    width: 32,
    flexDirection: 'row',
    alignItems: 'center',
  },
  barContainer: {
    flex: 1,
    marginHorizontal: spacing.md,
  },
  countLabel: {
    width: 32,
    textAlign: 'right',
    fontSize: typography.sizes.sm,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: spacing.lg,
  },
  filterChip: {
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
  },
  reviewCard: {
    marginBottom: spacing.md,
    padding: spacing.lg,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: typography.sizes.md,
    marginBottom: spacing.xs,
  },
  timeAgo: {
    fontSize: typography.sizes.xs,
  },
  reviewText: {
    fontSize: typography.sizes.md,
    lineHeight: 22,
    marginBottom: spacing.md,
  },
  helpfulRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  helpfulButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  helpfulText: {
    fontSize: typography.sizes.sm,
    marginLeft: spacing.xs,
  },
});
