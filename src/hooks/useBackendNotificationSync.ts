import { useEffect, useRef } from 'react';
import { useIsFocused } from '@react-navigation/native';
import { useQuery, useQueryClient, QueryKey } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { queryKeys } from '../lib/queryKeys';
import notificationService from '../services/notificationService';
import { useAuthStore } from '../store/authStore';
import { useNotificationStore, NotificationType } from '../store/notificationStore';

// Backend notification types handled by this hook, mapped to their title i18n key
// and the local NotificationType used for in-app display.
const HANDLED_TYPES: Record<string, { titleKey: string; notificationType: NotificationType }> = {
  new_booking_request: { titleKey: 'notifications.newBookingRequest', notificationType: 'new_booking_request' },
  booking_confirmed: { titleKey: 'notifications.bookingConfirmed', notificationType: 'booking_confirmed' },
  booking_cancelled_by_business: { titleKey: 'notifications.bookingCancelled', notificationType: 'booking_cancelled' },
};

/**
 * Polls the backend `/notifications` endpoint so customer/owner/employee devices pick up
 * booking lifecycle events (new requests, approvals, cancellations) created from another
 * device in near-real-time. Mirrors the cross-device pattern used for service-start codes.
 */
export function useBackendNotificationSync(invalidateKeys: QueryKey[] = []) {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const isFocused = useIsFocused();
  const queryClient = useQueryClient();
  const addNotificationFromBackend = useNotificationStore((s) => s.addNotificationFromBackend);
  const processedIds = useRef<Set<string>>(new Set());

  const { data: backendNotifications = [] } = useQuery({
    queryKey: queryKeys.notifications.forUser,
    queryFn: () => notificationService.getNotifications(),
    refetchInterval: 3000,
    refetchIntervalInBackground: false,
    enabled: !!user && isFocused,
  });

  useEffect(() => {
    if (!user || !backendNotifications.length) return;

    const unread = backendNotifications.filter(
      (n) => !n.isRead && HANDLED_TYPES[n.type] && !processedIds.current.has(n.id)
    );
    if (!unread.length) return;

    unread.forEach((n) => {
      processedIds.current.add(n.id);
      notificationService.markRead(n.id).catch(() => {});
      const handled = HANDLED_TYPES[n.type];
      addNotificationFromBackend({
        id: n.id,
        type: handled.notificationType,
        title: t(handled.titleKey),
        body: n.message,
        createdAt: new Date(n.createdAt),
        read: false,
        userId: user.id,
        reservationId: n.reservationId,
      });
    });

    invalidateKeys.forEach((key) => queryClient.invalidateQueries({ queryKey: key }));
  }, [backendNotifications, user]);
}
