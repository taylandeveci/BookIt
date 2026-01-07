import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { User, UserRole } from '../types';
import { authService } from '../services/authService';
import { setLogoutCallback, getIsLoggingOut, setIsLoggingOut } from '../services/apiClient';
import { AxiosError } from 'axios';

interface AuthState {
  user: User | null;
  token: string | null;
  hydrated: boolean;
  isLoggingOut: boolean;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  login: (credentials: { email: string; password: string }, expectedRole?: UserRole) => Promise<void>;
  logout: () => Promise<void>;
  hydrate: () => Promise<void>;
}

// Helper to clear authentication tokens from secure storage
const clearAuthTokens = async () => {
  await SecureStore.deleteItemAsync('accessToken').catch(() => {});
  await SecureStore.deleteItemAsync('refreshToken').catch(() => {});
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  hydrated: false,
  isLoggingOut: false,

  setUser: (user) => set({ user }),
  setToken: (token) => set({ token }),

  login: async (credentials, expectedRole) => {
    try {
      const response = await authService.login(credentials);
      console.log('AUTH_SET_USER_ROLE', response.user.role);
      
      // Validate role if expectedRole is provided
      if (expectedRole && response.user.role !== expectedRole) {
        // Role mismatch - throw error with role info for UI to handle
        const error = new Error('Role mismatch') as any;
        error.expectedRole = expectedRole;
        error.actualRole = response.user.role;
        throw error;
      }
      
      // Role matches or no validation needed - store tokens and set user
      await SecureStore.setItemAsync('accessToken', response.accessToken);
      await SecureStore.setItemAsync('refreshToken', response.refreshToken);
      set({ user: response.user, token: response.accessToken });
    } catch (error) {
      console.error('Failed to login:', error);
      throw error;
    }
  },

  logout: async () => {
    // Prevent multiple simultaneous logout calls
    if (get().isLoggingOut || getIsLoggingOut()) {
      console.log('[AUTH] logout already in progress, skipping duplicate call');
      return;
    }
    
    console.log('[AUTH] logout start');
    set({ isLoggingOut: true });
    setIsLoggingOut(true);
    
    try {
      // Try to call backend logout, but don't fail if it errors
      await authService.logout().catch((error) => {
        // Log but don't throw - we still want to clear local state
        const errorMessage = error?.message || 'Unknown error';
        if (errorMessage.includes('Too many requests') || errorMessage.includes('429')) {
          console.warn('[AUTH] Rate limited on logout, continuing with local cleanup');
        } else {
          console.warn('[AUTH] Logout API failed, continuing with local cleanup:', errorMessage);
        }
      });
    } finally {
      // Always clear tokens and reset state, regardless of API response
      await clearAuthTokens();
      set({ user: null, token: null, isLoggingOut: false });
      setIsLoggingOut(false);
      console.log('[AUTH] logout end');
    }
  },

  hydrate: async () => {
    try {
      const tokens = await authService.getStoredTokens();
      
      if (tokens.accessToken) {
        // Fetch current user with stored token
        const user = await authService.getMe();
        console.log('AUTH_SET_USER_ROLE', user.role);
        set({ user, token: tokens.accessToken, hydrated: true });
      } else {
        set({ hydrated: true });
      }
    } catch (error) {
      // Check if it's an authentication error (401/403)
      const isAuthError = 
        error && 
        typeof error === 'object' && 
        'response' in error && 
        error.response && 
        typeof error.response === 'object' &&
        'status' in error.response &&
        (error.response.status === 401 || error.response.status === 403);

      if (isAuthError) {
        console.log('Auth tokens cleared (expired or invalid)');
      } else {
        console.log('Auth hydration failed, cleared tokens');
      }

      // Clear invalid tokens and reset state
      await clearAuthTokens();
      set({ user: null, token: null, hydrated: true });
    }
  },
}));

// Register logout callback for API interceptor to use
setLogoutCallback(() => useAuthStore.getState().logout());

// Initialize hydration
useAuthStore.getState().hydrate();
