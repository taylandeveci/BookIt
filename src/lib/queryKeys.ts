export const queryKeys = {
  businesses: {
    all: ['businesses'] as const,
    list: (filters?: object) => ['businesses', 'list', filters] as const,
    detail: (id: string) => ['businesses', id] as const,
    reviews: (id: string) => ['businesses', id, 'reviews'] as const,
    services: (id: string) => ['businesses', id, 'services'] as const,
    employees: (id: string) => ['businesses', id, 'employees'] as const,
    timeSlots: (id: string, date: string, employeeId?: string, serviceId?: string) =>
      ['businesses', id, 'timeSlots', date, employeeId, serviceId] as const,
    averageRating: (id: string) => ['businesses', id, 'averageRating'] as const,
  },
  reviews: {
    forBusiness: (businessId: string) => ['reviews', 'business', businessId] as const,
    forOwner: ['reviews', 'owner'] as const,
  },
  bookings: {
    customerAll: ['bookings', 'customer'] as const,
    employeeAll: ['bookings', 'employee'] as const,
    employeeByDate: (date: string) => ['bookings', 'employee', date] as const,
    ownerAll: ['bookings', 'owner'] as const,
    ownerPending: ['bookings', 'owner', 'pending'] as const,
  },
  employees: {
    forBusiness: (businessId: string) => ['employees', businessId] as const,
    pending: ['employees', 'pending'] as const,
    services: (employeeId: string) => ['employees', employeeId, 'services'] as const,
    schedule: (employeeId: string) => ['employees', employeeId, 'schedule'] as const,
  },
  owner: {
    business: ['owner', 'business'] as const,
    dashboard: (range: string) => ['owner', 'dashboard', range] as const,
    services: ['owner', 'services'] as const,
  },
  notifications: {
    forUser: ['notifications'] as const,
  },
};
