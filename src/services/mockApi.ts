// @ts-nocheck
// Mock API - Not used when real backend is running. Contains old field names for reference only.
import {
  User,
  Business,
  Employee,
  Service,
  Appointment,
  Review,
  BusinessCategory,
  LoginFormData,
  RegisterFormData,
  BookingFormData,
  TimeSlot,
  ReviewFormData,
  FilterOptions,
} from '../types';

// Mock delay to simulate network request
const delay = (ms: number = 800) =>
  new Promise((resolve) => setTimeout(resolve, ms));

// Mock Data
const mockUsers: User[] = [
  {
    id: 'user-1',
    email: 'user@test.com',
    name: 'John Doe',
    role: 'USER',
    avatar: undefined,
  },
];

const mockOwners: User[] = [
  {
    id: 'owner-1',
    email: 'owner@test.com',
    name: 'Jane Smith',
    role: 'OWNER',
  },
];

const mockBusinesses: Business[] = [
  {
    id: 'biz-1',
    ownerId: 'owner-1',
    name: 'Classic Cuts Barber',
    category: 'barber',
    description: 'Traditional barbershop with modern style. Expert cuts and grooming services.',
    address: '123 Main St, Downtown',
    phone: '+1 555-0100',
    email: 'info@classiccuts.com',
    rating: 4.8,
    reviewCount: 127,
    distance: 1.2,
    images: [],
  },
  {
    id: 'biz-2',
    ownerId: 'owner-1',
    name: 'Elegant Hair Studio',
    category: 'hairdresser',
    description: 'Full-service hair salon specializing in color, cuts, and styling.',
    address: '456 Oak Ave, Midtown',
    phone: '+1 555-0101',
    email: 'hello@eleganthair.com',
    rating: 4.9,
    reviewCount: 203,
    distance: 2.5,
    images: [],
  },
  {
    id: 'biz-3',
    ownerId: 'owner-1',
    name: 'Serenity Beauty Spa',
    category: 'beauty',
    description: 'Luxury spa offering facials, massages, and beauty treatments.',
    address: '789 Elm St, Uptown',
    phone: '+1 555-0102',
    email: 'contact@serenityspa.com',
    rating: 4.7,
    reviewCount: 156,
    distance: 3.8,
    images: [],
  },
  {
    id: 'biz-4',
    ownerId: 'owner-1',
    name: 'The Garden Bistro',
    category: 'restaurant',
    description: 'Farm-to-table restaurant with seasonal menu and craft cocktails.',
    address: '321 Pine Rd, Arts District',
    phone: '+1 555-0103',
    email: 'reservations@gardenbistro.com',
    rating: 4.6,
    reviewCount: 89,
    distance: 4.2,
    images: [],
  },
];

let mockEmployees: Employee[] = [
  {
    id: 'emp-1',
    businessId: 'biz-1',
    name: 'Mike Johnson',
    role: 'Senior Barber',
    avatar: undefined,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'emp-2',
    businessId: 'biz-1',
    name: 'Sarah Williams',
    role: 'Barber',
    avatar: undefined,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'emp-3',
    businessId: 'biz-2',
    name: 'Emily Brown',
    role: 'Hair Stylist',
    avatar: undefined,
    createdAt: new Date().toISOString(),
  },
];

let mockServices: Service[] = [
  {
    id: 'svc-1',
    businessId: 'biz-1',
    name: 'Classic Haircut',
    description: 'Traditional barber cut with hot towel',
    price: 35,
    duration: 30,
    category: 'barber',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'svc-2',
    businessId: 'biz-1',
    name: 'Beard Trim & Shape',
    description: 'Professional beard grooming',
    price: 25,
    duration: 20,
    category: 'barber',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'svc-3',
    businessId: 'biz-2',
    name: 'Cut & Style',
    description: 'Haircut with wash and styling',
    price: 65,
    duration: 60,
    category: 'hairdresser',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'svc-4',
    businessId: 'biz-2',
    name: 'Color Treatment',
    description: 'Full color service',
    price: 120,
    duration: 120,
    category: 'hairdresser',
    createdAt: new Date().toISOString(),
  },
];

