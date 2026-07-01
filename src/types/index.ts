export type UserRole = 'USER' | 'EMPLOYEE' | 'OWNER';

export type EmployeeStatus = 'PENDING' | 'ACTIVE' | 'REJECTED' | 'UNASSIGNED';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar?: string;
  employee?: {
    id: string;
    status: EmployeeStatus;
    businessId: string | null;
  };
}



export interface Business {
  id: string;
  ownerId: string;
  name: string;
  description?: string;
  address?: string;
  city?: string;
  locationLat?: number | null;
  locationLng?: number | null;
  phone?: string;
  licenseDocumentUrl?: string;
  status?: string;
  averageRating?: number;
  reviewCount?: number;
  distance?: number;
  images?: string[];
  media?: Array<{ id: string; url: string; createdAt: string }>;
  createdAt?: string;
  joinCode?: string;
  joinCodeEnabled?: boolean;
  releaseOnEarlyCompletion?: boolean;
  cancellationWindowMinutes?: number;
  pendingBookingTTLHours?: number;
  tags?: string[];
  isFavorited?: boolean;
}

export interface PendingEmployee {
  id: string;
  fullName: string;
  specialization?: string;
  createdAt: string;
  user?: { email: string };
}

export interface Employee {
  id: string;
  businessId: string;
  fullName: string;
  specialization?: string;
  photoUrl?: string;
  isActive?: boolean;
  createdAt?: string;
  userId?: string | null;
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
  bookingCount?: number;
}

export type AppointmentStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'COMPLETED' | 'IN_PROGRESS' | 'NO_SHOW';

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
  cancellationReason?: string;
  customerArrivalConfirmed?: boolean | null;
  businessArrivalConfirmed?: boolean | null;
  arrivalConfirmedAt?: string | null;
  review?: { id: string } | null;
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

export type ReviewStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface Review {
  id: string;
  appointmentId?: string;
  reservationId?: string;
  userId: string;
  businessId: string;
  rating: number; // 1-5
  comment?: string;
  commentText?: string;
  status: ReviewStatus;
  createdAt: string;
  approvedAt?: string;
  user?: { id: string; fullName: string };
  reservation?: { service?: { name: string } };
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
  employeeSatisfaction?: number | null;
}

export interface BusinessMedia {
  id: string;
  url: string;
  businessId: string;
  createdAt: string;
}

export interface FilterOptions {
  minRating?: number;
  maxDistance?: number;
  search?: string;
  serviceName?: string;
  availableToday?: boolean;
}
