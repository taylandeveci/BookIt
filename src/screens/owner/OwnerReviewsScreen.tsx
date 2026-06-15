import React, { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery } from '@tanstack/react-query';
import { RootStackParamList } from '../../navigation/RootNavigator';
import { queryKeys } from '../../lib/queryKeys';
import { reviewService } from '../../services/reviewService';
import { businessService } from '../../services/businessService';
import { useTheme } from '../../theme/useTheme';
import { AverageRating, LoadingSpinner, ReviewCard } from '../../components';
import { spacing, typography } from '../../theme/theme';

type RouteParams = RouteProp<RootStackParamList, 'OwnerReviews'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const OwnerReviewsScreen: React.FC = () => {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const route = useRoute<RouteParams>();
  const navigation = useNavigation<NavigationProp>();
  const { businessId } = route.params;

  // Mark reviews as seen when this screen mounts
  useEffect(() => {
    AsyncStorage.setItem(`owner_reviews_last_seen_${businessId}`, Date.now().toString());
  }, [businessId]);

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

  const { data: reviews = [], isLoading: reviewsLoading } = useQuery({
    queryKey: queryKeys.reviews.forBusiness(businessId),
    queryFn: async () => {
      const data = await reviewService.getReviews(businessId);
      return Array.isArray(data) ? data : [];
    },
  });

  const loading = ratingLoading || reviewsLoading;

  const renderItem = useCallback(({ item }: { item: typeof reviews[number] }) => <ReviewCard review={item} />, []);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="chevron-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.title, typography.heading, { color: colors.foreground }]}>
          {t('businessReviews.title')}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <LoadingSpinner />
        </View>
      ) : (
        <FlatList
          data={reviews}
          keyExtractor={(item) => item.id}
          removeClippedSubviews
          maxToRenderPerBatch={10}
          windowSize={5}
          initialNumToRender={6}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            ratingData ? (
              <View style={[styles.ratingCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <AverageRating
                  averageRating={ratingData.averageRating}
                  reviewCount={ratingData.reviewCount}
                  size="full"
                />
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="chatbubble-outline" size={48} color={colors.mutedForeground} />
              <Text style={[typography.body, { color: colors.mutedForeground, marginTop: spacing.md }]}>
                {t('businessReviews.noReviews')}
              </Text>
            </View>
          }
          renderItem={renderItem}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backButton: { padding: spacing.xs },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: typography.sizes.xl,
  },
  headerSpacer: { width: 32 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: spacing.xl },
  ratingCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: spacing.xl,
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  emptyState: { alignItems: 'center', paddingTop: 80 },
});
