// Constants used throughout the app

export const APP_NAME = 'BookIT';
export const APP_VERSION = '1.0.0';

export const APPOINTMENT_STATUSES = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  CANCELLED: 'CANCELLED',
  COMPLETED: 'COMPLETED',
} as const;

export const REVIEW_STATUSES = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
} as const;

export const USER_ROLES = {
  USER: 'user',
  OWNER: 'owner',
} as const;

export const BUSINESS_CATEGORIES = {
  BARBER: 'barber',
  HAIRDRESSER: 'hairdresser',
  BEAUTY: 'beauty',
  RESTAURANT: 'restaurant',
} as const;

export const TIME_SLOTS = [
  '09:00',
  '10:00',
  '11:00',
  '12:00',
  '13:00',
  '14:00',
  '15:00',
  '16:00',
  '17:00',
  '18:00',
];

export const DAYS_OF_WEEK = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

export const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export const MIN_SEARCH_QUERY_LENGTH = 2;
export const MAX_REVIEW_LENGTH = 500;
export const MIN_PASSWORD_LENGTH = 6;
export const DEFAULT_PAGE_SIZE = 20;

export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network error. Please check your connection.',
  UNAUTHORIZED: 'You are not authorized to perform this action.',
  NOT_FOUND: 'The requested resource was not found.',
  SERVER_ERROR: 'Server error. Please try again later.',
  INVALID_CREDENTIALS: 'Invalid email or password.',
  EMAIL_EXISTS: 'An account with this email already exists.',
  GENERIC_ERROR: 'Something went wrong. Please try again.',
};

export const SUCCESS_MESSAGES = {
  LOGIN_SUCCESS: 'Welcome back!',
  REGISTER_SUCCESS: 'Account created successfully!',
  BOOKING_SUCCESS: 'Booking request sent!',
  CANCEL_SUCCESS: 'Appointment cancelled.',
  REVIEW_SUCCESS: 'Review submitted!',
  PROFILE_UPDATE_SUCCESS: 'Profile updated successfully.',
  PASSWORD_CHANGE_SUCCESS: 'Password changed successfully.',
};

export const ANIMATION_DURATION = {
  FAST: 200,
  NORMAL: 300,
  SLOW: 500,
};

export const STORAGE_KEYS = {
  USER: 'user',
  TOKEN: 'token',
  THEME: 'isDarkMode',
  NOTIFICATIONS: 'notificationsEnabled',
};
