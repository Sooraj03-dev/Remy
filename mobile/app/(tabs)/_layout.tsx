// mobile/app/(tabs)/_layout.tsx
// Bottom tab navigator — Home, Explore, Sell, Chats, Profile.

import { Tabs } from 'expo-router';
import { AnimatedTabBar } from '@components/fx/AnimatedTabBar';
import { Colors, FontFamily } from '@constants/theme';

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <AnimatedTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textSecondary,
        tabBarLabelStyle: { fontFamily: FontFamily.bodyMedium, fontSize: 11 },
      }}
    >
      <Tabs.Screen name="home" options={{ title: 'Home' }} />
      <Tabs.Screen name="explore" options={{ title: 'Explore' }} />
      <Tabs.Screen name="sell" options={{ title: 'Sell' }} />
      <Tabs.Screen name="chats" options={{ title: 'Chats' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}
