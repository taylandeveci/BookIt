import React, { useEffect, useState, useMemo } from 'react';
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
import { RootStackParamList } from '../../navigation/RootNavigator';
import { reviewService } from '../../services/reviewService';
import { Review } from '../../types';
import { useTheme } from '../../theme/useTheme';
import {
  Card,
  RatingStars,
  Chip,
  LoadingSpinner,
  EmptyState,
  Toast,
} from '../../components';
import { ProgressBar, getTimeAgo } from '../../components/reviews';
import { spacing, typography, borderRadius } from '../../theme/theme';

type RouteParams = RouteProp<RootStackParamList, 'BusinessReviews'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

type FilterType = 'all' | 'recent' | 'highest' | 'lowest' | 'photos';

interface RatingDistribution {
  5: number;
  4: number;
  3: number;
  2: number;
  1: number;
}

export const BusinessReviewsScreen: React.FC = () => {
  const { colors, shadows } = useTheme();
  const route = useRoute<RouteParams>();
  const navigation = useNavigation<NavigationProp>();
  
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState<FilterType>('all');
  const [helpfulReviews, setHelpfulReviews] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const { businessId, businessName, ratingAvg, ratingCount } = route.params;

  useEffect(() => {
    console.log('BusinessReviews params:', route.params);
    loadReviews();
  }, [businessId]);

  const loadReviews = async () => {
    try {
      setLoading(true);
      const data = await reviewService.getReviews(businessId);
      // Ensure data is an array before filtering
      const reviewsArray = Array.isArray(data) ? data : [];
      // Show only APPROVED reviews publicly
      const approvedReviews = reviewsArray.filter((r) => r.status === 'APPROVED');
      setReviews(approvedReviews);
    } catch (error: any) {
      console.error('Failed to load reviews:', error);
      setToast({ message: error.message || 'Failed to load reviews', type: 'error' });
      setReviews([]);
    } finally {
      setLoading(false);
    }
  };

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
      case 'photos':
        // Mock: assume some reviews have photos (for demo, filter reviews with id containing '2' or '4')
        filtered = filtered.filter((r) => r.id.includes('2') || r.id.includes('4'));
        break;
      default:
        // 'all' - no sorting
        break;
    }

    return filtered;
  }, [reviews, selectedFilter]);

  const toggleHelpful = (reviewId: string) => {
    setHelpfulReviews((prev) => {
      const updated = new Set(prev);
      if (updated.has(reviewId)) {
        updated.delete(reviewId);
      } else {
        updated.add(reviewId);
      }
      return updated;
    });
  };

  const renderHeader = () => {
    // Safe conversion for ratingAvg - handle string/null/undefined
    const safeRating = typeof ratingAvg === 'number' && !isNaN(ratingAvg) && isFinite(ratingAvg)
      ? ratingAvg
      : Number(ratingAvg) || 0;
    const displayRating = !isNaN(safeRating) && isFinite(safeRating) ? safeRating : 0;

    return (
      <View>
        {/* Rating Summary Card */}
        <Card style={styles.summaryCard}>
          <Text style={[styles.largeRating, typography.heading, { color: colors.foreground }]}>
            {displayRating.toFixed(1)}
          </Text>
          <RatingStars rating={displayRating} size={24} />
          <Text style={[styles.basedOnText, typography.body, { color: colors.mutedForeground }]}>
            Based on {ratingCount} review{ratingCount !== 1 ? 's' : ''}
          </Text>
        </Card>

      {/* Rating Distribution Card */}
      <Card style={styles.distributionCard}>
        {([5, 4, 3, 2, 1] as const).map((star) => {
          const count = distribution[star];
          const percentage = ratingCount > 0 ? count / ratingCount : 0;
          return (
            <View key={star} style={styles.distributionRow}>
              <Text style={[styles.starLabel, typography.bodySemiBold, { color: colors.foreground }]}>
                {star}★
              </Text>
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
        {(['all', 'recent', 'highest', 'lowest', 'photos'] as const).map((filter) => (
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
    );
  };

  const renderReview = ({ item }: { item: Review }) => {
    const isHelpful = helpfulReviews.has(item.id);
    const timeAgo = getTimeAgo(item.createdAt);
    // Mock: assume some reviews have photos
    const hasPhotos = item.id.includes('2') || item.id.includes('4');
    const mockPhotos = hasPhotos ? ['photo1', 'photo2', 'photo3'] : [];

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
                User {item.userId.slice(0, 6)}
              </Text>
              <RatingStars rating={item.rating} size={14} />
            </View>
          </View>
          <Text style={[styles.timeAgo, typography.body, { color: colors.mutedForeground }]}>
            {timeAgo}
          </Text>
        </View>

        {/* Review Text */}
        <Text style={[styles.reviewText, typography.body, { color: colors.foreground }]}>
          {item.comment}
        </Text>

        {/* Optional Service Tag (mock) */}
        <View style={styles.tagRow}>
          <View style={[styles.serviceTag, { backgroundColor: colors.accent }]}>
            <Text style={[typography.body, { color: colors.accentForeground, fontSize: typography.sizes.xs }]}>
              Service
            </Text>
          </View>
        </View>

        {/* Optional Photos Row */}
        {mockPhotos.length > 0 && (
          <View style={styles.photosRow}>
            {mockPhotos.slice(0, 3).map((photo, idx) => (
              <View
                key={idx}
                style={[
                  styles.photoThumb,
                  { backgroundColor: colors.muted, borderRadius: borderRadius.md },
                ]}
              >
                <Ionicons name="image-outline" size={24} color={colors.mutedForeground} />
              </View>
            ))}
          </View>
        )}

        {/* Helpful Button */}
        <View style={styles.helpfulRow}>
          <TouchableOpacity
            onPress={() => toggleHelpful(item.id)}
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
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, typography.headingSemiBold, { color: colors.foreground }]}>
            Reviews
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
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          <EmptyState
            icon="star-outline"
            title="No reviews yet"
            description="Be the first to review this business"
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
  tagRow: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  serviceTag: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.pill,
  },
  photosRow: {
    flexDirection: 'row',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  photoThumb: {
    width: 64,
    height: 64,
    justifyContent: 'center',
    alignItems: 'center',
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
