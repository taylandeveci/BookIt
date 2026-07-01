import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/RootNavigator';
import { useTheme } from '../../theme/useTheme';
import { spacing, typography, borderRadius } from '../../theme/theme';
import { appointmentService } from '../../services/appointmentService';
import { queryKeys } from '../../lib/queryKeys';
import { Button, LoadingSpinner, Toast } from '../../components';
import { Appointment, Business, Service, Employee } from '../../types';

type RouteProps = RouteProp<RootStackParamList, 'AppointmentDetail'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type AppointmentWithDetails = Appointment & {
  business?: Business;
  service?: Service;
  employee?: Employee;
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('tr-TR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
}

function addMinutes(iso: string, min: number): string {
  return new Date(new Date(iso).getTime() + min * 60000).toLocaleTimeString('tr-TR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export const AppointmentDetailScreen: React.FC = () => {
  const { colors, shadows } = useTheme();
  const { t } = useTranslation();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const queryClient = useQueryClient();
  const { appointmentId } = route.params;

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Try cache first, then fetch
  const cached = (queryClient.getQueryData<AppointmentWithDetails[]>(
    queryKeys.bookings.customerAll
  ) ?? []).find((a) => a.id === appointmentId);

  const { data: apt, isLoading } = useQuery<AppointmentWithDetails>({
    queryKey: ['appointment', appointmentId],
    queryFn: () => appointmentService.getAppointmentById(appointmentId) as Promise<AppointmentWithDetails>,
    initialData: cached,
    staleTime: 30_000,
  });

  const handleCancel = () => {
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
              await appointmentService.cancelAppointment(appointmentId);
              queryClient.invalidateQueries({ queryKey: queryKeys.bookings.customerAll });
              setToast({ message: t('appointments.cancelSuccess'), type: 'success' });
              setTimeout(() => navigation.goBack(), 1200);
            } catch (err: any) {
              setToast({ message: err.message || t('appointments.cancelError'), type: 'error' });
            }
          },
        },
      ]
    );
  };

  const handleOpenMap = (address: string) => {
    const query = encodeURIComponent(address);
    Linking.openURL(`https://maps.google.com/?q=${query}`).catch(() => {});
  };

  const handleWriteReview = () => {
    if (!apt) return;
    navigation.navigate('Review', {
      appointmentId: apt.id,
      businessId: apt.businessId,
      businessName: apt.business?.name,
      serviceName: apt.service?.name,
      businessOwnerId: apt.business?.ownerId,
    });
  };

  const isCancellable = (): boolean => {
    if (!apt) return false;
    if (apt.status !== 'PENDING' && apt.status !== 'APPROVED') return false;
    const startTime = apt.startTime ? new Date(apt.startTime) : null;
    if (!startTime) return true;
    const windowMin = apt.business?.cancellationWindowMinutes ?? 60;
    return (startTime.getTime() - Date.now()) / 60000 >= windowMin;
  };

  const cancelDeadline = (): string | null => {
    if (!apt?.startTime) return null;
    const windowMin = apt.business?.cancellationWindowMinutes ?? 60;
    const deadline = new Date(new Date(apt.startTime).getTime() - windowMin * 60000);
    return deadline.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED':
      case 'IN_PROGRESS': return colors.success;
      case 'PENDING': return colors.warning;
      case 'COMPLETED': return colors.info;
      case 'REJECTED':
      case 'CANCELLED':
      case 'NO_SHOW': return colors.destructive;
      default: return colors.mutedForeground;
    }
  };

  const getStatusLabel = (status: string): string => {
    if (status === 'APPROVED') return t('appointments.approved');
    if (status === 'PENDING') return t('appointments.pending');
    if (status === 'COMPLETED') return t('appointments.completed');
    if (status === 'CANCELLED') return t('appointments.cancelled');
    if (status === 'REJECTED') return t('appointments.rejected');
    if (status === 'IN_PROGRESS') return t('bookings.statusInProgress');
    if (status === 'NO_SHOW') return t('common.noShow');
    return status;
  };

  if (isLoading && !apt) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="chevron-back" size={24} color={colors.primary} />
          </TouchableOpacity>
          <Text style={[typography.heading, { color: colors.foreground, fontSize: typography.sizes.xl }]}>
            {t('appointmentDetail.title')}
          </Text>
          <View style={{ width: 32 }} />
        </View>
        <LoadingSpinner />
      </SafeAreaView>
    );
  }

  if (!apt) return null;

  const startIso = apt.startTime ?? '';
  const statusColor = getStatusColor(apt.status);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      {toast && <Toast message={toast.message} type={toast.type} onHide={() => setToast(null)} />}

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="chevron-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[typography.heading, { color: colors.foreground, fontSize: typography.sizes.xl }]}>
          {t('appointmentDetail.title')}
        </Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Status banner */}
        <View style={[styles.statusBanner, { backgroundColor: statusColor + '18', borderColor: statusColor + '55' }]}>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <Text style={[typography.bodySemiBold, { color: statusColor, fontSize: typography.sizes.md }]}>
            {getStatusLabel(apt.status)}
          </Text>
        </View>

        {/* İşletme */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }, shadows.sm]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="storefront-outline" size={18} color={colors.primary} />
            <Text style={[typography.bodySemiBold, styles.sectionTitle, { color: colors.mutedForeground }]}>
              {t('appointmentDetail.business')}
            </Text>
          </View>
          <Text style={[typography.heading, { color: colors.foreground, fontSize: typography.sizes.lg }]}>
            {apt.business?.name ?? '—'}
          </Text>
          {apt.business?.address ? (
            <TouchableOpacity
              style={styles.addressRow}
              onPress={() => handleOpenMap(apt.business!.address!)}
              activeOpacity={0.7}
            >
              <Ionicons name="location-outline" size={14} color={colors.primary} />
              <Text style={[typography.body, { color: colors.primary, fontSize: typography.sizes.sm, flex: 1 }]}>
                {apt.business.address}
              </Text>
              <Ionicons name="open-outline" size={14} color={colors.primary} />
            </TouchableOpacity>
          ) : null}
          {apt.business?.phone ? (
            <TouchableOpacity
              style={styles.addressRow}
              onPress={() => Linking.openURL(`tel:${apt.business!.phone}`)}
              activeOpacity={0.7}
            >
              <Ionicons name="call-outline" size={14} color={colors.mutedForeground} />
              <Text style={[typography.body, { color: colors.mutedForeground, fontSize: typography.sizes.sm }]}>
                {apt.business.phone}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Tarih & Saat */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }, shadows.sm]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="calendar-outline" size={18} color={colors.primary} />
            <Text style={[typography.bodySemiBold, styles.sectionTitle, { color: colors.mutedForeground }]}>
              {t('appointmentDetail.dateTime')}
            </Text>
          </View>
          {startIso ? (
            <>
              <Text style={[typography.heading, { color: colors.foreground, fontSize: typography.sizes.lg }]}>
                {formatDate(startIso)}
              </Text>
              <Text style={[typography.body, { color: colors.mutedForeground, marginTop: spacing.xs }]}>
                {formatTime(startIso)}
                {apt.service?.durationMin ? ` — ${addMinutes(startIso, apt.service.durationMin)}` : ''}
              </Text>
            </>
          ) : null}
        </View>

        {/* Hizmet */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }, shadows.sm]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="cut-outline" size={18} color={colors.primary} />
            <Text style={[typography.bodySemiBold, styles.sectionTitle, { color: colors.mutedForeground }]}>
              {t('appointmentDetail.service')}
            </Text>
          </View>
          <Text style={[typography.heading, { color: colors.foreground, fontSize: typography.sizes.lg }]}>
            {apt.service?.name ?? '—'}
          </Text>
          <View style={styles.metaRow}>
            {apt.service?.durationMin ? (
              <View style={styles.metaChip}>
                <Ionicons name="time-outline" size={13} color={colors.mutedForeground} />
                <Text style={[typography.body, { color: colors.mutedForeground, fontSize: typography.sizes.sm }]}>
                  {apt.service.durationMin} {t('common.min')}
                </Text>
              </View>
            ) : null}
            {apt.service?.price != null ? (
              <View style={styles.metaChip}>
                <Ionicons name="pricetag-outline" size={13} color={colors.mutedForeground} />
                <Text style={[typography.body, { color: colors.mutedForeground, fontSize: typography.sizes.sm }]}>
                  ₺{apt.service.price}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Çalışan */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }, shadows.sm]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="person-outline" size={18} color={colors.primary} />
            <Text style={[typography.bodySemiBold, styles.sectionTitle, { color: colors.mutedForeground }]}>
              {t('appointmentDetail.employee')}
            </Text>
          </View>
          <Text style={[typography.heading, { color: colors.foreground, fontSize: typography.sizes.lg }]}>
            {apt.employee?.fullName ?? '—'}
          </Text>
          {apt.employee?.specialization ? (
            <Text style={[typography.body, { color: colors.mutedForeground, marginTop: spacing.xs }]}>
              {apt.employee.specialization}
            </Text>
          ) : null}
        </View>

        {/* İptal bilgisi */}
        {isCancellable() && cancelDeadline() ? (
          <View style={[styles.infoRow, { backgroundColor: colors.muted, borderRadius: borderRadius.md }]}>
            <Ionicons name="information-circle-outline" size={15} color={colors.mutedForeground} />
            <Text style={[typography.body, { color: colors.mutedForeground, fontSize: typography.sizes.sm, flex: 1 }]}>
              {t('appointments.cancelUntil', { time: cancelDeadline() })}
            </Text>
          </View>
        ) : null}

        {/* Reddedilme sebebi */}
        {apt.rejectionReason ? (
          <View style={[styles.infoRow, { backgroundColor: colors.destructive + '15', borderRadius: borderRadius.md }]}>
            <Ionicons name="close-circle-outline" size={15} color={colors.destructive} />
            <Text style={[typography.body, { color: colors.destructive, fontSize: typography.sizes.sm, flex: 1 }]}>
              {t('appointments.reason')}: {apt.rejectionReason}
            </Text>
          </View>
        ) : null}

        {/* Aksiyonlar */}
        <View style={styles.actions}>
          {isCancellable() && (
            <Button
              title={t('appointments.cancel')}
              variant="destructive"
              onPress={handleCancel}
            />
          )}
          {apt.status === 'COMPLETED' && !apt.review && (
            <Button
              title={t('appointments.writeReview')}
              variant="outline"
              onPress={handleWriteReview}
            />
          )}
          {apt.status === 'COMPLETED' && apt.review && (
            <View style={styles.reviewedRow}>
              <Ionicons name="checkmark-circle" size={16} color={colors.mutedForeground} />
              <Text style={[typography.body, { color: colors.mutedForeground, fontSize: typography.sizes.sm }]}>
                {t('appointments.reviewSubmitted')}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { padding: spacing.xs },
  content: {
    padding: spacing.xl,
    gap: spacing.md,
    paddingBottom: spacing.xl * 2,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  section: {
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    gap: spacing.xs,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  sectionTitle: {
    fontSize: typography.sizes.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  metaRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    padding: spacing.md,
  },
  actions: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  reviewedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    justifyContent: 'center',
    paddingVertical: spacing.sm,
  },
});
