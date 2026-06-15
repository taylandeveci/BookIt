import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput as RNTextInput,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../lib/queryKeys';
import { useTranslation } from 'react-i18next';
import { ownerService } from '../../services/ownerService';
import { useAuthStore } from '../../store/authStore';
import { Appointment, PendingEmployee, Business } from '../../types';
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
import { formatCurrency } from '../../lib/formatCurrency';
import { useNotificationStore } from '../../store/notificationStore';
import { useBackendNotificationSync } from '../../hooks/useBackendNotificationSync';

type TabType = 'pending' | 'approved' | 'rejected' | 'staff';

// Extended type to hold included relations
type AppointmentWithDetails = Appointment & {
  customer?: { id: string; fullName: string; email?: string };
  employee?: { id: string; fullName: string };
  service?: { id: string; name: string; price: number; durationMin: number };
};

export const RequestsScreen: React.FC = () => {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const addNotification = useNotificationStore((s) => s.addNotification);

  const [tab, setTab] = useState<TabType>('pending');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [staffActionLoading, setStaffActionLoading] = useState<string | null>(null);
  const [rejectionModal, setRejectionModal] = useState<{
    visible: boolean;
    appointmentId: string | null;
  }>({ visible: false, appointmentId: null });
  const [rejectionReason, setRejectionReason] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const { data: appointmentsData, isLoading: loading } = useQuery({
    queryKey: queryKeys.bookings.ownerAll,
    queryFn: async () => {
      const [data, biz] = await Promise.all([
        ownerService.getOwnerAppointments(),
        ownerService.getBusiness(),
      ]);
      return { appointments: Array.isArray(data) ? (data as AppointmentWithDetails[]) : [], business: biz };
    },
    enabled: !!user,
    staleTime: 30000,
  });

  const appointments = appointmentsData?.appointments ?? [];
  const business = appointmentsData?.business ?? null;

  const { data: pendingEmployees = [], isLoading: staffLoading } = useQuery({
    queryKey: queryKeys.employees.pending,
    queryFn: async () => {
      const data = await ownerService.getPendingEmployees();
      return Array.isArray(data) ? data : [];
    },
    enabled: !!user,
    staleTime: 30000,
  });

  const isRefetchingRef = useRef(false);

  useFocusEffect(
    useCallback(() => {
      if (isRefetchingRef.current) return;
      isRefetchingRef.current = true;
      Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.bookings.ownerAll }),
        queryClient.invalidateQueries({ queryKey: queryKeys.employees.pending }),
      ]).finally(() => {
        isRefetchingRef.current = false;
      });
    }, [queryClient])
  );

  // Cross-device: pick up new booking requests created from another device.
  useBackendNotificationSync([queryKeys.bookings.ownerAll]);

  const handleApprove = async (appointmentId: string) => {
    Alert.alert(
      t('requests.approveRequest'),
      t('requests.approveConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('requests.approve'),
          onPress: async () => {
            try {
              setActionLoading(appointmentId);
              await ownerService.approveAppointment(appointmentId);
              setToast({ message: t('requests.approveSuccess'), type: 'success' });
              queryClient.invalidateQueries({ queryKey: queryKeys.bookings.ownerAll });
              queryClient.invalidateQueries({ queryKey: queryKeys.bookings.customerAll });
              queryClient.invalidateQueries({ queryKey: queryKeys.bookings.employeeAll });
              const apt = appointments.find((a) => a.id === appointmentId);
              if (apt) {
                const dateStr = apt.startTime
                  ? new Date(apt.startTime).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }) + ' · ' + new Date(apt.startTime).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
                  : '';
                addNotification({ type: 'booking_confirmed', title: t('notifications.bookingConfirmed'), body: `${business?.name ?? ''} — ${dateStr}`, userId: apt.customerId ?? '' });
              }
            } catch (error: any) {
              setToast({ message: error.message || t('requests.approveError'), type: 'error' });
            } finally {
              setActionLoading(null);
            }
          },
        },
      ]
    );
  };

  const handleReject = (appointmentId: string) => {
    setRejectionModal({ visible: true, appointmentId });
  };

  const confirmReject = async () => {
    if (!rejectionModal.appointmentId) return;

    if (!rejectionReason.trim()) {
      Alert.alert(t('common.error'), t('requests.rejectionReasonRequired'));
      return;
    }

    try {
      setActionLoading(rejectionModal.appointmentId);
      await ownerService.rejectAppointment(rejectionModal.appointmentId, rejectionReason);
      setToast({ message: t('requests.rejectSuccess'), type: 'success' });
      const rejectedApt = appointments.find((a) => a.id === rejectionModal.appointmentId);
      setRejectionModal({ visible: false, appointmentId: null });
      setRejectionReason('');
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.ownerAll });
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.customerAll });
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.employeeAll });
      if (rejectedApt) {
        const dateStr = rejectedApt.startTime
          ? new Date(rejectedApt.startTime).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }) + ' — ' + (business?.name ?? '')
          : business?.name ?? '';
        addNotification({ type: 'booking_cancelled', title: t('notifications.bookingCancelled'), body: dateStr, userId: rejectedApt.customerId ?? '' });
      }
    } catch (error: any) {
      setToast({ message: error.message || t('requests.rejectError'), type: 'error' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleComplete = async (appointmentId: string) => {
    Alert.alert(
      t('requests.markCompleted'),
      t('requests.markCompleted') + '?',
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('requests.complete'),
          onPress: async () => {
            try {
              setActionLoading(appointmentId);
              await ownerService.completeAppointment(appointmentId);
              setToast({ message: t('requests.approveSuccess'), type: 'success' });
              queryClient.invalidateQueries({ queryKey: queryKeys.bookings.ownerAll });
              queryClient.invalidateQueries({ queryKey: queryKeys.bookings.customerAll });
              queryClient.invalidateQueries({ queryKey: queryKeys.bookings.employeeAll });
              queryClient.invalidateQueries({ queryKey: ['owner', 'dashboard'] });
            } catch (error: any) {
              setToast({ message: error.message || t('requests.updateError'), type: 'error' });
            } finally {
              setActionLoading(null);
            }
          },
        },
      ]
    );
  };

  const handleStaffAction = async (id: string, action: 'approve' | 'reject') => {
    setStaffActionLoading(id + action);
    try {
      if (action === 'approve') {
        await ownerService.approveEmployee(id);
        queryClient.invalidateQueries({ queryKey: queryKeys.employees.pending });
        if (business?.id) {
          queryClient.invalidateQueries({ queryKey: queryKeys.employees.forBusiness(business.id) });
          queryClient.invalidateQueries({ queryKey: queryKeys.businesses.employees(business.id) });
        }
        queryClient.invalidateQueries({ queryKey: ['owner', 'dashboard'] });
      } else {
        await ownerService.rejectEmployee(id);
        queryClient.invalidateQueries({ queryKey: queryKeys.employees.pending });
        if (business?.id) {
          queryClient.invalidateQueries({ queryKey: queryKeys.employees.forBusiness(business.id) });
        }
      }
      setToast({ message: action === 'approve' ? t('employees.approveSuccess') : t('employees.rejectSuccess'), type: 'success' });
      const emp = pendingEmployees.find((e) => e.id === id);
      const empUserId = (emp as any)?.userId ?? (emp as any)?.user?.id ?? '';
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
      setStaffActionLoading(null);
    }
  };

  const isPendingExpired = (apt: AppointmentWithDetails): boolean => {
    if (!apt.createdAt) return false;
    const ttlHours = business?.pendingBookingTTLHours ?? 24;
    return Date.now() > new Date(apt.createdAt).getTime() + ttlHours * 3600000;
  };

  const getPendingExpiryLabel = (apt: AppointmentWithDetails): string | null => {
    if (!apt.createdAt) return null;
    const ttlHours = business?.pendingBookingTTLHours ?? 24;
    const expiry = new Date(new Date(apt.createdAt).getTime() + ttlHours * 3600000);
    return expiry.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const PENDING_APPOINTMENT_WARNING_MS = 2 * 60 * 60 * 1000;

  const isPendingAppointmentPastDue = (apt: AppointmentWithDetails): boolean => {
    if (apt.status !== 'PENDING') return false;
    if (!apt.startTime) return false;
    return new Date(apt.startTime).getTime() < Date.now();
  };

  const isPendingExpiringSoon = (apt: AppointmentWithDetails): boolean => {
    if (apt.status !== 'PENDING') return false;
    if (!apt.startTime) return false;
    const start = new Date(apt.startTime).getTime();
    const now = Date.now();
    return start > now && start - now < PENDING_APPOINTMENT_WARNING_MS;
  };

  const filterAppointments = (): AppointmentWithDetails[] => {
    switch (tab) {
      case 'pending':
        return appointments.filter(
          (apt) => apt.status === 'PENDING' && !isPendingExpired(apt) && !isPendingAppointmentPastDue(apt)
        );
      case 'approved':
        return appointments.filter((apt) => apt.status === 'APPROVED');
      case 'rejected':
        return appointments.filter(
          (apt) => apt.status === 'REJECTED' || apt.status === 'CANCELLED'
        );
      default:
        return [];
    }
  };

  const renderAppointment = ({ item }: { item: AppointmentWithDetails }) => {
    const isLoading = actionLoading === item.id;
    const displayDate = item.startTime
      ? new Date(item.startTime).toLocaleDateString()
      : t('requests.dateNotSet');
    const displayTime = item.startTime
      ? new Date(item.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : t('requests.timeNotSet');

    return (
      <Card style={styles.appointmentCard}>
        <View style={styles.appointmentHeader}>
          <Text style={[styles.date, typography.headingSemiBold, { color: colors.foreground }]}>
            {displayDate}
          </Text>
          <Text style={[styles.time, typography.bodySemiBold, { color: colors.primary }]}>
            {displayTime}
          </Text>
        </View>

        {/* Service details */}
        {item.service && (
          <View style={styles.serviceRow}>
            <Ionicons name="cut-outline" size={14} color={colors.mutedForeground} />
            <Text style={[styles.serviceText, typography.bodySemiBold, { color: colors.foreground }]}>
              {item.service.name}
            </Text>
            <Text style={[styles.durationText, typography.body, { color: colors.mutedForeground }]}>
              {item.service.durationMin} {t('common.min')}
            </Text>
            <Text style={[styles.priceText, typography.bodySemiBold, { color: colors.primary }]}>
              {formatCurrency(Number(item.service.price))}
            </Text>
          </View>
        )}

        {/* Employee */}
        {item.employee && (
          <View style={styles.metaRow}>
            <Ionicons name="person-outline" size={14} color={colors.mutedForeground} />
            <Text style={[styles.metaText, typography.body, { color: colors.mutedForeground }]}>
              {item.employee.fullName}
            </Text>
          </View>
        )}

        {/* Customer */}
        {item.customer && (
          <View style={styles.metaRow}>
            <Ionicons name="person-circle-outline" size={14} color={colors.mutedForeground} />
            <Text style={[styles.metaText, typography.body, { color: colors.mutedForeground }]}>
              {item.customer.fullName}
            </Text>
          </View>
        )}

        {item.rejectionReason && (
          <Text style={[styles.rejectionReason, typography.body, { color: colors.destructive }]}>
            {t('appointments.reason')}: {item.rejectionReason}
          </Text>
        )}

        {item.status === 'PENDING' && (() => {
          const expiresAt = getPendingExpiryLabel(item);
          return expiresAt ? (
            <Text style={[typography.body, { fontSize: typography.sizes.xs, color: colors.warning, marginTop: spacing.xs }]}>
              {t('requests.expiresAt', { time: expiresAt })}
            </Text>
          ) : null;
        })()}

        {isPendingExpiringSoon(item) && (
          <View style={styles.expiringSoonRow}>
            <Ionicons name="time-outline" size={12} color={colors.secondary} />
            <Text style={[typography.body, { fontSize: typography.sizes.xs, color: colors.secondary }]}>
              {t('common.expiringSoon')}
            </Text>
          </View>
        )}

        <View style={styles.actions}>
          {item.status === 'PENDING' && (
            <>
              <Button
                title={t('requests.approve')}
                variant="primary"
                size="sm"
                onPress={() => handleApprove(item.id)}
                loading={isLoading}
                style={styles.actionButton}
              />
              <Button
                title={t('requests.reject')}
                variant="destructive"
                size="sm"
                onPress={() => handleReject(item.id)}
                disabled={isLoading}
                style={styles.actionButton}
              />
            </>
          )}

          {item.status === 'APPROVED' && (
            <Button
              title={t('requests.markCompleted')}
              variant="secondary"
              size="sm"
              onPress={() => handleComplete(item.id)}
              loading={isLoading}
            />
          )}
        </View>
      </Card>
    );
  };

  const renderStaffRequest = ({ item }: { item: PendingEmployee }) => (
    <Card style={styles.appointmentCard}>
      <View style={styles.appointmentHeader}>
        <View style={{ flex: 1 }}>
          <Text style={[typography.headingSemiBold, { color: colors.foreground }]}>
            {item.fullName}
          </Text>
          {item.specialization ? (
            <Text style={[typography.body, { color: colors.mutedForeground, fontSize: 13 }]}>
              {item.specialization}
            </Text>
          ) : null}
          {item.user?.email ? (
            <Text style={[typography.body, { color: colors.mutedForeground, fontSize: 12 }]}>
              {item.user.email}
            </Text>
          ) : null}
        </View>
        <View style={[styles.staffBadge, { backgroundColor: colors.warning + '22' }]}>
          <Text style={[typography.bodySemiBold, { color: colors.warning, fontSize: 11 }]}>
            {t('common.pending').toUpperCase()}
          </Text>
        </View>
      </View>

      <Text style={[typography.body, { color: colors.mutedForeground, fontSize: 12, marginBottom: spacing.md }]}>
        {t('requests.requestedOn', { date: new Date(item.createdAt).toLocaleDateString() })}
      </Text>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.staffBtn, { backgroundColor: colors.primary }]}
          onPress={() => handleStaffAction(item.id, 'approve')}
          disabled={!!staffActionLoading}
          activeOpacity={0.8}
        >
          {staffActionLoading === item.id + 'approve' ? (
            <ActivityIndicator size="small" color={colors.primaryForeground} />
          ) : (
            <Text style={styles.staffBtnText}>{t('employees.approve')}</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.staffBtn, { backgroundColor: colors.destructive }]}
          onPress={() => handleStaffAction(item.id, 'reject')}
          disabled={!!staffActionLoading}
          activeOpacity={0.8}
        >
          {staffActionLoading === item.id + 'reject' ? (
            <ActivityIndicator size="small" color={colors.primaryForeground} />
          ) : (
            <Text style={styles.staffBtnText}>{t('employees.reject')}</Text>
          )}
        </TouchableOpacity>
      </View>
    </Card>
  );

  const staffBadgeCount = pendingEmployees.length > 0 ? ` (${pendingEmployees.length})` : '';

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onHide={() => setToast(null)}
        />
      )}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabScroll}
        contentContainerStyle={styles.tabSelector}
      >
        <Chip label={t('requests.pending')} selected={tab === 'pending'} onPress={() => setTab('pending')} variant="primary" />
        <Chip label={t('requests.approved')} selected={tab === 'approved'} onPress={() => setTab('approved')} variant="primary" />
        <Chip label={t('requests.rejected')} selected={tab === 'rejected'} onPress={() => setTab('rejected')} variant="primary" />
        <Chip label={`${t('requests.staff')}${staffBadgeCount}`} selected={tab === 'staff'} onPress={() => setTab('staff')} variant="primary" />
      </ScrollView>

      {tab === 'staff' ? (
        staffLoading ? (
          <LoadingSpinner />
        ) : pendingEmployees.length === 0 ? (
          <EmptyState
            icon="people"
            title={t('requests.noStaffRequests')}
            description={t('requests.noStaffRequestsDesc')}
          />
        ) : (
          <FlatList
            data={pendingEmployees}
            renderItem={renderStaffRequest}
            keyExtractor={(item) => item.id}
            removeClippedSubviews
            maxToRenderPerBatch={10}
            windowSize={5}
            initialNumToRender={6}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
          />
        )
      ) : loading ? (
        <LoadingSpinner />
      ) : filterAppointments().length === 0 ? (
        <EmptyState
          icon="mail"
          title={t('requests.noRequests')}
          description={t('requests.noRequests')}
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

      <Modal
        visible={rejectionModal.visible}
        transparent
        animationType="fade"
        onRequestClose={() => setRejectionModal({ visible: false, appointmentId: null })}
      >
        <View style={styles.modalOverlay}>
          <Card style={styles.modalCard}>
            <Text style={[styles.modalTitle, typography.headingSemiBold, { color: colors.foreground }]}>
              {t('requests.rejectConfirm')}
            </Text>

            <Text style={[styles.modalLabel, typography.body, { color: colors.mutedForeground }]}>
              {t('requests.rejectConfirm')}
            </Text>

            <RNTextInput
              style={[
                styles.modalInput,
                typography.body,
                {
                  backgroundColor: colors.input,
                  borderColor: colors.inputBorder,
                  color: colors.foreground,
                  borderRadius: borderRadius.lg,
                },
              ]}
              placeholder={t('requests.rejectionPlaceholder')}
              placeholderTextColor={colors.placeholder}
              value={rejectionReason}
              onChangeText={setRejectionReason}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />

            <View style={styles.modalActions}>
              <Button
                title={t('common.cancel')}
                variant="outline"
                size="sm"
                onPress={() => {
                  setRejectionModal({ visible: false, appointmentId: null });
                  setRejectionReason('');
                }}
                style={styles.modalButton}
              />
              <Button
                title={t('requests.reject')}
                variant="destructive"
                size="sm"
                onPress={confirmReject}
                loading={!!actionLoading}
                style={styles.modalButton}
              />
            </View>
          </Card>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabScroll: {
    flexGrow: 0,
    flexShrink: 0,
    minHeight: 68,
  },
  tabSelector: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    gap: spacing.sm,
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
  date: {
    fontSize: typography.sizes.md,
  },
  time: {
    fontSize: typography.sizes.md,
  },
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  serviceText: {
    fontSize: typography.sizes.sm,
    flex: 1,
  },
  durationText: {
    fontSize: typography.sizes.xs,
  },
  priceText: {
    fontSize: typography.sizes.sm,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: 2,
  },
  expiringSoonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: spacing.xs,
  },
  metaText: {
    fontSize: typography.sizes.sm,
  },
  rejectionReason: {
    fontSize: typography.sizes.sm,
    marginTop: spacing.sm,
    fontStyle: 'italic',
  },
  actions: {
    flexDirection: 'row',
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  actionButton: {
    flex: 1,
  },
  staffBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.md,
  },
  staffBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 36,
  },
  staffBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  modalCard: {
    width: '100%',
    maxWidth: 400,
    padding: spacing.xl,
  },
  modalTitle: {
    fontSize: typography.sizes.lg,
    marginBottom: spacing.md,
  },
  modalLabel: {
    fontSize: typography.sizes.sm,
    marginBottom: spacing.sm,
  },
  modalInput: {
    borderWidth: 1,
    padding: spacing.lg,
    fontSize: typography.sizes.md,
    minHeight: 80,
    marginBottom: spacing.lg,
  },
  modalActions: {
    flexDirection: 'row',
  },
  modalButton: {
    flex: 1,
    marginHorizontal: spacing.xs,
  },
});
