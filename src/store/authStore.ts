import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { User, UserRole } from '../types';
import { authService } from '../services/authService';
import { setLogoutCallback, getIsLoggingOut, setIsLoggingOut } from '../services/apiClient';

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

      // Validate role if expectedRole is provided
      if (expectedRole && response.user.role !== expectedRole) {
        const error = new Error('Role mismatch') as any;
        error.expectedRole = expectedRole;
        error.actualRole = response.user.role;
        throw error;
      }

      // Role matches or no validation needed - store tokens and set user
      await Promise.all([
        SecureStore.setItemAsync('accessToken', response.accessToken),
        SecureStore.setItemAsync('refreshToken', response.refreshToken),
      ]);
      set({ user: response.user, token: response.accessToken });
    } catch (error) {
      throw error;
    }
  },

  logout: async () => {
    // Prevent multiple simultaneous logout calls
    if (get().isLoggingOut || getIsLoggingOut()) {
      return;
    }

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
    }
  },

  hydrate: async () => {
    try {
      const tokens = await authService.getStoredTokens();

      if (tokens.accessToken) {
        const hydrateTimeout = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('hydrate timeout')), 5000)
        );
        const user = await Promise.race([authService.getMe(), hydrateTimeout]);
        set({ user, token: tokens.accessToken, hydrated: true });
      } else {
        set({ hydrated: true });
      }
    } catch {
      await clearAuthTokens();
      set({ user: null, token: null, hydrated: true });
    }
  },
}));

// Register logout callback for API interceptor to use
setLogoutCallback(() => useAuthStore.getState().logout());

// Initialize hydration
useAuthStore.getState().hydrate();
