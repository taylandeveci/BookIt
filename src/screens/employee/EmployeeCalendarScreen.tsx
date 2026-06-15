import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Animated,
  RefreshControl,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../lib/queryKeys';
import { Ionicons } from '@expo/vector-icons';
import { Calendar } from 'react-native-calendars';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../theme/useTheme';
import { employeeService } from '../../services/employeeService';
import { useNotificationStore } from '../../store/notificationStore';
import { useAuthStore } from '../../store/authStore';
import { Badge, StatusBadge } from '../../components';
import { spacing, typography, borderRadius } from '../../theme/theme';

const COLLAPSED_H = 72;
const EXPANDED_H = 360;

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function getWeekDays(dateStr: string): Date[] {
  const d = new Date(dateStr + 'T12:00:00');
  const dow = d.getDay();
  const monday = new Date(d);
  monday.setDate(d.getDate() - dow + (dow === 0 ? -6 : 1));
  return Array.from({ length: 7 }, (_, i) => {
    const dd = new Date(monday);
    dd.setDate(monday.getDate() + i);
    return dd;
  });
}


export const EmployeeCalendarScreen: React.FC = () => {
  const { colors } = useTheme();
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'tr' ? 'tr-TR' : 'en-US';
  const getDayAbbr = (d: Date) => new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(d);
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(toDateStr(new Date()));
  const [expanded, setExpanded] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const addNotification = useNotificationStore((s) => s.addNotification);
  const user = useAuthStore((s) => s.user);

  // Code entry bottom sheet state
  const [codeSheet, setCodeSheet] = useState<{
    visible: boolean;
    appointmentId: string;
    customerId: string;
    serviceName: string;
    bookingDate: string;
    expiresAt: Date | null;
  }>({ visible: false, appointmentId: '', customerId: '', serviceName: '', bookingDate: '', expiresAt: null });
  const [digits, setDigits] = useState(['', '', '', '']);
  const [codeError, setCodeError] = useState('');
  const [verifyLoading, setVerifyLoading] = useState(false);
  const digitRefs = [
    useRef<TextInput>(null),
    useRef<TextInput>(null),
    useRef<TextInput>(null),
    useRef<TextInput>(null),
  ];

  const heightAnim = useRef(new Animated.Value(COLLAPSED_H)).current;

  const toggleCalendar = () => {
    const toExpanded = !expanded;
    setExpanded(toExpanded);
    Animated.spring(heightAnim, {
      toValue: toExpanded ? EXPANDED_H : COLLAPSED_H,
      useNativeDriver: false,
      damping: 20,
      stiffness: 150,
    }).start();
  };

  const { data: allAppointments = [], isLoading, isRefetching } = useQuery({
    queryKey: queryKeys.bookings.employeeAll,
    queryFn: () => employeeService.getAllAppointments(),
    staleTime: 30000,
  });

  const isRefetchingRef = useRef(false);

  useFocusEffect(
    React.useCallback(() => {
      if (isRefetchingRef.current) return;
      isRefetchingRef.current = true;
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.employeeAll }).finally(() => {
        isRefetchingRef.current = false;
      });
    }, [queryClient])
  );

  const appointments = allAppointments as any[];

  const markedDates: Record<string, any> = {};
  appointments.forEach((apt) => {
    const ds = toDateStr(new Date(apt.startTime));
    markedDates[ds] = { marked: true, dotColor: colors.primary };
  });
  if (selectedDate) {
    markedDates[selectedDate] = {
      ...(markedDates[selectedDate] || {}),
      selected: true,
      selectedColor: colors.primary,
    };
  }

  const dayAppointments = appointments
    .filter((apt) => toDateStr(new Date(apt.startTime)) === selectedDate)
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  const weekDays = getWeekDays(selectedDate);
  const todayStr = toDateStr(new Date());

  const handleStart = async (item: any) => {
    setActionLoading(item.id + '_start');
    try {
      await employeeService.startAppointment(item.id);
      // Push code notification to customer (in-app, same device)
      const code = String(Math.floor(Math.random() * 9000) + 1000);
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
      const customerId: string = item.customer?.id ?? item.customerId ?? '';
      const serviceName: string = item.service?.name ?? '';
      if (customerId) {
        addNotification({
          type: 'service_start_code',
          title: t('notifications.serviceStartCode'),
          body: `${code}|${serviceName}|${expiresAt.toISOString()}`,
          userId: customerId,
        });
      }
      const bookingDate = item.startTime ? item.startTime.slice(0, 10) : selectedDate;
      setCodeSheet({
        visible: true,
        appointmentId: item.id,
        customerId,
        serviceName,
        bookingDate,
        expiresAt,
      });
      setDigits(['', '', '', '']);
      setCodeError('');
      setTimeout(() => digitRefs[0].current?.focus(), 200);
    } catch (e: any) {
      Alert.alert(t('common.error'), e.message || t('common.error'));
    } finally {
      setActionLoading(null);
    }
  };

  const handleVerifyCode = async () => {
    const code = digits.join('');
    if (code.length < 4) return;
    setVerifyLoading(true);
    setCodeError('');
    try {
      await employeeService.verifyStartCode(codeSheet.appointmentId, code);
      setCodeSheet({ visible: false, appointmentId: '', customerId: '', serviceName: '', bookingDate: '', expiresAt: null });
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.employeeAll });
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.employeeByDate(codeSheet.bookingDate) });
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.customerAll });
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.ownerAll });
    } catch (e: any) {
      const msg: string = e.message ?? '';
      if (msg.includes('süresi doldu') || msg.includes('expired')) {
        setCodeError(t('startCode.codeExpiredError'));
        setTimeout(() => setCodeSheet((prev) => ({ ...prev, visible: false })), 2000);
      } else {
        setCodeError(t('startCode.wrongCode'));
        setDigits(['', '', '', '']);
        setTimeout(() => digitRefs[0].current?.focus(), 100);
      }
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleComplete = async (id: string) => {
    setActionLoading(id + '_complete');
    try {
      await employeeService.completeAppointment(id);
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.employeeAll });
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.employeeByDate(selectedDate) });
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.ownerAll });
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.customerAll });
      queryClient.invalidateQueries({ queryKey: ['owner', 'dashboard'] });
    } catch (e: any) {
      Alert.alert(t('common.error'), e.message || t('common.error'));
    } finally {
      setActionLoading(null);
    }
  };

  const renderItem = ({ item }: { item: any }) => {
    const canStart =
      !item.actualStartTime &&
      (item.status === 'APPROVED' || item.status === 'PENDING' || item.status === 'confirmed');
    const canComplete =
      item.actualStartTime &&
      !item.actualEndTime &&
      (item.status === 'IN_PROGRESS' || item.status === 'in_service');
    return (
      <View style={[styles.apptCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.timeCol}>
          <Text style={[typography.bodySemiBold, { color: colors.primary, fontSize: 13 }]}>
            {formatTime(item.startTime)}
          </Text>
          <View style={[styles.statusDot, { backgroundColor: colors.primary }]} />
        </View>

        <View style={styles.apptInfo}>
          <Text style={[typography.bodySemiBold, { color: colors.foreground }]}>
            {item.customer?.fullName || t('common.anonymous')}
          </Text>
          <Text style={[typography.body, { color: colors.mutedForeground, fontSize: 13 }]}>
            {item.service?.name}
            {item.service?.durationMin ? ` · ${item.service.durationMin} ${t('common.min')}` : ''}
          </Text>
          <StatusBadge status={item.status} />
        </View>

        <View style={styles.apptActions}>
          {canStart && (
            <TouchableOpacity
              style={[styles.iconBtn, { backgroundColor: colors.primary }]}
              onPress={() => handleStart(item)}
              disabled={actionLoading === item.id + '_start'}
              activeOpacity={0.7}
            >
              {actionLoading === item.id + '_start' ? (
                <ActivityIndicator size="small" color={colors.primaryForeground} />
              ) : (
                <Ionicons name="play" size={16} color={colors.primaryForeground} />
              )}
            </TouchableOpacity>
          )}
          {canComplete && (
            <TouchableOpacity
              style={[styles.iconBtn, { backgroundColor: colors.primary }]}
              onPress={() => handleComplete(item.id)}
              disabled={actionLoading === item.id + '_complete'}
              activeOpacity={0.7}
            >
              {actionLoading === item.id + '_complete' ? (
                <ActivityIndicator size="small" color={colors.primaryForeground} />
              ) : (
                <Ionicons name="checkmark" size={16} color={colors.primaryForeground} />
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['bottom']}>
      {/* Calendar header */}
      <View style={[styles.calendarContainer, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Animated.View style={{ height: heightAnim, overflow: 'hidden' }}>
          {expanded ? (
            <Calendar
              current={selectedDate}
              onDayPress={(day: { dateString: string }) => setSelectedDate(day.dateString)}
              markedDates={markedDates}
              theme={{
                backgroundColor: colors.card,
                calendarBackground: colors.card,
                textSectionTitleColor: colors.mutedForeground,
                selectedDayBackgroundColor: colors.primary,
                selectedDayTextColor: colors.primaryForeground,
                todayTextColor: colors.primary,
                dayTextColor: colors.foreground,
                dotColor: colors.primary,
                monthTextColor: colors.foreground,
                arrowColor: colors.primary,
                textDisabledColor: colors.mutedForeground + '50',
              }}
            />
          ) : (
            <View style={styles.weekStrip}>
              {weekDays.map((d) => {
                const ds = toDateStr(d);
                const isSelected = ds === selectedDate;
                const isToday = ds === todayStr;
                const hasDot = !!markedDates[ds]?.marked && !isSelected;
                return (
                  <TouchableOpacity
                    key={ds}
                    style={[
                      styles.dayCell,
                      isSelected && { backgroundColor: colors.primary, borderRadius: borderRadius.pill },
                    ]}
                    onPress={() => setSelectedDate(ds)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.dayAbbr, { color: isSelected ? colors.primaryForeground : colors.mutedForeground }]}>
                      {getDayAbbr(d)}
                    </Text>
                    <Text style={[
                      styles.dayNum,
                      {
                        color: isSelected ? colors.primaryForeground : isToday ? colors.primary : colors.foreground,
                        fontWeight: isToday ? '700' : '500',
                      },
                    ]}>
                      {d.getDate()}
                    </Text>
                    {(hasDot || isSelected) && (
                      <View style={[styles.dotSmall, { backgroundColor: isSelected ? colors.primaryForeground + '80' : colors.primary }]} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </Animated.View>

        <TouchableOpacity style={styles.toggleBtn} onPress={toggleCalendar} activeOpacity={0.7}>
          <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color={colors.mutedForeground} />
        </TouchableOpacity>
      </View>

      {/* Day timeline */}
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={dayAppointments}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          removeClippedSubviews
          maxToRenderPerBatch={10}
          windowSize={5}
          initialNumToRender={6}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={() => queryClient.invalidateQueries({ queryKey: queryKeys.bookings.employeeAll })}
            />
          }
          ListHeaderComponent={
            dayAppointments.length > 0 ? (
              <Text style={[typography.body, { color: colors.mutedForeground, fontSize: 13, marginBottom: spacing.sm }]}>
                {t('employeeCalendar.appointmentCount', { count: dayAppointments.length })}
              </Text>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="calendar-outline" size={40} color={colors.mutedForeground} />
              <Text style={[typography.body, { color: colors.mutedForeground, marginTop: spacing.sm, textAlign: 'center' }]}>
                {t('employeeDashboard.noAppointmentsToday')}
              </Text>
            </View>
          }
        />
      )}

      {/* Employee code entry bottom sheet */}
      <Modal
        visible={codeSheet.visible}
        transparent
        animationType="slide"
        onRequestClose={() => setCodeSheet((p) => ({ ...p, visible: false }))}
      >
        <Pressable style={styles.overlay} onPress={() => setCodeSheet((p) => ({ ...p, visible: false }))}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ width: '100%' }}
          >
            <Pressable onPress={() => {}} style={[styles.sheet, { backgroundColor: colors.card }]}>
              <View style={[styles.dragHandle, { backgroundColor: colors.border }]} />
              <Text style={[typography.heading, styles.sheetTitle, { color: colors.foreground }]}>
                {t('startCode.employeeTitle')}
              </Text>
              <Text style={[typography.body, styles.sheetSubtitle, { color: colors.mutedForeground }]}>
                {t('startCode.employeeSubtitle')}
              </Text>

              <Text style={[typography.body, { color: colors.mutedForeground, fontSize: typography.sizes.sm, textAlign: 'center', marginBottom: spacing.md }]}>
                {t('startCode.waitingForCustomer')}
              </Text>

              <View style={styles.digitsRow}>
                {digits.map((d, i) => (
                  <TextInput
                    key={i}
                    ref={digitRefs[i]}
                    value={d}
                    autoFocus={i === 0}
                    onChangeText={(v) => {
                      const c = v.replace(/[^0-9]/g, '').slice(-1);
                      const next = [...digits];
                      next[i] = c;
                      setDigits(next);
                      setCodeError('');
                      if (c && i < 3) setTimeout(() => digitRefs[i + 1].current?.focus(), 50);
                    }}
                    onKeyPress={({ nativeEvent }) => {
                      if (nativeEvent.key === 'Backspace' && !digits[i] && i > 0) {
                        const next = [...digits];
                        next[i - 1] = '';
                        setDigits(next);
                        setTimeout(() => digitRefs[i - 1].current?.focus(), 50);
                      }
                    }}
                    style={[
                      styles.digitBox,
                      {
                        borderColor: d ? colors.primary : colors.border,
                        backgroundColor: d ? colors.primary + '14' : colors.muted,
                        color: colors.foreground,
                      },
                    ]}
                    maxLength={1}
                    keyboardType="numeric"
                    selectTextOnFocus
                  />
                ))}
              </View>

              {codeError ? (
                <Text style={[typography.body, { color: colors.destructive, fontSize: typography.sizes.sm, textAlign: 'center', marginBottom: spacing.sm }]}>
                  {codeError}
                </Text>
              ) : null}

              <TouchableOpacity
                style={[
                  styles.verifyBtn,
                  { backgroundColor: digits.join('').length === 4 ? colors.primary : colors.muted },
                ]}
                onPress={handleVerifyCode}
                disabled={digits.join('').length < 4 || verifyLoading}
                activeOpacity={0.8}
              >
                {verifyLoading ? (
                  <ActivityIndicator size="small" color={colors.primaryForeground} />
                ) : (
                  <Text style={[typography.bodySemiBold, { color: digits.join('').length === 4 ? colors.primaryForeground : colors.mutedForeground }]}>
                    {t('startCode.verify')}
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setCodeSheet((p) => ({ ...p, visible: false }))}
                activeOpacity={0.8}
              >
                <Text style={[typography.body, { color: colors.mutedForeground }]}>
                  {t('startCode.cancel')}
                </Text>
              </TouchableOpacity>
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  calendarContainer: {
    borderBottomWidth: 1,
  },
  weekStrip: {
    flexDirection: 'row',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    justifyContent: 'space-around',
    alignItems: 'center',
    height: COLLAPSED_H,
  },
  dayCell: {
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    minWidth: 40,
    gap: 2,
  },
  dayAbbr: {
    fontSize: 10,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dayNum: {
    fontSize: 15,
  },
  dotSmall: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 1,
  },
  toggleBtn: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  list: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  empty: {
    alignItems: 'center',
    paddingTop: 60,
  },
  apptCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  timeCol: {
    alignItems: 'center',
    gap: 6,
    width: 48,
    paddingTop: 2,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  apptInfo: {
    flex: 1,
    gap: 3,
  },
  apptActions: {
    flexDirection: 'row',
    gap: spacing.xs,
    alignItems: 'center',
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Code sheet
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
  digitsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  digitBox: {
    width: 56,
    height: 72,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    fontSize: 32,
    fontWeight: '700',
    textAlign: 'center',
  },
  verifyBtn: {
    width: '100%',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  cancelBtn: {
    width: '100%',
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.xs,
  },
});
