import { apiClient } from './apiClient';
import { Appointment, Employee, Service, Business, PendingEmployee, BusinessMedia } from '../types';

export const ownerService = {
  // Business Management
  async getBusiness(): Promise<Business> {
    return await apiClient.get<Business>('/owner/business');
  },

  async updateBusiness(data: Partial<Business>): Promise<Business> {
    return await apiClient.put<Business>('/owner/business', data);
  },

  // Appointment Management
  async getOwnerAppointments(businessId?: string): Promise<Appointment[]> {
    // Backend gets business from JWT token, businessId param is optional
    return await apiClient.get<Appointment[]>('/owner/appointments');
  },

  async approveAppointment(appointmentId: string): Promise<Appointment> {
    return await apiClient.post<Appointment>(`/owner/appointments/${appointmentId}/approve`);
  },

  async rejectAppointment(appointmentId: string, reason: string): Promise<Appointment> {
    return await apiClient.post<Appointment>(`/owner/appointments/${appointmentId}/reject`, {
      reason,
    });
  },

  async completeAppointment(appointmentId: string): Promise<Appointment> {
    return await apiClient.post<Appointment>(`/owner/appointments/${appointmentId}/complete`);
  },

  // Calendar
  async getCalendar(businessId: string, startDate: string, endDate: string): Promise<Appointment[]> {
    return await apiClient.get<Appointment[]>(
      `/owner/calendar?businessId=${businessId}&startDate=${startDate}&endDate=${endDate}`
    );
  },

  // Employee Management
  async createEmployee(businessId: string, data: Partial<Employee>): Promise<Employee> {
    return await apiClient.post<Employee>('/owner/employees', {
      businessId,
      ...data,
    });
  },

  async updateEmployee(employeeId: string, data: Partial<Employee>): Promise<Employee> {
    return await apiClient.put<Employee>(`/owner/employees/${employeeId}`, data);
  },

  async deleteEmployee(employeeId: string): Promise<void> {
    await apiClient.delete(`/owner/employees/${employeeId}`);
  },

  async toggleActiveEmployee(employeeId: string): Promise<Employee> {
    return await apiClient.patch<Employee>(`/owner/employees/${employeeId}/toggle-active`);
  },

  // Service Management
  async getOwnerServices(): Promise<Service[]> {
    return await apiClient.get<Service[]>('/owner/services');
  },

  async createService(businessId: string, data: Partial<Service>): Promise<Service> {
    try {
      const result = await apiClient.post<Service>('/owner/services', {
        businessId,
        ...data,
      });
      return result;
    } catch (error: any) {
      const errorMsg = error.response?.data?.message
        || error.response?.data?.error
        || error.message
        || 'Failed to create service';
      throw new Error(errorMsg);
    }
  },

  async updateService(serviceId: string, data: Partial<Service>): Promise<Service> {
    return await apiClient.put<Service>(`/owner/services/${serviceId}`, data);
  },

  async deleteService(serviceId: string): Promise<void> {
    await apiClient.delete(`/owner/services/${serviceId}`);
  },

  // Pending employee management
  async getPendingEmployees(): Promise<PendingEmployee[]> {
    return await apiClient.get<PendingEmployee[]>('/owner/pending-employees');
  },

  async approveEmployee(employeeId: string): Promise<void> {
    await apiClient.put(`/owner/employees/${employeeId}/approve`);
  },

  async rejectEmployee(employeeId: string): Promise<void> {
    await apiClient.put(`/owner/employees/${employeeId}/reject`);
  },

  // Business settings (joinCode + toggles + booking rules)
  async updateBusinessSettings(data: {
    joinCodeEnabled?: boolean;
    releaseOnEarlyCompletion?: boolean;
    cancellationWindowMinutes?: number;
    pendingBookingTTLHours?: number;
  }): Promise<Business> {
    return await apiClient.patch<Business>('/owner/business', data);
  },

  // Business Media
  async getBusinessMedia(): Promise<BusinessMedia[]> {
    return await apiClient.get<BusinessMedia[]>('/owner/business/media');
  },

  async addBusinessMedia(url: string): Promise<BusinessMedia> {
    return await apiClient.post<BusinessMedia>('/owner/business/media', { url });
  },

  async deleteBusinessMedia(id: string): Promise<void> {
    await apiClient.delete(`/owner/business/media/${id}`);
  },

  // Reviews Moderation
  async getReviewsToModerate(businessId: string): Promise<any[]> {
    return await apiClient.get(`/owner/reviews?businessId=${businessId}&status=PENDING`);
  },

  async approveReview(reviewId: string): Promise<any> {
    return await apiClient.post(`/owner/reviews/${reviewId}/approve`);
  },

  async rejectReview(reviewId: string, reason: string): Promise<any> {
    return await apiClient.post(`/owner/reviews/${reviewId}/reject`, { reason });
  },

  async getStaffSatisfaction(): Promise<Array<{ employeeId: string; avgSatisfaction: number; reviewCount: number }>> {
    const data = await apiClient.get<any>('/owner/staff-satisfaction');
    return Array.isArray(data) ? data : [];
  },
};
