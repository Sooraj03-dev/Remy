// mobile/app/(tabs)/home.tsx
// Home feed with a virtualized product carousel.

import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  RefreshControl,
  type ListRenderItem,
} from 'react-native';
import { useUser } from '@clerk/clerk-expo';
import { useIsFocused } from '@react-navigation/native';
import { GestureDetector } from 'react-native-gesture-handler';
import Animated, { useReducedMotion } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import {
  ClayHeader,
  ClayCard,
  ProductCard,
  ClayButton,
  ClayPressable,
  ClayText,
  CategoryChip,
  SkeletonCard,
  StaggeredItem,
  Icon,
} from '@components/index';
import { MarketplaceError } from '@components/product/MarketplaceError';
import { RemyArt } from '@components/ui/RemyArt';
import { RemyLogo } from '@components/ui/RemyLogo';
import { RemyMascot } from '@components/ui/RemyMascot';
import { RefreshingRemy } from '@components/ui/RemyReactions';
import { useFeedMascot } from '@hooks/useFeedMascot';
import { Colors, Radius, Spacing } from '@constants/theme';
import { Copy, pickVariant } from '@constants/copy';
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

const productKey = (product: Product) => product.id;
const CARD_WIDTH = 180;

export default function HomeScreen() {
  const { user } = useUser();
  const router = useRouter();
  const focused = useIsFocused();
  const reduced = useReducedMotion();
  const firstName = user?.firstName ?? 'there';

  const [shelf, setShelf] = useState<{ category: ProductCategory | 'all'; products: Product[] }>({
    category: 'all',
    products: [],
  });
  const { products } = shelf;
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory | 'all'>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const currentRequest = useRef(0);
  const showSkeleton = loading && products.length === 0;
  const { gesture, onFeedScroll, onProductScroll, pull, browsingTime } = useFeedMascot(refreshing, focused);
  const categoryActions = useMemo(() => CATEGORIES.map(({ key }) => () => setSelectedCategory(key)), []);
  const renderProduct = useCallback<ListRenderItem<Product>>(({ item }) => (
    <View style={styles.productCard}>
      <ProductCard product={item} />
    </View>
  ), []);

  const loadProducts = useCallback(async () => {
    const request = ++currentRequest.current;
    try {
      const params =
        selectedCategory === 'all' ? {} : { category: selectedCategory as ProductCategory };
      const data = await fetchProducts(params);
      if (request !== currentRequest.current) return;
      setError(null);
      setShelf({ category: selectedCategory, products: data });
    } catch (err) {
      if (request !== currentRequest.current) return;
      const msg = err instanceof Error ? err.message : 'Could not load products.';
      setError(msg);
    } finally {
      if (request === currentRequest.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [selectedCategory]);

  useEffect(() => {
    setLoading(true);
    setError(null);
    loadProducts();
    return () => { currentRequest.current += 1; };
  }, [loadProducts]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadProducts();
  }, [loadProducts]);

  return (
    <View style={styles.container}>
      <StaggeredItem index={0} style={styles.headerWrap}>
        <ClayHeader
          eyebrow="Welcome back,"
          title={firstName}
          rightAccessory={<RemyLogo size="sm" badgeOnly style={styles.logo} />}
        />
      </StaggeredItem>

      <View style={styles.scroll}>
        <GestureDetector gesture={gesture}>
          <Animated.ScrollView
            style={styles.scroll}
            onScroll={onFeedScroll}
            scrollEventThrottle={16}
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
                {CATEGORIES.map((cat, index) => (
                  <CategoryChip
                    key={cat.key}
                    label={cat.label}
                    category={cat.key}
                    selected={selectedCategory === cat.key}
                    onPress={categoryActions[index]}
                  />
                ))}
              </ScrollView>
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <View style={styles.shelfTitle}>
                  <ClayText variant="h3">Available on Campus</ClayText>
                  {!error && products.length > 0 ? (
                    <ClayText variant="caption" accessibilityLiveRegion="polite">
                      {loading ? 'Updating listings…' : `${products.length} item${products.length === 1 ? '' : 's'}`}
                    </ClayText>
                  ) : null}
                </View>
                <ClayPressable
                  accessibilityLabel="Explore all listings"
                  onPress={() => router.navigate('/(tabs)/explore')}
                  style={styles.exploreLink}
                >
                  <Icon name="Compass" size={17} color="primary" />
                  <ClayText variant="captionBold" color="primary">Explore all</ClayText>
                </ClayPressable>
              </View>

              {showSkeleton ? (
                <View>
                  <View style={styles.skeletonRow}>
                    {[0, 1, 2].map((index) => (
                      <SkeletonCard key={index} width={160} height={196} paused={!focused} />
                    ))}
                  </View>
                  <View style={styles.loadingOverlay} pointerEvents="none">
                    <RemyMascot state="loading" nibble status={pickVariant(Copy.loading.feed, 1)} paused={!focused} />
                  </View>
                </View>
              ) : error ? (
                <MarketplaceError error={error} onRetry={loadProducts} />
              ) : products.length === 0 ? (
                <ClayCard outlined style={styles.statusCard}>
                  <RemyArt size={82} />
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
                <Animated.FlatList
                  key={shelf.category}
                  accessibilityState={{ busy: loading }}
                  data={products}
                  keyExtractor={productKey}
                  removeClippedSubviews={true}
                  initialNumToRender={6}
                  maxToRenderPerBatch={6}
                  windowSize={5}
                  horizontal
                  snapToInterval={reduced ? undefined : CARD_WIDTH + Spacing.md}
                  decelerationRate={reduced ? 'normal' : 'fast'}
                  onScroll={onProductScroll}
                  scrollEventThrottle={16}
                  showsHorizontalScrollIndicator={false}
                  renderItem={renderProduct}
                  contentContainerStyle={styles.productList}
                />
              )}
            </View>

            <View style={styles.section}>
              <ClayCard variant="success" gradient style={styles.guideCard}>
                <View style={styles.guideIcon}>
                  <Icon name="ShieldCheck" size={22} color="successText" />
                </View>
                <View style={styles.guideText}>
                  <ClayText variant="bodyBold" color="successText">Safe Campus Meetups</ClayText>
                  <ClayText variant="caption" color="successText">
                    Meet in a well-lit public spot on campus and inspect the item before trading.
                  </ClayText>
                </View>
              </ClayCard>
            </View>
          </Animated.ScrollView>
        </GestureDetector>
        <RefreshingRemy pull={pull} refreshing={refreshing} paused={!focused} />
      </View>
      {!showSkeleton ? <RemyMascot state="roaming" paused={!focused} browsingTime={browsingTime} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  headerWrap: { paddingTop: Spacing.base },
  logo: { marginLeft: Spacing.sm },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: Spacing.base },
  section: { paddingHorizontal: Spacing.base, marginTop: Spacing.xl },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  shelfTitle: { flex: 1, gap: 2 },
  exploreLink: {
    minHeight: 44,
    paddingHorizontal: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    borderRadius: Radius.full,
    backgroundColor: Colors.accentSoft,
  },
  sectionTitle: { marginBottom: Spacing.xs },
  chips: { flexDirection: 'row', gap: Spacing.sm, paddingVertical: Spacing.sm, paddingHorizontal: Spacing.xs },
  skeletonRow: { flexDirection: 'row', gap: Spacing.sm, overflow: 'hidden' },
  loadingOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', padding: Spacing.base },
  productList: { gap: Spacing.md, paddingVertical: Spacing.sm, paddingHorizontal: Spacing.xs },
  productCard: { width: CARD_WIDTH },
  statusCard: {
    alignItems: 'center',
    padding: Spacing.lg,
    gap: Spacing.xs,
  },
  emptyText: { textAlign: 'center', color: Colors.textSecondary },
  retryBtn: { marginTop: Spacing.sm, alignSelf: 'center' },
  guideCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.md },
  guideIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.successBg,
  },
  guideText: { flex: 1, gap: 2 },
});
