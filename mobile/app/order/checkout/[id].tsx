// mobile/app/order/checkout/[id].tsx
// Checkout & Campus Meetup Order Placement Screen

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
  Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RemyMascot } from '@components/ui/RemyMascot';
import { RemyFormError, useRemyFormFeedback } from '@components/ui/RemyFormError';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@clerk/clerk-expo';
import {
  AppIcon,
  ClayHeader,
  ClayCard,
  ClayInput,
  ClayButton,
  ClayText,
  StatusBadge,
  CelebrationOverlay,
} from '@components/index';
import { Colors, Spacing, Radius, Typography, FontSize, FontFamily } from '@constants/theme';
import { Copy } from '@constants/copy';
import {
  fetchProductById,
  createOrder,
  fetchMeetupLocations,
  initiatePayment,
  verifyPayment,
} from '../../../services/api';
import type { Product, CampusMeetupLocation, PaymentMethod } from '../../../../shared/types';

const PLACEHOLDER_IMAGE = 'https://via.placeholder.com/400x300/EADFD5/4A2E1B?text=Remy';

export default function CheckoutScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { getToken, userId } = useAuth();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [meetupLocation, setMeetupLocation] = useState('');
  const [meetupTime, setMeetupTime] = useState('');
  const [certifiedLocations, setCertifiedLocations] = useState<CampusMeetupLocation[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('upi_demo');
  const [error, setError] = useState<string | null>(null);
  const [celebrating, setCelebrating] = useState(false);
  const [placedOrderId, setPlacedOrderId] = useState<string | null>(null);

  const loadProductAndLocations = useCallback(async () => {
    if (!id) return;
    try {
      const token = await getToken();
      const [productData, locationsData] = await Promise.all([
        fetchProductById(id, token),
        fetchMeetupLocations().catch(() => []),
      ]);
      setProduct(productData);
      setCertifiedLocations(locationsData);
      if (productData.campusLocation) {
        setMeetupLocation(productData.campusLocation);
      } else if (locationsData.length > 0) {
        setMeetupLocation(locationsData[0].name);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load checkout data.');
    } finally {
      setLoading(false);
    }
  }, [id, getToken]);

  useEffect(() => {
    loadProductAndLocations();
  }, [loadProductAndLocations]);

  const handlePlaceOrder = async () => {
    if (!product || !id) return;
    setError(null);

    if (product.sellerEmail && product.sellerId === userId) {
      setError('You cannot place an order for your own listing.');
      return;
    }

    if (product.status !== 'available' && product.status !== 'verified') {
      setError('This product is no longer available for purchase.');
      return;
    }

    if (!meetupLocation.trim()) {
      setError('Please specify a campus meetup point.');
      return;
    }

    setSubmitting(true);

    try {
      const token = await getToken();
      if (!token) throw new Error('Please sign in to place an order.');

      const order = await createOrder(token, {
        productId: id,
        amount: product.price,
        meetupLocation: meetupLocation.trim(),
        meetupTime: meetupTime.trim() ? new Date(Date.now() + 24 * 3600 * 1000).toISOString() : undefined,
      });

      if (paymentMethod === 'upi_demo') {
        // Initiate and verify digital UPI sandbox payment
        const paymentInit = await initiatePayment(token, {
          orderId: order.id,
          method: 'upi_demo',
        });
        await verifyPayment(token, {
          orderId: order.id,
          transactionRef: paymentInit.transactionRef,
          paymentMethod: 'upi_demo',
        });
      }

      setPlacedOrderId(order.id);
      setCelebrating(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to place order.');
    } finally {
      setSubmitting(false);
    }
  };

  const feedback = useRemyFormFeedback(error, handlePlaceOrder);

  if (loading) {
    return (
      <View style={[styles.container, styles.centerBox]}>
        <RemyMascot state="loading" status="Loading checkout..." />
      </View>
    );
  }

  if (error && !product) {
    return (
      <View style={[styles.container, styles.centerBox]}>
        <ClayCard variant="peach" style={styles.errorCard}>
          <View style={styles.errorIcon}>
            <AppIcon name="warning" size={36} tint="errorText" />
          </View>
          <Text style={Typography.bodyBold}>Cannot Checkout</Text>
          <Text style={[Typography.caption, styles.errorText]}>{error}</Text>
          <ClayButton label="Go Back" variant="secondary" onPress={() => router.back()} style={{ marginTop: Spacing.sm }} />
        </ClayCard>
      </View>
    );
  }

  const imageUri = product?.images && product.images.length > 0 ? product.images[0] : PLACEHOLDER_IMAGE;

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.scroll, { paddingBottom: Spacing.xxxl + insets.bottom }]}
      >
        <ClayHeader title="Checkout" subtitle="Confirm campus pickup & meetup details" />

        {/* Product summary card */}
        {product && (
          <ClayCard style={styles.summaryCard}>
            <Image source={{ uri: imageUri }} style={styles.thumbnail} />
            <View style={styles.summaryInfo}>
              <Text style={Typography.bodyBold} numberOfLines={2}>
                {product.title}
              </Text>
              <Text style={styles.price}>₹{product.price.toLocaleString('en-IN')}</Text>
              <Text style={Typography.caption}>Seller: {product.sellerName}</Text>
              <View style={{ marginTop: Spacing.xs }}>
                <StatusBadge status={product.status} />
              </View>
            </View>
          </ClayCard>
        )}

        {/* Meetup Coordination Form */}
        <ClayCard variant="lavender" style={styles.formCard}>
          <Text style={[Typography.h3, styles.sectionTitle]}>Campus Meetup Details</Text>
          <View style={[styles.inlineRow, { marginBottom: Spacing.md }]}>
            <AppIcon name="meetup" size={16} tint="textSecondary" />
            <Text style={[Typography.caption, { color: Colors.textSecondary, flex: 1 }]}>
              Remy transactions happen in person on campus. Coordinate where and when to meet the seller.
            </Text>
          </View>

          {/* Certified Campus Safe Meetup Points */}
          {certifiedLocations.length > 0 && (
            <View style={{ marginBottom: Spacing.sm }}>
              <View style={[styles.inlineRow, styles.fieldLabel]}>
                <AppIcon name="safeZone" size={15} tint="primary" />
                <Text style={[Typography.captionBold, { color: Colors.text }]}>
                  Certified Safe Campus Meetup Zones
                </Text>
              </View>
              <View style={styles.zoneTrack}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.zoneRow}
                >
                  {certifiedLocations.map((loc) => {
                    const isSelected = meetupLocation === loc.name;
                    return (
                      <Pressable
                        key={loc.id}
                        onPress={() => setMeetupLocation(loc.name)}
                        accessibilityRole="button"
                        accessibilityState={{ selected: isSelected }}
                        accessibilityLabel={loc.name}
                        style={({ pressed }) => [
                          styles.zoneChip,
                          isSelected && styles.zoneChipSelected,
                          pressed && styles.zoneChipPressed,
                        ]}
                      >
                        <AppIcon
                          name="location"
                          size={15}
                          tint={isSelected ? 'white' : 'primary'}
                        />
                        <ClayText
                          variant="captionBold"
                          color={isSelected ? 'white' : 'text'}
                          maxFontSizeMultiplier={1.3}
                        >
                          {loc.name}
                        </ClayText>
                      </Pressable>
                    );
                  })}
                </ScrollView>
                <LinearGradient
                  colors={['rgba(242,234,225,0)', 'rgba(242,234,225,0.92)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.zoneFadeRight}
                  pointerEvents="none"
                />
              </View>
            </View>
          )}

          <Text style={[Typography.captionBold, styles.fieldLabel]}>Preferred Meetup Point *</Text>
          <ClayInput
            value={meetupLocation}
            onChangeText={setMeetupLocation}
            placeholder="e.g. University Library Ground Floor, North Gate Cafe"
          />

          <Text style={[Typography.captionBold, styles.fieldLabel]}>Preferred Date / Time Note</Text>
          <ClayInput
            value={meetupTime}
            onChangeText={setMeetupTime}
            placeholder="e.g. Tomorrow between 2 PM - 4 PM"
          />

          {/* Payment Method Selector */}
          <View style={[styles.inlineRow, styles.fieldLabel, { marginTop: Spacing.md }]}>
            <AppIcon name="card" size={15} tint="primary" />
            <Text style={[Typography.captionBold, { color: Colors.text }]}>
              Select Payment Method
            </Text>
          </View>
          <View style={styles.paymentList}>
            {(
              [
                {
                  id: 'upi_demo' as const,
                  icon: 'upi' as const,
                  title: 'UPI Digital',
                  subtitle: 'Verified campus sandbox',
                },
                {
                  id: 'cash_on_meetup' as const,
                  icon: 'cash' as const,
                  title: 'Cash on Meetup',
                  subtitle: 'Pay after inspecting in person',
                },
              ] as const
            ).map((option) => {
              const selected = paymentMethod === option.id;
              return (
                <Pressable
                  key={option.id}
                  onPress={() => setPaymentMethod(option.id)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  accessibilityLabel={`${option.title}, ${option.subtitle}`}
                  style={({ pressed }) => [
                    styles.paymentCard,
                    selected && styles.paymentCardSelected,
                    pressed && styles.paymentCardPressed,
                  ]}
                >
                  <View style={[styles.paymentIconWell, selected && styles.paymentIconWellSelected]}>
                    <AppIcon
                      name={option.icon}
                      size={20}
                      tint={selected ? 'white' : 'primary'}
                    />
                  </View>
                  <View style={styles.paymentCopy}>
                    <ClayText
                      variant="bodyBold"
                      color="text"
                      maxFontSizeMultiplier={1.3}
                    >
                      {option.title}
                    </ClayText>
                    <ClayText
                      variant="caption"
                      color="textSecondary"
                      maxFontSizeMultiplier={1.3}
                    >
                      {option.subtitle}
                    </ClayText>
                  </View>
                  <View style={[styles.radioRing, selected && styles.radioRingSelected]}>
                    {selected ? <AppIcon name="check" size={14} tint="white" /> : null}
                  </View>
                </Pressable>
              );
            })}
          </View>

          {/* Payment Note */}
          <ClayCard variant="mint" style={styles.paymentNoteCard}>
            <View style={styles.inlineRow}>
              <AppIcon name={paymentMethod === 'upi_demo' ? 'upi' : 'cash'} size={16} tint="successText" />
              <Text style={Typography.captionBold}>
                {paymentMethod === 'upi_demo' ? 'UPI Sandbox Demonstration' : 'Cash on Exchange'}
              </Text>
            </View>
            <Text style={Typography.caption}>
              {paymentMethod === 'upi_demo'
                ? 'Backend-verified UPI simulation. No real money will be deducted from your bank.'
                : 'Inspect the item in person and pay the student cash directly upon handover.'}
            </Text>
          </ClayCard>

          <RemyFormError message={feedback.message} attempt={feedback.attempt} />
          <View style={styles.buttonRow}>
            <ClayButton
              label={submitting ? 'Placing Order...' : feedback.message ? Copy.error.retry : `Confirm Order (₹${product?.price.toLocaleString('en-IN')})`}
              onPress={feedback.onSubmit}
              loading={submitting}
              style={styles.confirmBtn}
            />
            <ClayButton
              label="Cancel"
              variant="secondary"
              onPress={() => router.back()}
              style={styles.cancelBtn}
            />
          </View>
        </ClayCard>
      </ScrollView>

      <CelebrationOverlay
        visible={celebrating}
        title={Copy.success.orderPlaced}
        message={Copy.success.orderPlacedBody}
        onDismiss={() => {
          setCelebrating(false);
          if (placedOrderId) router.replace(`/order/${placedOrderId}`);
        }}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.background },
  container: { flex: 1 },
  scroll: { padding: Spacing.md, paddingBottom: Spacing.xxxl },
  centerBox: { justifyContent: 'center', alignItems: 'center', padding: Spacing.xl },
  errorCard: { padding: Spacing.lg, alignItems: 'center', width: '100%' },
  errorIcon: { marginBottom: Spacing.sm },
  errorText: { color: Colors.error, textAlign: 'center', marginTop: Spacing.xs },
  summaryCard: { flexDirection: 'row', padding: Spacing.md, marginBottom: Spacing.md, alignItems: 'center' },
  thumbnail: { width: 84, height: 84, borderRadius: Radius.md, marginRight: Spacing.md },
  summaryInfo: { flex: 1 },
  price: { fontSize: FontSize.h3, fontFamily: FontFamily.bodyBold, color: Colors.text, marginVertical: Spacing.xs },
  formCard: { padding: Spacing.md },
  sectionTitle: { marginBottom: Spacing.xs },
  inlineRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  fieldLabel: { color: Colors.text, marginTop: Spacing.sm, marginBottom: Spacing.xs },
  zoneTrack: { marginHorizontal: -Spacing.md, marginVertical: Spacing.xs, position: 'relative' },
  zoneRow: { flexDirection: 'row', gap: Spacing.sm, paddingHorizontal: Spacing.md, paddingRight: Spacing.xxl, paddingVertical: 2 },
  zoneChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 48,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  zoneChipSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  zoneChipPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.97 }],
  },
  zoneFadeRight: { position: 'absolute', top: 0, bottom: 0, right: 0, width: 24 },
  paymentList: { gap: Spacing.sm, marginBottom: Spacing.md },
  paymentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    minHeight: 68,
    padding: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  paymentCardSelected: {
    backgroundColor: Colors.accentSoft,
    borderColor: Colors.primary,
  },
  paymentCardPressed: {
    opacity: 0.94,
    transform: [{ scale: 0.985 }],
  },
  paymentIconWell: {
    width: 42,
    height: 42,
    borderRadius: Radius.sm,
    backgroundColor: Colors.input,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentIconWellSelected: {
    backgroundColor: Colors.primary,
  },
  paymentCopy: { flex: 1, gap: 2 },
  radioRing: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioRingSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  paymentNoteCard: { padding: Spacing.sm, marginTop: Spacing.xs, marginBottom: Spacing.md, gap: 4 },
  buttonRow: { gap: Spacing.sm },
  confirmBtn: { width: '100%' },
  cancelBtn: { width: '100%' },
});

