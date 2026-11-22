// mobile/app/(tabs)/chats.tsx
// Chats screen — Live buyer–seller order conversations

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@clerk/clerk-expo';
import { ClayHeader, ClayCard, ClayButton } from '@components/index';
import { RemyMascot } from '@components/ui/RemyMascot';
import { Colors, Spacing, Radius, Typography, FontWeight } from '@constants/theme';
import { fetchConversations } from '../../services/api';
import type { Conversation } from '../../../shared/types';

export default function ChatsScreen() {
  const router = useRouter();
  const { getToken } = useAuth();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadConversations = useCallback(async () => {
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

  useEffect(() => {
    setLoading(true);
    loadConversations();
  }, [loadConversations]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadConversations();
  }, [loadConversations]);

  return (
    <View style={styles.container}>
      <ClayHeader title="Chats" subtitle="Coordinate campus meetups & pickups" />

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      >
        {loading && !refreshing ? (
          <View style={styles.centerBox}>
            <RemyMascot state="loading" status="Loading conversations..." />
          </View>
        ) : error ? (
          <ClayCard variant="peach" style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>⚠️</Text>
            <Text style={Typography.bodyBold}>Could not load chats</Text>
            <Text style={[Typography.caption, styles.errorText]}>{error}</Text>
            <ClayButton label="Retry" variant="secondary" onPress={loadConversations} style={{ marginTop: Spacing.sm }} />
          </ClayCard>
        ) : conversations.length === 0 ? (
          <ClayCard variant="lavender" style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>💬</Text>
            <Text style={Typography.bodyBold}>No conversations yet</Text>
            <Text style={[Typography.caption, styles.emptyText]}>
              When you place an order or receive one from another student, your order chat will appear here.
            </Text>
            <ClayButton
              label="Explore Marketplace"
              onPress={() => router.push('/(tabs)/home')}
              style={{ marginTop: Spacing.md }}
            />
          </ClayCard>
        ) : (
          conversations.map((conv) => (
            <Pressable key={conv.orderId} onPress={() => router.push(`/chat/${conv.orderId}`)}>
              <ClayCard style={styles.convCard}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {conv.otherUserName ? conv.otherUserName[0].toUpperCase() : 'U'}
                  </Text>
                </View>
                <View style={styles.convInfo}>
                  <View style={styles.topRow}>
                    <Text style={[Typography.bodyBold, styles.name]} numberOfLines={1}>
                      {conv.otherUserName}
                    </Text>
                    <Text style={styles.timeText}>
                      {new Date(conv.lastMessageAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </Text>
                  </View>
                  <Text style={[Typography.caption, styles.productTag]} numberOfLines={1}>
                    📦 {conv.productTitle}
                  </Text>
                  <Text style={[Typography.caption, styles.lastMsg]} numberOfLines={1}>
                    {conv.lastMessage}
                  </Text>
                </View>
                {conv.unreadCount > 0 && (
                  <View style={styles.unreadBadge}>
                    <Text style={styles.unreadText}>{conv.unreadCount}</Text>
                  </View>
                )}
              </ClayCard>
            </Pressable>
          ))
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
  emptyText: { textAlign: 'center', color: Colors.textSecondary, marginTop: Spacing.xs },
  errorText: { color: Colors.error, textAlign: 'center', marginTop: Spacing.xs },
  convCard: {
    flexDirection: 'row',
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    alignItems: 'center',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  avatarText: { color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold },
  convInfo: { flex: 1 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { flex: 1, marginRight: Spacing.xs },
  timeText: { fontSize: 10, color: Colors.textSecondary },
  productTag: { color: Colors.primary, marginTop: 2, fontWeight: FontWeight.bold },
  lastMsg: { color: Colors.textSecondary, marginTop: 2 },
  unreadBadge: {
    backgroundColor: Colors.error,
    borderRadius: Radius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: Spacing.sm,
  },
  unreadText: { color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold },
});
