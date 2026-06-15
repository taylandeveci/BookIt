import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Modal,
  RefreshControl,
} from 'react-native';
import * as Location from 'expo-location';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../lib/queryKeys';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { RootStackParamList } from '../../navigation/RootNavigator';
import { businessService } from '../../services/businessService';
import { appointmentService } from '../../services/appointmentService';
import { Business, Appointment } from '../../types';
import { useTheme } from '../../theme/useTheme';
import { RatingStars, Toast, ImageWithFallback } from '../../components';
import { spacing, typography, borderRadius } from '../../theme/theme';
import { useAuthStore } from '../../store/authStore';
import { useNotificationStore, NotificationType } from '../../store/notificationStore';
import notificationService from '../../services/notificationService';
import { useBackendNotificationSync } from '../../hooks/useBackendNotificationSync';
import { calculateDistance } from '../../lib/calculateDistance';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

type BusinessWithDistance = Business & { _meters: number };

interface VisitAgainItem {
  businessId: string;
  businessName: string;
  serviceName: string;
  lastVisit: string;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m uzakta`;
  return `${(meters / 1000).toFixed(1)} km uzakta`;
}

function daysSince(isoDate: string): number {
  return Math.floor((Date.now() - new Date(isoDate).getTime()) / (1000 * 60 * 60 * 24));
}

const SKELETON_IDS = [0, 1, 2, 3];
const NEARBY_RADIUS_METERS = 10000;

const HorizontalBusinessCard = React.memo<{
  item: BusinessWithDistance;
  showRating: boolean;
  onPress: (businessId: string) => void;
}>(({ item, showRating, onPress }) => {
  const { colors, shadows } = useTheme();

  return (
    <TouchableOpacity
      style={[styles.hCard, { backgroundColor: colors.card, borderRadius: borderRadius.lg }, shadows.sm]}
      onPress={() => onPress(item.id)}
      activeOpacity={0.8}
    >
      <View style={[styles.hCardImage, { backgroundColor: colors.muted, borderRadius: borderRadius.md, overflow: 'hidden' }]}>
        <Ionicons name="storefront-outline" size={32} color={colors.mutedForeground} />
        {item.media?.[0]?.url ? (
          <ImageWithFallback uri={item.media[0].url} style={StyleSheet.absoluteFill} resizeMode="cover" iconSize={32} />
        ) : null}
      </View>
      <View style={styles.hCardBody}>
        <Text
          style={[typography.bodySemiBold, styles.hCardName, { color: colors.foreground }]}
          numberOfLines={2}
        >
          {item.name}
        </Text>
        {item.city ? (
          <Text
            style={[typography.body, styles.hCardSub, { color: colors.mutedForeground }]}
            numberOfLines={1}
          >
            {item.city}
          </Text>
        ) : null}
        {showRating && (item.averageRating ?? 0) > 0 ? (
          <View style={styles.ratingRow}>
            <RatingStars rating={item.averageRating ?? 0} size={12} />
            <Text style={[typography.body, styles.hCardSub, { color: colors.mutedForeground, marginLeft: spacing.xs }]}>
              ({item.reviewCount ?? 0})
            </Text>
          </View>
        ) : null}
        {!showRating && item._meters >= 0 ? (
          <Text style={[typography.body, styles.hCardSub, { color: colors.primary }]}>
            {formatDistance(item._meters)}
          </Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
});

export const HomeScreen: React.FC = () => {
  const { colors, shadows } = useTheme();
  const { t } = useTranslation();
  const navigation = useNavigation<NavigationProp>();
  const queryClient = useQueryClient();

  const isFocused = useIsFocused();

  const user = useAuthStore((s) => s.user);
  const notifications = useNotificationStore((s) => s.notifications);
  const markAsRead = useNotificationStore((s) => s.markAsRead);
  const addNotificationFromBackend = useNotificationStore((s) => s.addNotificationFromBackend);

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [userCoords, setUserCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationDenied, setLocationDenied] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [startCodeSheet, setStartCodeSheet] = useState<{
    visible: boolean;
    code: string;
    serviceName: string;
    expiresAt: Date | null;
    notificationId: string;
  }>({ visible: false, code: '', serviceName: '', expiresAt: null, notificationId: '' });
  const [countdown, setCountdown] = useState(5);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const processedBackendIds = useRef<Set<string>>(new Set());

  // Pick up cross-device booking status changes (e.g. business approves/cancels) in near-real-time
  useBackendNotificationSync([queryKeys.bookings.customerAll]);

  // Poll backend for notifications (cross-device code delivery)
  const { data: backendNotifications = [] } = useQuery({
    queryKey: queryKeys.notifications.forUser,
    queryFn: () => notificationService.getNotifications(),
    refetchInterval: 3000,
    refetchIntervalInBackground: false,
    enabled: !!user && user.role === 'USER' && isFocused,
  });

  // Request location silently on mount if already granted
  useEffect(() => {
    (async () => {
      try {
        const { status, canAskAgain } = await Location.getForegroundPermissionsAsync();
        if (status === 'granted') {
          const pos = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          setUserCoords({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        } else if (!canAskAgain) {
          setLocationDenied(true);
        }
      } catch {}
    })();
  }, []);

  const handleRequestLocation = async () => {
    try {
      const { status, canAskAgain } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        setUserCoords({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
      } else if (!canAskAgain) {
        setLocationDenied(true);
      }
    } catch {}
  };

  // Watch for service_start_code notifications
  useEffect(() => {
    if (!user) return;
    const latest = notifications.find(
      (n) => n.userId === user.id && n.type === 'service_start_code' && !n.read
    );
    if (!latest) return;
    const parts = latest.body.split('|');
    const code = parts[0] ?? '';
    const serviceName = parts[1] ?? '';
    const expiresAt = parts[2] ? new Date(parts[2]) : null;
    if (code && !startCodeSheet.visible) {
      const minsLeft = expiresAt
        ? Math.max(0, Math.round((expiresAt.getTime() - Date.now()) / 60000))
        : 5;
      setCountdown(minsLeft);
      setStartCodeSheet({ visible: true, code, serviceName, expiresAt, notificationId: latest.id });
    }
  }, [notifications, user]);

  // Process backend service_start_code notifications (cross-device delivery)
  useEffect(() => {
    if (!user || !backendNotifications.length) return;

    const unread = backendNotifications.find(
      (n) => n.type === 'service_start_code' && !n.isRead
    );
    if (!unread) return;
    if (processedBackendIds.current.has(unread.id)) return;

    processedBackendIds.current.add(unread.id);
    notificationService.markRead(unread.id).catch(() => {});

    const parts = unread.message.split('|');
    const code = parts[0] ?? '';
    const serviceName = parts[1] ?? '';
    const expiresAt = parts[2] ? new Date(parts[2]) : null;

    if (!code || (expiresAt && new Date() > expiresAt)) return;

    addNotificationFromBackend({
      id: unread.id,
      type: 'service_start_code' as NotificationType,
      title: t('notifications.serviceStartCode'),
      body: unread.message,
      createdAt: new Date(unread.createdAt),
      read: false,
      userId: user.id,
    });

    if (startCodeSheet.visible) return;

    const minsLeft = expiresAt
      ? Math.max(0, Math.round((expiresAt.getTime() - Date.now()) / 60000))
      : 5;
    setCountdown(minsLeft);
    setStartCodeSheet({ visible: true, code, serviceName, expiresAt, notificationId: unread.id });
  }, [backendNotifications, user]);

  // Countdown timer for start code sheet
  useEffect(() => {
    if (!startCodeSheet.visible) {
      if (countdownRef.current) clearInterval(countdownRef.current);
      return;
    }
    countdownRef.current = setInterval(() => {
      if (!startCodeSheet.expiresAt) return;
      const minsLeft = Math.max(
        0,
        Math.round((startCodeSheet.expiresAt.getTime() - Date.now()) / 60000)
      );
      setCountdown(minsLeft);
    }, 1000);
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [startCodeSheet.visible, startCodeSheet.expiresAt]);

  const closeStartCodeSheet = () => {
    if (startCodeSheet.notificationId) markAsRead(startCodeSheet.notificationId);
    setStartCodeSheet({ visible: false, code: '', serviceName: '', expiresAt: null, notificationId: '' });
  };

  // Data queries
  const { data: businesses = [], isLoading: loadingBusinesses } = useQuery({
    queryKey: queryKeys.businesses.list(),
    queryFn: () => businessService.getBusinesses(),
    staleTime: 60_000,
  });

  const { data: appointments = [], isLoading: loadingAppointments } = useQuery({
    queryKey: queryKeys.bookings.customerAll,
    queryFn: () => appointmentService.getAppointments(),
    staleTime: 60_000,
  });

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.businesses.all }),
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.customerAll }),
    ]);
    setRefreshing(false);
  }, [queryClient]);

  // Derived sections
  const nearbyBusinesses = useMemo((): BusinessWithDistance[] => {
    if (!userCoords) {
      // Location unavailable — fall back to all businesses sorted by rating
      return businesses
        .slice()
        .sort((a, b) => (b.averageRating ?? 0) - (a.averageRating ?? 0))
        .slice(0, 6)
        .map((b) => ({ ...b, _meters: -1 }));
    }
    return businesses
      .filter((b) => b.locationLat != null && b.locationLng != null)
      .map((b) => ({
        ...b,
        _meters: calculateDistance(userCoords, {
          latitude: b.locationLat!,
          longitude: b.locationLng!,
        }),
      }))
      .filter((b) => b._meters <= NEARBY_RADIUS_METERS)
      .sort((a, b) => a._meters - b._meters)
      .slice(0, 6);
  }, [businesses, userCoords]);

  const nearbyLocationFallback = !userCoords;

  const topRatedBusinesses = useMemo((): BusinessWithDistance[] => {
    return businesses
      .filter((b) => (b.averageRating ?? 0) > 0)
      .sort((a, b) => {
        const diff = (b.averageRating ?? 0) - (a.averageRating ?? 0);
        if (diff !== 0) return diff;
        return (b.reviewCount ?? 0) - (a.reviewCount ?? 0);
      })
      .slice(0, 6)
      .map((b) => ({ ...b, _meters: -1 }));
  }, [businesses]);

  const visitAgainItems = useMemo((): VisitAgainItem[] => {
    const byBusiness = new Map<string, Appointment>();
    appointments
      .filter((a) => a.status === 'COMPLETED')
      .forEach((a) => {
        const date = a.startTime ?? a.createdAt ?? '';
        const existing = byBusiness.get(a.businessId);
        const existingDate = existing ? (existing.startTime ?? existing.createdAt ?? '') : '';
        if (!existing || date > existingDate) byBusiness.set(a.businessId, a);
      });
    return Array.from(byBusiness.values())
      .sort((a, b) => {
        const aDate = a.startTime ?? a.createdAt ?? '';
        const bDate = b.startTime ?? b.createdAt ?? '';
        return bDate > aDate ? 1 : -1;
      })
      .slice(0, 5)
      .map((a) => ({
        businessId: a.businessId,
        businessName: a.business?.name ?? '',
        serviceName: a.service?.name ?? '',
        lastVisit: a.startTime ?? a.createdAt ?? '',
      }));
  }, [appointments]);

  const showTopRated = loadingBusinesses || topRatedBusinesses.length > 0;
  const showVisitAgain = loadingAppointments || visitAgainItems.length > 0;
  const firstName = user?.name?.split(' ')[0] ?? '';

  // Card renderers
  const handleBusinessPress = useCallback(
    (businessId: string) => {
      navigation.navigate('BusinessDetail', { businessId });
    },
    [navigation]
  );

  const renderNearbyCard = useCallback(
    ({ item }: { item: BusinessWithDistance }) => (
      <HorizontalBusinessCard item={item} showRating={false} onPress={handleBusinessPress} />
    ),
    [handleBusinessPress]
  );

  const renderTopRatedCard = useCallback(
    ({ item }: { item: BusinessWithDistance }) => (
      <HorizontalBusinessCard item={item} showRating={true} onPress={handleBusinessPress} />
    ),
    [handleBusinessPress]
  );

  const renderSkeletonCard = ({ item: _item }: { item: number }) => (
    <View style={[styles.hCard, { backgroundColor: colors.card, borderRadius: borderRadius.lg }]}>
      <View style={[styles.hCardImage, { backgroundColor: colors.muted }]} />
      <View style={styles.hCardBody}>
        <View style={[styles.skeletonLine, { width: '80%', height: 14, marginBottom: spacing.xs, backgroundColor: colors.muted }]} />
        <View style={[styles.skeletonLine, { width: '60%', height: 12, marginBottom: spacing.xs, backgroundColor: colors.muted }]} />
        <View style={[styles.skeletonLine, { width: '40%', height: 12, backgroundColor: colors.muted }]} />
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {toast && <Toast message={toast.message} type={toast.type} onHide={() => setToast(null)} />}

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Greeting header */}
        <View style={styles.header}>
          <View style={styles.greetingRow}>
            <View style={styles.greetingText}>
              <Text style={[typography.heading, styles.helloText, { color: colors.foreground }]}>
                {firstName ? t('home.hello', { name: firstName }) : t('home.title')}
              </Text>
              <Text style={[typography.body, { color: colors.mutedForeground }]}>
                {t('home.subtitle')}
              </Text>
            </View>
            {user?.name ? (
              <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
                <Text style={[typography.bodySemiBold, { color: '#ffffff', fontSize: typography.sizes.md }]}>
                  {getInitials(user.name)}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Location banner */}
        {!userCoords && !locationDenied ? (
          <View style={[styles.locationBanner, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="location-outline" size={18} color={colors.primary} />
            <Text style={[typography.body, styles.locationBannerText, { color: colors.mutedForeground }]}>
              {t('home.locationBanner')}
            </Text>
            <TouchableOpacity onPress={handleRequestLocation} activeOpacity={0.8}>
              <Text style={[typography.bodySemiBold, { color: colors.primary, fontSize: typography.sizes.sm }]}>
                {t('home.allowLocation')}
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Section 1: Yakınındakiler */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[typography.headingSemiBold, styles.sectionTitle, { color: colors.foreground }]}>
              {t('home.nearbyTitle')}
            </Text>
            {nearbyLocationFallback ? (
              <Text style={[typography.body, styles.nearbyFallbackText, { color: colors.mutedForeground }]}>
                {t('home.locationPermissionFallback')}
              </Text>
            ) : null}
          </View>
          {loadingBusinesses ? (
            <FlatList
              horizontal
              data={SKELETON_IDS}
              keyExtractor={(item) => `sk-nearby-${item}`}
              renderItem={renderSkeletonCard}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.hList}
              scrollEnabled
              maxToRenderPerBatch={10}
              windowSize={5}
              initialNumToRender={6}
            />
          ) : nearbyBusinesses.length === 0 ? (
            <View style={styles.nearbyEmpty}>
              <Ionicons name="location-outline" size={40} color={colors.mutedForeground} />
              <Text style={[typography.body, styles.nearbyEmptyText, { color: colors.mutedForeground, fontSize: typography.sizes.sm }]}>
                {t('home.noNearbyBusinesses')}
              </Text>
              <Text style={[typography.body, styles.nearbyEmptyText, { color: colors.mutedForeground, fontSize: typography.sizes.xs }]}>
                {t('home.viewAllInSearch')}
              </Text>
            </View>
          ) : (
            <FlatList
              horizontal
              data={nearbyBusinesses}
              keyExtractor={(item) => `nb-${item.id}`}
              renderItem={renderNearbyCard}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.hList}
              scrollEnabled
              maxToRenderPerBatch={10}
              windowSize={5}
              initialNumToRender={6}
            />
          )}
        </View>

        {/* Section 2: Yüksek Puanlılar */}
        {showTopRated ? (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[typography.headingSemiBold, styles.sectionTitle, { color: colors.foreground }]}>
                {t('home.topRatedTitle')}
              </Text>
            </View>
            {loadingBusinesses ? (
              <FlatList
                horizontal
                data={SKELETON_IDS}
                keyExtractor={(item) => `sk-rated-${item}`}
                renderItem={renderSkeletonCard}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.hList}
                scrollEnabled
                maxToRenderPerBatch={10}
                windowSize={5}
                initialNumToRender={6}
              />
            ) : (
              <FlatList
                horizontal
                data={topRatedBusinesses}
                keyExtractor={(item) => `tr-${item.id}`}
                renderItem={renderTopRatedCard}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.hList}
                scrollEnabled
                maxToRenderPerBatch={10}
                windowSize={5}
                initialNumToRender={6}
              />
            )}
          </View>
        ) : null}

        {/* Section 3: Tekrar Gidebilirsin */}
        {showVisitAgain ? (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[typography.headingSemiBold, styles.sectionTitle, { color: colors.foreground }]}>
                {t('home.visitAgainTitle')}
              </Text>
            </View>
            {loadingAppointments
              ? SKELETON_IDS.slice(0, 3).map((k) => (
                  <View
                    key={`sk-va-${k}`}
                    style={[styles.visitCard, { backgroundColor: colors.card, borderRadius: borderRadius.lg }]}
                  >
                    <View style={[styles.visitCardImg, { backgroundColor: colors.muted, borderRadius: borderRadius.md }]} />
                    <View style={styles.visitCardBody}>
                      <View style={[styles.skeletonLine, { width: '70%', height: 14, marginBottom: spacing.xs, backgroundColor: colors.muted }]} />
                      <View style={[styles.skeletonLine, { width: '50%', height: 12, backgroundColor: colors.muted }]} />
                    </View>
                  </View>
                ))
              : visitAgainItems.map((item) => {
                  const days = daysSince(item.lastVisit);
                  const label =
                    days === 0
                      ? t('home.lastVisitToday')
                      : t('home.lastVisitDays', { count: days });
                  return (
                    <TouchableOpacity
                      key={item.businessId}
                      style={[styles.visitCard, { backgroundColor: colors.card, borderRadius: borderRadius.lg }, shadows.sm]}
                      onPress={() => navigation.navigate('BusinessDetail', { businessId: item.businessId })}
                      activeOpacity={0.8}
                    >
                      <View style={[styles.visitCardImg, { backgroundColor: colors.muted, borderRadius: borderRadius.md }]}>
                        <Ionicons name="storefront-outline" size={20} color={colors.mutedForeground} />
                      </View>
                      <View style={styles.visitCardBody}>
                        <Text
                          style={[typography.bodySemiBold, { color: colors.foreground, fontSize: typography.sizes.sm }]}
                          numberOfLines={1}
                        >
                          {item.businessName}
                        </Text>
                        {item.serviceName ? (
                          <Text
                            style={[typography.body, { color: colors.mutedForeground, fontSize: typography.sizes.xs }]}
                            numberOfLines={1}
                          >
                            {item.serviceName}
                          </Text>
                        ) : null}
                        <Text style={[typography.body, { color: colors.mutedForeground, fontSize: typography.sizes.xs }]}>
                          {label}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
                    </TouchableOpacity>
                  );
                })}
          </View>
        ) : null}

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Service start code bottom sheet */}
      <Modal
        visible={startCodeSheet.visible}
        transparent
        animationType="slide"
        onRequestClose={closeStartCodeSheet}
      >
        <View style={styles.overlay}>
          <View style={[styles.sheet, { backgroundColor: colors.card, ...shadows.lg }]}>
            <View style={[styles.dragHandle, { backgroundColor: colors.border }]} />
            <Text style={[typography.heading, styles.sheetTitle, { color: colors.foreground }]}>
              {t('startCode.customerTitle')}
            </Text>
            <Text style={[typography.body, styles.sheetSubtitle, { color: colors.mutedForeground }]}>
              {t('startCode.customerSubtitle')}
            </Text>
            <View style={[styles.codePill, { backgroundColor: colors.primary + '1A' }]}>
              <Text style={[typography.heading, styles.codeText, { color: colors.foreground }]}>
                {startCodeSheet.code}
              </Text>
            </View>
            {startCodeSheet.serviceName ? (
              <Text style={[typography.body, styles.serviceNameText, { color: colors.mutedForeground }]}>
                {startCodeSheet.serviceName}
              </Text>
            ) : null}
            <Text style={[typography.body, styles.countdownText, { color: colors.mutedForeground }]}>
              {countdown > 0
                ? t('startCode.expiresIn', { count: countdown })
                : t('startCode.expired')}
            </Text>
            <TouchableOpacity
              style={[styles.closeBtn, { borderColor: colors.border, borderWidth: 1 }]}
              onPress={closeStartCodeSheet}
              activeOpacity={0.8}
            >
              <Text style={[typography.bodySemiBold, { color: colors.foreground }]}>
                {t('startCode.close')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingBottom: spacing.xl },

  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl + spacing.lg,
    paddingBottom: spacing.lg,
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  greetingText: { flex: 1 },
  helloText: {
    fontSize: typography.sizes.xxl,
    marginBottom: spacing.xs,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing.md,
  },

  locationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.xl,
    marginBottom: spacing.lg,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    gap: spacing.sm,
  },
  locationBannerText: {
    flex: 1,
    fontSize: typography.sizes.xs,
  },

  section: {
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.sizes.lg,
  },
  nearbyFallbackText: {
    fontSize: typography.sizes.xs,
    marginTop: spacing.xs,
  },
  nearbyEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
  },
  nearbyEmptyText: {
    textAlign: 'center',
    marginTop: spacing.sm,
  },

  hList: {
    paddingHorizontal: spacing.xl,
  },
  hCard: {
    width: 200,
    height: 240,
    marginRight: spacing.md,
    overflow: 'hidden',
  },
  hCardImage: {
    height: 140,
    justifyContent: 'center',
    alignItems: 'center',
  },
  hCardBody: {
    padding: spacing.sm,
    flex: 1,
  },
  hCardName: {
    fontSize: typography.sizes.sm,
    marginBottom: spacing.xs,
  },
  hCardSub: {
    fontSize: typography.sizes.xs,
    marginTop: spacing.xs,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
  },

  visitCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.xl,
    marginBottom: spacing.sm,
    padding: spacing.md,
    minHeight: 80,
  },
  visitCardImg: {
    width: 56,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  visitCardBody: {
    flex: 1,
  },

  skeletonLine: {
    borderRadius: borderRadius.sm,
  },

  bottomPadding: { height: spacing.xxl },

  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.xl,
    paddingBottom: spacing.xxl,
    alignItems: 'center',
  },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: borderRadius.pill,
    marginBottom: spacing.md,
  },
  sheetTitle: {
    fontSize: typography.sizes.xxl,
    textAlign: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  sheetSubtitle: {
    fontSize: typography.sizes.md,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  codePill: {
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.xxl,
    marginBottom: spacing.md,
    alignItems: 'center',
    width: '100%',
  },
  codeText: {
    fontSize: 48,
    letterSpacing: 8,
    textAlign: 'center',
  },
  serviceNameText: {
    fontSize: typography.sizes.sm,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  countdownText: {
    fontSize: typography.sizes.xs,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  closeBtn: {
    width: '100%',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
});
