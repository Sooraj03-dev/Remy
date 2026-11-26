// mobile/app/(tabs)/chats.tsx
// Chats screen — Live buyer–seller order conversations with auto-refresh

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import Animated, { useReducedMotion, ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@clerk/clerk-expo';
import { AppIcon, ClayHeader, ClayCard, ClayButton, ClayText, PulseDot, StaggeredItem } from '@components/index';
import { RemyMascot } from '@components/ui/RemyMascot';
import { SleepyRemy } from '@components/ui/RemyReactions';
import { Durations } from '@constants/motion';
import { Colors, Spacing, Radius, Typography, FontFamily } from '@constants/theme';
import { fetchConversations } from '../../services/api';
import type { Conversation } from '../../../shared/types';

export default function ChatsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const { getToken, isLoaded, isSignedIn } = useAuth();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadConversations = useCallback(async (showFullLoader = false) => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      setLoading(false);
      setRefreshing(false);
      return;
    }
    if (showFullLoader) {
      setLoading(true);
    }
    try {
      const token = await getToken();
      if (!token) return;
      const data = await fetchConversations(token);
      setConversations(data);
      setError(null);
    } catch (err) {
      if (conversations.length === 0) {
        setError(err instanceof Error ? err.message : 'Could not load conversations.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [getToken, isLoaded, isSignedIn, conversations.length]);

  // Auto-refresh conversations when screen is in focus
  useFocusEffect(
    useCallback(() => {
      loadConversations(conversations.length === 0);
      const interval = setInterval(() => {
        loadConversations(false);
      }, 4000);
      return () => clearInterval(interval);
    }, [loadConversations, conversations.length])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadConversations(false);
  }, [loadConversations]);

  const formatMessageTime = (isoString?: string) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    const now = new Date();
    const isToday =
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear();

    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <View style={styles.container}>
      <ClayHeader title="Chats" subtitle="Coordinate campus meetups & pickups" />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: Spacing.xxxl + insets.bottom }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
      >
        {!isLoaded || (loading && !refreshing) ? (
          <View style={styles.centerBox}>
            <RemyMascot state="loading" status="Loading conversations..." />
          </View>
        ) : !isSignedIn ? (
          <ClayCard variant="lavender" style={styles.emptyCard}>
            <SleepyRemy size={96} />
            <Text style={[Typography.bodyBold, { marginTop: Spacing.xs }]}>Sign in to view messages</Text>
            <Text style={[Typography.caption, styles.emptyText]}>
              Sign in with your campus account to coordinate pickups and message buyers or sellers.
            </Text>
            <ClayButton
              label="Sign In"
              onPress={() => router.push('/(auth)/login')}
              style={{ marginTop: Spacing.md }}
            />
          </ClayCard>
        ) : error && conversations.length === 0 ? (
          <ClayCard variant="peach" style={styles.emptyCard}>
            <View style={styles.emptyIconWrap}>
              <AppIcon name="warning" size={40} tint="errorText" />
            </View>
            <Text style={Typography.bodyBold}>Could not load chats</Text>
            <Text style={[Typography.caption, styles.errorText]}>{error}</Text>
            <ClayButton
              label="Retry"
              variant="secondary"
              onPress={() => loadConversations(true)}
              style={{ marginTop: Spacing.sm }}
            />
          </ClayCard>
        ) : conversations.length === 0 ? (
          <ClayCard variant="lavender" style={styles.emptyCard}>
            <SleepyRemy size={96} />
            <Text style={[Typography.bodyBold, { marginTop: Spacing.xs }]}>No conversations yet</Text>
            <Text style={[Typography.caption, styles.emptyText]}>
              Tap &quot;Chat with Seller&quot; on any item or place an order to coordinate with fellow campus students!
            </Text>
            <ClayButton
              label="Explore Marketplace"
              onPress={() => router.push('/(tabs)/home')}
              style={{ marginTop: Spacing.md }}
            />
          </ClayCard>
        ) : (
          conversations.map((conv, index) => {
            const hasUnread = conv.unreadCount > 0;
            return (
              <StaggeredItem key={conv.orderId} index={index}>
                <Pressable
                  onPress={() => router.push(`/chat/${conv.orderId}`)}
                  style={({ pressed }) => [
                    styles.cardPressable,
                    pressed && styles.cardPressed,
                  ]}
                >
                  <ClayCard
                    variant={hasUnread ? 'mint' : 'default'}
                    style={[styles.convCard, hasUnread && styles.unreadBorder]}
                  >
                    {/* User Avatar Circle */}
                    <View style={[styles.avatar, hasUnread && styles.avatarUnread]}>
                      <Text style={[styles.avatarText, hasUnread && styles.avatarTextUnread]}>
                        {conv.otherUserName ? conv.otherUserName[0].toUpperCase() : 'U'}
                      </Text>
                      {hasUnread ? (
                        <View style={styles.onlinePulse}>
                          <PulseDot color={Colors.successText} size={7} />
                        </View>
                      ) : null}
                    </View>

                    {/* Conversation Meta */}
                    <View style={styles.convInfo}>
                      <View style={styles.topRow}>
                        <Text
                          style={[
                            Typography.bodyBold,
                            styles.name,
                            hasUnread && styles.nameUnread,
                          ]}
                          numberOfLines={1}
                        >
                          {conv.otherUserName}
                        </Text>
                        <Text style={[styles.timeText, hasUnread && styles.timeTextUnread]}>
                          {formatMessageTime(conv.lastMessageAt)}
                        </Text>
                      </View>

                      <View style={styles.productTagRow}>
                        <AppIcon name="package" size={14} tint="primary" />
                        <ClayText variant="label" color="primary" style={styles.productTagText} numberOfLines={1}>
                          {conv.productTitle}
                        </ClayText>
                      </View>

                      <View style={styles.msgBottomRow}>
                        <Text
                          style={[
                            Typography.caption,
                            styles.lastMsg,
                            hasUnread && styles.lastMsgUnread,
                          ]}
                          numberOfLines={1}
                        >
                          {conv.lastMessage}
                        </Text>

                        {hasUnread && (
                          <Animated.View
                            entering={reduced ? undefined : ZoomIn.duration(Durations.micro)}
                            style={styles.unreadBadge}
                          >
                            <Text style={styles.unreadText}>{conv.unreadCount}</Text>
                          </Animated.View>
                        )}
                      </View>
                    </View>
                  </ClayCard>
                </Pressable>
              </StaggeredItem>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: Spacing.md, paddingBottom: Spacing.xxxl },
  centerBox: { justifyContent: 'center', alignItems: 'center', padding: Spacing.xl },
  emptyCard: { padding: Spacing.xl, alignItems: 'center' },
  emptyIconWrap: { marginBottom: Spacing.sm },
  emptyText: { textAlign: 'center', color: Colors.textSecondary, marginTop: Spacing.xs, lineHeight: 18 },
  errorText: { color: Colors.error, textAlign: 'center', marginTop: Spacing.xs },
  cardPressable: {
    marginBottom: Spacing.sm,
  },
  cardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  convCard: {
    flexDirection: 'row',
    padding: Spacing.md,
    alignItems: 'center',
  },
  unreadBorder: {
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.surfaceMuted,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
    position: 'relative',
  },
  onlinePulse: {
    position: 'absolute',
    right: -2,
    bottom: -2,
  },
  avatarUnread: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  avatarText: {
    color: Colors.text,
    fontSize: 18,
    fontFamily: FontFamily.bodyBold,
  },
  avatarTextUnread: {
    color: Colors.white,
  },
  convInfo: { flex: 1 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { flex: 1, marginRight: Spacing.xs, color: Colors.text },
  nameUnread: { color: Colors.textPrimary, fontFamily: FontFamily.bodyBold },
  timeText: { fontSize: 11, fontFamily: FontFamily.body, color: Colors.textSecondary },
  timeTextUnread: { color: Colors.primary, fontFamily: FontFamily.bodyBold },
  productTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  productTagText: {
    flex: 1,
  },
  msgBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 3,
  },
  lastMsg: {
    flex: 1,
    color: Colors.textSecondary,
    marginRight: Spacing.xs,
  },
  lastMsgUnread: {
    color: Colors.text,
    fontFamily: FontFamily.bodyBold,
  },
  unreadBadge: {
    backgroundColor: Colors.error,
    borderRadius: Radius.full,
    paddingHorizontal: 7,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadText: {
    color: Colors.white,
    fontSize: 10,
    fontFamily: FontFamily.bodyBold,
  },
});
