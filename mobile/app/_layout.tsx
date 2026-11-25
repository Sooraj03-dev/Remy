// mobile/app/_layout.tsx
// Root layout — fonts, native splash handoff, Clerk auth gate, animated splash.

import 'react-native-gesture-handler';

import { ClerkProvider, useAuth } from '@clerk/clerk-expo';
import { PlusJakartaSans_400Regular } from '@expo-google-fonts/plus-jakarta-sans/400Regular';
import { PlusJakartaSans_600SemiBold } from '@expo-google-fonts/plus-jakarta-sans/600SemiBold';
import { PlusJakartaSans_700Bold } from '@expo-google-fonts/plus-jakarta-sans/700Bold';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Platform, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useReducedMotion } from 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AnimatedSplash, ToastProvider } from '@components/index';
import { Colors } from '@constants/theme';

const CLERK_PUBLISHABLE_KEY =
  process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ||
  'pk_test_ZGFzaGluZy1tb2xseS04OTk4LmNsZXJrLmFjY291bnRzLmRldiQ';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

// Token cache: persisted in Expo SecureStore for secure JWT storage
const tokenCache = {
  async getToken(key: string) {
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  },
  async saveToken(key: string, value: string) {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch {
      // ignore write failures
    }
  },
};

/** Redirect authenticated/unauthenticated users to the right stack */
function AuthGate() {
  const { isLoaded, isSignedIn } = useAuth();
  const reducedMotion = useReducedMotion();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!isLoaded) return;
    const inAuthGroup = segments[0] === '(auth)';
    if (isSignedIn && inAuthGroup) {
      router.replace('/(tabs)/home');
    } else if (!isSignedIn && !inAuthGroup) {
      router.replace('/(auth)/login');
    }
  }, [isLoaded, isSignedIn, segments, router]);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Colors.background },
        animation: reducedMotion ? 'none' : Platform.OS === 'android' ? 'fade_from_bottom' : 'default',
      }}
    >
      <Stack.Screen name="(tabs)" options={{ animation: reducedMotion ? 'none' : 'fade' }} />
      <Stack.Screen name="(auth)" options={{ animation: reducedMotion ? 'none' : 'fade' }} />
      <Stack.Screen name="chat/[orderId]" options={{ presentation: 'modal', animation: reducedMotion ? 'none' : 'slide_from_bottom' }} />
      <Stack.Screen name="order/checkout/[id]" options={{ presentation: 'modal', animation: reducedMotion ? 'none' : 'slide_from_bottom' }} />
    </Stack>
  );
}

function SplashGate({ fontsReady }: { fontsReady: boolean }) {
  const { isLoaded } = useAuth();
  const [splashDone, setSplashDone] = useState(false);

  useEffect(() => {
    if (!fontsReady) return;
    // Hand over from the native splash only once our custom fonts are usable.
    SplashScreen.hideAsync().catch(() => undefined);
  }, [fontsReady]);

  if (!fontsReady) return null;

  return (
    <>
      <AuthGate />
      {!splashDone ? (
        <AnimatedSplash ready={isLoaded} onFinish={() => setSplashDone(true)} />
      ) : null}
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
  });

  const fontsReady = fontsLoaded || Boolean(fontError);

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY} tokenCache={tokenCache}>
          <StatusBar style="dark" backgroundColor={Colors.background} translucent />
          <ToastProvider>
            <SplashGate fontsReady={fontsReady} />
          </ToastProvider>
        </ClerkProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
});
