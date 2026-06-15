import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../theme/useTheme';
import { employeeService } from '../../services/employeeService';
import { queryKeys } from '../../lib/queryKeys';
import { spacing, typography, borderRadius } from '../../theme/theme';

function formatTime(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export const EmployeeHomeScreen: React.FC = () => {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const { data: appointments = [], isLoading: loading } = useQuery({
    queryKey: queryKeys.bookings.employeeAll,
    queryFn: () => employeeService.getAppointments(),
    staleTime: 30000,
  });

  const isRefetchingRef = useRef(false);

  useFocusEffect(
    useCallback(() => {
      if (isRefetchingRef.current) return;
      isRefetchingRef.current = true;
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.employeeAll }).finally(() => {
        isRefetchingRef.current = false;
      });
    }, [queryClient])
  );

  const ARRIVAL_WINDOW_MS = 15 * 60 * 1000;

  const isInArrivalWindow = (startTimeIso: string): boolean => {
    const start = new Date(startTimeIso).getTime();
    const now = Date.now();
    return now >= start && now <= start + ARRIVAL_WINDOW_MS;
  };

  const invalidateAfterMutation = (bookingDate: string) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.bookings.employeeAll });
    queryClient.invalidateQueries({ queryKey: queryKeys.bookings.employeeByDate(bookingDate) });
    queryClient.invalidateQueries({ queryKey: queryKeys.bookings.ownerAll });
    queryClient.invalidateQueries({ queryKey: queryKeys.bookings.ownerPending });
    queryClient.invalidateQueries({ queryKey: queryKeys.bookings.customerAll });
  };

  const handleStart = async (id: string, bookingDate: string) => {
    setActionLoading(id + '_start');
    try {
      await employeeService.startAppointment(id);
      invalidateAfterMutation(bookingDate);
    } catch (e: any) {
      Alert.alert(t('common.error'), e.message || t('employeeHome.startError'));
    } finally {
      setActionLoading(null);
    }
  };

  const handleNoShow = async (id: string, bookingDate: string) => {
    setActionLoading(id + '_noshow');
    try {
      await employeeService.noShowAppointment(id);
      invalidateAfterMutation(bookingDate);
    } catch (e: any) {
      Alert.alert(t('common.error'), e.message || t('employeeHome.noShowError'));
    } finally {
      setActionLoading(null);
    }
  };

  const handleComplete = async (id: string, bookingDate: string) => {
    setActionLoading(id + '_complete');
    try {
      await employeeService.completeAppointment(id);
      invalidateAfterMutation(bookingDate);
    } catch (e: any) {
      Alert.alert(t('common.error'), e.message || t('employeeHome.completeError'));
    } finally {
      setActionLoading(null);
    }
  };

  const renderItem = ({ item }: { item: any }) => {
    const bookingDate = item.startTime ? item.startTime.slice(0, 10) : '';
    const inWindow = isInArrivalWindow(item.startTime);
    const canStart = !item.actualStartTime &&
      item.status !== 'COMPLETED' &&
      item.status !== 'CANCELLED' &&
      item.status !== 'NO_SHOW' &&
      item.status !== 'DISPUTED';
    const canNoShow = item.status === 'APPROVED' && inWindow && !item.businessArrivalConfirmed;
    const canComplete = item.actualStartTime && !item.actualEndTime && item.status === 'IN_PROGRESS';
    const showWindowLabel = canNoShow || (canStart && inWindow && !item.businessArrivalConfirmed);

    return (
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <View style={styles.timeBox}>
            <Ionicons name="time-outline" size={14} color={colors.mutedForeground} />
            <Text style={[typography.bodySemiBold, { color: colors.foreground, fontSize: 15 }]}>
              {formatTime(item.startTime)}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: colors.muted }]}>
            <Text style={[typography.body, { color: colors.mutedForeground, fontSize: 12 }]}>
              {t(`status.${item.status.toLowerCase()}`)}
            </Text>
          </View>
        </View>

        <Text style={[typography.bodySemiBold, { color: colors.foreground, marginBottom: 2 }]}>
          {item.customer?.fullName || t('requests.customer')}
        </Text>
        <Text style={[typography.body, { color: colors.mutedForeground, fontSize: 13 }]}>
          {item.service?.name} · {item.service?.durationMin} {t('common.min')}
        </Text>

        <View style={styles.actions}>
          {canStart && (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: '#3b82f6' }]}
              onPress={() => handleStart(item.id, bookingDate)}
              disabled={!!actionLoading}
            >
              {actionLoading === item.id + '_start' ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="play" size={14} color="#fff" />
                  <Text style={styles.actionBtnText}>{t('employeeCalendar.start')}</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {canNoShow && (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: '#ef4444' }]}
              onPress={() => handleNoShow(item.id, bookingDate)}
              disabled={!!actionLoading}
            >
              {actionLoading === item.id + '_noshow' ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="person-remove-outline" size={14} color="#fff" />
                  <Text style={styles.actionBtnText}>{t('common.noShow')}</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {canComplete && (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: '#22c55e' }]}
              onPress={() => handleComplete(item.id, bookingDate)}
              disabled={!!actionLoading}
            >
              {actionLoading === item.id + '_complete' ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="checkmark" size={14} color="#fff" />
                  <Text style={styles.actionBtnText}>{t('employeeCalendar.complete')}</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>

        {showWindowLabel && (
          <View style={styles.windowLabel}>
            <Ionicons name="time-outline" size={12} color={colors.secondary} />
            <Text style={[typography.body, { fontSize: 11, color: colors.secondary }]}>
              {t('employeeHome.confirmationWindowOpen')}
            </Text>
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={appointments}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        removeClippedSubviews
        maxToRenderPerBatch={10}
        windowSize={5}
        initialNumToRender={6}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={false} onRefresh={() => queryClient.invalidateQueries({ queryKey: queryKeys.bookings.employeeAll })} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="calendar-outline" size={48} color={colors.mutedForeground} />
            <Text style={[typography.body, { color: colors.mutedForeground, marginTop: spacing.md }]}>
              {t('employeeDashboard.noAppointmentsToday')}
            </Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: spacing.md, gap: spacing.sm },
  empty: { alignItems: 'center', paddingTop: 80 },
  card: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    gap: spacing.xs,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  timeBox: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.pill,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    minWidth: 90,
    justifyContent: 'center',
  },
  actionBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  windowLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
});
