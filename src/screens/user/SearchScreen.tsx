import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput as RNTextInput,
  ScrollView,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Linking,
  Platform,
  Image,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../../lib/queryKeys';
import { RootStackParamList, UserTabParamList } from '../../navigation/RootNavigator';
import { businessService } from '../../services/businessService';
import { Business, FilterOptions } from '../../types';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../theme/useTheme';
import {
  Card,
  RatingStars,
  Toast,
  Badge,
  Button,
} from '../../components';
import { spacing, typography, borderRadius } from '../../theme/theme';
import { useBusinessLocation } from '../../hooks/useBusinessLocation';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const SERVICE_CHIP_DEFS: { i18nKey: string; apiValue: string }[] = [
  { i18nKey: 'search.chipMaleHaircut', apiValue: 'Male Haircut' },
  { i18nKey: 'search.chipHaircutBeard', apiValue: 'Haircut & Beard' },
  { i18nKey: 'search.chipKidsHaircut', apiValue: "Kid's Haircut" },
  { i18nKey: 'search.chipSkinFade', apiValue: 'Skin Fade' },
  { i18nKey: 'search.chipFemaleHaircut', apiValue: 'Female Haircut' },
  { i18nKey: 'search.chipBeardShaping', apiValue: 'Beard Shaping' },
  { i18nKey: 'search.chipLineUp', apiValue: 'Line Up' },
];

const CATEGORY_CHIP_DEFS: { i18nKey: string; tagValue: string }[] = [
  { i18nKey: 'search.chipBarber', tagValue: 'Berber' },
  { i18nKey: 'search.chipHairColor', tagValue: 'Saç Boyama' },
  { i18nKey: 'search.chipSpa', tagValue: 'Spa' },
  { i18nKey: 'search.chipMensGrooming', tagValue: 'Erkek Bakımı' },
  { i18nKey: 'search.chipWomensCare', tagValue: 'Kadın Bakımı' },
];

const ANKARA = { latitude: 39.9208, longitude: 32.8541 };
const SKELETON_COUNT = 5;

