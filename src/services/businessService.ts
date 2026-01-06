import { apiClient } from './apiClient';
import { Business, Employee, Service, FilterOptions } from '../types';

export const businessService = {
  async getRecommended(limit: number = 10): Promise<Business[]> {
    return await apiClient.get<Business[]>(`/businesses/recommended?limit=${limit}`);
  },

  async getBusinesses(filters?: FilterOptions): Promise<Business[]> {
    const params = new URLSearchParams();
    
    if (filters?.search) params.append('search', filters.search);
    if (filters?.minRating) params.append('minRating', filters.minRating.toString());
    if (filters?.maxDistance) params.append('maxDistance', filters.maxDistance.toString());

    const query = params.toString();
    return await apiClient.get<Business[]>(`/businesses${query ? `?${query}` : ''}`);
  },

  async getBusiness(id: string): Promise<Business> {
    return await apiClient.get<Business>(`/businesses/${id}`);
  },

  async getEmployees(businessId: string): Promise<Employee[]> {
    return await apiClient.get<Employee[]>(`/businesses/${businessId}/employees`);
  },

  async getServices(businessId: string): Promise<Service[]> {
    return await apiClient.get<Service[]>(`/businesses/${businessId}/services`);
  },

  async getAvailableTimeSlots(
    businessId: string,
    employeeId: string,
    date: string
  ): Promise<{ time: string; available: boolean }[]> {
    return await apiClient.get(
      `/businesses/${businessId}/time-slots?employeeId=${employeeId}&date=${date}`
    );
  },
};
