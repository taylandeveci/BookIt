import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'app_notifications';
const MAX_NOTIFICATIONS = 50;

export type NotificationType =
  | 'booking_confirmed'
  | 'booking_cancelled'
  | 'booking_rejected'
  | 'booking_pending'
  | 'review_submitted'
  | 'employee_approved'
  | 'employee_rejected'
  | 'new_review'
  | 'service_start_code'
  | 'new_booking_request';

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  type: NotificationType;
  createdAt: Date;
  read: boolean;
  userId: string;
  reservationId?: string;
}

interface NotificationState {
  notifications: AppNotification[];
  unreadCount: number;
  addNotification: (notification: Omit<AppNotification, 'id' | 'createdAt' | 'read'>) => void;
  addNotificationFromBackend: (notification: AppNotification) => void;
  markAllAsRead: () => void;
  markAsRead: (id: string) => void;
  clearAll: () => void;
  hydrate: () => Promise<void>;
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

async function persist(notifications: AppNotification[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
  } catch {
    // silent — persistence failure is non-critical
  }
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,

  addNotification: (notification) => {
    const newItem: AppNotification = {
      ...notification,
      id: generateId(),
      createdAt: new Date(),
      read: false,
    };

    set((state) => {
      const updated = [newItem, ...state.notifications].slice(0, MAX_NOTIFICATIONS);
      persist(updated);
      return { notifications: updated, unreadCount: state.unreadCount + 1 };
    });
  },

  addNotificationFromBackend: (notification) => {
    set((state) => {
      if (state.notifications.some((n) => n.id === notification.id)) return state;
      const updated = [notification, ...state.notifications].slice(0, MAX_NOTIFICATIONS);
      persist(updated);
      const unreadDelta = notification.read ? 0 : 1;
      return { notifications: updated, unreadCount: state.unreadCount + unreadDelta };
    });
  },

  markAllAsRead: () => {
    set((state) => {
      const updated = state.notifications.map((n) => ({ ...n, read: true }));
      persist(updated);
      return { notifications: updated, unreadCount: 0 };
    });
  },

  markAsRead: (id) => {
    set((state) => {
      const target = state.notifications.find((n) => n.id === id);
      if (!target || target.read) return state;
      const updated = state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      );
      persist(updated);
      return { notifications: updated, unreadCount: Math.max(0, state.unreadCount - 1) };
    });
  },

  clearAll: () => {
    persist([]);
    set({ notifications: [], unreadCount: 0 });
  },

  hydrate: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed: AppNotification[] = JSON.parse(raw).map((n: any) => ({
        ...n,
        createdAt: new Date(n.createdAt),
      }));
      const unreadCount = parsed.filter((n) => !n.read).length;
      set({ notifications: parsed, unreadCount });
    } catch {
      // start with empty state on parse failure
    }
  },
}));

useNotificationStore.getState().hydrate();
