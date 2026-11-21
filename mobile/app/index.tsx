// mobile/app/index.tsx
// Root index — redirects to login by default; AuthGate in _layout handles routing

import { Redirect } from 'expo-router';

export default function Index() {
  return <Redirect href="/(auth)/login" />;
}

