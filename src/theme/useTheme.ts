import { useAppStore } from '../store/appStore';
import { lightTheme, darkTheme, shadows } from './theme';

export const useTheme = () => {
  const isDarkMode = useAppStore((state) => state.isDarkMode);
  const colors = isDarkMode ? darkTheme : lightTheme;
  const themeShadows = isDarkMode ? shadows.dark : shadows.light;

  return {
    colors,
    shadows: themeShadows,
    isDarkMode,
  };
};
