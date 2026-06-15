import { useEffect, useRef } from 'react';
import { useIsFocused } from '@react-navigation/native';
import { useQuery, useQueryClient, QueryKey } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { queryKeys } from '../lib/queryKeys';
import notificationService from '../services/notificationService';
import { useAuthStore } from '../store/authStore';
import { useNotificationStore, NotificationType } from '../store/notificationStore';

// Backend notification types handled by this hook, mapped to their title i18n key.
const HANDLED_TYPES: Record<string, string> = {
  new_booking_request: 'notifications.newBookingRequest',
};

/**
 * Polls the backend `/notifications` endpoint so owner/employee devices pick up
 * events (e.g. new booking requests) created from another device in near-real-time.
 * Mirrors the cross-device pattern already used for customer service-start codes.
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
    refetchInterval: 5000,
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
      addNotificationFromBackend({
        id: n.id,
        type: n.type as NotificationType,
        title: t(HANDLED_TYPES[n.type]),
        body: n.message,
        createdAt: new Date(n.createdAt),
        read: false,
        userId: user.id,
      });
    });

    invalidateKeys.forEach((key) => queryClient.invalidateQueries({ queryKey: key }));
  }, [backendNotifications, user]);
}
