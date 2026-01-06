import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput as RNTextInput,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../../navigation/RootNavigator';
import { businessService } from '../../services/businessService';
import { Business, FilterOptions } from '../../types';
import { useTheme } from '../../theme/useTheme';
import {
  Card,
  RatingStars,
  Chip,
  LoadingSpinner,
  EmptyState,
  Toast,
} from '../../components';
import { spacing, typography, borderRadius } from '../../theme/theme';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const SearchScreen: React.FC = () => {
  const { colors, shadows } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const [searchQuery, setSearchQuery] = useState('');
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>({});
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.trim().length < 2) {
      setBusinesses([]);
      return;
    }

    try {
      setLoading(true);
      const results = await businessService.getBusinesses({ 
        search: query,
        minRating: filters.minRating,
        maxDistance: filters.maxDistance
      });
      setBusinesses(results);
    } catch (error: any) {
      console.error('Search failed:', error);
      setToast({ message: error.message || 'Search failed', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = (data: Business[]): Business[] => {
    // Filtering now handled by API
    return data;
  };

  const toggleRatingFilter = (rating: number) => {
    setFilters((prev) => ({
      ...prev,
      minRating: prev.minRating === rating ? undefined : rating,
    }));
    if (searchQuery.trim().length >= 2) {
      handleSearch(searchQuery);
    }
  };

  const renderBusinessCard = ({ item }: { item: Business }) => (
    <Card
      style={styles.businessCard}
      pressable
      onPress={() => navigation.navigate('BusinessDetail', { businessId: item.id })}
    >
      <View
        style={[
          styles.businessImage,
          { backgroundColor: colors.muted, borderRadius: borderRadius.md },
        ]}
      >
        <Ionicons name="image" size={32} color={colors.mutedForeground} />
      </View>

      <View style={styles.businessInfo}>
        <Text
          style={[
            styles.businessName,
            typography.headingSemiBold,
            { color: colors.foreground },
          ]}
        >
          {item.name}
        </Text>

        {item.city && (
          <Text
            style={[
              styles.businessCategory,
              typography.body,
              { color: colors.mutedForeground },
            ]}
          >
            {item.city}
          </Text>
        )}

        <View style={styles.businessMeta}>
          <RatingStars rating={item.averageRating || 0} size={16} />
          <Text
            style={[
              styles.metaText,
              typography.body,
              { color: colors.mutedForeground },
            ]}
          >
            ({item.reviewCount})
          </Text>
          <Text
            style={[
              styles.metaText,
              typography.body,
              { color: colors.mutedForeground },
            ]}
          >
            • {item.distance} km
          </Text>
        </View>
      </View>
    </Card>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onHide={() => setToast(null)}
        />
      )}
      
      <View style={styles.searchSection}>
        <RNTextInput
          style={[
            styles.searchInput,
            typography.body,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              color: colors.foreground,
              borderRadius: borderRadius.pill,
            },
            shadows.sm,
          ]}
          placeholder="Search businesses or services..."
          placeholderTextColor={colors.placeholder}
          value={searchQuery}
          onChangeText={handleSearch}
        />
      </View>

      <View style={styles.filterSection}>
        <Text
          style={[
            styles.filterTitle,
            typography.bodySemiBold,
            { color: colors.foreground },
          ]}
        >
          Minimum Rating
        </Text>
        <View style={styles.filterChips}>
          {[4, 4.5].map((rating) => {
            const isSelected = filters.minRating === rating;
            return (
              <Chip
                key={rating}
                label={
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Text
                      style={[
                        typography.bodySemiBold,
                        {
                          color: isSelected
                            ? colors.primaryForeground
                            : colors.mutedForeground,
                        },
                      ]}
                    >
                      {rating}+
                    </Text>
                    <Ionicons
                      name="star"
                      size={14}
                      color={isSelected ? colors.primaryForeground : colors.secondary}
                    />
                  </View>
                }
                selected={isSelected}
                onPress={() => toggleRatingFilter(rating)}
              />
            );
          })}
        </View>
      </View>

      {loading ? (
        <LoadingSpinner />
      ) : searchQuery.trim().length < 2 ? (
        <EmptyState
          icon="search"
          title="Start searching"
          description="Enter at least 2 characters to search"
        />
      ) : businesses.length === 0 ? (
        <EmptyState
          icon="sad"
          title="No results found"
          description="Try adjusting your search or filters"
        />
      ) : (
        <FlatList
          data={businesses}
          renderItem={renderBusinessCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchSection: {
    padding: spacing.xl,
    paddingBottom: spacing.md,
  },
  searchInput: {
    borderWidth: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: typography.sizes.md,
  },
  filterSection: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
  },
  filterTitle: {
    fontSize: typography.sizes.sm,
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  filterChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  list: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
  },
  businessCard: {
    marginBottom: spacing.lg,
    flexDirection: 'row',
  },
  businessImage: {
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  imagePlaceholder: {
    fontSize: 32,
  },
  businessInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  businessName: {
    fontSize: typography.sizes.md,
    marginBottom: spacing.xs,
  },
  businessCategory: {
    fontSize: typography.sizes.sm,
    marginBottom: spacing.sm,
  },
  businessMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: typography.sizes.xs,
    marginLeft: spacing.xs,
  },
});
