import { apiClient } from './apiClient';
import { Appointment, BookingFormData } from '../types';

export const appointmentService = {
  async createAppointment(userId: string, data: BookingFormData): Promise<Appointment> {
    return await apiClient.post<Appointment>('/appointments', {
      businessId: data.businessId,
      employeeId: data.employeeId,
      serviceId: data.serviceId,
      date: data.date,
      timeSlot: data.timeSlot,
      notes: data.notes,
    });
  },

  async getAppointments(userId?: string): Promise<Appointment[]> {
    // Backend uses JWT to identify user, userId param is ignored
    return await apiClient.get<Appointment[]>('/appointments');
  },

  async cancelAppointment(appointmentId: string): Promise<void> {
    await apiClient.post(`/appointments/${appointmentId}/cancel`);
  },

  async getAppointmentById(appointmentId: string): Promise<Appointment> {
    return await apiClient.get<Appointment>(`/appointments/${appointmentId}`);
  },
};
