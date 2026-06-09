import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AppState {
  isDarkMode: boolean;
  notificationsEnabled: boolean;
  toggleTheme: () => Promise<void>;
  setNotifications: (enabled: boolean) => Promise<void>;
  hydrate: () => Promise<void>;
}

export const useAppStore = create<AppState>((set) => ({
  isDarkMode: false,
  notificationsEnabled: true,

  toggleTheme: async () => {
    let newMode = false;
    set((state) => {
      newMode = !state.isDarkMode;
      return { isDarkMode: newMode };
    });
    await AsyncStorage.setItem('isDarkMode', JSON.stringify(newMode));
  },

  setNotifications: async (enabled) => {
    await AsyncStorage.setItem('notificationsEnabled', JSON.stringify(enabled));
    set({ notificationsEnabled: enabled });
  },

  hydrate: async () => {
    try {
      const darkModeStr = await AsyncStorage.getItem('isDarkMode');
      const notificationsStr = await AsyncStorage.getItem('notificationsEnabled');
      
      set({
        isDarkMode: darkModeStr ? JSON.parse(darkModeStr) : false,
        notificationsEnabled: notificationsStr ? JSON.parse(notificationsStr) : true,
      });
    } catch (error) {
      console.error('Failed to hydrate app state:', error);
    }
  },
}));

// Initialize hydration
useAppStore.getState().hydrate();
