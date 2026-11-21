// mobile/app/(tabs)/home.tsx
// Home — Thrifty Owl feed with blob header, staggered clay cards and owl states.

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  FlatList,
  RefreshControl,
} from 'react-native';
import { useUser } from '@clerk/clerk-expo';
import { useIsFocused } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import {
  ClayHeader,
  ClayCard,
  ProductCard,
  ClayButton,
  ClayText,
  CategoryChip,
  AnimatedOwl,
  FloatingBlobs,
  SkeletonCard,
  StaggeredItem,
  Icon,
} from '@components/index';
import { Colors, Spacing } from '@constants/theme';
import { Copy, isOfflineError, pickVariant } from '@constants/copy';
import { fetchProducts } from '../../services/api';
import type { Product, ProductCategory } from '../../../shared/types';

const CATEGORIES: { label: string; key: ProductCategory | 'all' }[] = [
  { label: 'All', key: 'all' },
  { label: 'Textbooks', key: 'books' },
  { label: 'Electronics', key: 'electronics' },
  { label: 'Clothing', key: 'clothing' },
  { label: 'Stationery', key: 'stationery' },
  { label: 'Sports', key: 'sports' },
  { label: 'Furniture', key: 'furniture' },
];

export default function HomeScreen() {
  const { user } = useUser();
  const router = useRouter();
  const focused = useIsFocused();
  const firstName = user?.firstName ?? 'there';

  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory | 'all'>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadProducts = useCallback(async () => {
    setError(null);
    try {
      const params =
        selectedCategory === 'all' ? {} : { category: selectedCategory as ProductCategory };
      const data = await fetchProducts(params);
      setProducts(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not load products.';
      setError(msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedCategory]);

  useEffect(() => {
    setLoading(true);
    loadProducts();
  }, [loadProducts]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadProducts();
  }, [loadProducts]);

  return (
    <View style={styles.container}>
      <View style={styles.headerWrap}>
        <FloatingBlobs variant="header" paused={!focused} />
        <ClayText variant="captionBold" color="primary" style={styles.wordmark}>
          THRIFTY OWL
        </ClayText>
        <ClayHeader title={`Hey, ${firstName}`} subtitle="What are you looking for today?" />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
      >
        <View style={styles.section}>
          <ClayText variant="h3" style={styles.sectionTitle}>
            Categories
          </ClayText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            {CATEGORIES.map((cat) => (
              <CategoryChip
                key={cat.key}
                label={cat.label}
                category={cat.key}
                selected={selectedCategory === cat.key}
                onPress={() => setSelectedCategory(cat.key)}
              />
            ))}
          </ScrollView>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <ClayText variant="h3">Available on Campus</ClayText>
            {products.length > 0 ? (
              <ClayText variant="caption">
                {products.length} item{products.length === 1 ? '' : 's'}
              </ClayText>
            ) : null}
          </View>

          {loading ? (
            <View>
              <View style={styles.skeletonRow}>
                {[0, 1, 2].map((index) => (
                  <SkeletonCard key={index} width={160} height={196} paused={!focused} />
                ))}
              </View>
              <ClayText variant="caption" align="center" style={styles.loadingText}>
                {pickVariant(Copy.loading.feed, 1)}
              </ClayText>
            </View>
          ) : error ? (
            <ClayCard variant="peach" style={styles.statusCard}>
              {isOfflineError(error) ? (
                <Icon name="WifiSlash" size="lg" weight="duotone" color="primary" />
              ) : (
                <AnimatedOwl mood="shocked" size={130} paused={!focused} />
              )}
              <ClayText variant="bodyBold" align="center">
                {isOfflineError(error) ? Copy.error.offlineTitle : Copy.error.title}
              </ClayText>
              <ClayText variant="caption" style={styles.errorText}>
                {isOfflineError(error) ? `${Copy.error.offline} (${error})` : error}
              </ClayText>
              <ClayButton label={Copy.error.retry} variant="secondary" onPress={loadProducts} style={styles.retryBtn} />
            </ClayCard>
          ) : products.length === 0 ? (
            <ClayCard style={styles.statusCard}>
              <AnimatedOwl mood="sleepy" size={140} paused={!focused} />
              <ClayText variant="bodyBold" align="center">
                {Copy.empty.listingsTitle}
              </ClayText>
              <ClayText variant="caption" align="center" style={styles.emptyText}>
                {selectedCategory === 'all'
                  ? Copy.empty.listings
                  : `No approved items in ${selectedCategory} yet. Try another shelf.`}
              </ClayText>
              <ClayButton
                label="List your first item"
                onPress={() => router.push('/(tabs)/sell')}
                style={styles.retryBtn}
              />
            </ClayCard>
          ) : (
            <FlatList
              data={products}
              keyExtractor={(item) => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              renderItem={({ item, index }) => (
                <StaggeredItem index={index} style={styles.productCard}>
                  <ProductCard product={item} />
                </StaggeredItem>
              )}
              contentContainerStyle={styles.productList}
            />
          )}
        </View>

        <View style={styles.section}>
          <ClayCard variant="mint" style={styles.guideCard}>
            <View style={styles.guideHeader}>
              <ClayText variant="bodyBold">Safe Campus Meetups</ClayText>
              <ClayText variant="caption" color="textSecondary">
                Owl approved
              </ClayText>
            </View>
            <ClayText variant="caption" style={styles.guideText}>
              Meet in well-lit public campus spots like the Student Union, Library foyer, or
              University Cafe. Inspect items before completing trades.
            </ClayText>
          </ClayCard>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  headerWrap: { paddingTop: Spacing.sm, overflow: 'hidden' },
  wordmark: { paddingHorizontal: Spacing.base, letterSpacing: 1.5 },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: Spacing.xxxl },
  section: { paddingHorizontal: Spacing.base, marginTop: Spacing.xl },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  sectionTitle: { marginBottom: Spacing.sm },
  chips: { flexDirection: 'row', gap: Spacing.sm, paddingVertical: 2 },
  skeletonRow: { flexDirection: 'row', gap: Spacing.sm, overflow: 'hidden' },
  loadingText: { marginTop: Spacing.sm },
  productList: { gap: Spacing.sm, paddingVertical: Spacing.xs },
  productCard: { width: 180 },
  statusCard: {
    alignItems: 'center',
    padding: Spacing.lg,
    gap: Spacing.xs,
  },
  errorText: { color: Colors.error, textAlign: 'center' },
  emptyText: { textAlign: 'center', color: Colors.textSecondary },
  retryBtn: { marginTop: Spacing.sm, alignSelf: 'center' },
  guideCard: { padding: Spacing.base },
  guideHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  guideText: { marginTop: 4 },
});
