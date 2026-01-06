import { apiClient } from './apiClient';
import { Appointment, Employee, Service, Business } from '../types';

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

  // Service Management
  async createService(businessId: string, data: Partial<Service>): Promise<Service> {
    console.log('[ownerService] Creating service with businessId:', businessId);
    console.log('[ownerService] Service payload:', JSON.stringify(data, null, 2));
    
    const payload = {
      businessId,
      ...data,
    };
    
    console.log('[ownerService] Full request payload:', JSON.stringify(payload, null, 2));
    console.log('[ownerService] Request URL: /owner/services');
    
    try {
      const result = await apiClient.post<Service>('/owner/services', payload);
      console.log('[ownerService] Service created successfully:', result);
      return result;
    } catch (error: any) {
      console.error('[ownerService] Create service failed:', error);
      console.error('[ownerService] Error type:', error.constructor.name);
      console.error('[ownerService] Error message:', error.message);
      console.error('[ownerService] Error response status:', error.response?.status);
      console.error('[ownerService] Error response data:', error.response?.data);
      console.error('[ownerService] Error request:', error.request ? 'Request was made' : 'No request');
      console.error('[ownerService] Full error:', JSON.stringify({
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
        hasResponse: !!error.response,
        hasRequest: !!error.request,
      }, null, 2));
      
      // Throw a more descriptive error
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
};
