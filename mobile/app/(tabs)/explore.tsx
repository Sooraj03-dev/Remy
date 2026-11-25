// mobile/app/(tabs)/explore.tsx
// Explore — live search with a skeleton grid and empty/error states.

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
  type ListRenderItem,
} from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useDerivedValue, useReducedMotion, withTiming } from 'react-native-reanimated';
import {
  ClayHeader,
  ClayInput,
  ClayPressable,
  ClayCard,
  ProductCard,
  ClayText,
  SkeletonCard,
  StaggeredItem,
  Icon,
} from '@components/index';
import { MarketplaceError } from '@components/product/MarketplaceError';
import { RemyArt } from '@components/ui/RemyArt';
import { RemyMascot } from '@components/ui/RemyMascot';
import { RefreshingRemy } from '@components/ui/RemyReactions';
import { useFeedMascot } from '@hooks/useFeedMascot';
import { Colors, Spacing } from '@constants/theme';
import { Durations } from '@constants/motion';
import { Copy } from '@constants/copy';
import { fetchProducts } from '../../services/api';
import type { Product } from '../../../shared/types';

const EMPTY_PRODUCTS: Product[] = [];
const productKey = (product: Product) => product.id;

export default function ExploreScreen() {
  const focused = useIsFocused();
  const [search, setSearch] = useState('');
  const [settledQuery, setSettledQuery] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const currentRequest = useRef(0);
  const hasSearch = search.length > 0;
  const reduced = useReducedMotion();
  const clearProgress = useDerivedValue(() => {
    const target = hasSearch ? 1 : 0;
    return reduced ? target : withTiming(target, { duration: Durations.fast });
  });
  const clearMotion = useAnimatedStyle(() => ({
    opacity: clearProgress.value,
    transform: [{ scale: 0.9 + 0.1 * clearProgress.value }],
  }));
  const { gesture, onFeedScroll, pull, browsingTime } = useFeedMascot(refreshing, focused);

  const performSearch = useCallback(async (query: string) => {
    const request = ++currentRequest.current;
    try {
      const data = await fetchProducts({ search: query.trim() || undefined });
      if (request !== currentRequest.current) return;
      setError(null);
      setProducts(data);
    } catch (err) {
      if (request !== currentRequest.current) return;
      const msg = err instanceof Error ? err.message : 'Failed to search products.';
      setError(msg);
    } finally {
      if (request === currentRequest.current) {
        setSettledQuery(query.trim());
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(search);
    }, 350);
    return () => {
      clearTimeout(timer);
      currentRequest.current += 1;
    };
  }, [search, performSearch]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    performSearch(search);
  }, [performSearch, search]);

  const pendingQuery = search.trim() !== settledQuery;
  const showLoading = !refreshing && (loading || (pendingQuery && (products.length === 0 || !!error)));
  const visibleProducts = showLoading || error ? EMPTY_PRODUCTS : products;
  const renderProduct = useCallback<ListRenderItem<Product>>(({ item }) => (
    <View style={styles.card}>
      <ProductCard product={item} />
    </View>
  ), []);

  return (
    <View style={styles.container}>
      <StaggeredItem index={0}>
        <ClayHeader title="Explore" subtitle="Find second-hand gems on campus" />
      </StaggeredItem>

      <View style={styles.searchBar}>
        <ClayInput
          showMascotOnFocus
          value={search}
          onChangeText={setSearch}
          placeholder="Search by title, brand, or course..."
          returnKeyType="search"
          accessibilityLabel="Search products"
          style={styles.searchInput}
        />
        <View style={styles.searchIcon} pointerEvents="none">
          {focused && pendingQuery && !reduced ? (
            <ActivityIndicator size="small" color={Colors.primary} accessibilityLabel="Searching" />
          ) : (
            <Icon name="MagnifyingGlass" size={20} color="textSecondary" />
          )}
        </View>
        <Animated.View
          pointerEvents={hasSearch ? 'auto' : 'none'}
          accessibilityElementsHidden={!hasSearch}
          importantForAccessibility={hasSearch ? 'auto' : 'no-hide-descendants'}
          style={[styles.clearSlot, clearMotion]}
        >
          <ClayPressable
            accessibilityLabel="Clear search"
            disabled={!hasSearch}
            onPress={() => setSearch('')}
            style={styles.clearButton}
          >
            <Icon name="XCircle" size={20} color="primary" />
          </ClayPressable>
        </Animated.View>
      </View>

      <View style={styles.results}>
        <GestureDetector gesture={gesture}>
          <Animated.FlatList
            data={visibleProducts}
            keyExtractor={productKey}
            removeClippedSubviews={true}
            initialNumToRender={6}
            maxToRenderPerBatch={6}
            windowSize={5}
            numColumns={2}
            columnWrapperStyle={styles.row}
            contentContainerStyle={visibleProducts.length > 0 ? styles.list : styles.emptyList}
            onScroll={onFeedScroll}
            scrollEventThrottle={16}
            alwaysBounceVertical
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            renderItem={renderProduct}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
            }
            ListEmptyComponent={showLoading ? (
              <View style={styles.skeletonGrid}>
                {[0, 1, 2, 3].map((index) => (
                  <SkeletonCard key={index} width={160} height={196} paused={!focused} />
                ))}
                <View style={styles.loadingOverlay} pointerEvents="none">
                  <RemyMascot state="loading" nibble status={Copy.loading.search[0]} paused={!focused} />
                </View>
              </View>
            ) : error ? (
              <MarketplaceError error={error} onRetry={() => performSearch(search)} style={styles.resultMargin} />
            ) : (
              <ClayCard outlined style={styles.emptyCard}>
                <RemyArt size={82} />
                <ClayText variant="bodyBold" align="center">
                  {Copy.empty.searchTitle}
                </ClayText>
                <ClayText variant="caption" align="center" style={styles.emptyText}>
                  {search.trim()
                    ? `Nothing matches "${search}". ${Copy.empty.search}`
                    : 'There are currently no approved products listed on campus.'}
                </ClayText>
              </ClayCard>
            )}
          />
        </GestureDetector>
        <RefreshingRemy pull={pull} refreshing={refreshing} paused={!focused} />
      </View>
      {!loading ? <RemyMascot state="roaming" paused={!focused} browsingTime={browsingTime} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  searchBar: { paddingHorizontal: Spacing.base, marginTop: Spacing.xs, zIndex: 1 },
  searchInput: { paddingLeft: 44, paddingRight: 48 },
  searchIcon: { position: 'absolute', left: Spacing.base + Spacing.md, top: 0, bottom: 0, justifyContent: 'center' },
  clearSlot: { position: 'absolute', right: Spacing.base, top: 0, bottom: 0, justifyContent: 'center' },
  clearButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  results: { flex: 1 },
  list: { padding: Spacing.base, gap: Spacing.sm },
  emptyList: { flexGrow: 1 },
  row: { gap: Spacing.sm },
  card: { flex: 1 },
  skeletonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    padding: Spacing.base,
  },
  loadingOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', padding: Spacing.base },
  emptyCard: {
    margin: Spacing.base,
    alignItems: 'center',
    padding: Spacing.lg,
    gap: Spacing.xs,
  },
  resultMargin: { margin: Spacing.base },
  emptyText: { textAlign: 'center', color: Colors.textSecondary },
});
