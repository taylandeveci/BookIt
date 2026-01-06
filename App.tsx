import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useFonts, Fraunces_400Regular, Fraunces_600SemiBold, Fraunces_700Bold } from '@expo-google-fonts/fraunces';
import { Nunito_400Regular, Nunito_600SemiBold, Nunito_700Bold } from '@expo-google-fonts/nunito';
import { RootNavigator } from './src/navigation/RootNavigator';
import { useAppStore } from './src/store/appStore';
import { useAuthStore } from './src/store/authStore';
import { LoadingScreen } from './src/components/LoadingScreen';
import './src/localization/i18n';

export default function App() {
  const [fontsLoaded] = useFonts({
    Fraunces_400Regular,
    Fraunces_600SemiBold,
    Fraunces_700Bold,
    Nunito_400Regular,
    Nunito_600SemiBold,
    Nunito_700Bold,
  });

  const isDarkMode = useAppStore((state) => state.isDarkMode);
  const hydrated = useAuthStore((state) => state.hydrated);

  if (!fontsLoaded || !hydrated) {
    return <LoadingScreen />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavigationContainer>
        <StatusBar style={isDarkMode ? 'light' : 'dark'} />
        <RootNavigator />
      </NavigationContainer>
    </GestureHandlerRootView>
  );
}
