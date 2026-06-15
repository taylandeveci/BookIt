import { apiClient } from './apiClient';
import * as SecureStore from 'expo-secure-store';
import { User, LoginFormData } from '../types';

interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

// Helper to normalize backend auth response envelopes
const normalizeAuthResponse = (response: any): AuthResponse => {
  let normalized = response;
  
  // Unwrap { success: true, data: ... }
  if (normalized && typeof normalized === 'object' && 'data' in normalized) {
    normalized = normalized.data;
  }
  
  // Unwrap nested { data: { user, accessToken, refreshToken } }
  if (normalized && typeof normalized === 'object' && 'data' in normalized && 
      normalized.data && typeof normalized.data === 'object' && 'user' in normalized.data) {
    normalized = normalized.data;
  }
  
  // Normalize role to uppercase if it exists
  if (normalized?.user?.role && typeof normalized.user.role === 'string') {
    normalized.user.role = normalized.user.role.toUpperCase();
  }
  
  return normalized as AuthResponse;
};

export const authService = {
  async registerUser(data: { fullName: string; email: string; password: string; phone?: string }): Promise<AuthResponse> {
    const response = await apiClient.post<any>('/auth/register-user', {
      fullName: data.fullName,
      email: data.email,
      password: data.password,
      phone: data.phone,
    });
    
    return normalizeAuthResponse(response);
  },

  async registerOwner(data: {
    fullName: string;
    email: string;
    password: string;
    phone?: string;
    businessName: string;
  }): Promise<AuthResponse> {
    const response = await apiClient.post<any>('/auth/register-owner', {
      fullName: data.fullName,
      email: data.email,
      password: data.password,
      phone: data.phone,
      businessName: data.businessName,
    });
    return normalizeAuthResponse(response);
  },

  async verifyJoinCode(code: string): Promise<{ businessId: string; businessName: string; isValid: boolean }> {
    const response = await apiClient.post<any>('/auth/verify-join-code', { code });
    return response;
  },

  async registerEmployee(data: {
    fullName: string;
    email: string;
    password: string;
    joinCode: string;
    specialization?: string;
  }): Promise<AuthResponse> {
    const response = await apiClient.post<any>('/auth/register-employee', data);
    return normalizeAuthResponse(response);
  },

  async login(credentials: LoginFormData): Promise<AuthResponse> {
    const response = await apiClient.post<any>('/auth/login', {
      email: credentials.email,
      password: credentials.password,
    });
    
    const normalized = normalizeAuthResponse(response);

    // NOTE: Do NOT store tokens here - let the caller validate role first
    // Tokens will be stored by authStore after role validation

    return normalized;
  },

  async logout(): Promise<void> {
    try {
      await apiClient.post('/auth/logout');
    } catch {
      // Backend logout may fail if token is already expired; authStore handles local cleanup.
    }
  },

  async getMe(): Promise<User> {
    const user = await apiClient.get<any>('/auth/me');
    if (user?.role && typeof user.role === 'string') {
      user.role = user.role.toUpperCase();
    }
    // Backend returns fullName; frontend User type expects name
    if (user?.fullName && !user.name) {
      user.name = user.fullName;
    }
    // Backend returns avatarUrl; frontend User type expects avatar
    if (user?.avatarUrl !== undefined && user.avatar === undefined) {
      user.avatar = user.avatarUrl ?? undefined;
    }
    return user as User;
  },

  async refreshToken(): Promise<{ accessToken: string; refreshToken: string }> {
    const refreshToken = await SecureStore.getItemAsync('refreshToken');
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await apiClient.post<{ accessToken: string; refreshToken: string }>(
      '/auth/refresh',
      { refreshToken }
    );

    // Update stored tokens
    await SecureStore.setItemAsync('accessToken', response.accessToken);
    if (response.refreshToken) {
      await SecureStore.setItemAsync('refreshToken', response.refreshToken);
    }

    return response;
  },

  async getStoredTokens(): Promise<{ accessToken: string | null; refreshToken: string | null }> {
    const accessToken = await SecureStore.getItemAsync('accessToken');
    const refreshToken = await SecureStore.getItemAsync('refreshToken');
    return { accessToken, refreshToken };
  },

  async updateProfile(data: { name?: string; email?: string; avatarUrl?: string | null }): Promise<User> {
    return await apiClient.put<User>('/auth/profile/me', data);
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await apiClient.post('/auth/change-password/me', {
      currentPassword,
      newPassword,
    });
  },
};
