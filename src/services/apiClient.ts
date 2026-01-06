import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import * as SecureStore from 'expo-secure-store';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

// ============ LOGOUT LOCK MECHANISM ============
// Global state to prevent multiple logout calls and request loops
let isLoggingOut = false;
let logoutPromise: Promise<void> | null = null;
let logoutCallback: (() => Promise<void>) | null = null;

// Export functions to control logout state from outside (authStore)
export const setLogoutCallback = (callback: () => Promise<void>) => {
  logoutCallback = callback;
};

export const getIsLoggingOut = () => isLoggingOut;
export const setIsLoggingOut = (value: boolean) => {
  isLoggingOut = value;
  if (!value) {
    logoutPromise = null;
  }
};

// Ensure logout is called only once
const ensureLogoutOnce = async (): Promise<void> => {
  if (isLoggingOut) {
    console.log('[AUTH] logout already in progress, skipping');
    return logoutPromise || Promise.resolve();
  }
  
  if (!logoutCallback) {
    console.warn('[AUTH] No logout callback registered');
    return Promise.resolve();
  }
  
  console.log('[AUTH] triggering logout from API interceptor');
  logoutPromise = logoutCallback().finally(() => {
    logoutPromise = null;
  });
  
  return logoutPromise;
};

class ApiClient {
  private client: AxiosInstance;
  private isRefreshing = false;
  private failedQueue: Array<{
    resolve: (value?: unknown) => void;
    reject: (reason?: unknown) => void;
  }> = [];

  constructor() {
    this.client = axios.create({
      baseURL: API_URL,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor: attach access token + block during logout
    this.client.interceptors.request.use(
      async (config: InternalAxiosRequestConfig) => {
        // Block all requests during logout (except logout itself)
        const isLogoutRequest = config.url?.includes('/auth/logout');
        if (isLoggingOut && !isLogoutRequest) {
          console.log('[AUTH] Request blocked during logout:', config.url);
          return Promise.reject(new axios.Cancel('Request cancelled: logout in progress'));
        }
        
        const token = await SecureStore.getItemAsync('accessToken');
        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor: handle 401 and refresh token
    this.client.interceptors.response.use(
      (response) => {
        // Unwrap {success, data} envelope if present
        if (response.data && typeof response.data === 'object' && 'data' in response.data) {
          return { ...response, data: response.data.data };
        }
        return response;
      },
      async (error: AxiosError) => {
        // Handle cancelled requests during logout
        if (axios.isCancel(error)) {
          return Promise.reject(error);
        }
        
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
        const status = error.response?.status;

        // Handle 429 Too Many Requests - don't trigger logout loop
        if (status === 429) {
          console.warn('[AUTH] Rate limited (429), not triggering logout');
          return Promise.reject(this.handleError(error));
        }

        // Handle 401/403: try refresh token once, then logout
        if ((status === 401 || status === 403) && !originalRequest._retry) {
          // If already logging out, don't trigger another logout
          if (isLoggingOut) {
            console.log('[AUTH] 401/403 received but logout already in progress');
            return Promise.reject(this.handleError(error));
          }
          
          if (this.isRefreshing) {
            // Queue this request until refresh completes
            return new Promise((resolve, reject) => {
              this.failedQueue.push({ resolve, reject });
            })
              .then(() => this.client(originalRequest))
              .catch((err) => Promise.reject(err));
          }

          originalRequest._retry = true;
          this.isRefreshing = true;

          try {
            const refreshToken = await SecureStore.getItemAsync('refreshToken');
            if (!refreshToken) {
              throw new Error('No refresh token');
            }

            const response = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
            const { accessToken, refreshToken: newRefreshToken } = response.data.data || response.data;

            await SecureStore.setItemAsync('accessToken', accessToken);
            if (newRefreshToken) {
              await SecureStore.setItemAsync('refreshToken', newRefreshToken);
            }

            // Retry all queued requests
            this.failedQueue.forEach((prom) => prom.resolve());
            this.failedQueue = [];

            return this.client(originalRequest);
          } catch (refreshError) {
            // Refresh failed, clear tokens and reject all queued requests
            this.failedQueue.forEach((prom) => prom.reject(refreshError));
            this.failedQueue = [];

            // Trigger logout only once
            await ensureLogoutOnce();

            return Promise.reject(refreshError);
          } finally {
            this.isRefreshing = false;
          }
        }

        // Handle other errors
        return Promise.reject(this.handleError(error));
      }
    );
  }

  private handleError(error: AxiosError): Error {
    if (error.response) {
      const status = error.response.status;
      const data: any = error.response.data;
      const message = data?.message || data?.error || 'An error occurred';

      switch (status) {
        case 401:
          return new Error('Authentication required. Please log in again.');
        case 403:
          return new Error('You do not have permission to perform this action.');
        case 409:
          // Return the backend's specific message instead of hardcoding time-slot error
          return new Error(message || 'This resource is no longer available.');
        case 422:
          return new Error(message || 'Invalid data provided.');
        case 429:
          return new Error('Too many requests. Please wait a moment.');
        case 500:
          // Return the actual backend error message instead of generic message
          return new Error(message || 'Server error. Please try again later.');
        default:
          return new Error(message || `Request failed with status ${status}`);
      }
    } else if (error.request) {
      return new Error('Network error. Please check your connection.');
    }
    return new Error(error.message || 'An unexpected error occurred');
  }

  // HTTP Methods
  async get<T>(url: string, config?: any): Promise<T> {
    const response = await this.client.get<T>(url, config);
    return response.data;
  }

  async post<T>(url: string, data?: any, config?: any): Promise<T> {
    const response = await this.client.post<T>(url, data, config);
    return response.data;
  }

  async put<T>(url: string, data?: any, config?: any): Promise<T> {
    const response = await this.client.put<T>(url, data, config);
    return response.data;
  }

  async patch<T>(url: string, data?: any, config?: any): Promise<T> {
    const response = await this.client.patch<T>(url, data, config);
    return response.data;
  }

  async delete<T>(url: string, config?: any): Promise<T> {
    const response = await this.client.delete<T>(url, config);
    return response.data;
  }
}

export const apiClient = new ApiClient();
