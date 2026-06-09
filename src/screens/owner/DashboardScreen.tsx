import React, { useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Pressable,
  Animated,
  Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../lib/queryKeys';
import { BarChart } from 'react-native-gifted-charts';
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
import { spacing, typography, borderRadius } from '../../theme/theme';
import { PendingEmployee } from '../../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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
// Bar colors — explicit hex values per spec
// ---------------------------------------------------------------------------

const BAR_COLORS = {
  completed: '#4A5E6A',
  confirmed: '#7BA7BC',
  noShow: '#C18C5D',
  cancelled: '#A85448',
};

// ---------------------------------------------------------------------------
// Y-axis helpers
// ---------------------------------------------------------------------------

function niceStep(rawMax: number): { max: number; sections: number } {
  if (rawMax <= 0) return { max: 4, sections: 4 };
  // Pick a step that gives 4–6 clean grid lines
  const candidates = [1, 2, 5, 10, 20, 50, 100];
  const step = candidates.find(s => s * 4 >= rawMax) ?? Math.ceil(rawMax / 4);
  const sections = Math.ceil(rawMax / step);
  return { max: step * sections, sections };
}

// ---------------------------------------------------------------------------
// Chart data builder
// ---------------------------------------------------------------------------

function buildChartData(
  apts: DashApt[],
  filter: RangeFilter,
  mutedForeground: string,
  locale: string
): object[] {
  type Group = { label: string; start: number; end: number };
  const allGroups: Group[] = [];
  const now = new Date();

  if (filter === 'Day') {
    const HOURS = [8, 10, 12, 14, 16, 18];
    const LABELS = ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00'];
    HOURS.forEach((h, i) => {
      const s = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h);
      const e = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h + 2);
      allGroups.push({ label: LABELS[i], start: s.getTime(), end: e.getTime() - 1 });
    });
  } else if (filter === 'Month') {
    const y = now.getFullYear();
    const m = now.getMonth();
    [[1, 7], [8, 14], [15, 21], [22, 31]].forEach(([ws, we], i) => {
      allGroups.push({
        label: `H${i + 1}`,
        start: new Date(y, m, ws).getTime(),
        end: new Date(y, m, we, 23, 59, 59, 999).getTime(),
      });
    });
  } else {
    const y = now.getFullYear();
    const dateLocale = locale === 'tr' ? 'tr-TR' : 'en-US';
    const monthFormatter = new Intl.DateTimeFormat(dateLocale, { month: 'short' });
    const MONTH_LABELS = Array.from({ length: 12 }, (_, i) =>
      monthFormatter.format(new Date(2000, i, 1))
    );
    for (let mo = 0; mo < 12; mo++) {
      allGroups.push({
        label: MONTH_LABELS[mo],
        start: new Date(y, mo, 1).getTime(),
        end: new Date(y, mo + 1, 0, 23, 59, 59, 999).getTime(),
      });
    }
  }

  const CHARTED_STATUSES = new Set(['COMPLETED', 'APPROVED', 'NO_SHOW', 'CANCELLED']);
  const groups = allGroups.filter(group =>
    apts.some(a => {
      if (!a.startTime || !CHARTED_STATUSES.has(a.status)) return false;
      const t = new Date(a.startTime).getTime();
      return t >= group.start && t <= group.end;
    })
  );

  if (groups.length === 0) return [];

  // Spread bars to fill available width when few groups exist
  const groupCount = groups.length;
  const groupSpacing = groupCount <= 2 ? 60 : groupCount <= 4 ? 40 : 20;

  const barColorsArr = [
    BAR_COLORS.completed,
    BAR_COLORS.confirmed,
    BAR_COLORS.noShow,
    BAR_COLORS.cancelled,
  ];

  // X-axis label anchored to the 2nd bar (Onaylandı) — visually centers the label under the group
  const labelTextStyle = {
    fontFamily: 'Nunito_400Regular',
    fontSize: 10,
    color: mutedForeground,
    textAlign: 'center' as const,
    width: 36,
  };

  const data: object[] = [];

  groups.forEach(group => {
    const g = apts.filter(a => {
      if (!a.startTime) return false;
      const t = new Date(a.startTime).getTime();
      return t >= group.start && t <= group.end;
    });

    const counts = [
      g.filter(a => a.status === 'COMPLETED').length,
      g.filter(a => a.status === 'APPROVED').length,
      g.filter(a => a.status === 'NO_SHOW').length,
      g.filter(a => a.status === 'CANCELLED').length,
    ];

    counts.forEach((val, idx) => {
      const isLabel = idx === 1;
      const isLast = idx === 3;
      const color = barColorsArr[idx];

      data.push({
        value: val,
        frontColor: val > 0 ? color : 'transparent',
        barWidth: 14,
        barBorderRadius: val > 0 ? 6 : 0,
        spacing: isLast ? groupSpacing : 3,
        ...(isLabel ? { label: group.label, labelTextStyle } : {}),
        ...(val > 0 ? {
          topLabelComponent: () => (
            <Text style={{ color, fontFamily: 'Nunito_700Bold', fontSize: 9, textAlign: 'center' }}>
              {String(val)}
            </Text>
          ),
        } : {}),
      });
    });
  });

  return data;
}

