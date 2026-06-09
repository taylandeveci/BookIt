import { apiClient } from './apiClient';

export interface BackendNotification {
  id: string;
  type: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  userId: string;
  reservationId?: string;
}

const notificationService = {
  getNotifications: (): Promise<BackendNotification[]> =>
    apiClient.get<BackendNotification[]>('/notifications'),

  markRead: (id: string): Promise<void> =>
    apiClient.post<void>(`/notifications/${id}/read`),
};

export default notificationService;