let mockAppointments: Appointment[] = [
  {
    id: 'apt-1',
    userId: 'user-1',
    businessId: 'biz-1',
    employeeId: 'emp-1',
    serviceId: 'svc-1',
    date: new Date(Date.now() + 86400000 * 2).toISOString(),
    timeSlot: '10:00',
    status: 'PENDING',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

let mockReviews: Review[] = [];

// Mock API Methods
export const mockApi = {
  // Auth
  login: async (data: LoginFormData): Promise<{ user: User; token: string }> => {
    await delay();
    
    const allUsers = [...mockUsers, ...mockOwners];
    const user = allUsers.find((u) => u.email === data.email);
    
    if (!user || data.password !== '123456') {
      throw new Error('Invalid email or password');
    }
    
    return {
      user,
      token: `mock-token-${user.id}`,
    };
  },

  register: async (
    data: RegisterFormData,
    role: 'USER' | 'OWNER'
  ): Promise<{ user: User; token: string }> => {
    await delay();
    
    if (role === 'OWNER' && !data.businessLicenseUri) {
      throw new Error('Business license is required for business owners');
    }
    
    const allUsers = [...mockUsers, ...mockOwners];
    if (allUsers.find((u) => u.email === data.email)) {
      throw new Error('Email already exists');
    }
    
    const newUser: User = {
      id: `${role}-${Date.now()}`,
      email: data.email,
      name: data.name,
      role,
    };
    
    if (role === 'USER') {
      mockUsers.push(newUser);
    } else {
      mockOwners.push(newUser);
    }
    
    return {
      user: newUser,
      token: `mock-token-${newUser.id}`,
    };
  },

  // Businesses
  getBusinesses: async (filters?: FilterOptions): Promise<Business[]> => {
    await delay(400);
    
    let filtered = [...mockBusinesses];
    
    if (filters?.category) {
      filtered = filtered.filter((b) => b.category === filters.category);
    }
    
    if (filters?.minRating) {
      filtered = filtered.filter((b) => b.rating >= filters.minRating!);
    }
    
    if (filters?.maxDistance) {
      filtered = filtered.filter((b) => b.distance <= filters.maxDistance!);
    }
    
    return filtered;
  },

  getBusiness: async (id: string): Promise<Business | undefined> => {
    await delay(400);
    return mockBusinesses.find((b) => b.id === id);
  },

  searchBusinesses: async (query: string): Promise<Business[]> => {
    await delay(400);
    const lowerQuery = query.toLowerCase();
    return mockBusinesses.filter(
      (b) =>
        b.name.toLowerCase().includes(lowerQuery) ||
        b.category.toLowerCase().includes(lowerQuery) ||
        b.description.toLowerCase().includes(lowerQuery)
    );
  },

  // Employees
  getEmployees: async (businessId: string): Promise<Employee[]> => {
    await delay(300);
    return mockEmployees.filter((e) => e.businessId === businessId);
  },

  createEmployee: async (
    businessId: string,
    data: { name: string; role: string }
  ): Promise<Employee> => {
    await delay();
    const newEmployee: Employee = {
      id: `emp-${Date.now()}`,
      businessId,
      name: data.name,
      role: data.role,
      createdAt: new Date().toISOString(),
    };
    mockEmployees.push(newEmployee);
    return newEmployee;
  },

  updateEmployee: async (
    id: string,
    data: Partial<Employee>
  ): Promise<Employee> => {
    await delay();
    const index = mockEmployees.findIndex((e) => e.id === id);
    if (index === -1) throw new Error('Employee not found');
    mockEmployees[index] = { ...mockEmployees[index], ...data };
    return mockEmployees[index];
  },

  deleteEmployee: async (id: string): Promise<void> => {
    await delay();
    mockEmployees = mockEmployees.filter((e) => e.id !== id);
  },

  // Services
  getServices: async (businessId: string): Promise<Service[]> => {
    await delay(300);
    return mockServices.filter((s) => s.businessId === businessId);
  },

  createService: async (
    businessId: string,
    data: {
      name: string;
      description: string;
      price: number;
      duration: number;
      category: BusinessCategory;
    }
  ): Promise<Service> => {
    await delay();
    const newService: Service = {
      id: `svc-${Date.now()}`,
      businessId,
      name: data.name,
      description: data.description,
      price: data.price,
      duration: data.duration,
      category: data.category,
      createdAt: new Date().toISOString(),
    };
    mockServices.push(newService);
    return newService;
  },

  updateService: async (
    id: string,
    data: Partial<Service>
  ): Promise<Service> => {
    await delay();
    const index = mockServices.findIndex((s) => s.id === id);
    if (index === -1) throw new Error('Service not found');
    mockServices[index] = { ...mockServices[index], ...data };
    return mockServices[index];
  },

  deleteService: async (id: string): Promise<void> => {
    await delay();
    mockServices = mockServices.filter((s) => s.id !== id);
  },

  // Appointments
  getAppointments: async (userId: string): Promise<Appointment[]> => {
    await delay(400);
    return mockAppointments.filter((a) => a.userId === userId);
  },

  getBusinessAppointments: async (
    businessId: string
  ): Promise<Appointment[]> => {
    await delay(400);
    return mockAppointments.filter((a) => a.businessId === businessId);
  },

  createAppointment: async (
    userId: string,
    data: BookingFormData & { businessId: string }
  ): Promise<Appointment> => {
    await delay();
    const newAppointment: Appointment = {
      id: `apt-${Date.now()}`,
      userId,
      businessId: data.businessId,
      employeeId: data.employeeId,
      serviceId: data.serviceId,
      date: data.date,
      timeSlot: data.timeSlot,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    mockAppointments.push(newAppointment);
    return newAppointment;
  },

  updateAppointmentStatus: async (
    id: string,
    status: Appointment['status'],
    rejectionReason?: string
  ): Promise<Appointment> => {
    await delay();
    const index = mockAppointments.findIndex((a) => a.id === id);
    if (index === -1) throw new Error('Appointment not found');
    mockAppointments[index] = {
      ...mockAppointments[index],
      status,
      rejectionReason,
      updatedAt: new Date().toISOString(),
    };
    return mockAppointments[index];
  },

  getAvailableTimeSlots: async (
    businessId: string,
    employeeId: string,
    date: string
  ): Promise<TimeSlot[]> => {
    await delay(300);
    
    // Generate time slots from 9 AM to 6 PM
    const slots: TimeSlot[] = [];
    for (let hour = 9; hour <= 18; hour++) {
      const time = `${hour.toString().padStart(2, '0')}:00`;
      
      // Check if slot is already booked
      const isBooked = mockAppointments.some(
        (a) =>
          a.businessId === businessId &&
          a.employeeId === employeeId &&
          a.date === date &&
          a.timeSlot === time &&
          a.status !== 'CANCELLED' &&
          a.status !== 'REJECTED'
      );
      
      slots.push({
        time,
        available: !isBooked,
      });
    }
    
    return slots;
  },

  // Reviews
  getReviews: async (businessId: string): Promise<Review[]> => {
    await delay(300);
    return mockReviews.filter(
      (r) => r.businessId === businessId && r.status === 'APPROVED'
    );
  },

  getUserReviews: async (userId: string): Promise<Review[]> => {
    await delay(300);
    return mockReviews.filter((r) => r.userId === userId);
  },

  getPendingReviews: async (businessId: string): Promise<Review[]> => {
    await delay(300);
    return mockReviews.filter(
      (r) => r.businessId === businessId && r.status === 'PENDING'
    );
  },

  createReview: async (
    userId: string,
    appointmentId: string,
    businessId: string,
    data: ReviewFormData
  ): Promise<Review> => {
    await delay();
    
    // Check if review already exists for this appointment
    if (mockReviews.find((r) => r.appointmentId === appointmentId)) {
      throw new Error('Review already exists for this appointment');
    }
    
    const newReview: Review = {
      id: `rev-${Date.now()}`,
      appointmentId,
      userId,
      businessId,
      rating: data.rating,
      comment: data.comment,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
    };
    mockReviews.push(newReview);
    return newReview;
  },

  approveReview: async (id: string): Promise<Review> => {
    await delay();
    const index = mockReviews.findIndex((r) => r.id === id);
    if (index === -1) throw new Error('Review not found');
    mockReviews[index] = {
      ...mockReviews[index],
      status: 'APPROVED',
      approvedAt: new Date().toISOString(),
    };
    return mockReviews[index];
  },

  // User Profile
  updateProfile: async (
    userId: string,
    data: { name: string; email?: string }
  ): Promise<User> => {
    await delay();
    const allUsers = [...mockUsers, ...mockOwners];
    const index = allUsers.findIndex((u) => u.id === userId);
    if (index === -1) throw new Error('User not found');
    allUsers[index] = { ...allUsers[index], ...data };
    return allUsers[index];
  },

  changePassword: async (
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<void> => {
    await delay();
    // Mock implementation - always succeeds if current password is '123456'
    if (currentPassword !== '123456') {
      throw new Error('Current password is incorrect');
    }
  },
};
