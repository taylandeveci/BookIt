import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../lib/queryKeys';
import { useBackendNotificationSync } from '../../hooks/useBackendNotificationSync';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { RootStackParamList } from '../../navigation/RootNavigator';
import { appointmentService } from '../../services/appointmentService';
import { useAuthStore } from '../../store/authStore';
import { Appointment, Business, Service, Employee } from '../../types';
import { useTheme } from '../../theme/useTheme';
import {
  Card,
  Chip,
  Button,
  LoadingSpinner,
  EmptyState,
  Toast,
} from '../../components';
import { spacing, typography, borderRadius } from '../../theme/theme';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

type AppointmentWithDetails = Appointment & {
  business?: Business;
  service?: Service;
  employee?: Employee;
};

export const AppointmentsScreen: React.FC = () => {
  const { colors, shadows } = useTheme();
  const { t } = useTranslation();
  const navigation = useNavigation<NavigationProp>();
  const user = useAuthStore((state) => state.user);

  const queryClient = useQueryClient();
  const [tab, setTab] = useState<'active' | 'past'>('active');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const handleTabChange = (next: 'active' | 'past') => {
    setTab(next);
    setStatusFilter(null);
  };

  const { data: appointments = [], isLoading: loading } = useQuery({
    queryKey: queryKeys.bookings.customerAll,
    queryFn: async () => {
      const data = await appointmentService.getAppointments(user?.id);
      return Array.isArray(data) ? (data as AppointmentWithDetails[]) : [];
    },
    enabled: !!user,
    staleTime: 30000,
  });

  // Pick up cross-device booking status changes (e.g. business approves/cancels) in near-real-time
  useBackendNotificationSync([queryKeys.bookings.customerAll]);

  const isRefetchingRef = useRef(false);
  useFocusEffect(
    useCallback(() => {
      if (isRefetchingRef.current) return;
      isRefetchingRef.current = true;
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.customerAll })
        .finally(() => {
          isRefetchingRef.current = false;
        });
    }, [queryClient])
  );

  const handleCancelAppointment = (appointmentId: string) => {
    Alert.alert(
      t('appointments.cancel'),
      t('appointments.cancelConfirm'),
      [
        { text: t('common.no'), style: 'cancel' },
        {
          text: t('common.yes'),
          style: 'destructive',
          onPress: async () => {
            try {
              const apt = appointments.find((a) => a.id === appointmentId);
              const bookingDate = apt?.startTime ? apt.startTime.slice(0, 10) : '';
              await appointmentService.cancelAppointment(appointmentId);
              setToast({ message: t('appointments.cancelSuccess'), type: 'success' });
              queryClient.invalidateQueries({ queryKey: queryKeys.bookings.customerAll });
              queryClient.invalidateQueries({ queryKey: queryKeys.bookings.ownerAll });
              queryClient.invalidateQueries({ queryKey: queryKeys.bookings.employeeAll });
              if (bookingDate) {
                queryClient.invalidateQueries({ queryKey: queryKeys.bookings.employeeByDate(bookingDate) });
              }
              if (apt?.businessId) {
                queryClient.invalidateQueries({ queryKey: ['businesses', apt.businessId, 'timeSlots'] });
              }
            } catch (error: any) {
              setToast({ message: error.message || t('appointments.cancelError'), type: 'error' });
            }
          },
        },
      ]
    );
  };

  const handleWriteReview = (item: AppointmentWithDetails) => {
    navigation.navigate('Review', {
      appointmentId: item.id,
      businessId: item.businessId,
      businessName: item.business?.name,
      serviceName: item.service?.name,
      businessOwnerId: item.business?.ownerId,
    });
  };

  const isCancellable = (item: AppointmentWithDetails): boolean => {
    const startTime = item.startTime ? new Date(item.startTime) : null;
    if (!startTime) return true;
    const minutesUntilStart = (startTime.getTime() - Date.now()) / 60000;
    const windowMinutes = item.business?.cancellationWindowMinutes ?? 60;
    return minutesUntilStart > windowMinutes;
  };

  const getCancelDeadline = (item: AppointmentWithDetails): string | null => {
    const startTime = item.startTime ? new Date(item.startTime) : null;
    if (!startTime) return null;
    const windowMinutes = item.business?.cancellationWindowMinutes ?? 60;
    const deadline = new Date(startTime.getTime() - windowMinutes * 60000);
    return deadline.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };



  const getStatusLabel = (status: Appointment['status']): string => {
    if (status === 'IN_PROGRESS') return t('bookings.statusInProgress');
    if (status === 'APPROVED') return t('appointments.approved');
    if (status === 'PENDING') return t('appointments.pending');
    if (status === 'COMPLETED') return t('appointments.completed');
    if (status === 'CANCELLED') return t('appointments.cancelled');
    if (status === 'REJECTED') return t('appointments.rejected');
    if (status === 'NO_SHOW') return t('common.noShow');
    return status;
  };

  const getStatusColor = (status: Appointment['status']) => {
    switch (status) {
      case 'APPROVED':
      case 'IN_PROGRESS':
        return colors.success;
      case 'PENDING':
        return colors.warning;
      case 'REJECTED':
      case 'CANCELLED':
      case 'NO_SHOW':
        return colors.destructive;
      case 'COMPLETED':
        return colors.info;
      default:
        return colors.mutedForeground;
    }
  };

  const isInProgressExpired = (apt: AppointmentWithDetails): boolean => {
    if (apt.status !== 'IN_PROGRESS') return false;
    if (!apt.startTime) return false;
    const durationMin = apt.service?.durationMin ?? 0;
    const estimatedEnd = new Date(apt.startTime).getTime() + durationMin * 60000;
    return Date.now() > estimatedEnd;
  };

  const PENDING_EXPIRY_WARNING_MS = 2 * 60 * 60 * 1000;

  const isPendingPastDue = (apt: AppointmentWithDetails): boolean => {
    if (apt.status !== 'PENDING') return false;
    if (!apt.startTime) return false;
    return new Date(apt.startTime).getTime() < Date.now();
  };

  const isPendingExpiringSoon = (apt: AppointmentWithDetails): boolean => {
    if (apt.status !== 'PENDING') return false;
    if (!apt.startTime) return false;
    const start = new Date(apt.startTime).getTime();
    const now = Date.now();
    return start > now && start - now < PENDING_EXPIRY_WARNING_MS;
  };

  const filterAppointments = (): AppointmentWithDetails[] => {
    const q = search.trim().toLowerCase();
    const matchSearch = (apt: AppointmentWithDetails) =>
      !q ||
      apt.business?.name?.toLowerCase().includes(q) ||
      apt.service?.name?.toLowerCase().includes(q) ||
      apt.employee?.fullName?.toLowerCase().includes(q);

    const matchStatus = (apt: AppointmentWithDetails) => {
      if (!statusFilter) return true;
      if (statusFilter === 'IN_PROGRESS') return apt.status === 'IN_PROGRESS' && !isInProgressExpired(apt);
      if (statusFilter === 'PENDING') return apt.status === 'PENDING' && !isPendingPastDue(apt);
      return apt.status === statusFilter;
    };

    if (tab === 'active') {
      return appointments.filter(
        (apt) =>
          matchSearch(apt) &&
          matchStatus(apt) &&
          ((apt.status === 'PENDING' && !isPendingPastDue(apt)) ||
          apt.status === 'APPROVED' ||
          (apt.status === 'IN_PROGRESS' && !isInProgressExpired(apt)))
      );
    } else {
      return appointments.filter(
        (apt) =>
          matchSearch(apt) &&
          matchStatus(apt) &&
          (apt.status === 'COMPLETED' ||
          apt.status === 'CANCELLED' ||
          apt.status === 'REJECTED' ||
          apt.status === 'NO_SHOW' ||
          (apt.status === 'IN_PROGRESS' && isInProgressExpired(apt)) ||
          (apt.status === 'PENDING' && isPendingPastDue(apt)))
      );
    }
  };

  const renderAppointment = ({ item }: { item: AppointmentWithDetails }) => (
    <Card
      style={styles.appointmentCard}
      pressable
      onPress={() => navigation.navigate('AppointmentDetail', { appointmentId: item.id })}
    >
      <View style={styles.appointmentHeader}>
        <Text
          style={[
            styles.businessName,
            typography.headingSemiBold,
            { color: colors.foreground },
          ]}
        >
          {item.business?.name || t('appointments.unknownBusiness')}
        </Text>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(item.status) },
          ]}
        >
          <Text style={[styles.statusText, typography.bodySemiBold]}>
            {getStatusLabel(item.status)}
          </Text>
        </View>
      </View>

      <Text
        style={[
          styles.serviceText,
          typography.body,
          { color: colors.mutedForeground },
        ]}
      >
        {t('appointments.service')}: {item.service?.name || t('appointments.unknownService')}
      </Text>

      <Text
        style={[
          styles.employeeText,
          typography.body,
          { color: colors.mutedForeground },
        ]}
      >
        {t('appointments.staff')}: {item.employee?.fullName || t('appointments.unknownStaff')}
      </Text>

      <Text
        style={[
          styles.dateText,
          typography.bodySemiBold,
          { color: colors.foreground },
        ]}
      >
        {new Date(item.date || item.startTime || '').toLocaleDateString()} {t('time.at')} {item.timeSlot || (item.startTime ? new Date(item.startTime).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'}) : 'TBD')}
      </Text>

      {isPendingExpiringSoon(item) && (
        <View style={styles.expiringSoonRow}>
          <Ionicons name="time-outline" size={12} color={colors.secondary} />
          <Text style={[typography.body, { fontSize: typography.sizes.xs, color: colors.secondary }]}>
            {t('common.expiringSoon')}
          </Text>
        </View>
      )}


      {item.rejectionReason && (
        <Text
          style={[
            styles.rejectionReason,
            typography.body,
            { color: colors.destructive },
          ]}
        >
          {t('appointments.reason')}: {item.rejectionReason}
        </Text>
      )}

      {item.status === 'CANCELLED' && item.cancellationReason === 'auto_expired' && (
        <Text style={[typography.body, { fontSize: typography.sizes.xs, color: colors.mutedForeground, marginTop: spacing.xs, fontStyle: 'italic' }]}>
          {t('appointments.expiredNote')}
        </Text>
      )}


      <View style={styles.appointmentActions}>
        {(item.status === 'PENDING' || item.status === 'APPROVED') && isCancellable(item) && (
          <View style={{ flex: 1 }}>
            <Button
              title={t('common.cancel')}
              variant="destructive"
              size="sm"
              onPress={() => handleCancelAppointment(item.id)}
            />
            {getCancelDeadline(item) && (
              <Text style={[typography.body, { fontSize: typography.sizes.xs, color: colors.mutedForeground, marginTop: spacing.xs }]}>
                {t('appointments.cancelUntil', { time: getCancelDeadline(item) })}
              </Text>
            )}
          </View>
        )}

        {item.status === 'COMPLETED' && (
          item.review ? (
            <View style={styles.reviewSubmittedRow}>
              <Ionicons name="checkmark-circle" size={14} color={colors.mutedForeground} />
              <Text style={[typography.body, { fontSize: typography.sizes.xs, color: colors.mutedForeground, marginLeft: 4 }]}>
                {t('appointments.reviewSubmitted')}
              </Text>
            </View>
          ) : (
            <Button
              title={t('appointments.writeReview')}
              variant="outline"
              size="sm"
              onPress={() => handleWriteReview(item)}
              style={styles.reviewButton}
            />
          )
        )}
      </View>
    </Card>
  );

  if (!user) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
        <EmptyState
          title={t('appointments.loginRequired')}
          description={t('appointments.loginToView')}
        />
        <View style={styles.loginButton}>
          <Button
            title={t('common.goToLogin')}
            onPress={() => navigation.navigate('Auth')}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onHide={() => setToast(null)}
        />
      )}

      <View style={[styles.headerBlock, { borderBottomColor: colors.border }]}>
        {/* Tab seçici */}
        <View style={styles.tabSelector}>
          <Chip
            label={t('appointments.active')}
            selected={tab === 'active'}
            onPress={() => handleTabChange('active')}
            variant="primary"
          />
          <Chip
            label={t('appointments.past')}
            selected={tab === 'past'}
            onPress={() => handleTabChange('past')}
            variant="primary"
          />
        </View>

        {/* Arama */}
        <View style={[styles.searchRow, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: borderRadius.pill }, shadows.sm]}>
          <Ionicons name="search-outline" size={16} color={colors.mutedForeground} />
          <TextInput
            style={[styles.searchInput, typography.body, { color: colors.foreground }]}
            placeholder={t('appointments.search')}
            placeholderTextColor={colors.placeholder}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
        </View>

        {/* Durum filtreleri */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {(tab === 'active'
            ? [
                { key: null, label: t('common.all'), color: colors.primary },
                { key: 'PENDING', label: t('appointments.pending'), color: colors.warning },
                { key: 'APPROVED', label: t('appointments.approved'), color: colors.success },
                { key: 'IN_PROGRESS', label: t('bookings.statusInProgress'), color: colors.info },
              ]
            : [
                { key: null, label: t('common.all'), color: colors.primary },
                { key: 'COMPLETED', label: t('appointments.completed'), color: colors.info },
                { key: 'CANCELLED', label: t('appointments.cancelled'), color: colors.mutedForeground },
                { key: 'REJECTED', label: t('appointments.rejected'), color: colors.destructive },
                { key: 'NO_SHOW', label: t('common.noShow'), color: colors.destructive },
              ]
          ).map(({ key, label, color }) => {
            const selected = statusFilter === key;
            return (
              <TouchableOpacity
                key={String(key)}
                onPress={() => setStatusFilter(key)}
                activeOpacity={0.7}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: selected ? color : colors.muted,
                    borderColor: selected ? color : color + '40',
                  },
                ]}
              >
                <Text
                  style={[
                    typography.bodySemiBold,
                    styles.filterChipText,
                    { color: selected ? '#FFFFFF' : color },
                  ]}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {loading ? (
        <LoadingSpinner />
      ) : filterAppointments().length === 0 ? (
        <EmptyState
          title={t('appointments.noAppointments')}
          description={
            tab === 'active'
              ? t('appointments.bookFirst')
              : t('appointments.noPast')
          }
        />
      ) : (
        <FlatList
          data={filterAppointments()}
          renderItem={renderAppointment}
          keyExtractor={(item) => item.id}
          removeClippedSubviews
          maxToRenderPerBatch={10}
          windowSize={5}
          initialNumToRender={6}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerBlock: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingBottom: spacing.sm,
  },
  tabSelector: {
    flexDirection: 'row',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.xl,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    padding: 0,
  },
  filterRow: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xs,
    gap: spacing.sm,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.pill,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: typography.sizes.sm,
  },
  list: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
  },
  appointmentCard: {
    marginBottom: spacing.lg,
  },
  appointmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  businessName: {
    fontSize: typography.sizes.md,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 12,
  },
  statusText: {
    fontSize: typography.sizes.xs,
    color: '#FFFFFF',
  },
  serviceText: {
    fontSize: typography.sizes.sm,
    marginBottom: spacing.xs,
  },
  employeeText: {
    fontSize: typography.sizes.sm,
    marginBottom: spacing.sm,
  },
  dateText: {
    fontSize: typography.sizes.md,
    marginBottom: spacing.sm,
  },
  rejectionReason: {
    fontSize: typography.sizes.sm,
    marginTop: spacing.sm,
    fontStyle: 'italic',
  },
  appointmentActions: {
    flexDirection: 'row',
    marginTop: spacing.md,
  },
  loginButton: {
    padding: spacing.xl,
  },
  expiringSoonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: spacing.xs,
  },
  reviewButton: {
    alignSelf: 'flex-start',
  },
  reviewSubmittedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
});
