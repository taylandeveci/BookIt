import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../theme/useTheme';
import { typography, spacing, borderRadius } from '../../theme/theme';
import { useAuthStore } from '../../store/authStore';
import { useNotificationStore, AppNotification, NotificationType } from '../../store/notificationStore';

function getIcon(type: NotificationType): React.ComponentProps<typeof Ionicons>['name'] {
  switch (type) {
    case 'booking_confirmed':
    case 'employee_approved':
      return 'checkmark-circle-outline';
    case 'booking_cancelled':
    case 'booking_rejected':
    case 'employee_rejected':
      return 'close-circle-outline';
    case 'booking_pending':
      return 'time-outline';
    case 'new_review':
    case 'review_submitted':
      return 'star-outline';
    case 'service_start_code':
      return 'key-outline';
    default:
      return 'notifications-outline';
  }
}

function getIconColor(type: NotificationType, colors: any): string {
  switch (type) {
    case 'booking_confirmed':
    case 'employee_approved':
    case 'review_submitted':
      return colors.primary;
    case 'booking_cancelled':
    case 'booking_rejected':
    case 'employee_rejected':
      return colors.destructive;
    case 'booking_pending':
    case 'new_review':
      return colors.secondary;
    default:
      return colors.primary;
  }
}

function timeAgo(date: Date, t: (key: string, opts?: Record<string, unknown>) => string): string {
  const diffMs = Date.now() - new Date(date).getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return t('notifications.justNow');
  if (diffMin < 60) return t('notifications.minutesAgo', { count: diffMin });
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return t('notifications.hoursAgo', { count: diffHr });
  return t('notifications.daysAgo', { count: Math.floor(diffHr / 24) });
}

export const NotificationsScreen: React.FC = () => {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const navigation = useNavigation();
  const user = useAuthStore((s) => s.user);

  const notifications = useNotificationStore((s) => s.notifications);
  const markAllAsRead = useNotificationStore((s) => s.markAllAsRead);
  const markAsRead = useNotificationStore((s) => s.markAsRead);

  const userNotifications = notifications.filter((n) => n.userId === user?.id);

  const renderItem = useCallback(({ item }: { item: AppNotification }) => {
    const rowBg = item.read ? 'transparent' : colors.muted + '4D';

    if (item.type === 'service_start_code') {
      const parts = item.body.split('|');
      const code = parts[0] ?? '';
      const serviceName = parts[1] ?? '';
      return (
        <TouchableOpacity
          onPress={() => markAsRead(item.id)}
          activeOpacity={0.7}
          style={[styles.row, styles.rowCode, { backgroundColor: rowBg }]}
        >
          <Ionicons name="key-outline" size={20} color={colors.primary} style={styles.rowIcon} />
          <View style={styles.rowText}>
            <Text style={[typography.bodySemiBold, { color: colors.foreground, fontSize: typography.sizes.sm }]} numberOfLines={1}>
              {item.title}
            </Text>
            {serviceName ? (
              <Text style={[typography.body, { color: colors.mutedForeground, fontSize: typography.sizes.xs }]} numberOfLines={1}>
                {serviceName}
              </Text>
            ) : null}
            <Text style={[typography.heading, styles.codeDisplay, { color: colors.foreground }]}>
              {code}
            </Text>
          </View>
          <Text style={[typography.body, { color: colors.mutedForeground, fontSize: typography.sizes.xs, alignSelf: 'flex-start' }]}>
            {timeAgo(item.createdAt, t)}
          </Text>
        </TouchableOpacity>
      );
    }

    const iconName = getIcon(item.type);
    const iconColor = getIconColor(item.type, colors);
    return (
      <TouchableOpacity
        onPress={() => markAsRead(item.id)}
        activeOpacity={0.7}
        style={[styles.row, { backgroundColor: rowBg }]}
      >
        <Ionicons name={iconName} size={20} color={iconColor} style={styles.rowIcon} />
        <View style={styles.rowText}>
          <Text style={[typography.bodySemiBold, { color: colors.foreground, fontSize: typography.sizes.sm }]} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={[typography.body, { color: colors.mutedForeground, fontSize: typography.sizes.xs }]} numberOfLines={2}>
            {item.body}
          </Text>
        </View>
        <Text style={[typography.body, { color: colors.mutedForeground, fontSize: typography.sizes.xs }]}>
          {timeAgo(item.createdAt, t)}
        </Text>
      </TouchableOpacity>
    );
  }, [colors, t, markAsRead]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="chevron-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[typography.heading, styles.title, { color: colors.foreground }]}>
          {t('notifications.title')}
        </Text>
        <TouchableOpacity onPress={markAllAsRead} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={[typography.body, { color: colors.primary, fontSize: typography.sizes.xs }]}>
            {t('notifications.markAllRead')}
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={userNotifications}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        removeClippedSubviews
        maxToRenderPerBatch={10}
        windowSize={5}
        initialNumToRender={6}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="notifications-off-outline" size={48} color={colors.mutedForeground} />
            <Text style={[typography.body, { color: colors.mutedForeground, marginTop: spacing.md }]}>
              {t('notifications.empty')}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { padding: spacing.xs },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: typography.sizes.xl,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  rowIcon: { flexShrink: 0 },
  rowText: { flex: 1, gap: 2 },
  rowCode: { alignItems: 'flex-start' },
  codeDisplay: {
    fontSize: 28,
    letterSpacing: 6,
    marginTop: 4,
  },
  empty: { alignItems: 'center', paddingTop: 80 },
});
