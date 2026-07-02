import { initializeKakaoSDK } from '@react-native-kakao/core';
import { QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider, router, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import 'react-native-reanimated';

import { UserRole } from '@order-eats/types';
import { useColorScheme } from '@/components/useColorScheme';
import { queryClient } from '@/lib/query-client';
import { useAuthStore } from '@/stores/auth.store';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });
  const isAuthLoading = useAuthStore((state) => state.isLoading);
  const checkSession = useAuthStore((state) => state.checkSession);

  // Kakao native SDK has no web entry point — native platforms only.
  useEffect(() => {
    if (Platform.OS !== 'web' && process.env.EXPO_PUBLIC_KAKAO_NATIVE_APP_KEY) {
      void initializeKakaoSDK(process.env.EXPO_PUBLIC_KAKAO_NATIVE_APP_KEY);
    }
    void checkSession();
  }, [checkSession]);

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded && !isAuthLoading) {
      SplashScreen.hideAsync();
    }
  }, [loaded, isAuthLoading]);

  if (!loaded || isAuthLoading) {
    return null;
  }

  return <RootLayoutNav />;
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const user = useAuthStore((state) => state.user);
  const segments = useSegments();

  useEffect(() => {
    // segments bo'sh bo'lsa router hali tayyor emas — kutamiz
    if (!segments.length) return;

    const inAuthScreen = segments[0] === 'login' || segments[0] === 'register';

    if (!user && !inAuthScreen) {
      // Login bo'lmagan, himoyalangan sahifada → loginga
      router.replace('/login');
    } else if (user && inAuthScreen) {
      // Login bo'lgan, auth sahifada → rolga qarab yo'naltir
      if (user.role === UserRole.RESTAURANT_OWNER) {
        router.replace('/(owner)');
      } else if (user.role === UserRole.DRIVER) {
        router.replace('/(driver)');
      } else {
        router.replace('/(customer)/(tabs)/(home)');
      }
    }
  }, [user, segments]);

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="login" />
            <Stack.Screen name="register" />
            <Stack.Screen name="(owner)" />
            <Stack.Screen name="(customer)" />
            <Stack.Screen name="(driver)" />
            <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
          </Stack>
        </ThemeProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
