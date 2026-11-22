// mobile/app/chat/[orderId].tsx
// Buyer–Seller In-App Chat Screen linked to order

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@clerk/clerk-expo';
import { ClayInput, ClayButton } from '@components/index';
import { RemyMascot } from '@components/ui/RemyMascot';
import { Colors, Spacing, Radius, Typography, FontSize, FontWeight } from '@constants/theme';
import { fetchOrderMessages, sendMessage, fetchOrderById } from '../../services/api';
import type { Message, Order } from '../../../shared/types';

export default function ChatScreen() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const router = useRouter();
  const { getToken, userId } = useAuth();

  const [order, setOrder] = useState<Order | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const loadData = useCallback(async () => {
    if (!orderId) return;
    try {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated.');

      const [orderData, msgData] = await Promise.all([
        fetchOrderById(token, orderId),
        fetchOrderMessages(token, orderId),
      ]);
      setOrder(orderData);
      setMessages(msgData);
    } catch (err) {
      console.warn('[Chat load error]', err);
    } finally {
      setLoading(false);
    }
  }, [orderId, getToken]);

  useEffect(() => {
    loadData();
    // Poll for new messages every 4 seconds
    const interval = setInterval(() => {
      loadData();
    }, 4000);
    return () => clearInterval(interval);
  }, [loadData]);

  const handleSend = async () => {
    if (!inputText.trim() || !orderId || sending) return;

    const content = inputText.trim();
    setInputText('');
    setSending(true);

    try {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated.');

      const newMsg = await sendMessage(token, {
        orderId,
        content,
        receiverId: order?.buyerId === userId ? (order?.sellerId ?? '') : (order?.buyerId ?? ''),
      });

      setMessages((prev) => [...prev, newMsg]);
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (err) {
      console.warn('[Send message error]', err);
    } finally {
      setSending(false);
    }
  };

  const otherPersonName =
    order?.buyerId === userId ? order?.sellerName : order?.buyerName;

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backText}>← Back</Text>
          </Pressable>
          <View style={styles.headerInfo}>
            <Text style={Typography.bodyBold} numberOfLines={1}>
              {otherPersonName || 'Chat'}
            </Text>
            <Text style={Typography.caption} numberOfLines={1}>
              {order ? `Order: ${order.productTitle}` : 'Campus Coordination'}
            </Text>
          </View>
        </View>

        {loading ? (
          <View style={styles.centerBox}>
            <RemyMascot state="loading" status="Loading conversation..." />
          </View>
        ) : messages.length === 0 ? (
          <View style={styles.centerBox}>
            <Text style={styles.emptyIcon}>💬</Text>
            <Text style={Typography.bodyBold}>No messages yet</Text>
            <Text style={[Typography.caption, styles.emptyText]}>
              Say hello and coordinate a meetup spot on campus!
            </Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.messagesList}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
            renderItem={({ item }) => {
              const isMine = item.senderId === userId;
              return (
                <View style={[styles.bubbleWrapper, isMine ? styles.myBubbleWrapper : styles.theirBubbleWrapper]}>
                  {!isMine && (
                    <Text style={styles.senderLabel}>{item.senderName}</Text>
                  )}
                  <View style={[styles.bubble, isMine ? styles.myBubble : styles.theirBubble]}>
                    <Text style={[styles.messageText, isMine ? styles.myText : styles.theirText]}>
                      {item.content}
                    </Text>
                    <Text style={[styles.timeText, isMine ? styles.myTimeText : styles.theirTimeText]}>
                      {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>
                </View>
              );
            }}
          />
        )}

        {/* Input Bar */}
        <View style={styles.inputBar}>
          <View style={styles.inputContainer}>
            <ClayInput
              showMascotOnFocus
              value={inputText}
              onChangeText={setInputText}
              placeholder="Type your message..."
              returnKeyType="send"
              onSubmitEditing={handleSend}
              style={styles.chatInput}
            />
          </View>
          <ClayButton
            label="Send"
            onPress={handleSend}
            loading={sending}
            style={styles.sendButton}
          />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.background },
  container: { flex: 1 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.xxl,
    paddingBottom: Spacing.sm,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: { paddingRight: Spacing.md, paddingVertical: Spacing.xs },
  backText: { color: Colors.primary, fontWeight: FontWeight.bold, fontSize: FontSize.body },
  headerInfo: { flex: 1 },
  centerBox: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.xl },
  emptyIcon: { fontSize: 44, marginBottom: Spacing.sm },
  emptyText: { textAlign: 'center', color: Colors.textSecondary, marginTop: Spacing.xs },
  messagesList: { padding: Spacing.md, paddingBottom: Spacing.lg },
  bubbleWrapper: { marginBottom: Spacing.sm, maxWidth: '82%' },
  myBubbleWrapper: { alignSelf: 'flex-end' },
  theirBubbleWrapper: { alignSelf: 'flex-start' },
  senderLabel: { fontSize: 10, color: Colors.textSecondary, marginBottom: 2, marginLeft: Spacing.xs },
  bubble: { padding: Spacing.md, borderRadius: Radius.lg },
  myBubble: { backgroundColor: Colors.primary, borderBottomRightRadius: Spacing.xs },
  theirBubble: { backgroundColor: Colors.mint, borderBottomLeftRadius: Spacing.xs },
  messageText: { fontSize: FontSize.body },
  myText: { color: Colors.white },
  theirText: { color: Colors.text },
  timeText: { fontSize: 9, marginTop: 4, alignSelf: 'flex-end' },
  myTimeText: { color: 'rgba(255,255,255,0.7)' },
  theirTimeText: { color: Colors.textSecondary },
  inputBar: {
    zIndex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.sm,
    paddingBottom: Platform.OS === 'ios' ? Spacing.lg : Spacing.sm,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: Spacing.sm,
  },
  inputContainer: { flex: 1 },
  chatInput: { height: 44, borderRadius: Radius.full },
  sendButton: { height: 44, minWidth: 70, borderRadius: Radius.full },
});

