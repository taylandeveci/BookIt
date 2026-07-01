import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Pressable,
  Animated,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../lib/queryKeys';
import { PieChart } from 'react-native-gifted-charts';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/RootNavigator';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../theme/useTheme';
import { useAuthStore } from '../../store/authStore';
import { ownerService } from '../../services/ownerService';
import { businessService } from '../../services/businessService';
import { reviewService } from '../../services/reviewService';
import { Card, EmptyState, Toast } from '../../components';
import { formatCurrency } from '../../lib/formatCurrency';
import { useNotificationStore } from '../../store/notificationStore';
import { useBackendNotificationSync } from '../../hooks/useBackendNotificationSync';
import { spacing, typography, borderRadius } from '../../theme/theme';
import { PendingEmployee } from '../../types';
import { SafeAreaView } from 'react-native-safe-area-context';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type RangeFilter = 'Day' | 'Month' | 'Year';

interface DashApt {
  id: string;
  startTime?: string;
  status: string;
  employeeId?: string;
  employee?: { id: string; fullName: string };
  service?: { id: string; name: string; price: number };
}

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------

function getRange(filter: RangeFilter): { start: Date; end: Date } {
  const now = new Date();
  switch (filter) {
    case 'Day':
      return {
        start: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
        end: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999),
      };
    case 'Month':
      return {
        start: new Date(now.getFullYear(), now.getMonth(), 1),
        end: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999),
      };
    case 'Year':
      return {
        start: new Date(now.getFullYear(), 0, 1),
        end: new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999),
      };
  }
}

function getPreviousRange(filter: RangeFilter): { start: Date; end: Date } {
  const now = new Date();
  switch (filter) {
    case 'Day': {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
      return {
        start: new Date(d.getFullYear(), d.getMonth(), d.getDate()),
        end: new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999),
      };
    }
    case 'Month':
      return {
        start: new Date(now.getFullYear(), now.getMonth() - 1, 1),
        end: new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999),
      };
    case 'Year':
      return {
        start: new Date(now.getFullYear() - 1, 0, 1),
        end: new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999),
      };
  }
}

function filterByRange(apts: DashApt[], range: { start: Date; end: Date }): DashApt[] {
  if (!apts || !Array.isArray(apts)) return [];
  const s = range.start.getTime();
  const e = range.end.getTime();
  return apts.filter(a => {
    if (!a.startTime) return false;
    const t = new Date(a.startTime).getTime();
    return t >= s && t <= e;
  });
}

// ---------------------------------------------------------------------------
// Revenue formatting
// ---------------------------------------------------------------------------


function trendPct(current: number, previous: number): number {
  if (previous === 0 && current === 0) return 0;
  if (previous === 0) return 100;
  return Math.round(((current - previous) / previous) * 100);
}

// ---------------------------------------------------------------------------
// Pie segment colors — explicit hex values per spec
// ---------------------------------------------------------------------------

const BAR_COLORS = {
  completed: '#4A7C59',
  confirmed: '#4A5E6A',
  noShow: '#C18C5D',
  cancelled: '#A85448',
};

interface PieSegmentDatum {
  value: number;
  color: string;
  onPress: () => void;
  shiftX?: number;
  shiftY?: number;
}

// ---------------------------------------------------------------------------
// Stat block (2x2 legend grid below chart)
// ---------------------------------------------------------------------------

interface StatBlockProps {
  label: string;
  count: number;
  color: string;
  highlighted?: boolean;
}

const StatBlock: React.FC<StatBlockProps> = ({ label, count, color, highlighted }) => {
  const { colors } = useTheme();
  return (
    <View
      style={[
        statBlockStyles.block,
        highlighted && { backgroundColor: color + '1A', borderRadius: borderRadius.lg },
      ]}
    >
      <View style={statBlockStyles.labelRow}>
        <View
          style={[
            statBlockStyles.dot,
            { backgroundColor: color },
            highlighted && {
              width: 12,
              height: 12,
              shadowColor: color,
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.5,
              shadowRadius: 4,
              elevation: 3,
            },
          ]}
        />
        <Text style={[typography.bodySemiBold, { color: colors.mutedForeground, fontSize: 13 }]}>
          {label}
        </Text>
      </View>
      <Text style={[typography.heading, { color: colors.foreground, fontSize: 32 }]}>
        {count}
      </Text>
    </View>
  );
};

