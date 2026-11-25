// mobile/app/chat/[orderId].tsx
// Buyer–Seller In-App Chat Screen linked to order / inquiry

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  TextInput,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Animated, { FadeInDown, useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@clerk/clerk-expo';
import { AppIcon, TypingDots } from '@components/index';
import { RemyArt } from '@components/ui/RemyArt';
import { RemyMascot } from '@components/ui/RemyMascot';
import { Durations, Easings } from '@constants/motion';
import { Colors, Spacing, Radius, Typography, FontSize, FontFamily } from '@constants/theme';
import {
  fetchOrderMessages,
  sendMessage,
  fetchOrderById,
  fetchMyProfile,
} from '../../services/api';
import type { Message, Order, UserProfile } from '../../../shared/types';

const QUICK_PROMPTS = [
  'Meet at the Library?',
  'Are you free today?',
  'Is this still available?',
  'Can you do a student discount?',
  'Hi! Interested in picking this up',
  'Sounds great, see you there!',
];

export default function ChatScreen() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const { getToken } = useAuth();

  const [order, setOrder] = useState<Order | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [myProfile, setMyProfile] = useState<UserProfile | null>(null);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);

  const loadData = useCallback(async (isInitial = false) => {
    if (!orderId) return;
    try {
      const token = await getToken();
      if (!token) return;

      const [orderData, msgData, profileData] = await Promise.all([
        fetchOrderById(token, orderId),
        fetchOrderMessages(token, orderId),
        isInitial ? fetchMyProfile(token).catch(() => null) : Promise.resolve(null),
      ]);

      setOrder(orderData);
      setMessages(msgData);
      if (profileData) {
        setMyProfile(profileData);
      }
    } catch (err) {
      console.warn('[Chat load error]', err);
    } finally {
      if (isInitial) setLoading(false);
    }
  }, [orderId, getToken]);

  useEffect(() => {
    loadData(true);
    // Poll for new messages every 3.5 seconds
    const interval = setInterval(() => {
      loadData(false);
    }, 3500);
    return () => clearInterval(interval);
  }, [loadData]);

  const handleSendText = async (textToSend: string) => {
    const trimmed = textToSend.trim();
    if (!trimmed || !orderId || sending) return;

    setInputText('');
    setSending(true);

    try {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated.');

      const isBuyer = myProfile?.id === order?.buyerId;
      const receiverId = isBuyer ? (order?.sellerId ?? '') : (order?.buyerId ?? '');

      const newMsg = await sendMessage(token, {
        orderId,
        content: trimmed,
        receiverId,
      });

      setMessages((prev) => {
        // Avoid duplicate if polled simultaneously
        if (prev.some((m) => m.id === newMsg.id)) return prev;
        return [...prev, { ...newMsg, isMine: true }];
      });

      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (err) {
      console.warn('[Send message error]', err);
      // Restore input if send failed
      setInputText(trimmed);
    } finally {
      setSending(false);
    }
  };

  const handleSend = () => {
    handleSendText(inputText);
  };

  const handleSelectQuickPrompt = (prompt: string) => {
    setInputText(prompt);
    inputRef.current?.focus();
  };

  // Determine other user's name accurately using database UUIDs
  const isBuyer = myProfile?.id ? order?.buyerId === myProfile.id : true;
  const otherPersonName = order
    ? isBuyer
      ? order.sellerName
      : order.buyerName
    : 'Campus Student';

  const otherPersonRole = isBuyer ? 'Seller' : 'Buyer';

  const getStatusBadge = () => {
    if (!order) return null;
    if (order.status === 'inquiry') {
      return (
        <View style={[styles.badge, styles.inquiryBadge]}>
          <AppIcon name="chats" size={12} tint="primary" />
          <Text style={styles.inquiryBadgeText}>Inquiry</Text>
        </View>
      );
    }
    if (order.status === 'completed') {
      return (
        <View style={[styles.badge, styles.completedBadge]}>
          <AppIcon name="checkCircle" size={12} tint="successText" />
          <Text style={styles.completedBadgeText}>Picked Up</Text>
        </View>
      );
    }
    return (
      <View style={[styles.badge, styles.pendingBadge]}>
        <AppIcon name="time" size={12} tint="warningText" />
        <Text style={styles.pendingBadgeText}>{order.status}</Text>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View style={styles.container}>
        {/* Header Bar */}
        <View style={styles.headerRow}>
          <Pressable
            style={styles.backBtn}
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <AppIcon name="back" size={20} tint="primary" />
            <Text style={styles.backText}>Back</Text>
          </Pressable>

          <View style={styles.headerInfo}>
            <View style={styles.nameRow}>
              <Text style={[Typography.bodyBold, styles.headerName]} numberOfLines={1}>
                {otherPersonName}
              </Text>
              <Text style={styles.roleTag}>• {otherPersonRole}</Text>
            </View>
            <View style={styles.subRow}>
              <AppIcon name="package" size={13} tint="primary" />
              <Text style={[Typography.caption, styles.productSub]} numberOfLines={1}>
                {order ? `${order.productTitle} · ₹${order.amount}` : 'Campus Marketplace'}
              </Text>
            </View>
          </View>

          {getStatusBadge()}
        </View>

        {/* Conversation Body */}
        {loading ? (
          <View style={styles.centerBox}>
            <RemyMascot state="loading" status="Loading conversation..." />
          </View>
        ) : messages.length === 0 ? (
          <View style={styles.centerBox}>
            <View style={styles.emptyIcon}>
              <RemyArt size={76} />
            </View>
            <Text style={[Typography.h3, styles.emptyTitle]}>Say Hello to {otherPersonName}!</Text>
            <Text style={[Typography.caption, styles.emptyText]}>
              Coordinate campus meetup spot (e.g. library, cafe) or ask any questions about the item.
            </Text>

            {/* Quick Suggestions for Empty State */}
            <View style={styles.emptySuggestions}>
              <Text style={styles.suggestionsTitle}>Quick Suggestions:</Text>
              {QUICK_PROMPTS.slice(0, 3).map((prompt, idx) => (
                <Pressable
                  key={idx}
                  style={styles.emptyPromptChip}
                  onPress={() => handleSendText(prompt)}
                >
                  <Text style={styles.emptyPromptText}>{prompt}</Text>
                  <AppIcon name="send" size={14} tint="primary" />
                </Pressable>
              ))}
            </View>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.messagesList}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
            renderItem={({ item }) => {
              const isMine =
                item.isMine ??
                (myProfile ? item.senderId === myProfile.id : false);

              const timeStr = item.createdAt
                ? new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : '';

              return (
                <Animated.View
                  entering={
                    reduced
                      ? undefined
                      : FadeInDown.duration(Durations.micro)
                          .easing(Easings.enter)
                          .withInitialValues({ opacity: 0, transform: [{ translateY: 6 }, { scale: 0.97 }] })
                  }
                  style={[
                    styles.bubbleWrapper,
                    isMine ? styles.myBubbleWrapper : styles.theirBubbleWrapper,
                  ]}
                >
                  {!isMine && (
                    <Text style={styles.senderLabel}>
                      {item.senderName || otherPersonName}
                    </Text>
                  )}
                  <View
                    style={[
                      styles.bubble,
                      isMine ? styles.myBubble : styles.theirBubble,
                    ]}
                  >
                    <Text
                      style={[
                        styles.messageText,
                        isMine ? styles.myText : styles.theirText,
                      ]}
                    >
                      {item.content}
                    </Text>
                    <Text
                      style={[
                        styles.timeText,
                        isMine ? styles.myTimeText : styles.theirTimeText,
                      ]}
                    >
                      {timeStr}
                    </Text>
                  </View>
                </Animated.View>
              );
            }}
          />
        )}

        {/* Campus Meetup Quick Suggestion Chips */}
        <View style={styles.quickPromptsBar}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.quickPromptsScroll}
          >
            {QUICK_PROMPTS.map((prompt, idx) => (
              <Pressable
                key={idx}
                style={styles.quickChip}
                onPress={() => handleSelectQuickPrompt(prompt)}
              >
                <Text style={styles.quickChipText}>{prompt}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* Typing / Sending Indicator */}
        {sending ? (
          <View style={styles.sendingBar}>
            <TypingDots color={Colors.primary} />
          </View>
        ) : null}

        {/* Input Bar */}
        <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, Spacing.sm) }]}>
          <View style={styles.inputContainer}>
            <TextInput
              ref={inputRef}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Type message or choose prompt..."
              placeholderTextColor={Colors.textSecondary}
              style={styles.chatInput}
              multiline
              maxLength={600}
              returnKeyType="default"
            />
          </View>

          <Pressable
            onPress={handleSend}
            disabled={!inputText.trim() || sending}
            accessibilityRole="button"
            accessibilityLabel="Send message"
            style={({ pressed }) => [
              styles.sendButton,
              inputText.trim() ? styles.sendButtonActive : styles.sendButtonDisabled,
              pressed && { opacity: 0.8 },
            ]}
          >
            {sending ? (
              <ActivityIndicator size="small" color={Colors.white} />
            ) : (
              <View style={styles.sendInner}>
                <Text
                  style={[
                    styles.sendButtonText,
                    inputText.trim() ? styles.sendButtonTextActive : styles.sendButtonTextInactive,
                  ]}
                >
                  Send
                </Text>
                <AppIcon
                  name="send"
                  size={15}
                  tint={inputText.trim() ? 'white' : 'textSecondary'}
                />
              </View>
            )}
          </Pressable>
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
    paddingTop: Platform.OS === 'android' ? Spacing.xl : Spacing.xxl,
    paddingBottom: Spacing.sm,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    shadowColor: Colors.shadowColor,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingRight: Spacing.sm,
    paddingVertical: Spacing.xs,
    minHeight: 48,
  },
  backText: {
    color: Colors.primary,
    fontFamily: FontFamily.bodyBold,
    fontSize: FontSize.body,
  },
  headerInfo: {
    flex: 1,
    marginLeft: Spacing.xs,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  headerName: {
    fontSize: FontSize.body,
    color: Colors.text,
  },
  roleTag: {
    fontSize: FontSize.caption,
    color: Colors.textSecondary,
    fontFamily: FontFamily.label,
  },
  subRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 1,
  },
  productSub: {
    fontSize: FontSize.caption,
    color: Colors.primary,
    flex: 1,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.full,
    marginLeft: Spacing.xs,
  },
  inquiryBadge: {
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
  },
  inquiryBadgeText: {
    color: '#2563EB',
    fontSize: 11,
    fontFamily: FontFamily.bodyBold,
  },
  pendingBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
  },
  pendingBadgeText: {
    color: '#D97706',
    fontSize: 11,
    fontFamily: FontFamily.bodyBold,
  },
  completedBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
  },
  completedBadgeText: {
    color: '#059669',
    fontSize: 11,
    fontFamily: FontFamily.bodyBold,
  },
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  emptyIcon: {
    marginBottom: Spacing.sm,
  },
  emptyTitle: {
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  emptyText: {
    textAlign: 'center',
    color: Colors.textSecondary,
    maxWidth: 280,
    lineHeight: 18,
    marginBottom: Spacing.lg,
  },
  emptySuggestions: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: Colors.white,
    padding: Spacing.md,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  suggestionsTitle: {
    fontSize: FontSize.caption,
    fontFamily: FontFamily.bodyBold,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  emptyPromptChip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.surfaceMuted,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.full,
    marginBottom: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  emptyPromptText: {
    fontSize: FontSize.caption,
    color: Colors.text,
    fontFamily: FontFamily.label,
  },
  messagesList: {
    padding: Spacing.md,
    paddingBottom: Spacing.lg,
  },
  bubbleWrapper: {
    marginBottom: Spacing.sm,
    maxWidth: '82%',
  },
  myBubbleWrapper: {
    alignSelf: 'flex-end',
  },
  theirBubbleWrapper: {
    alignSelf: 'flex-start',
  },
  senderLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginBottom: 3,
    marginLeft: Spacing.xs,
    fontFamily: FontFamily.label,
  },
  bubble: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    borderRadius: Radius.lg,
  },
  myBubble: {
    backgroundColor: Colors.primary,
    borderBottomRightRadius: Spacing.xs,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 1,
  },
  theirBubble: {
    backgroundColor: Colors.white,
    borderBottomLeftRadius: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: Colors.shadowColor,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  messageText: {
    fontSize: FontSize.body,
    fontFamily: FontFamily.body,
    lineHeight: 20,
  },
  myText: {
    color: Colors.white,
  },
  theirText: {
    color: Colors.text,
  },
  timeText: {
    fontSize: 10,
    fontFamily: FontFamily.body,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  myTimeText: {
    color: 'rgba(255,255,255,0.75)',
  },
  theirTimeText: {
    color: Colors.textSecondary,
  },
  quickPromptsBar: {
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingVertical: Spacing.xs,
  },
  quickPromptsScroll: {
    paddingHorizontal: Spacing.sm,
    gap: Spacing.xs,
  },
  quickChip: {
    backgroundColor: Colors.surfaceMuted,
    paddingHorizontal: Spacing.sm + 4,
    paddingVertical: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    marginRight: 6,
  },
  quickChipText: {
    fontSize: FontSize.caption,
    color: Colors.text,
    fontFamily: FontFamily.label,
  },
  sendingBar: {
    paddingHorizontal: Spacing.base,
    paddingVertical: 4,
    backgroundColor: Colors.background,
    alignItems: 'flex-end',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.sm,
    paddingBottom: Platform.OS === 'ios' ? Spacing.lg : Spacing.sm,
    backgroundColor: Colors.white,
    gap: Spacing.sm,
  },
  inputContainer: {
    flex: 1,
    backgroundColor: Colors.surfaceMuted,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: Platform.OS === 'ios' ? Spacing.xs : 2,
    minHeight: 42,
    justifyContent: 'center',
  },
  chatInput: {
    fontSize: FontSize.body,
    fontFamily: FontFamily.body,
    color: Colors.text,
    maxHeight: 90,
  },
  sendButton: {
    height: 44,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.full,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 82,
  },
  sendInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sendButtonActive: {
    backgroundColor: Colors.primary,
  },
  sendButtonDisabled: {
    backgroundColor: Colors.surfaceMuted,
    opacity: 0.6,
  },
  sendButtonText: {
    fontSize: FontSize.caption + 1,
    fontFamily: FontFamily.bodyBold,
  },
  sendButtonTextActive: {
    color: Colors.white,
  },
  sendButtonTextInactive: {
    color: Colors.textSecondary,
  },
});
