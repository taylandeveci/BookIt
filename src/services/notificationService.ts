import { apiClient } from './apiClient';

interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  data?: any;
  createdAt: string;
}

export const notificationService = {
  async getNotifications(userId: string): Promise<Notification[]> {
    return await apiClient.get<Notification[]>(`/notifications?userId=${userId}`);
  },

  async markAsRead(notificationId: string): Promise<void> {
    await apiClient.post(`/notifications/${notificationId}/read`);
  },

  async markAllAsRead(userId: string): Promise<void> {
    await apiClient.post(`/notifications/read-all`, { userId });
  },

  async deleteNotification(notificationId: string): Promise<void> {
    await apiClient.delete(`/notifications/${notificationId}`);
  },
};