const statBlockStyles = StyleSheet.create({
  block: {
    flex: 1,
    alignItems: 'flex-start',
    padding: spacing.sm,
    gap: spacing.xs,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: borderRadius.pill,
  },
});

// ---------------------------------------------------------------------------
// Skeleton blocks
// ---------------------------------------------------------------------------

const SkeletonCard: React.FC<{ height: number }> = ({ height }) => {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.skeletonCard,
        {
          height,
          backgroundColor: colors.card,
          borderRadius: borderRadius.xl,
        },
      ]}
    >
      <View style={[styles.skeletonLine, { width: '40%', backgroundColor: colors.muted }]} />
      <View style={[styles.skeletonLineLg, { width: '55%', backgroundColor: colors.muted }]} />
      <View style={[styles.skeletonLine, { width: '70%', backgroundColor: colors.muted }]} />
    </View>
  );
};

const SkeletonChartCard: React.FC = () => {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.skeletonCard,
        {
          height: 320,
          backgroundColor: colors.card,
          borderRadius: borderRadius.xl,
          padding: spacing.lg,
        },
      ]}
    >
      <View style={[styles.skeletonLine, { width: '35%', backgroundColor: colors.muted }]} />
      <View
        style={[
          styles.skeletonLineLg,
          { width: '25%', height: 36, backgroundColor: colors.muted, marginBottom: spacing.lg },
        ]}
      />
      <View
        style={{ flex: 1, backgroundColor: colors.muted, borderRadius: borderRadius.md }}
      />
    </View>
  );
};

const SkeletonStaff: React.FC = () => {
  const { colors } = useTheme();
  return (
    <View>
      <View
        style={[
          styles.skeletonLine,
          { width: '45%', height: 20, backgroundColor: colors.muted, marginBottom: spacing.md },
        ]}
      />
      {[0, 1, 2].map(i => (
        <View
          key={i}
          style={[
            styles.staffRowSkeleton,
            {
              backgroundColor: colors.card,
              borderRadius: borderRadius.xl,
              marginBottom: spacing.sm,
            },
          ]}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <View
              style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.muted }}
            />
            <View
              style={[
                styles.skeletonLine,
                { width: 100, backgroundColor: colors.muted },
              ]}
            />
          </View>
          <View style={[styles.skeletonLine, { width: 64, backgroundColor: colors.muted }]} />
        </View>
      ))}
    </View>
  );
};

// ---------------------------------------------------------------------------
// Trend badge
// ---------------------------------------------------------------------------

const TrendBadge: React.FC<{ pct: number }> = ({ pct }) => {
  const { colors } = useTheme();

  if (pct > 0) {
    return (
      <View style={[styles.trendBadge, { backgroundColor: colors.primary + '1F' }]}>
        <Ionicons name="trending-up" size={12} color={colors.primary} />
        <Text
          style={[
            typography.bodySemiBold,
            { color: colors.primary, fontSize: typography.sizes.xs, marginLeft: 3 },
          ]}
        >
          +{pct}%
        </Text>
      </View>
    );
  }

  if (pct < 0) {
    return (
      <View style={[styles.trendBadge, { backgroundColor: colors.destructive + '1F' }]}>
        <Ionicons name="trending-down" size={12} color={colors.destructive} />
        <Text
          style={[
            typography.bodySemiBold,
            { color: colors.destructive, fontSize: typography.sizes.xs, marginLeft: 3 },
          ]}
        >
          {pct}%
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.trendBadge, { backgroundColor: colors.muted }]}>
      <Ionicons name="remove" size={12} color={colors.mutedForeground} />
      <Text
        style={[
          typography.bodySemiBold,
          { color: colors.mutedForeground, fontSize: typography.sizes.xs, marginLeft: 3 },
        ]}
      >
        0%
      </Text>
    </View>
  );
};

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

const RANGES: RangeFilter[] = ['Day', 'Month', 'Year'];

