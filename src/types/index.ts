export type UserRole = 'USER' | 'OWNER';
export type BusinessCategory = 'barber' | 'hairdresser' | 'beauty' | 'restaurant';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar?: string;
}

export interface BusinessOwner extends User {
  role: 'OWNER';
  businessLicenseUri?: string;
  businessLicenseVerified: boolean;
  businessInfo?: {
    description: string;
    address: string;
    phone: string;
  };
}

export interface Business {
  id: string;
  ownerId: string;
  name: string;
  description?: string;
  address?: string;
  city?: string;
  locationLat?: number;
  locationLng?: number;
  phone?: string;
  licenseDocumentUrl?: string;
  status?: string;
  averageRating?: number;
  reviewCount?: number;
  distance?: number; // in km
  images?: string[];
  createdAt?: string;
}

export interface Employee {
  id: string;
  businessId: string;
  fullName: string;
  photoUrl?: string;
  isActive?: boolean;
  createdAt?: string;
}

export interface Service {
  id: string;
  businessId: string;
  name: string;
  description?: string;
  price: number;
  durationMin: number; // in minutes
  isActive?: boolean;
  createdAt?: string;
}

export type AppointmentStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'COMPLETED';

export interface Appointment {
  id: string;
  userId?: string;
  customerId?: string; // Backend uses customerId
  businessId: string;
  employeeId: string;
  serviceId: string;
  date?: string; // ISO date string
  startTime?: string; // Backend uses startTime
  endTime?: string;
  timeSlot?: string; // e.g., "10:00"
  status: AppointmentStatus;
  createdAt?: string;
  updatedAt?: string;
  rejectionReason?: string;
  // Relations that might be included
  business?: Business;
  employee?: Employee;
  service?: Service;
  customer?: {
    id: string;
    fullName: string;
    email?: string;
  };
}

export type ReviewStatus = 'PENDING' | 'APPROVED';

export interface Review {
  id: string;
  appointmentId: string;
  userId: string;
  businessId: string;
  rating: number; // 1-5
  comment: string;
  status: ReviewStatus;
  createdAt: string;
  approvedAt?: string;
}

export interface TimeSlot {
  time: string;
  available: boolean;
}

export interface BookingFormData {
  businessId: string;
  employeeId: string;
  serviceId: string;
  date: string;
  timeSlot: string;
  notes?: string;
}

export interface LoginFormData {
  email: string;
  password: string;
}

export interface RegisterFormData {
  email: string;
  password: string;
  confirmPassword: string;
  fullName: string;
  phone?: string;
  businessName?: string;
}

export interface ProfileFormData {
  name: string;
}

export interface PasswordFormData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface EmployeeFormData {
  name: string;
}

export interface ServiceFormData {
  name: string;
  description: string;
  price: string;
  duration: string;
}

export interface ReviewFormData {
  rating: number;
  comment: string;
}

export interface FilterOptions {
  minRating?: number;
  maxDistance?: number;
  search?: string;
}
