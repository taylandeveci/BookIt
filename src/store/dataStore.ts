import { create } from 'zustand';
import {
  Business,
  Employee,
  Service,
  Appointment,
  Review,
} from '../types';

interface DataState {
  businesses: Business[];
  employees: Employee[];
  services: Service[];
  appointments: Appointment[];
  reviews: Review[];
  
  setBusinesses: (businesses: Business[]) => void;
  setEmployees: (employees: Employee[]) => void;
  setServices: (services: Service[]) => void;
  setAppointments: (appointments: Appointment[]) => void;
  setReviews: (reviews: Review[]) => void;
  
  addEmployee: (employee: Employee) => void;
  updateEmployee: (id: string, data: Partial<Employee>) => void;
  deleteEmployee: (id: string) => void;
  
  addService: (service: Service) => void;
  updateService: (id: string, data: Partial<Service>) => void;
  deleteService: (id: string) => void;
  
  updateAppointment: (id: string, data: Partial<Appointment>) => void;
  
  addReview: (review: Review) => void;
  updateReview: (id: string, data: Partial<Review>) => void;
}

export const useDataStore = create<DataState>((set) => ({
  businesses: [],
  employees: [],
  services: [],
  appointments: [],
  reviews: [],
  
  setBusinesses: (businesses) => set({ businesses }),
  setEmployees: (employees) => set({ employees }),
  setServices: (services) => set({ services }),
  setAppointments: (appointments) => set({ appointments }),
  setReviews: (reviews) => set({ reviews }),
  
  addEmployee: (employee) =>
    set((state) => ({ employees: [...state.employees, employee] })),
  
  updateEmployee: (id, data) =>
    set((state) => ({
      employees: state.employees.map((e) =>
        e.id === id ? { ...e, ...data } : e
      ),
    })),
  
  deleteEmployee: (id) =>
    set((state) => ({
      employees: state.employees.filter((e) => e.id !== id),
    })),
  
  addService: (service) =>
    set((state) => ({ services: [...state.services, service] })),
  
  updateService: (id, data) =>
    set((state) => ({
      services: state.services.map((s) =>
        s.id === id ? { ...s, ...data } : s
      ),
    })),
  
  deleteService: (id) =>
    set((state) => ({
      services: state.services.filter((s) => s.id !== id),
    })),
  
  updateAppointment: (id, data) =>
    set((state) => ({
      appointments: state.appointments.map((a) =>
        a.id === id ? { ...a, ...data } : a
      ),
    })),
  
  addReview: (review) =>
    set((state) => ({ reviews: [...state.reviews, review] })),
  
  updateReview: (id, data) =>
    set((state) => ({
      reviews: state.reviews.map((r) =>
        r.id === id ? { ...r, ...data } : r
      ),
    })),
}));