export const SearchScreen: React.FC = () => {
  const { colors, shadows } = useTheme();
  const { t } = useTranslation();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProp<UserTabParamList, 'Search'>>();
  const insets = useSafeAreaInsets();
  const inputRef = useRef<RNTextInput>(null);

  // Focus input when navigated here from HomeScreen search bar
  useEffect(() => {
    if (!route.params?.focusAt) return;
    const timeout = setTimeout(() => inputRef.current?.focus(), 80);
    return () => clearTimeout(timeout);
  }, [route.params?.focusAt]);

  const RATING_OPTIONS: { label: string; value: number | undefined }[] = [
    { label: t('common.all'), value: undefined },
    { label: '4.5+', value: 4.5 },
    { label: '4.0+', value: 4.0 },
    { label: '3.5+', value: 3.5 },
  ];

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [filters, setFilters] = useState<FilterOptions>({});
  const [activeService, setActiveService] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [mapRegion, setMapRegion] = useState<{
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  } | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locationDenied, setLocationDenied] = useState(false);
  const [mapModalVisible, setMapModalVisible] = useState(false);
  const [userCoords, setUserCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [selectedMapBusiness, setSelectedMapBusiness] = useState<Business | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Debounce search text — 300ms after last keystroke
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch businesses — always enabled; passes empty query when input is clear
  // minRating is intentionally excluded from queryKey/queryFn: the server stores a
  // stale averageRating field that may differ from the computed value returned in the
  // response. Rating filtering is applied client-side on the actual computed value.
  const { data: businesses = [], isLoading, isError } = useQuery({
    queryKey: queryKeys.businesses.list({
      query: debouncedQuery,
      serviceName: activeService,
    }),
    queryFn: () =>
      businessService.getBusinesses({
        search: debouncedQuery || undefined,
        serviceName: activeService || undefined,
      }),
    staleTime: 30_000,
  });

  useEffect(() => {
    if (isError) setToast({ message: t('common.error'), type: 'error' });
  }, [isError]);

  const bizLocation = useBusinessLocation(selectedMapBusiness ?? undefined, userCoords);

  // Rating and category filters are client-side — applied on the computed averageRating
  // returned by the API, not the stored field used by the server.
  const filteredBusinesses = useMemo(() => {
    return businesses.filter((b) => {
      // Rating filter: exclude businesses with no rating or rating <= 0
      if (filters.minRating !== undefined) {
        const rating = Number(b.averageRating);
        if (!rating || rating <= 0 || rating < filters.minRating) return false;
      }
      // Category filter
      if (activeCategory && !b.tags?.includes(activeCategory)) return false;
      return true;
    });
  }, [businesses, filters.minRating, activeCategory]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleServiceChip = (service: string) => {
    setActiveService((prev) => (prev === service ? null : service));
  };

  const handleRatingChip = (value: number | undefined) => {
    const next = filters.minRating === value ? undefined : value;
    setFilters((prev) => ({ ...prev, minRating: next }));
  };

  const handleCategoryChip = (tag: string) => {
    setActiveCategory((prev) => (prev === tag ? null : tag));
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setDebouncedQuery('');
    setFilters({});
    setActiveService(null);
    setActiveCategory(null);
  };

  const handleOpenMap = async () => {
    setIsLocating(true);
    setLocationDenied(false);
    setMapRegion(null);
    setMapModalVisible(true);

    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      setLocationDenied(true);
      setMapRegion({ ...ANKARA, latitudeDelta: 0.05, longitudeDelta: 0.05 });
      setIsLocating(false);
      return;
    }

    try {
      const result = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setUserCoords({ latitude: result.coords.latitude, longitude: result.coords.longitude });
      setMapRegion({
        latitude: result.coords.latitude,
        longitude: result.coords.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      });
    } catch {
      setLocationDenied(true);
      setMapRegion({ ...ANKARA, latitudeDelta: 0.05, longitudeDelta: 0.05 });
    } finally {
      setIsLocating(false);
    }
  };

  const handleMarkerPress = (biz: Business) => {
    setSelectedMapBusiness(biz);
  };

  const handleNavigateToBusiness = () => {
    if (!selectedMapBusiness) return;
    const id = selectedMapBusiness.id;
    setMapModalVisible(false);
    setSelectedMapBusiness(null);
    navigation.navigate('BusinessDetail', { businessId: id });
  };

  const renderBusinessCard = ({ item }: { item: Business }) => (
    <Card
      style={styles.businessCard}
      pressable
      onPress={() => navigation.navigate('BusinessDetail', { businessId: item.id })}
    >
      <View style={[styles.businessImage, { backgroundColor: colors.muted, borderRadius: borderRadius.md, overflow: 'hidden' }]}>
        <Ionicons name="image" size={32} color={colors.mutedForeground} />
        {item.media?.[0]?.url ? (
          <Image source={{ uri: item.media[0].url }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        ) : null}
      </View>

      <View style={styles.businessInfo}>
        <Text style={[styles.businessName, typography.headingSemiBold, { color: colors.foreground }]}>
          {item.name}
        </Text>

        {item.city ? (
          <Text style={[styles.businessCity, typography.body, { color: colors.mutedForeground }]}>
            {item.city}
          </Text>
        ) : null}

        <View style={styles.businessMeta}>
          <RatingStars rating={item.averageRating || 0} size={16} />
          <Text style={[styles.metaText, typography.body, { color: colors.mutedForeground }]}>
            ({item.reviewCount})
          </Text>
          {item.distance ? (
            <Text style={[styles.metaText, typography.body, { color: colors.mutedForeground }]}>
              • {item.distance} km
            </Text>
          ) : null}
        </View>
      </View>
    </Card>
  );

  const renderSkeletonCard = (_: number) => (
    <View key={_} style={[styles.businessCard, styles.skeletonCard, { backgroundColor: colors.card, borderRadius: borderRadius.lg }]}>
      <View style={[styles.businessImage, { backgroundColor: colors.muted, borderRadius: borderRadius.md }]} />
      <View style={[styles.businessInfo, { gap: spacing.xs }]}>
        <View style={[styles.skeletonLine, { width: '60%', backgroundColor: colors.muted }]} />
        <View style={[styles.skeletonLine, { width: '40%', backgroundColor: colors.muted }]} />
        <View style={[styles.skeletonLine, { width: '30%', backgroundColor: colors.muted }]} />
      </View>
    </View>
  );

  // Empty-state logic
  const hasAnyFilter = !!filters.minRating || !!activeService || !!activeCategory;
  const hasAnySearch = searchQuery.trim().length > 0;
  // DB is empty — no filters or search active, server returned nothing
  const showDbEmpty = !isLoading && businesses.length === 0 && !hasAnyFilter && !hasAnySearch;
  // Filter/search mismatch — something is active but produced no visible results
  const showFilterMismatch = !isLoading && filteredBusinesses.length === 0 && !showDbEmpty;
  const showList = !isLoading && filteredBusinesses.length > 0;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['bottom']}>
      {toast ? (
        <Toast message={toast.message} type={toast.type} onHide={() => setToast(null)} />
      ) : null}

      {/* Search bar row */}
      <View style={styles.searchRow}>
        <RNTextInput
          ref={inputRef}
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
          placeholder={t('search.placeholder')}
          placeholderTextColor={colors.placeholder}
          value={searchQuery}
          onChangeText={handleSearch}
        />

        <TouchableOpacity
          style={[styles.mapToggle, { backgroundColor: colors.card, borderRadius: borderRadius.pill }, shadows.sm]}
          onPress={handleOpenMap}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          activeOpacity={0.7}
          disabled={mapModalVisible}
        >
          <Ionicons name="map-outline" size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Rating filter */}
      <View style={styles.filterSection}>
        <Text style={[typography.bodySemiBold, styles.sectionLabel, { color: colors.mutedForeground }]}>
          {t('search.rating')}
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipScrollContent}
        >
          {RATING_OPTIONS.map((opt) => {
            const selected = filters.minRating === opt.value;
            return (
              <TouchableOpacity
                key={opt.label}
                style={[
                  styles.chip,
                  {
                    backgroundColor: selected ? colors.primary : colors.muted,
                    borderRadius: borderRadius.pill,
                  },
                ]}
                onPress={() => handleRatingChip(opt.value)}
                activeOpacity={0.7}
              >
                {opt.value !== undefined ? (
                  <View style={styles.ratingChipContent}>
                    <Text style={[typography.bodySemiBold, { fontSize: typography.sizes.sm, color: selected ? colors.primaryForeground : colors.mutedForeground }]}>
                      {opt.label}
                    </Text>
                    <Ionicons name="star" size={11} color={selected ? colors.primaryForeground : colors.secondary} />
                  </View>
                ) : (
                  <Text style={[typography.bodySemiBold, { fontSize: typography.sizes.sm, color: selected ? colors.primaryForeground : colors.mutedForeground }]}>
                    {opt.label}
                  </Text>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Categories filter */}
      <View style={styles.filterSection}>
        <Text style={[typography.bodySemiBold, styles.sectionLabel, { color: colors.mutedForeground }]}>
          {t('search.categories')}
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipScrollContent}
        >
          {CATEGORY_CHIP_DEFS.map((chip) => (
            <TouchableOpacity
              key={chip.tagValue}
              style={[
                styles.chip,
                {
                  backgroundColor: activeCategory === chip.tagValue ? colors.primary : colors.muted,
                  borderRadius: borderRadius.pill,
                },
              ]}
              onPress={() => handleCategoryChip(chip.tagValue)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  typography.bodySemiBold,
                  {
                    fontSize: typography.sizes.sm,
                    color: activeCategory === chip.tagValue ? colors.primaryForeground : colors.mutedForeground,
                  },
                ]}
              >
                {t(chip.i18nKey)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Popular Services filter */}
      <View style={styles.filterSection}>
        <Text style={[typography.bodySemiBold, styles.sectionLabel, { color: colors.mutedForeground }]}>
          {t('search.popularServices')}
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipScrollContent}
        >
          {SERVICE_CHIP_DEFS.map((chip) => (
            <TouchableOpacity
              key={chip.apiValue}
              style={[
                styles.chip,
                {
                  backgroundColor: activeService === chip.apiValue ? colors.primary : colors.muted,
                  borderRadius: borderRadius.pill,
                },
              ]}
              onPress={() => handleServiceChip(chip.apiValue)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  typography.bodySemiBold,
                  {
                    fontSize: typography.sizes.sm,
                    color: activeService === chip.apiValue ? colors.primaryForeground : colors.mutedForeground,
                  },
                ]}
              >
                {t(chip.i18nKey)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Result count */}
      {showList && (
        <Text style={[typography.body, styles.resultCount, { color: colors.mutedForeground }]}>
          {t('search.resultCount', { count: filteredBusinesses.length })}
        </Text>
      )}

      {/* Content area — skeleton / DB-empty / filter-mismatch / list */}
      {isLoading ? (
        <ScrollView
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        >
          {Array.from({ length: SKELETON_COUNT }, (_, i) => renderSkeletonCard(i))}
        </ScrollView>
      ) : showDbEmpty ? (
        <View style={styles.centeredContent}>
          <Ionicons name="storefront-outline" size={48} color={colors.mutedForeground} />
          <Text style={[typography.headingSemiBold, styles.emptyTitle, { color: colors.foreground }]}>
            {t('search.noBusinesses')}
          </Text>
          <Text style={[typography.body, styles.emptyDesc, { color: colors.mutedForeground }]}>
            {t('search.noBusinessesDesc')}
          </Text>
        </View>
      ) : showFilterMismatch ? (
        <View style={styles.centeredContent}>
          <Ionicons name="search-outline" size={48} color={colors.mutedForeground} />
          <Text style={[typography.headingSemiBold, styles.emptyTitle, { color: colors.foreground }]}>
            {t('search.filterNoResults')}
          </Text>
          <Text style={[typography.body, styles.emptyDesc, { color: colors.mutedForeground }]}>
            {t('search.adjustFilters')}
          </Text>
          {hasAnyFilter && (
            <TouchableOpacity
              style={[styles.clearBtn, { borderColor: colors.border, borderWidth: 1, borderRadius: borderRadius.lg }]}
              onPress={handleClearFilters}
              activeOpacity={0.7}
            >
              <Text style={[typography.bodySemiBold, { color: colors.foreground, fontSize: typography.sizes.sm }]}>
                {t('search.clearFilters')}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={filteredBusinesses}
          renderItem={renderBusinessCard}
          keyExtractor={(item) => item.id}
          removeClippedSubviews
          maxToRenderPerBatch={10}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Map Modal */}
      <Modal
        visible={mapModalVisible}
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => {
          setMapModalVisible(false);
          setSelectedMapBusiness(null);
        }}
      >
        <View style={styles.modalContainer}>
          {isLocating || !mapRegion ? (
            <View style={[StyleSheet.absoluteFill, styles.mapLoadingContainer, { backgroundColor: colors.background }]}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : (
            <MapView
              style={StyleSheet.absoluteFill}
              region={mapRegion}
              onRegionChangeComplete={setMapRegion}
              showsUserLocation={!locationDenied}
            >
              {businesses
                .filter((b) => b.locationLat && b.locationLng)
                .map((b) => (
                  <Marker
                    key={b.id}
                    coordinate={{
                      latitude: Number(b.locationLat),
                      longitude: Number(b.locationLng),
                    }}
                    onPress={() => handleMarkerPress(b)}
                    tracksViewChanges={false}
                  >
                    <View style={styles.markerContainer}>
                      <Ionicons name="location" size={20} color="#4A5E6A" />
                    </View>
                  </Marker>
                ))}
            </MapView>
          )}

          {/* Controls overlay — box-none passes map touches through */}
          <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
            <TouchableOpacity
              style={[
                styles.closeBtn,
                { backgroundColor: colors.card, top: insets.top + spacing.sm, ...shadows.sm },
              ]}
              onPress={() => {
                setMapModalVisible(false);
                setSelectedMapBusiness(null);
              }}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close" size={20} color={colors.foreground} />
            </TouchableOpacity>

            {locationDenied && !isLocating && (
              <View style={[styles.locationBanner, { backgroundColor: colors.muted }]}>
                <Text style={[typography.body, { fontSize: typography.sizes.xs, color: colors.mutedForeground, textAlign: 'center' }]}>
                  {t('search.locationFallback')}
                </Text>
              </View>
            )}
          </View>

          {/* Business bottom sheet — overlaid on map when marker is tapped */}
          {selectedMapBusiness && (
            <View
              style={[styles.bsSheet, { backgroundColor: colors.card, ...shadows.lg }]}
              pointerEvents="auto"
            >
              <View style={styles.bsHandleArea}>
                <View style={[styles.bsHandle, { backgroundColor: colors.border }]} />
              </View>
              <View style={[styles.bsContent, { paddingBottom: insets.bottom + spacing.lg }]}>
                <Text style={[typography.heading, { fontSize: typography.sizes.xl, color: colors.foreground, marginBottom: spacing.sm }]}>
                  {selectedMapBusiness.name}
                </Text>
                {selectedMapBusiness.city ? (
                  <View style={{ marginBottom: spacing.md }}>
                    <Badge label={selectedMapBusiness.city} variant="muted" />
                  </View>
                ) : null}
                {bizLocation.distance !== null && (
                  <View style={[styles.bsRow, { marginBottom: spacing.sm }]}>
                    <Ionicons name="navigate" size={14} color={colors.primary} />
                    <Text style={[typography.body, { color: colors.mutedForeground, marginLeft: spacing.xs }]}>
                      {bizLocation.distance}
                    </Text>
                  </View>
                )}
                <View style={[styles.bsRow, { marginBottom: spacing.sm }]}>
                  <Ionicons name="star" size={14} color={colors.secondary} />
                  <Text style={[typography.body, { color: colors.mutedForeground, marginLeft: spacing.xs }]}>
                    {Number(selectedMapBusiness.averageRating || 0).toFixed(1)} ({selectedMapBusiness.reviewCount || 0})
                  </Text>
                </View>
                {!!selectedMapBusiness.address && (
                  <View style={[styles.bsRow, { marginBottom: spacing.lg }]}>
                    <Ionicons name="location" size={14} color={colors.mutedForeground} />
                    <Text style={[typography.body, { color: colors.mutedForeground, marginLeft: spacing.xs, flex: 1 }]}>
                      {selectedMapBusiness.address}
                    </Text>
                  </View>
                )}
                <View style={styles.bsButtons}>
                  <Button
                    title={t('businessDetail.getDirections')}
                    variant="outline"
                    style={{ flex: 1 }}
                    onPress={() => {
                      if (!selectedMapBusiness.locationLat || !selectedMapBusiness.locationLng) return;
                      const lat = Number(selectedMapBusiness.locationLat);
                      const lng = Number(selectedMapBusiness.locationLng);
                      const url = Platform.OS === 'ios'
                        ? `maps://app?daddr=${lat},${lng}`
                        : `google.navigation:q=${lat},${lng}`;
                      Linking.openURL(url);
                    }}
                  />
                  <Button
                    title={t('search.goToBusiness')}
                    variant="primary"
                    style={{ flex: 1 }}
                    onPress={handleNavigateToBusiness}
                  />
                </View>
              </View>
            </View>
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: typography.sizes.md,
  },
  mapToggle: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  filterSection: {
    marginBottom: spacing.sm,
  },
  sectionLabel: {
    fontSize: typography.sizes.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.xs,
  },
  chipScrollContent: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  ratingChipContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  resultCount: {
    fontSize: typography.sizes.xs,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  list: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
  },
  centeredContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  emptyTitle: {
    fontSize: typography.sizes.xl,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  emptyDesc: {
    fontSize: typography.sizes.md,
    textAlign: 'center',
    maxWidth: 280,
  },
  clearBtn: {
    marginTop: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  businessCard: {
    marginBottom: spacing.lg,
    flexDirection: 'row',
  },
  skeletonCard: {
    padding: spacing.md,
  },
  skeletonLine: {
    height: 12,
    borderRadius: borderRadius.sm,
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
  businessCity: {
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
  // Map modal
  modalContainer: {
    flex: 1,
  },
  mapLoadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtn: {
    position: 'absolute',
    right: spacing.md,
    zIndex: 20,
    width: 36,
    height: 36,
    borderRadius: borderRadius.pill,
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationBanner: {
    padding: spacing.md,
  },
  // Custom marker
  markerContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  // Bottom sheet — absolutely positioned inside map modal
  bsSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
  },
  bsHandleArea: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  bsHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  bsContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
  },
  bsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bsButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
});
