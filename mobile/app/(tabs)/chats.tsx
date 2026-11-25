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
  Platform,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '@clerk/clerk-expo';
import { ClayHeader, ClayCard, ClayButton } from '@components/index';
import { RemyMascot } from '@components/ui/RemyMascot';
import { Colors, Spacing, Radius, Typography, FontSize, FontFamily } from '@constants/theme';
import { fetchConversations } from '../../services/api';
import type { Conversation } from '../../../shared/types';

export default function ChatsScreen() {
  const router = useRouter();
  const { getToken } = useAuth();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadConversations = useCallback(async (showFullLoader = false) => {
    if (showFullLoader) {
      setLoading(true);
    }
    setError(null);
    try {
      const token = await getToken();
      if (!token) throw new Error('Please sign in to view conversations.');
      const data = await fetchConversations(token);
      setConversations(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load conversations.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [getToken]);

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
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
      >
        {loading && !refreshing ? (
          <View style={styles.centerBox}>
            <RemyMascot state="loading" status="Loading conversations..." />
          </View>
        ) : error && conversations.length === 0 ? (
          <ClayCard variant="peach" style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>⚠️</Text>
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
            <Text style={styles.emptyEmoji}>💬</Text>
            <Text style={Typography.bodyBold}>No conversations yet</Text>
            <Text style={[Typography.caption, styles.emptyText]}>
              Tap "Chat with Seller" on any item or place an order to coordinate with fellow campus students!
            </Text>
            <ClayButton
              label="Explore Marketplace"
              onPress={() => router.push('/(tabs)/home')}
              style={{ marginTop: Spacing.md }}
            />
          </ClayCard>
        ) : (
          conversations.map((conv) => {
            const hasUnread = conv.unreadCount > 0;
            return (
              <Pressable
                key={conv.orderId}
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
                    <Text style={styles.avatarText}>
                      {conv.otherUserName ? conv.otherUserName[0].toUpperCase() : 'U'}
                    </Text>
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

                    <Text style={[Typography.caption, styles.productTag]} numberOfLines={1}>
                      📦 {conv.productTitle}
                    </Text>

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
                        <View style={styles.unreadBadge}>
                          <Text style={styles.unreadText}>{conv.unreadCount}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </ClayCard>
              </Pressable>
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
  emptyEmoji: { fontSize: 44, marginBottom: Spacing.sm },
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
  convInfo: { flex: 1 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { flex: 1, marginRight: Spacing.xs, color: Colors.text },
  nameUnread: { color: Colors.textPrimary, fontFamily: FontFamily.bodyBold },
  timeText: { fontSize: 11, fontFamily: FontFamily.body, color: Colors.textSecondary },
  timeTextUnread: { color: Colors.primary, fontFamily: FontFamily.bodyBold },
  productTag: {
    color: Colors.primary,
    marginTop: 2,
    fontFamily: FontFamily.label,
    fontSize: FontSize.caption,
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
