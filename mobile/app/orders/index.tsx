// mobile/app/orders/index.tsx
// My Orders — purchases/sales with animated lifecycle stepper and owl states.

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import { useAuth } from '@clerk/clerk-expo';
import {
  ClayHeader,
  ClayCard,
  ClayButton,
  StatusBadge,
  ClayText,
  AnimatedOwl,
  OrderStepper,
  SkeletonCard,
} from '@components/index';
import { Colors, Spacing, Radius, Typography, FontSize, FontFamily } from '@constants/theme';
import { Copy } from '@constants/copy';
import { fetchMyBuyerOrders, fetchMySellerOrders } from '../../services/api';
import type { Order } from '../../../shared/types';

const PLACEHOLDER_IMAGE = 'https://via.placeholder.com/160x120/B9A0EB/FFFFFF?text=Owl';

type OrdersTab = 'purchases' | 'sales';

export default function MyOrdersScreen() {
  const router = useRouter();
  const focused = useIsFocused();
  const { getToken } = useAuth();

  const [activeTab, setActiveTab] = useState<OrdersTab>('purchases');
  const [purchases, setPurchases] = useState<Order[]>([]);
  const [sales, setSales] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadOrders = useCallback(async () => {
    setError(null);
    try {
      const token = await getToken();
      if (!token) throw new Error('Authentication required.');

      const [buyerData, sellerData] = await Promise.all([
        fetchMyBuyerOrders(token),
        fetchMySellerOrders(token),
      ]);
      setPurchases(buyerData);
      setSales(sellerData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load orders.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [getToken]);

  useEffect(() => {
    setLoading(true);
    loadOrders();
  }, [loadOrders]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadOrders();
  }, [loadOrders]);

  const currentList = activeTab === 'purchases' ? purchases : sales;

  return (
    <View style={styles.container}>
      <ClayHeader title="My Orders" subtitle="Track your campus purchases & sales" />

      <View style={styles.tabsContainer}>
        <Pressable
          style={[styles.tab, activeTab === 'purchases' && styles.tabActive]}
          onPress={() => setActiveTab('purchases')}
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'purchases' }}
        >
          <ClayText variant="captionBold" color={activeTab === 'purchases' ? 'white' : 'textSecondary'}>
            Purchases ({purchases.length})
          </ClayText>
        </Pressable>
        <Pressable
          style={[styles.tab, activeTab === 'sales' && styles.tabActive]}
          onPress={() => setActiveTab('sales')}
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'sales' }}
        >
          <ClayText variant="captionBold" color={activeTab === 'sales' ? 'white' : 'textSecondary'}>
            Sales ({sales.length})
          </ClayText>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      >
        {loading && !refreshing ? (
          <View style={styles.skeletonList}>
            {[0, 1, 2].map((index) => (
              <SkeletonCard key={index} height={104} paused={!focused} style={styles.skeletonItem} />
            ))}
            <ClayText variant="caption" align="center">
              {Copy.loading.orders[0]}
            </ClayText>
          </View>
        ) : error ? (
          <ClayCard variant="peach" style={styles.emptyCard}>
            <AnimatedOwl mood="shocked" size={140} paused={!focused} />
            <ClayText variant="bodyBold" align="center">
              {Copy.error.title}
            </ClayText>
            <ClayText variant="caption" style={styles.errorText}>
              {error}
            </ClayText>
            <ClayButton label={Copy.error.retry} variant="secondary" onPress={loadOrders} style={{ marginTop: Spacing.sm }} />
          </ClayCard>
        ) : currentList.length === 0 ? (
          <ClayCard variant="lavender" style={styles.emptyCard}>
            <AnimatedOwl mood="sleepy" size={150} paused={!focused} />
            <ClayText variant="bodyBold" align="center">
              {Copy.empty.ordersTitle}
            </ClayText>
            <ClayText variant="caption" align="center" style={styles.emptyText}>
              {activeTab === 'purchases' ? Copy.empty.orders : 'Orders for your listings will appear here when students buy from you.'}
            </ClayText>
            {activeTab === 'purchases' ? (
              <ClayButton
                label="Browse Marketplace"
                onPress={() => router.push('/(tabs)/home')}
                style={{ marginTop: Spacing.md }}
              />
            ) : null}
          </ClayCard>
        ) : (
          currentList.map((order) => (
            <Pressable key={order.id} onPress={() => router.push(`/order/${order.id}`)} accessibilityRole="button">
              <ClayCard style={styles.orderCard}>
                <View style={styles.orderTop}>
                  <Image source={{ uri: order.productImage || PLACEHOLDER_IMAGE }} style={styles.thumbnail} />
                  <View style={styles.orderInfo}>
                    <View style={styles.orderHeader}>
                      <Text style={[Typography.bodyBold, styles.orderTitle]} numberOfLines={1}>
                        {order.productTitle}
                      </Text>
                      <StatusBadge status={order.status} />
                    </View>
                    <Text style={styles.price}>₹{order.amount.toLocaleString('en-IN')}</Text>
                    <Text style={Typography.caption} numberOfLines={1}>
                      {activeTab === 'purchases' ? `Seller: ${order.sellerName}` : `Buyer: ${order.buyerName}`}
                    </Text>
                    <Text style={[Typography.caption, styles.meta]}>
                      {order.meetupLocation || 'Campus Center'} · {new Date(order.createdAt).toLocaleDateString()}
                    </Text>
                  </View>
                </View>
                <View style={styles.stepperWrap}>
                  <OrderStepper status={order.status} compact />
                </View>
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
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    borderRadius: Radius.full,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tabActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  scroll: { padding: Spacing.md, paddingBottom: Spacing.xxxl },
  skeletonList: { gap: Spacing.sm },
  skeletonItem: { width: '100%' },
  emptyCard: { padding: Spacing.xl, alignItems: 'center' },
  emptyText: { textAlign: 'center', color: Colors.textSecondary, marginTop: Spacing.xs },
  errorText: { color: Colors.error, textAlign: 'center', marginTop: Spacing.xs },
  orderCard: { padding: Spacing.sm, marginBottom: Spacing.sm },
  orderTop: { flexDirection: 'row', alignItems: 'center' },
  thumbnail: { width: 70, height: 70, borderRadius: Radius.md, marginRight: Spacing.sm },
  orderInfo: { flex: 1 },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderTitle: { flex: 1, marginRight: Spacing.xs },
  price: { fontSize: FontSize.body, fontFamily: FontFamily.display, color: Colors.text, marginVertical: 2 },
  meta: { color: Colors.textSecondary, marginTop: 2 },
  stepperWrap: { marginTop: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: Spacing.xs },
});