// ---------------------------------------------------------------------------
// Stat block (2x2 grid below chart)
// ---------------------------------------------------------------------------

interface StatBlockProps {
  label: string;
  count: number;
  color: string;
}

const StatBlock: React.FC<StatBlockProps> = ({ label, count, color }) => {
  const { colors } = useTheme();
  return (
    <View style={statBlockStyles.block}>
      <View style={statBlockStyles.labelRow}>
        <View style={[statBlockStyles.dot, { backgroundColor: color }]} />
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
  const { t, i18n } = useTranslation();
  useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [selectedRange, setSelectedRange] = useState<RangeFilter>('Month');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [empActionLoading, setEmpActionLoading] = useState<string | null>(null);
  const addNotification = useNotificationStore((s) => s.addNotification);
  const [unseenCount, setUnseenCount] = useState(0);
  const ratingCardScale = React.useRef(new Animated.Value(1)).current;

  // --- Queries ---

  const businessQuery = useQuery({
    queryKey: queryKeys.owner.business,
    queryFn: () => ownerService.getBusiness(),
  });

  const appointmentsQuery = useQuery({
    queryKey: queryKeys.bookings.ownerAll,
    queryFn: () => ownerService.getOwnerAppointments(),
  });

  const employeesQuery = useQuery({
    queryKey: businessQuery.data?.id
      ? queryKeys.employees.forBusiness(businessQuery.data.id)
      : ['employees', '__none__'],
    queryFn: () => businessService.getEmployees(businessQuery.data!.id),
    enabled: !!businessQuery.data?.id,
  });

  const pendingQuery = useQuery({
    queryKey: queryKeys.employees.pending,
    queryFn: () => ownerService.getPendingEmployees().catch(() => [] as PendingEmployee[]),
  });

  const reviewsQuery = useQuery({
    queryKey: businessQuery.data?.id
      ? queryKeys.reviews.forBusiness(businessQuery.data.id)
      : ['reviews', '__none__'],
    queryFn: () => reviewService.getReviews(businessQuery.data!.id),
    enabled: !!businessQuery.data?.id,
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
  useFocusEffect(
    useCallback(() => {
      queryClient.invalidateQueries({ queryKey: queryKeys.owner.business });
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.ownerAll });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      if (businessQuery.data?.id) {
        queryClient.invalidateQueries({ queryKey: queryKeys.businesses.averageRating(businessQuery.data.id) });
      }
      checkUnseenReviews();
    }, [queryClient, businessQuery.data?.id, checkUnseenReviews])
  );

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

  const chartData = useMemo(
    () => buildChartData(filteredApts, selectedRange, colors.mutedForeground, i18n.language),
    [filteredApts, selectedRange, colors.mutedForeground, i18n.language]
  );

  const statusCounts = useMemo(() => ({
    completed: filteredApts.filter(a => a.status === 'COMPLETED').length,
    confirmed: filteredApts.filter(a => a.status === 'APPROVED').length,
    noShow: filteredApts.filter(a => a.status === 'NO_SHOW').length,
    cancelled: filteredApts.filter(a => a.status === 'CANCELLED').length,
  }), [filteredApts]);

  const chartScale = useMemo(() => {
    if (chartData.length === 0) return { max: 4, sections: 4 };
    const rawMax = Math.max(...(chartData as any[]).map((d: any) => d.value as number));
    return niceStep(rawMax);
  }, [chartData]);

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

  const staffStats = useMemo(() => {
    const emps = (employeesQuery.data ?? []) as Array<{
      id: string;
      fullName: string;
    }>;
    return emps
      .map(emp => {
        const rev = filteredApts
          .filter(a => a.employeeId === emp.id && a.status === 'COMPLETED')
          .reduce((s, a) => s + Number(a.service?.price ?? 0), 0);
        return { id: emp.id, name: emp.fullName, revenue: rev };
      })
      .sort((a, b) => b.revenue - a.revenue);
  }, [employeesQuery.data, filteredApts]);

  const business = businessQuery.data;
  const pendingEmployees = (pendingQuery.data ?? []) as PendingEmployee[];
  const avgRating = avgRatingQuery.data?.averageRating ?? Number(business?.averageRating ?? 0);
  const filledStars = Math.min(5, Math.round(avgRating));
  const isLoading = businessQuery.isLoading || appointmentsQuery.isLoading;

  const Y_AXIS_W = 32;
  const CHART_HPAD = 16;
  const chartWidth = SCREEN_WIDTH - spacing.xl * 2 - CHART_HPAD * 2 - Y_AXIS_W;

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
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
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
                onPress={() => setSelectedRange(r)}
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
                  {t('businessReviews.based', { count: business?.reviewCount ?? 0 })}
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
              {statusCounts.completed + statusCounts.confirmed + statusCounts.noShow + statusCounts.cancelled}
            </Text>
          </View>

          {/* Bar chart */}
          {chartData.length > 0 ? (
            <View style={{ paddingHorizontal: CHART_HPAD }}>
              <BarChart
                data={chartData as any}
                width={chartWidth}
                height={220}
                maxValue={chartScale.max}
                noOfSections={chartScale.sections}
                yAxisLabelWidth={Y_AXIS_W}
                yAxisThickness={0}
                yAxisTextStyle={{
                  fontFamily: 'Nunito_400Regular',
                  fontSize: 10,
                  color: colors.mutedForeground,
                  textAlign: 'right',
                }}
                xAxisThickness={1}
                xAxisColor={colors.border}
                hideRules={false}
                rulesType="solid"
                rulesColor={colors.border + '66'}
                backgroundColor="transparent"
                isAnimated
                animationDuration={500}
                initialSpacing={8}
                endSpacing={8}
                showLine={false}
                disableScroll
              />
            </View>
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

          {/* 2x2 Status stat grid */}
          <View style={[styles.statGrid, { borderTopColor: colors.border }]}>
            <View style={[styles.statVerticalDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statRow}>
              <StatBlock
                label={t('dashboard.legendCompleted')}
                count={statusCounts.completed}
                color={BAR_COLORS.completed}
              />
              <StatBlock
                label={t('dashboard.legendConfirmed')}
                count={statusCounts.confirmed}
                color={BAR_COLORS.confirmed}
              />
            </View>
            <View style={[styles.statHDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statRow}>
              <StatBlock
                label={t('dashboard.legendNoShow')}
                count={statusCounts.noShow}
                color={BAR_COLORS.noShow}
              />
              <StatBlock
                label={t('dashboard.legendCancelled')}
                count={statusCounts.cancelled}
                color={BAR_COLORS.cancelled}
              />
            </View>
          </View>
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
                  <Text
                    style={[
                      typography.bodySemiBold,
                      { color: colors.foreground, fontSize: typography.sizes.md },
                    ]}
                    numberOfLines={1}
                  >
                    {emp.name}
                  </Text>
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
