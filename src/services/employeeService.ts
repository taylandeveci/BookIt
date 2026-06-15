import { apiClient } from './apiClient';

export const employeeService = {
  async getAppointments() {
    return apiClient.get<any[]>('/employee/appointments');
  },

  async getAllAppointments() {
    return apiClient.get<any[]>('/employee/appointments?all=true');
  },

  async approveAppointment(id: string) {
    return apiClient.post<any>(`/employee/appointments/${id}/approve`, {});
  },

  async declineAppointment(id: string) {
    return apiClient.post<any>(`/employee/appointments/${id}/decline`, {});
  },

  async startAppointment(id: string) {
    return apiClient.post<any>(`/employee/appointments/${id}/start`, {});
  },

  async verifyStartCode(id: string, code: string) {
    return apiClient.post<any>(`/employee/appointments/${id}/verify-start-code`, { code });
  },

  async noShowAppointment(id: string) {
    return apiClient.post<any>(`/employee/appointments/${id}/no-show`, {});
  },

  async completeAppointment(id: string) {
    return apiClient.post<any>(`/employee/appointments/${id}/complete`, {});
  },

  async getServices() {
    return apiClient.get<any[]>('/employee/services');
  },

  async addService(
    serviceId: string,
    overrides?: { durationOverride?: number; priceOverride?: number; notes?: string }
  ) {
    return apiClient.post<any>(`/employee/services/${serviceId}`, overrides ?? {});
  },

  async removeService(serviceId: string) {
    return apiClient.delete<any>(`/employee/services/${serviceId}`);
  },

  async joinBusiness(joinCode: string) {
    return apiClient.post<any>('/employee/join-business', { joinCode });
  },

  async leaveBusiness() {
    return apiClient.delete<any>('/employee/leave-business');
  },

  async getSchedule() {
    return apiClient.get<any[]>('/employee/schedule');
  },

  async updateSchedule(entries: { dayOfWeek: number; startTime: string; endTime: string; isWorking: boolean }[]) {
    return apiClient.put<any[]>('/employee/schedule', entries);
  },
};
