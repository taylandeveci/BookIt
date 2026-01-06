import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput as RNTextInput,
  FlatList,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../../navigation/RootNavigator';
import { businessService } from '../../services/businessService';
import { Business } from '../../types';
import { useTheme } from '../../theme/useTheme';
import { Card, RatingStars, LoadingSpinner, EmptyState, Toast } from '../../components';
import { spacing, typography, borderRadius } from '../../theme/theme';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const HomeScreen: React.FC = () => {
  const { colors, shadows } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    loadBusinesses();
  }, []);

  const loadBusinesses = async () => {
    try {
      setLoading(true);
      const data = await businessService.getRecommended(10);
      setBusinesses(data);
    } catch (error: any) {
      console.error('Failed to load businesses:', error);
      setToast({ message: error.message || 'Failed to load businesses', type: 'error' });
    } finally {
      setLoading(false);
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
      
      {/* Fixed Header */}
      <View
        style={[
          styles.headerContainer,
          { backgroundColor: colors.background, zIndex: 10, elevation: 2 },
        ]}
      >
        <View style={styles.header}>
          <Text
            style={[
              styles.greeting,
              typography.heading,
              { color: colors.foreground },
            ]}
          >
            Discover
          </Text>
          <Text
            style={[
              styles.subGreeting,
              typography.body,
              { color: colors.mutedForeground },
            ]}
          >
            Find your perfect appointment
          </Text>
        </View>

        <TouchableOpacity
          style={[
            styles.searchBar,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              borderRadius: borderRadius.pill,
            },
            shadows.sm,
          ]}
          onPress={() => navigation.navigate('UserTabs', { screen: 'Search' } as any)}
        >
          <Text style={[typography.body, { color: colors.placeholder }]}>
            Search businesses or services...
          </Text>
        </TouchableOpacity>
      </View>

      {/* Scrollable Content */}
      {loading ? (
        <View style={styles.centerContent}>
          <LoadingSpinner />
        </View>
      ) : businesses.length === 0 ? (
        <View style={styles.centerContent}>
          <EmptyState
            title="No businesses found"
            description="Check back later for recommendations"
          />
        </View>
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
  headerContainer: {
    paddingTop: spacing.md,
  },
  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
  },
  greeting: {
    fontSize: typography.sizes.xxl,
    marginBottom: spacing.xs,
  },
  subGreeting: {
    fontSize: typography.sizes.md,
  },
  searchBar: {
    marginHorizontal: spacing.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
  },
  list: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