export const DashboardScreen: React.FC = () => {
  const { colors, shadows } = useTheme();
  const { t } = useTranslation();
  useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [selectedRange, setSelectedRange] = useState<RangeFilter>('Month');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    AsyncStorage.getItem('dashboard_range').then((v) => {
      if (v === 'Day' || v === 'Month' || v === 'Year') setSelectedRange(v);
    });
  }, []);

  const handleRangeChange = (r: RangeFilter) => {
    setSelectedRange(r);
    AsyncStorage.setItem('dashboard_range', r);
  };
  const [empActionLoading, setEmpActionLoading] = useState<string | null>(null);
  const addNotification = useNotificationStore((s) => s.addNotification);
  const [unseenCount, setUnseenCount] = useState(0);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const ratingCardScale = React.useRef(new Animated.Value(1)).current;

  // --- Queries ---

  const businessQuery = useQuery({
    queryKey: queryKeys.owner.business,
    queryFn: () => ownerService.getBusiness(),
    staleTime: 60000,
  });

  const appointmentsQuery = useQuery({
    queryKey: queryKeys.bookings.ownerAll,
    queryFn: () => ownerService.getOwnerAppointments(),
    staleTime: 30000,
  });

  const employeesQuery = useQuery({
    queryKey: businessQuery.data?.id
      ? queryKeys.employees.forBusiness(businessQuery.data.id)
      : ['employees', '__none__'],
    queryFn: () => businessService.getEmployees(businessQuery.data!.id),
    enabled: !!businessQuery.data?.id,
    staleTime: 60000,
  });

  const pendingQuery = useQuery({
    queryKey: queryKeys.employees.pending,
    queryFn: () => ownerService.getPendingEmployees().catch(() => [] as PendingEmployee[]),
    staleTime: 30000,
  });

  const reviewsQuery = useQuery({
    queryKey: businessQuery.data?.id
      ? queryKeys.reviews.forBusiness(businessQuery.data.id)
      : ['reviews', '__none__'],
    queryFn: () => reviewService.getReviews(businessQuery.data!.id),
    enabled: !!businessQuery.data?.id,
    staleTime: 30000,
  });

  const avgRatingQuery = useQuery({
    queryKey: businessQuery.data?.id
      ? queryKeys.businesses.averageRating(businessQuery.data.id)
      : ['businesses', '__none__', 'averageRating'],
    queryFn: async () => {
      const biz = await businessService.getBusiness(businessQuery.data!.id);
      return {
        averageRating: Number(biz?.averageRating) || 0,
        reviewCount: biz?.reviewCount || 0,
      };
    },
    enabled: !!businessQuery.data?.id,
    staleTime: 60000,
  });

  const staffSatisfactionQuery = useQuery({
    queryKey: ['owner', 'staff-satisfaction'],
    queryFn: () => ownerService.getStaffSatisfaction(),
    staleTime: 60000,
  });

  const checkUnseenReviews = useCallback(async () => {
    const businessId = businessQuery.data?.id;
    if (!businessId || !reviewsQuery.data) return;
    const stored = await AsyncStorage.getItem(`owner_reviews_last_seen_${businessId}`);
    const lastSeen = stored ? parseInt(stored, 10) : 0;
    const unseen = (reviewsQuery.data as any[]).filter(
      (r) => new Date(r.createdAt).getTime() > lastSeen
    ).length;
    setUnseenCount(unseen);
  }, [businessQuery.data?.id, reviewsQuery.data]);

  // Invalidate on tab focus and recheck unseen count
  const isRefetchingRef = useRef(false);

  useFocusEffect(
    useCallback(() => {
      if (isRefetchingRef.current) return;
      isRefetchingRef.current = true;

      const invalidations = [
        queryClient.invalidateQueries({ queryKey: queryKeys.owner.business }),
        queryClient.invalidateQueries({ queryKey: queryKeys.bookings.ownerAll }),
        queryClient.invalidateQueries({ queryKey: ['employees'] }),
        queryClient.invalidateQueries({ queryKey: ['owner', 'staff-satisfaction'] }),
      ];
      if (businessQuery.data?.id) {
        invalidations.push(
          queryClient.invalidateQueries({ queryKey: queryKeys.businesses.averageRating(businessQuery.data.id) })
        );
      }

      Promise.all(invalidations)
        .then(() => checkUnseenReviews())
        .finally(() => {
          isRefetchingRef.current = false;
        });
    }, [queryClient, businessQuery.data?.id, checkUnseenReviews])
  );

  // Cross-device: pick up new booking requests created from another device.
  useBackendNotificationSync([queryKeys.bookings.ownerAll]);

  // --- Derived data ---

  const allApts = useMemo(() => {
    const raw = appointmentsQuery.data as any;
    if (!raw) return [] as DashApt[];
    if (Array.isArray(raw)) return raw as DashApt[];
    if (raw?.appointments && Array.isArray(raw.appointments)) return raw.appointments as DashApt[];
    return [] as DashApt[];
  }, [appointmentsQuery.data]);

  const currentRange = useMemo(() => getRange(selectedRange), [selectedRange]);
  const previousRange = useMemo(() => getPreviousRange(selectedRange), [selectedRange]);

  const filteredApts = useMemo(
    () => filterByRange(allApts, currentRange),
    [allApts, currentRange]
  );
  const prevApts = useMemo(
    () => filterByRange(allApts, previousRange),
    [allApts, previousRange]
  );

  const statusCounts = useMemo(() => ({
    completed: filteredApts.filter(a => a.status === 'COMPLETED').length,
    confirmed: filteredApts.filter(a => a.status === 'APPROVED').length,
    noShow: filteredApts.filter(a => a.status === 'NO_SHOW').length,
    cancelled: filteredApts.filter(a => a.status === 'CANCELLED').length,
  }), [filteredApts]);

  const totalCount =
    statusCounts.completed + statusCounts.confirmed + statusCounts.noShow + statusCounts.cancelled;

  const pieData = useMemo(
    () => [
      { value: statusCounts.completed, color: BAR_COLORS.completed, label: t('dashboard.legendCompleted') },
      { value: statusCounts.confirmed, color: BAR_COLORS.confirmed, label: t('dashboard.legendConfirmed') },
      { value: statusCounts.noShow, color: BAR_COLORS.noShow, label: t('dashboard.legendNoShow') },
      { value: statusCounts.cancelled, color: BAR_COLORS.cancelled, label: t('dashboard.legendCancelled') },
    ],
    [statusCounts, t]
  );

  const handleSegmentPress = useCallback((index: number) => {
    setFocusedIndex(prev => (prev === index ? -1 : index));
  }, []);

  const handleChartBackgroundPress = useCallback(() => {
    setFocusedIndex(-1);
  }, []);

  // Dim unfocused segments to 40% opacity and pop the focused one outward
  // along its angular midpoint (exploded-donut effect)
  const pieChartData = useMemo<PieSegmentDatum[]>(
    () =>
      pieData.map((d, i) => {
        const item: PieSegmentDatum = { value: d.value, color: d.color, onPress: () => handleSegmentPress(i) };
        if (focusedIndex < 0) return item;
        if (i !== focusedIndex) {
          item.color = d.color + '66';
          return item;
        }
        const before = pieData.slice(0, i).reduce((s, p) => s + p.value, 0);
        const midFraction = totalCount > 0 ? (before + d.value / 2) / totalCount : 0;
        const angle = 2 * Math.PI * midFraction;
        const shift = 6;
        item.shiftX = shift * Math.sin(angle);
        item.shiftY = -shift * Math.cos(angle);
        return item;
      }),
    [pieData, focusedIndex, totalCount, handleSegmentPress]
  );

  // Reset chart focus when the date range filter changes
  useEffect(() => {
    setFocusedIndex(-1);
  }, [selectedRange]);

  const currentRevenue = useMemo(
    () =>
      filteredApts
        .filter(a => a.status === 'COMPLETED')
        .reduce((s, a) => s + Number(a.service?.price ?? 0), 0),
    [filteredApts]
  );

  const previousRevenue = useMemo(
    () =>
      prevApts
        .filter(a => a.status === 'COMPLETED')
        .reduce((s, a) => s + Number(a.service?.price ?? 0), 0),
    [prevApts]
  );

  const revTrend = useMemo(() => trendPct(currentRevenue, previousRevenue), [currentRevenue, previousRevenue]);

  // Today's projected revenue: APPROVED appointments for today (booked but not yet completed)
  const todayExpectedRevenue = useMemo(() => {
    const todayRange = getRange('Day');
    return (appointmentsQuery.data as DashApt[] ?? [])
      .filter(a =>
        (a.status === 'APPROVED') &&
        a.startTime &&
        new Date(a.startTime).getTime() >= todayRange.start.getTime() &&
        new Date(a.startTime).getTime() <= todayRange.end.getTime()
      )
      .reduce((s, a) => s + Number(a.service?.price ?? 0), 0);
  }, [appointmentsQuery.data]);

  const staffStats = useMemo(() => {
    const emps = (employeesQuery.data ?? []) as Array<{
      id: string;
      fullName: string;
    }>;
    const satisfactionMap = new Map(
      (staffSatisfactionQuery.data ?? []).map((s) => [s.employeeId, s.avgSatisfaction])
    );
    return emps
      .map(emp => {
        const rev = filteredApts
          .filter(a => a.employeeId === emp.id && a.status === 'COMPLETED')
          .reduce((s, a) => s + Number(a.service?.price ?? 0), 0);
        const satisfaction = satisfactionMap.get(emp.id) ?? null;
        return { id: emp.id, name: emp.fullName, revenue: rev, satisfaction };
      })
      .sort((a, b) => b.revenue - a.revenue);
  }, [employeesQuery.data, filteredApts, staffSatisfactionQuery.data]);

  const business = businessQuery.data;
  const pendingEmployees = (pendingQuery.data ?? []) as PendingEmployee[];
  const avgRating = avgRatingQuery.data?.averageRating ?? 0;
  const filledStars = Math.min(5, Math.round(avgRating));
  const isLoading = businessQuery.isLoading || appointmentsQuery.isLoading;

  // --- Pending employee actions ---

  const handleEmployeeAction = async (id: string, action: 'approve' | 'reject') => {
    setEmpActionLoading(id + action);
    try {
      if (action === 'approve') {
        await ownerService.approveEmployee(id);
      } else {
        await ownerService.rejectEmployee(id);
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.employees.pending });
      if (action === 'approve' && businessQuery.data?.id) {
        queryClient.invalidateQueries({ queryKey: queryKeys.employees.forBusiness(businessQuery.data.id) });
        queryClient.invalidateQueries({ queryKey: ['owner', 'dashboard'] });
      }
      setToast({
        message: action === 'approve' ? t('employees.approveSuccess') : t('employees.rejectSuccess'),
        type: 'success',
      });
      const emp = (pendingEmployees as any[]).find((e) => e.id === id);
      const empUserId = emp?.userId ?? emp?.user?.id ?? '';
      if (empUserId) {
        if (action === 'approve') {
          addNotification({ type: 'employee_approved', title: t('notifications.employeeApproved'), body: business?.name ?? '', userId: empUserId });
        } else {
          addNotification({ type: 'employee_rejected', title: t('notifications.employeeRejected'), body: t('notifications.employeeRejectedBody'), userId: empUserId });
        }
      }
    } catch (e: any) {
      setToast({ message: e.message || t('common.error'), type: 'error' });
    } finally {
      setEmpActionLoading(null);
    }
  };

  // --- Empty state (no business) ---

  if (!isLoading && !business) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <EmptyState
          title={t('dashboard.noBusiness')}
          description={t('dashboard.noBusinessDesc')}
        />
      </View>
    );
  }

  // --- Render ---

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top', 'bottom']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.content}
      >
      {toast && (
        <Toast message={toast.message} type={toast.type} onHide={() => setToast(null)} />
      )}

      {/* ── Header ── */}
      <View style={styles.header}>
        {isLoading ? (
          <View
            style={[styles.skeletonLineLg, { width: 180, height: 34, backgroundColor: colors.muted }]}
          />
        ) : (
          <Text
            style={[styles.businessName, typography.heading, { color: colors.foreground }]}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {business?.name ?? ''}
          </Text>
        )}

        <View style={styles.filterRow}>
          {RANGES.map(r => {
            const active = selectedRange === r;
            return (
              <TouchableOpacity
                key={r}
                style={[
                  styles.pill,
                  { backgroundColor: active ? colors.primary : colors.muted },
                ]}
                onPress={() => handleRangeChange(r)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.pillText,
                    typography.bodySemiBold,
                    { color: active ? colors.primaryForeground : colors.mutedForeground },
                  ]}
                >
                  {t(`dashboard.range${r}`)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* ── Pending Employees ── */}
      {pendingEmployees.length > 0 && (
        <View
          style={[
            styles.pendingSection,
            { backgroundColor: colors.card, borderColor: colors.warning },
          ]}
        >
          <Text
            style={[
              typography.headingSemiBold,
              {
                color: colors.foreground,
                fontSize: typography.sizes.sm,
                marginBottom: spacing.sm,
              },
            ]}
          >
            {t('dashboard.pendingEmployees')} ({pendingEmployees.length})
          </Text>
          {pendingEmployees.map((emp, idx) => (
            <View
              key={emp.id}
              style={[
                styles.pendingRow,
                idx === 0 && { borderTopWidth: 0 },
                { borderTopColor: colors.border },
              ]}
            >
              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    typography.bodySemiBold,
                    { color: colors.foreground, fontSize: typography.sizes.sm },
                  ]}
                >
                  {emp.fullName}
                </Text>
                {emp.specialization ? (
                  <Text
                    style={[
                      typography.body,
                      { color: colors.mutedForeground, fontSize: typography.sizes.xs },
                    ]}
                  >
                    {emp.specialization}
                  </Text>
                ) : null}
                {emp.user?.email ? (
                  <Text
                    style={[
                      typography.body,
                      { color: colors.mutedForeground, fontSize: typography.sizes.xs },
                    ]}
                  >
                    {emp.user.email}
                  </Text>
                ) : null}
              </View>
              <View style={styles.pendingActions}>
                <TouchableOpacity
                  style={[styles.pendingBtn, { backgroundColor: colors.success }]}
                  onPress={() => handleEmployeeAction(emp.id, 'approve')}
                  disabled={!!empActionLoading}
                  activeOpacity={0.8}
                >
                  <Text style={styles.pendingBtnText}>{t('dashboard.approve')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.pendingBtn, { backgroundColor: colors.destructive }]}
                  onPress={() => handleEmployeeAction(emp.id, 'reject')}
                  disabled={!!empActionLoading}
                  activeOpacity={0.8}
                >
                  <Text style={styles.pendingBtnText}>{t('dashboard.reject')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* ── Average Rating ── */}
      {isLoading ? (
        <SkeletonCard height={128} />
      ) : (
        <View style={styles.ratingCardWrapper}>
          <Pressable
            onPressIn={() => Animated.spring(ratingCardScale, { toValue: 0.98, useNativeDriver: true, speed: 30 }).start()}
            onPressOut={() => Animated.spring(ratingCardScale, { toValue: 1, useNativeDriver: true, speed: 30 }).start()}
            onPress={() => business?.id && navigation.navigate('OwnerReviews', { businessId: business.id })}
          >
            <Animated.View style={{ transform: [{ scale: ratingCardScale }] }}>
              <Card style={[styles.card, styles.ratingCard]}>
                <Text
                  style={[
                    typography.bodySemiBold,
                    { color: colors.mutedForeground, fontSize: typography.sizes.sm, textAlign: 'center' },
                  ]}
                >
                  {t('dashboard.averageRating')}
                </Text>

                <Text
                  style={[
                    typography.heading,
                    {
                      color: colors.foreground,
                      fontSize: typography.sizes.xxxl,
                      lineHeight: typography.sizes.xxxl + 6,
                      marginTop: spacing.xs,
                      textAlign: 'center',
                    },
                  ]}
                >
                  {avgRating.toFixed(1)}
                </Text>

                <View style={styles.starsRow}>
                  {[1, 2, 3, 4, 5].map(i => (
                    <Ionicons
                      key={i}
                      name={i <= filledStars ? 'star' : 'star-outline'}
                      size={16}
                      color={i <= filledStars ? colors.secondary : colors.muted}
                      style={{ marginRight: 2 }}
                    />
                  ))}
                </View>

                <Text
                  style={[
                    typography.body,
                    { color: colors.mutedForeground, fontSize: typography.sizes.xs, marginTop: spacing.xs, textAlign: 'center' },
                  ]}
                >
                  {t('businessReviews.based', { count: avgRatingQuery.data?.reviewCount ?? 0 })}
                </Text>
              </Card>
            </Animated.View>
          </Pressable>

          {unseenCount > 0 && (
            <View style={[styles.unseenBadge, { backgroundColor: colors.destructive, ...shadows.sm }]}>
              <Text style={[typography.bodyBold, styles.unseenBadgeText]}>
                {unseenCount > 9 ? '9+' : String(unseenCount)}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* ── Appointments Chart ── */}
      {isLoading ? (
        <SkeletonChartCard />
      ) : (
        <Card style={[styles.card, styles.chartCard]}>
          {/* Chart header */}
          <View style={styles.chartHeader}>
            <Text
              style={[
                typography.bodySemiBold,
                { color: colors.mutedForeground, fontSize: typography.sizes.sm },
              ]}
            >
              {t('dashboard.appointments')}
            </Text>
            <Text
              style={[
                typography.heading,
                { color: colors.foreground, fontSize: typography.sizes.xxl },
              ]}
            >
              {totalCount}
            </Text>
          </View>

          {/* Donut chart */}
          {totalCount > 0 ? (
            <Pressable onPress={handleChartBackgroundPress}>
              <View style={styles.pieContainer}>
                <PieChart
                  data={pieChartData}
                  donut
                  radius={100}
                  innerRadius={62}
                  strokeWidth={2}
                  strokeColor={colors.background}
                  backgroundColor={colors.card}
                  isAnimated
                  animationDuration={600}
                  // focusOnPress disabled: its native overlay redraws all
                  // other slices in a single gray "peripheral" color.
                  // Tap handling is done per-item via pieChartData's onPress
                  // (handleSegmentPress), which drives focusedIndex below.
                  focusOnPress={false}
                  centerLabelComponent={() => {
                    const focused = focusedIndex >= 0 ? pieData[focusedIndex] : null;
                    return (
                      <View style={styles.centerLabel}>
                        {focused && (
                          <View style={[styles.centerDot, { backgroundColor: focused.color }]} />
                        )}
                        <Text
                          style={[
                            typography.heading,
                            { fontSize: 36, color: focused ? focused.color : colors.foreground },
                          ]}
                        >
                          {focused ? focused.value : totalCount}
                        </Text>
                        <Text
                          style={[
                            typography.body,
                            { fontSize: 11, color: colors.mutedForeground, marginTop: 2 },
                          ]}
                        >
                          {focused ? focused.label : t('dashboard.appointmentsCenterLabel')}
                        </Text>
                      </View>
                    );
                  }}
                />
              </View>

              {/* 2x2 legend grid */}
              <View style={[styles.statGrid, { borderTopColor: colors.border }]}>
                <View style={[styles.statVerticalDivider, { backgroundColor: colors.border }]} />
                <View style={styles.statRow}>
                  <StatBlock
                    label={pieData[0].label}
                    count={pieData[0].value}
                    color={pieData[0].color}
                    highlighted={focusedIndex === 0}
                  />
                  <StatBlock
                    label={pieData[1].label}
                    count={pieData[1].value}
                    color={pieData[1].color}
                    highlighted={focusedIndex === 1}
                  />
                </View>
                <View style={[styles.statHDivider, { backgroundColor: colors.border }]} />
                <View style={styles.statRow}>
                  <StatBlock
                    label={pieData[2].label}
                    count={pieData[2].value}
                    color={pieData[2].color}
                    highlighted={focusedIndex === 2}
                  />
                  <StatBlock
                    label={pieData[3].label}
                    count={pieData[3].value}
                    color={pieData[3].color}
                    highlighted={focusedIndex === 3}
                  />
                </View>
              </View>
            </Pressable>
          ) : (
            <View style={styles.chartEmpty}>
              <Ionicons name="bar-chart-outline" size={40} color={colors.mutedForeground} />
              <Text
                style={[
                  typography.body,
                  { color: colors.mutedForeground, fontSize: typography.sizes.sm, textAlign: 'center' },
                ]}
              >
                {t('dashboard.noAppointmentsInPeriod')}
              </Text>
            </View>
          )}
        </Card>
      )}

      {/* ── Total Revenue ── */}
      {isLoading ? (
        <SkeletonCard height={112} />
      ) : (
        <Card style={styles.card}>
          <Text
            style={[
              typography.bodySemiBold,
              { color: colors.mutedForeground, fontSize: typography.sizes.sm },
            ]}
          >
            {t('dashboard.totalRevenue')}
          </Text>
          <View style={styles.revenueRow}>
            <Text
              style={[
                typography.heading,
                { color: colors.foreground, fontSize: typography.sizes.xxl },
              ]}
            >
              {formatCurrency(currentRevenue)}
            </Text>
            <TrendBadge pct={revTrend} />
          </View>
          {todayExpectedRevenue > 0 && (
            <View style={[styles.expectedRevenueRow, { backgroundColor: colors.success + '15', borderRadius: 8 }]}>
              <Ionicons name="calendar-outline" size={13} color={colors.success} />
              <Text style={[typography.body, { fontSize: typography.sizes.xs, color: colors.success }]}>
                {t('dashboard.todayExpected')}: {formatCurrency(todayExpectedRevenue)}
              </Text>
            </View>
          )}
        </Card>
      )}

      {/* ── Staff Performance ── */}
      {isLoading ? (
        <SkeletonStaff />
      ) : staffStats.length > 0 ? (
        <View style={styles.staffSection}>
          <Text
            style={[
              typography.heading,
              { color: colors.foreground, fontSize: typography.sizes.lg, marginBottom: spacing.md },
            ]}
          >
            {t('dashboard.staffPerformance')}
          </Text>

          <Card style={styles.staffCard}>
            {staffStats.map((emp, idx) => (
              <View
                key={emp.id}
                style={[
                  styles.staffRow,
                  idx > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
                ]}
              >
                <View style={styles.staffLeft}>
                  <View style={[styles.staffAvatar, { backgroundColor: colors.muted }]}>
                    <Text
                      style={[
                        typography.bodyBold,
                        { color: colors.mutedForeground, fontSize: typography.sizes.sm },
                      ]}
                    >
                      {emp.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View>
                    <Text
                      style={[
                        typography.bodySemiBold,
                        { color: colors.foreground, fontSize: typography.sizes.md },
                      ]}
                      numberOfLines={1}
                    >
                      {emp.name}
                    </Text>
                    {emp.satisfaction !== null && (
                      <Text style={[typography.body, { color: colors.mutedForeground, fontSize: typography.sizes.xs }]}>
                        {t('dashboard.satisfaction')}: {Math.round((emp.satisfaction / 5) * 100)}%
                      </Text>
                    )}
                  </View>
                </View>
                <Text
                  style={[
                    typography.bodyBold,
                    { color: colors.foreground, fontSize: typography.sizes.sm },
                  ]}
                >
                  {formatCurrency(emp.revenue)}
                </Text>
              </View>
            ))}
          </Card>
        </View>
      ) : null}
    </ScrollView>
    </SafeAreaView>
  );
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: spacing.xl,
    paddingBottom: spacing.xl * 2,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  businessName: {
    flex: 1,
    fontSize: typography.sizes.xxl,
  },
  filterRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: borderRadius.pill,
  },
  pillText: {
    fontSize: typography.sizes.xs,
  },

  // Pending employees
  pendingSection: {
    borderWidth: 1.5,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  pendingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: spacing.sm,
    marginTop: spacing.sm,
    borderTopWidth: 1,
    gap: spacing.sm,
  },
  pendingActions: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  pendingBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: borderRadius.md,
    minWidth: 64,
    alignItems: 'center',
  },
  pendingBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },

  // Cards
  card: {
    marginBottom: spacing.md,
  },
  chartCard: {
    padding: 0,
    overflow: 'hidden',
  },
  chartHeader: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  pieContainer: {
    alignItems: 'center',
    alignSelf: 'center',
    paddingVertical: spacing.lg,
  },
  centerLabel: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: 4,
  },

  // Rating card
  ratingCardWrapper: {
    position: 'relative',
  },
  ratingCard: {
    alignItems: 'center',
  },
  unseenBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unseenBadgeText: {
    fontSize: typography.sizes.xs,
    color: '#fff',
    textAlign: 'center',
  },

  // Stars
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },

  // Revenue
  revenueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  expectedRevenueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs + 2,
  },

  // Trend badge
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.pill,
  },

  // Chart empty state
  chartEmpty: {
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },

  // 2x2 stat grid
  statGrid: {
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: spacing.sm,
  },
  statRow: {
    flexDirection: 'row',
  },
  statVerticalDivider: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '50%' as unknown as number,
    width: 1,
    opacity: 0.5,
  },
  statHDivider: {
    height: 1,
    opacity: 0.5,
  },

  // Staff
  staffSection: {
    marginBottom: spacing.md,
  },
  staffCard: {
    padding: 0,
    overflow: 'hidden',
  },
  staffRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  staffLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
    marginRight: spacing.md,
  },
  staffAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Skeletons
  skeletonCard: {
    marginBottom: spacing.md,
    padding: spacing.lg,
    justifyContent: 'space-between',
  },
  skeletonLine: {
    height: 14,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.sm,
  },
  skeletonLineLg: {
    height: 28,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.sm,
  },
  staffRowSkeleton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    height: 64,
  },
});
