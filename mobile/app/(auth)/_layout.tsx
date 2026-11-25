// mobile/app/(auth)/_layout.tsx
// Auth stack layout — login and signup screens

import { Stack } from 'expo-router';
import { useReducedMotion } from 'react-native-reanimated';
import { Colors } from '@constants/theme';

export default function AuthLayout() {
  const reducedMotion = useReducedMotion();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Colors.background },
        animation: reducedMotion ? 'none' : 'default',
      }}
    />
  );
}

