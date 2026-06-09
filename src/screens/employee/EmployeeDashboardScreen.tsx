import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../lib/queryKeys';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../theme/useTheme';
import { useAuthStore } from '../../store/authStore';
import { employeeService } from '../../services/employeeService';
import { Button, Badge, Card, StatusBadge } from '../../components';
import { spacing, typography, borderRadius } from '../../theme/theme';
import { useNotificationStore } from '../../store/notificationStore';

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function formatRequestDate(iso: string, locale: string): string {
  const d = new Date(iso);
  const dayAbbr = new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(d);
  const monthAbbr = new Intl.DateTimeFormat(locale, { month: 'short' }).format(d);
  return `${dayAbbr} ${d.getDate()} ${monthAbbr} · ${formatTime(iso)}`;
}


interface SummaryCardProps {
  icon: string;
  label: string;
  value: number;
  iconColor: string;
}

const SummaryCard: React.FC<SummaryCardProps> = ({ icon, label, value, iconColor }) => {
  const { colors } = useTheme();
  return (
    <View style={[summaryCardStyles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[summaryCardStyles.iconWrap, { backgroundColor: iconColor + '18' }]}>
        <Ionicons name={icon as any} size={20} color={iconColor} />
      </View>
      <Text style={[typography.heading, { color: colors.foreground, fontSize: 26, marginTop: spacing.xs }]}>
        {value}
      </Text>
      <Text style={[typography.body, { color: colors.mutedForeground, fontSize: 12 }]}>
        {label}
      </Text>
    </View>
  );
};

const summaryCardStyles = StyleSheet.create({
  card: {
    flex: 1,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    alignItems: 'flex-start',
    gap: 2,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export const EmployeeDashboardScreen: React.FC = () => {
  const { colors } = useTheme();
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'tr' ? 'tr-TR' : 'en-US';
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const addNotification = useNotificationStore((s) => s.addNotification);

  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});

  const { data: allAppointments = [], isLoading, refetch } = useQuery({
    queryKey: queryKeys.bookings.employeeAll,
    queryFn: () => employeeService.getAllAppointments(),
  });

  useFocusEffect(
    React.useCallback(() => {
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.employeeAll });
    }, [queryClient])
  );

  const today = toDateStr(new Date());

  const pendingRequests = (allAppointments as any[])
    .filter((a) => a.status === 'PENDING')
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  const todaySchedule = (allAppointments as any[])
    .filter(
      (a) =>
        toDateStr(new Date(a.startTime)) === today &&
        a.status !== 'CANCELLED' &&
        a.status !== 'REJECTED' &&
        a.status !== 'PENDING',
    )
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  const completedCount = (allAppointments as any[]).filter((a) => a.status === 'COMPLETED').length;

  const handleApprove = async (id: string, bookingDate: string) => {
    setActionLoading(id + '_approve');
    setRowErrors((prev) => ({ ...prev, [id]: '' }));
    try {
      await employeeService.approveAppointment(id);
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.employeeAll });
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.employeeByDate(bookingDate) });
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.customerAll });
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.ownerAll });
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.ownerPending });
      const apt = (allAppointments as any[]).find((a) => a.id === id);
      if (apt?.customer?.id) {
        const dateStr = apt.startTime
          ? new Date(apt.startTime).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }) + ' · ' + new Date(apt.startTime).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
          : '';
        addNotification({ type: 'booking_confirmed', title: t('notifications.bookingConfirmed'), body: `${apt.service?.name ?? ''} — ${dateStr}`, userId: apt.customer.id });
      }
    } catch (e: any) {
      setRowErrors((prev) => ({ ...prev, [id]: e.message || t('common.error') }));
    } finally {
      setActionLoading(null);
    }
  };

  const handleDecline = async (id: string, bookingDate: string) => {
    setActionLoading(id + '_decline');
    setRowErrors((prev) => ({ ...prev, [id]: '' }));
    try {
      const aptToDecline = (allAppointments as any[]).find((a) => a.id === id);
      await employeeService.declineAppointment(id);
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.employeeAll });
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.employeeByDate(bookingDate) });
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.customerAll });
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.ownerAll });
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.ownerPending });
      if (aptToDecline?.customer?.id) {
        const dateStr = aptToDecline.startTime
          ? new Date(aptToDecline.startTime).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }) + ' — ' + (aptToDecline.service?.name ?? '')
          : aptToDecline.service?.name ?? '';
        addNotification({ type: 'booking_cancelled', title: t('notifications.bookingCancelled'), body: dateStr, userId: aptToDecline.customer.id });
      }
    } catch (e: any) {
      setRowErrors((prev) => ({ ...prev, [id]: e.message || t('common.error') }));
    } finally {
      setActionLoading(null);
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={false}
            onRefresh={() => queryClient.invalidateQueries({ queryKey: queryKeys.bookings.employeeAll })}
          />
        }
      >
        {/* Greeting */}
        <Text style={[typography.heading, { color: colors.foreground, fontSize: 22, marginBottom: spacing.md }]}>
          {t('employeeDashboard.greeting')}, {user?.name?.split(' ')[0] || ''}
        </Text>

        {/* Summary cards */}
        <View style={styles.cardsRow}>
          <SummaryCard
            icon="time-outline"
            label={t('employeeDashboard.pending')}
            value={pendingRequests.length}
            iconColor="#f59e0b"
          />
          <SummaryCard
            icon="calendar-outline"
            label={t('employeeDashboard.today')}
            value={todaySchedule.length}
            iconColor={colors.primary}
          />
          <SummaryCard
            icon="checkmark-circle-outline"
            label={t('employeeDashboard.completed')}
            value={completedCount}
            iconColor="#22c55e"
          />
        </View>

        {/* Pending Requests */}
        <View style={styles.section}>
          <Text style={[typography.bodySemiBold, { color: colors.foreground, fontSize: 16, marginBottom: spacing.sm }]}>
            {t('employeeDashboard.pendingRequests')}
          </Text>
          {pendingRequests.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Ionicons name="checkmark-done-outline" size={28} color={colors.mutedForeground} />
              <Text style={[typography.body, { color: colors.mutedForeground, marginTop: spacing.xs }]}>
                {t('employeeDashboard.noPendingRequests')}
              </Text>
            </Card>
          ) : (
            pendingRequests.map((apt) => {
              const bookingDate = toDateStr(new Date(apt.startTime));
              const rowError = rowErrors[apt.id];
              const initial = (apt.customer?.fullName ?? '?').charAt(0).toUpperCase();

              return (
                <Card key={apt.id} style={styles.requestCard}>
                  <View style={styles.requestTop}>
                    {/* Avatar */}
                    <View style={[styles.avatar, { backgroundColor: colors.primary + '22' }]}>
                      <Text style={[typography.bodyBold, { color: colors.primary, fontSize: 16 }]}>
                        {initial}
                      </Text>
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text style={[typography.bodySemiBold, { color: colors.foreground, fontSize: 16 }]}>
                        {apt.customer?.fullName || ''}
                      </Text>
                      <Text style={[typography.body, { color: colors.mutedForeground, fontSize: 14 }]}>
                        {apt.service?.name}
                        {apt.service?.durationMin ? ` · ${apt.service.durationMin} ${t('common.min')}` : ''}
                      </Text>
                      <Text style={[typography.body, { color: colors.mutedForeground, fontSize: 14, marginTop: 2 }]}>
                        {formatRequestDate(apt.startTime, locale)}
                      </Text>
                    </View>
                  </View>

                  {rowError ? (
                    <Text style={[typography.body, { color: colors.destructive, fontSize: 12, marginTop: spacing.xs }]}>
                      {rowError}
                    </Text>
                  ) : null}

                  <View style={styles.requestActions}>
                    <Button
                      title={t('employeeDashboard.approve')}
                      variant="primary"
                      size="sm"
                      style={styles.actionBtn}
                      onPress={() => handleApprove(apt.id, bookingDate)}
                      loading={actionLoading === apt.id + '_approve'}
                      disabled={!!actionLoading}
                    />
                    <Button
                      title={t('employeeDashboard.decline')}
                      variant="outline"
                      size="sm"
                      style={[styles.actionBtn, { borderColor: colors.destructive }]}
                      textStyle={{ color: colors.destructive }}
                      onPress={() => handleDecline(apt.id, bookingDate)}
                      loading={actionLoading === apt.id + '_decline'}
                      disabled={!!actionLoading}
                    />
                  </View>
                </Card>
              );
            })
          )}
        </View>

        {/* Today's Schedule */}
        <View style={styles.section}>
          <Text style={[typography.bodySemiBold, { color: colors.foreground, fontSize: 16, marginBottom: spacing.sm }]}>
            {t('employeeDashboard.todaySchedule')}
          </Text>
          {todaySchedule.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Ionicons name="calendar-outline" size={28} color={colors.mutedForeground} />
              <Text style={[typography.body, { color: colors.mutedForeground, marginTop: spacing.xs }]}>
                {t('employeeDashboard.noAppointmentsToday')}
              </Text>
            </Card>
          ) : (
            todaySchedule.map((apt) => {
              return (
                <View
                  key={apt.id}
                  style={[styles.scheduleRow, { backgroundColor: colors.card, borderLeftColor: colors.primary }]}
                >
                  <Text style={[typography.bodySemiBold, { color: colors.primary, width: 48, fontSize: 13 }]}>
                    {formatTime(apt.startTime)}
                  </Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[typography.bodySemiBold, { color: colors.foreground, fontSize: 14 }]}>
                      {apt.customer?.fullName || t('common.anonymous')}
                    </Text>
                    <Text style={[typography.body, { color: colors.mutedForeground, fontSize: 12 }]}>
                      {apt.service?.name}
                    </Text>
                  </View>
                  <StatusBadge status={apt.status} />
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: spacing.md, paddingBottom: spacing.xxl },
  cardsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  section: {
    marginBottom: spacing.lg,
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.xs,
  },
  requestCard: {
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  requestTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  requestActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionBtn: {
    flex: 1,
  },
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderLeftWidth: 3,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.xs,
    gap: spacing.sm,
  },
});
