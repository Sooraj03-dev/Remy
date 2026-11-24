// mobile/app/(tabs)/profile.tsx
// Profile screen — Displays live user database statistics, role badges, and navigation menu

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  Alert,
} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { RemyMascot } from '@components/ui/RemyMascot';
import { useUser, useAuth, useClerk } from '@clerk/clerk-expo';
import { useRouter } from 'expo-router';
import { ClayHeader, ClayCard, ClayButton } from '@components/index';
import { Colors, Spacing, Typography } from '@constants/theme';
import { fetchMyProfile } from '../../services/api';
import type { UserProfile } from '../../../shared/types';

export default function ProfileScreen() {
  const { user } = useUser();
  const { getToken } = useAuth();
  const { signOut } = useClerk();
  const router = useRouter();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const loadProfile = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) return;
      const data = await fetchMyProfile(token);
      setProfile(data);
    } catch {
      // Fallback gracefully to Clerk user metadata if server profile is sync-pending
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [getToken]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadProfile();
  }, [loadProfile]);

  const performSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
    } catch (err) {
      console.warn('[SignOut] Clerk signOut error:', err);
    } finally {
      try {
        await SecureStore.deleteItemAsync('__clerk_client_jwt');
      } catch (err) {
        console.warn('[SignOut] Failed to clear token from SecureStore:', err);
      }
      setSigningOut(false);
      router.replace('/(auth)/login');
    }
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: () => {
            void performSignOut();
          },
        },
      ],
      { cancelable: true }
    );
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userRole = profile?.role || ((user?.publicMetadata as any)?.role as string) || 'student';
  const isAdminOrVerifier = userRole === 'admin' || userRole === 'verifier';

  const menuItems = [
    {
      emoji: '🏪',
      label: 'Seller Dashboard',
      subtitle: 'Manage your active & sold items',
      onPress: () => router.push('/seller/dashboard'),
    },
    ...(isAdminOrVerifier
      ? [
          {
            emoji: '🛡️',
            label: 'Admin Verification Queue',
            subtitle: 'Review & approve student listings',
            onPress: () => router.push('/admin/dashboard'),
          },
        ]
      : []),
    {
      emoji: '📦',
      label: 'My Orders',
      subtitle: 'Campus purchases & sale requests',
      onPress: () => router.push('/orders'),
    },
    {
      emoji: '❤️',
      label: 'Saved Wishlist',
      subtitle: 'View and manage your saved items',
      onPress: () => router.push('/wishlist'),
    },
    {
      emoji: '🔔',
      label: 'Notifications',
      subtitle: 'Activity, order updates & reviews',
      onPress: () => router.push('/notifications'),
    },
  ];

  return (
    <View style={styles.container}>
      <ClayHeader title="My Profile" />

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
          />
        }
      >
        {/* User Profile Card */}
        <ClayCard style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(user?.firstName?.[0] || profile?.fullName?.[0] || 'U').toUpperCase()}
            </Text>
          </View>

          <Text style={[Typography.h2, styles.name]}>
            {profile?.fullName || user?.fullName || 'Campus Student'}
          </Text>
          <Text style={Typography.caption}>
            {profile?.email || user?.primaryEmailAddress?.emailAddress || ''}
          </Text>

          {/* Role pill */}
          <View
            style={[
              styles.rolePill,
              userRole === 'admin'
                ? styles.adminPill
                : userRole === 'verifier'
                ? styles.verifierPill
                : styles.studentPill,
            ]}
          >
            <Text
              style={[
                styles.roleText,
                userRole === 'admin'
                  ? styles.adminText
                  : userRole === 'verifier'
                  ? styles.verifierText
                  : styles.studentText,
              ]}
            >
              {userRole === 'admin'
                ? '🛡️ Administrator'
                : userRole === 'verifier'
                ? '🔍 Campus Verifier'
                : '🎓 Verified Student'}
            </Text>
          </View>

          {/* Live Statistics Row from Neon DB */}
          {loading && !refreshing ? (
            <RemyMascot state="loading" size={44} status="Loading profile stats..." />
          ) : (
            <View style={styles.statsRow}>
              <View style={styles.stat}>
                <Text style={Typography.h3}>{profile?.activeListings ?? 0}</Text>
                <Text style={Typography.caption}>Active Items</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.stat}>
                <Text style={Typography.h3}>{profile?.totalSold ?? 0}</Text>
                <Text style={Typography.caption}>Items Sold</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.stat}>
                <Text style={Typography.h3}>
                  {profile?.rating ? profile.rating.toFixed(1) : '5.0'} ⭐
                </Text>
                <Text style={Typography.caption}>Rating</Text>
              </View>
            </View>
          )}
        </ClayCard>

        {/* Menu Items */}
        <View style={styles.menu}>
          {menuItems.map((item) => (
            <Pressable
              key={item.label}
              onPress={item.onPress}
              accessibilityRole="button"
              accessibilityLabel={item.label}
            >
              <ClayCard style={styles.menuItem}>
                <Text style={styles.menuEmoji}>{item.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={Typography.bodyBold}>{item.label}</Text>
                  <Text style={Typography.caption}>{item.subtitle}</Text>
                </View>
                <Text style={styles.arrow}>›</Text>
              </ClayCard>
            </Pressable>
          ))}
        </View>

        <ClayButton
          label={signingOut ? 'Signing Out...' : 'Sign Out'}
          variant="danger"
          loading={signingOut}
          disabled={signingOut}
          onPress={handleSignOut}
          style={styles.signOut}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: {
    padding: Spacing.base,
    gap: Spacing.sm,
    paddingBottom: Spacing.xxxl,
  },
  profileCard: { alignItems: 'center', gap: Spacing.xs, paddingVertical: Spacing.lg },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  avatarText: { fontSize: 32, color: Colors.white, fontWeight: '700' },
  name: { textAlign: 'center' },
  rolePill: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 999,
    marginTop: 2,
  },
  roleText: {
    fontWeight: '600',
    fontSize: 12,
  },
  studentPill: { backgroundColor: Colors.primarySoft },
  studentText: { color: Colors.primary, fontWeight: '600', fontSize: 12 },
  verifierPill: { backgroundColor: Colors.successBg },
  verifierText: { color: Colors.successText, fontWeight: '600', fontSize: 12 },
  adminPill: { backgroundColor: Colors.errorBg },
  adminText: { color: Colors.errorText, fontWeight: '700', fontSize: 12 },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  stat: { alignItems: 'center', flex: 1 },
  divider: { width: 1, backgroundColor: Colors.border },
  menu: { gap: Spacing.sm, marginTop: Spacing.xs },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
  },
  menuEmoji: { fontSize: 24 },
  arrow: { fontSize: 24, color: Colors.textSecondary },
  signOut: { marginTop: Spacing.sm },
});
