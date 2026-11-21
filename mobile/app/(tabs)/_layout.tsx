// mobile/app/(tabs)/_layout.tsx
// Bottom tab navigator — Home, Explore, Sell, Chats, Profile

import { Tabs } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { Colors, Radius } from '@constants/theme';

// Simple icon placeholder (replace with @expo/vector-icons when installed)
function TabIcon({ emoji, focused }: { emoji: string; focused: boolean }) {
  return (
    <View style={[styles.iconWrapper, focused && styles.activeIcon]}>
      <View>
        {/* emoji label acts as icon placeholder */}
        {/* In Phase 2, replace with Lucide or @expo/vector-icons */}
      </View>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textSecondary,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabLabel,
        tabBarIcon: ({ focused }) => (
          <TabIcon
            emoji={
              route.name === 'home'
                ? '🏠'
                : route.name === 'explore'
                ? '🔍'
                : route.name === 'sell'
                ? '➕'
                : route.name === 'chats'
                ? '💬'
                : '👤'
            }
            focused={focused}
          />
        ),
      })}
    >
      <Tabs.Screen name="home" options={{ title: 'Home' }} />
      <Tabs.Screen name="explore" options={{ title: 'Explore' }} />
      <Tabs.Screen name="sell" options={{ title: 'Sell' }} />
      <Tabs.Screen name="chats" options={{ title: 'Chats' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.white,
    borderTopWidth: 0,
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    shadowColor: Colors.shadowColor,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 12,
    height: 64,
    paddingBottom: 8,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  iconWrapper: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
  },
  activeIcon: {
    backgroundColor: `${Colors.primary}22`,
  },
});

