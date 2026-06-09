import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/useTheme';
import { typography, spacing, borderRadius } from '../../theme/theme';
import { useNotificationStore, AppNotification, NotificationType } from '../../store/notificationStore';
import { useAuthStore } from '../../store/authStore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SIDE_MARGIN = spacing.md;
const TOAST_WIDTH = SCREEN_WIDTH - SIDE_MARGIN * 2;

function getAccentColor(type: NotificationType, colors: any): string {
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
    default:
      return 'notifications-outline';
  }
}

interface ToastBannerProps {
  notification: AppNotification;
  onDismiss: () => void;
}

const ToastBanner: React.FC<ToastBannerProps> = ({ notification, onDismiss }) => {
  const { colors, shadows } = useTheme();
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(-120);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const accentColor = getAccentColor(notification.type, colors);
  const iconName = getIcon(notification.type);

  const dismiss = () => {
    translateY.value = withTiming(-120, { duration: 300 }, () => {});
    if (timerRef.current) clearTimeout(timerRef.current);
    setTimeout(onDismiss, 310);
  };

  useEffect(() => {
    translateY.value = withSpring(0, { damping: 18, stiffness: 200 });
    timerRef.current = setTimeout(dismiss, 3500);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View
      style={[
        styles.banner,
        animatedStyle,
        {
          top: insets.top + spacing.sm,
          width: TOAST_WIDTH,
          backgroundColor: colors.card,
          borderLeftColor: accentColor,
          ...shadows.lg,
        },
      ]}
    >
      <TouchableOpacity style={styles.inner} onPress={dismiss} activeOpacity={0.9}>
        <Ionicons name={iconName} size={20} color={accentColor} style={styles.icon} />
        <View style={styles.textBlock}>
          <Text style={[typography.bodySemiBold, { color: colors.foreground, fontSize: typography.sizes.sm }]} numberOfLines={1}>
            {notification.title}
          </Text>
          <Text style={[typography.body, { color: colors.mutedForeground, fontSize: typography.sizes.xs }]} numberOfLines={2}>
            {notification.body}
          </Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

export const ToastNotification: React.FC = () => {
  const notifications = useNotificationStore((s) => s.notifications);
  const currentUserId = useAuthStore((s) => s.user?.id);
  const [visible, setVisible] = React.useState<AppNotification | null>(null);
  const lastIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (notifications.length === 0) return;
    const latest = notifications[0];
    if (latest.id !== lastIdRef.current) {
      lastIdRef.current = latest.id;
      if (latest.userId === currentUserId) {
        setVisible(latest);
      }
    }
  }, [notifications, currentUserId]);

  if (!visible) return null;

  return (
    <View style={styles.container} pointerEvents="box-none">
      <ToastBanner
        key={visible.id}
        notification={visible}
        onDismiss={() => setVisible(null)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    alignItems: 'center',
  },
  banner: {
    position: 'absolute',
    left: SIDE_MARGIN,
    borderRadius: borderRadius.lg,
    borderLeftWidth: 4,
    overflow: 'hidden',
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.sm,
  },
  icon: {
    flexShrink: 0,
  },
  textBlock: {
    flex: 1,
    gap: 2,
  },
});
